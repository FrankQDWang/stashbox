import { create } from 'zustand';

import type { InventorySortMode } from '@/domain/sorting';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastState {
  id: number;
  kind: ToastKind;
  message: string;
}

interface AppStoreState {
  inventorySearch: string;
  selectedCategoryId: string | null;
  inventorySortMode: InventorySortMode;
  refreshToken: number;
  toast: ToastState | null;
  setInventorySearch: (value: string) => void;
  setSelectedCategoryId: (value: string | null) => void;
  setInventorySortMode: (value: InventorySortMode) => void;
  bumpRefreshToken: () => void;
  showToast: (kind: ToastKind, message: string) => void;
  hideToast: () => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  inventorySearch: '',
  selectedCategoryId: null,
  inventorySortMode: 'due_first',
  refreshToken: 0,
  toast: null,
  setInventorySearch: (value) => set({ inventorySearch: value }),
  setSelectedCategoryId: (value) => set({ selectedCategoryId: value }),
  setInventorySortMode: (value) => set({ inventorySortMode: value }),
  bumpRefreshToken: () => set((state) => ({ refreshToken: state.refreshToken + 1 })),
  showToast: (kind, message) =>
    set((state) => ({
      toast: {
        id: state.toast ? state.toast.id + 1 : 1,
        kind,
        message,
      },
    })),
  hideToast: () => set({ toast: null }),
}));
