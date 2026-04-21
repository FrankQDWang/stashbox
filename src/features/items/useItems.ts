import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { listCategories, listCategoriesWithActiveCount } from '@/db/repositories/categoryRepository';
import {
  getDashboardCounts,
  getItemById,
  listArchivedItems,
  listHomeRiskItems,
  listItems,
  type DashboardCounts,
  type ListItemsOptions,
} from '@/db/repositories/itemRepository';
import { groupHomeRiskItems, type HomeRiskGroups } from '@/domain/sorting';
import { todayDateOnly } from '@/utils/date';
import { useAppStore } from '@/store/useAppStore';
import type { Category, CategoryWithCount } from '@/types/category';
import type { ItemWithImages } from '@/types/item';

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useInventoryItems(options: ListItemsOptions): AsyncState<ItemWithImages[]> {
  const db = useSQLiteContext();
  const refreshToken = useAppStore((state) => state.refreshToken);
  const [data, setData] = useState<ItemWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setData(await listItems(db, options));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取库存失败');
    } finally {
      setLoading(false);
    }
  }, [db, options]);

  useFocusEffect(
    useCallback(() => {
      void refreshToken;
      void reloadToken;
      void load();
    }, [load, refreshToken, reloadToken]),
  );

  return {
    data,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1),
  };
}

export function useHomeData(): AsyncState<{
  counts: DashboardCounts;
  groups: HomeRiskGroups;
}> {
  const db = useSQLiteContext();
  const refreshToken = useAppStore((state) => state.refreshToken);
  const [data, setData] = useState({
    counts: { expired: 0, dueWithin30Days: 0, totalActive: 0 },
    groups: { expired: [], urgent: [], soon: [] } as HomeRiskGroups,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const today = todayDateOnly();
      const [counts, riskItems] = await Promise.all([
        getDashboardCounts(db, today),
        listHomeRiskItems(db, today),
      ]);

      setData({ counts, groups: groupHomeRiskItems(riskItems, today) });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取首页失败');
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refreshToken;
      void reloadToken;
      void load();
    }, [load, refreshToken, reloadToken]),
  );

  return {
    data,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1),
  };
}

export function useArchivedItems(): AsyncState<ItemWithImages[]> {
  const db = useSQLiteContext();
  const refreshToken = useAppStore((state) => state.refreshToken);
  const [data, setData] = useState<ItemWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setData(await listArchivedItems(db));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取归档失败');
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refreshToken;
      void reloadToken;
      void load();
    }, [load, refreshToken, reloadToken]),
  );

  return {
    data,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1),
  };
}

export function useCategories(): AsyncState<Category[]> {
  const db = useSQLiteContext();
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        const categories = await listCategories(db);
        if (mounted) setData(categories);
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : '读取分类失败');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [db]);

  return {
    data,
    loading,
    error,
    reload: () => undefined,
  };
}

export function useCategoriesWithCount(): AsyncState<CategoryWithCount[]> {
  const db = useSQLiteContext();
  const refreshToken = useAppStore((state) => state.refreshToken);
  const [data, setData] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      setData(await listCategoriesWithActiveCount(db));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取分类失败');
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refreshToken;
      void reloadToken;
      void load();
    }, [load, refreshToken, reloadToken]),
  );

  return {
    data,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1),
  };
}

export function useItem(id: string | string[] | undefined): AsyncState<ItemWithImages | null> {
  const db = useSQLiteContext();
  const itemId = Array.isArray(id) ? id[0] : id;
  const refreshToken = useAppStore((state) => state.refreshToken);
  const [data, setData] = useState<ItemWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    if (!itemId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setData(await getItemById(db, itemId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取宝贝失败');
    } finally {
      setLoading(false);
    }
  }, [db, itemId]);

  useFocusEffect(
    useCallback(() => {
      void refreshToken;
      void reloadToken;
      void load();
    }, [load, refreshToken, reloadToken]),
  );

  return {
    data,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1),
  };
}
