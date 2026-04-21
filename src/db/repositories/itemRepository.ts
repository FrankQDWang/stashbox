import type { SQLiteDatabase } from 'expo-sqlite';

import { runWriteTransaction } from '@/db/transaction';
import { computeDueDate } from '@/domain/expiry';
import type { InventorySortMode } from '@/domain/sorting';
import { addDays, todayDateOnly } from '@/utils/date';
import { createImageId, createItemId } from '@/utils/id';
import type { Category } from '@/types/category';
import type { Item, ItemImage, ItemStatus, ItemWithImages } from '@/types/item';
import type { ItemFormData } from '@/types/itemForm';

export type { InventorySortMode };

export interface ListItemsOptions {
  searchQuery?: string;
  categoryId?: string | null;
  sortMode: InventorySortMode;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface DashboardCounts {
  expired: number;
  dueWithin30Days: number;
  totalActive: number;
}

export interface CreateItemInput extends Omit<ItemFormData, 'images'> {
  id?: string;
  imageLocalUris: string[];
}

export interface UpdateItemInput extends Partial<Omit<ItemFormData, 'images'>> {
  imageLocalUris?: string[];
}

interface ItemRow {
  id: string;
  name: string;
  category_id: string | null;
  brand: string | null;
  series: string | null;
  shade: string | null;
  status: ItemStatus;
  remaining_percent: number | null;
  purchase_date: string | null;
  purchase_price: number | null;
  purchase_channel: string | null;
  expiry_date: string | null;
  open_date: string | null;
  after_open_months: number | null;
  computed_due_date: string | null;
  storage_location: string | null;
  repurchase_rating: number | null;
  notes: string | null;
  is_archived: number | null;
  favorite: number | null;
  created_at: string;
  updated_at: string;
  category_name: string | null;
  category_icon: string | null;
  category_sort_order: number | null;
  category_created_at: string | null;
}

interface ItemImageRow {
  id: string;
  item_id: string;
  local_uri: string;
  sort_order: number | null;
  created_at: string;
}

const ITEM_SELECT = `
  SELECT
    i.*,
    c.name AS category_name,
    c.icon AS category_icon,
    c.sort_order AS category_sort_order,
    c.created_at AS category_created_at
  FROM items i
  LEFT JOIN categories c ON c.id = i.category_id
`;

export async function getItemById(
  db: SQLiteDatabase,
  id: string,
): Promise<ItemWithImages | null> {
  const row = await db.getFirstAsync<ItemRow>(
    `${ITEM_SELECT} WHERE i.id = ? LIMIT 1`,
    id,
  );

  if (!row) {
    return null;
  }

  const images = await listImagesForItem(db, id);
  return mapItemRow(row, images);
}

export async function listItems(
  db: SQLiteDatabase,
  options: ListItemsOptions,
): Promise<ItemWithImages[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (!options.includeArchived) {
    conditions.push('i.is_archived = 0');
  }

  if (options.searchQuery?.trim()) {
    const query = `%${options.searchQuery.trim().toLowerCase()}%`;
    conditions.push('(LOWER(i.name) LIKE ? OR LOWER(COALESCE(i.brand, "")) LIKE ?)');
    params.push(query, query);
  }

  if (options.categoryId) {
    conditions.push('i.category_id = ?');
    params.push(options.categoryId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause =
    options.sortMode === 'latest'
      ? 'ORDER BY i.created_at DESC'
      : `
        ORDER BY
          CASE WHEN i.computed_due_date IS NULL THEN 1 ELSE 0 END ASC,
          i.computed_due_date ASC,
          i.created_at DESC
      `;
  const limitClause = options.limit ? 'LIMIT ?' : '';
  const offsetClause = options.offset ? 'OFFSET ?' : '';

  if (options.limit) params.push(options.limit);
  if (options.offset) params.push(options.offset);

  const rows = await db.getAllAsync<ItemRow>(
    `${ITEM_SELECT} ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`,
    params,
  );

  return attachImages(db, rows);
}

export async function listHomeRiskItems(
  db: SQLiteDatabase,
  today: string,
): Promise<ItemWithImages[]> {
  const soonBoundary = addDays(today, 30);
  const rows = await db.getAllAsync<ItemRow>(
    `
    ${ITEM_SELECT}
    WHERE i.is_archived = 0
      AND i.computed_due_date IS NOT NULL
      AND i.computed_due_date <= ?
    ORDER BY i.computed_due_date ASC, i.created_at DESC
    `,
    soonBoundary,
  );

  return attachImages(db, rows);
}

export async function listArchivedItems(db: SQLiteDatabase): Promise<ItemWithImages[]> {
  const rows = await db.getAllAsync<ItemRow>(
    `
    ${ITEM_SELECT}
    WHERE i.is_archived = 1
    ORDER BY i.updated_at DESC
    `,
  );

  return attachImages(db, rows);
}

export async function getDashboardCounts(
  db: SQLiteDatabase,
  today: string,
): Promise<DashboardCounts> {
  const soonBoundary = addDays(today, 30);
  const row = await db.getFirstAsync<{
    expired: number | null;
    dueWithin30Days: number | null;
    totalActive: number | null;
  }>(
    `
    SELECT
      SUM(CASE WHEN computed_due_date IS NOT NULL AND computed_due_date < ? THEN 1 ELSE 0 END) AS expired,
      SUM(CASE WHEN computed_due_date IS NOT NULL AND computed_due_date >= ? AND computed_due_date <= ? THEN 1 ELSE 0 END) AS dueWithin30Days,
      COUNT(*) AS totalActive
    FROM items
    WHERE is_archived = 0
    `,
    today,
    today,
    soonBoundary,
  );

  return {
    expired: row?.expired ?? 0,
    dueWithin30Days: row?.dueWithin30Days ?? 0,
    totalActive: row?.totalActive ?? 0,
  };
}

export async function createItem(
  db: SQLiteDatabase,
  input: CreateItemInput,
): Promise<ItemWithImages> {
  const id = input.id ?? createItemId();
  const now = new Date().toISOString();
  const computedDueDate = computeDueDate(input);

  await runWriteTransaction(db, async (txn) => {
    await txn.runAsync(
      `
      INSERT INTO items (
        id, name, category_id, brand, series, shade, status,
        remaining_percent, purchase_date, purchase_price, purchase_channel,
        expiry_date, open_date, after_open_months, computed_due_date,
        storage_location, repurchase_rating, notes,
        is_archived, favorite, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      input.name,
      toDbValue(input.categoryId),
      toDbValue(input.brand),
      toDbValue(input.series),
      toDbValue(input.shade),
      input.status,
      input.remainingPercent,
      toDbValue(input.purchaseDate),
      toDbValue(input.purchasePrice),
      toDbValue(input.purchaseChannel),
      toDbValue(input.expiryDate),
      toDbValue(input.openDate),
      toDbValue(input.afterOpenMonths),
      toDbValue(computedDueDate),
      toDbValue(input.storageLocation),
      toDbValue(input.repurchaseRating),
      toDbValue(input.notes),
      0,
      input.favorite ? 1 : 0,
      now,
      now,
    );

    await insertImages(txn, id, input.imageLocalUris, now);
  });

  const created = await getItemById(db, id);
  if (!created) {
    throw new Error('Item was not created.');
  }

  return created;
}

export async function updateItem(
  db: SQLiteDatabase,
  id: string,
  input: UpdateItemInput,
): Promise<ItemWithImages> {
  const current = await getItemById(db, id);

  if (!current) {
    throw new Error('Item not found.');
  }

  const merged = {
    ...current,
    ...input,
    openDate:
      input.status === 'opened' && current.status !== 'opened' && !input.openDate && !current.openDate
        ? todayDateOnly()
        : (input.openDate ?? current.openDate),
  };
  const computedDueDate = computeDueDate(merged);
  const now = new Date().toISOString();

  await runWriteTransaction(db, async (txn) => {
    await txn.runAsync(
      `
      UPDATE items SET
        name = ?,
        category_id = ?,
        brand = ?,
        series = ?,
        shade = ?,
        status = ?,
        remaining_percent = ?,
        purchase_date = ?,
        purchase_price = ?,
        purchase_channel = ?,
        expiry_date = ?,
        open_date = ?,
        after_open_months = ?,
        computed_due_date = ?,
        storage_location = ?,
        repurchase_rating = ?,
        notes = ?,
        favorite = ?,
        updated_at = ?
      WHERE id = ?
      `,
      merged.name,
      toDbValue(merged.categoryId),
      toDbValue(merged.brand),
      toDbValue(merged.series),
      toDbValue(merged.shade),
      merged.status,
      merged.remainingPercent,
      toDbValue(merged.purchaseDate),
      toDbValue(merged.purchasePrice),
      toDbValue(merged.purchaseChannel),
      toDbValue(merged.expiryDate),
      toDbValue(merged.openDate),
      toDbValue(merged.afterOpenMonths),
      toDbValue(computedDueDate),
      toDbValue(merged.storageLocation),
      toDbValue(merged.repurchaseRating),
      toDbValue(merged.notes),
      merged.favorite ? 1 : 0,
      now,
      id,
    );

    if (input.imageLocalUris) {
      await replaceImagesOnConnection(txn, id, input.imageLocalUris, now);
    }
  });

  const updated = await getItemById(db, id);
  if (!updated) {
    throw new Error('Updated item not found.');
  }

  return updated;
}

export async function deleteItem(
  db: SQLiteDatabase,
  id: string,
): Promise<{ deletedImageUris: string[] }> {
  const rows = await db.getAllAsync<{ local_uri: string }>(
    'SELECT local_uri FROM item_images WHERE item_id = ?',
    id,
  );

  await runWriteTransaction(db, async (txn) => {
    await txn.runAsync('DELETE FROM items WHERE id = ?', id);
  });

  return { deletedImageUris: rows.map((row) => row.local_uri) };
}

export async function archiveItem(db: SQLiteDatabase, id: string): Promise<ItemWithImages> {
  return updateArchiveState(db, id, true);
}

export async function unarchiveItem(db: SQLiteDatabase, id: string): Promise<ItemWithImages> {
  return updateArchiveState(db, id, false);
}

export async function markItemOpened(
  db: SQLiteDatabase,
  id: string,
  openDate: string,
): Promise<ItemWithImages> {
  const current = await getItemById(db, id);

  if (!current) {
    throw new Error('Item not found.');
  }

  const computedDueDate = computeDueDate({
    expiryDate: current.expiryDate,
    openDate,
    afterOpenMonths: current.afterOpenMonths,
  });

  await db.runAsync(
    `
    UPDATE items SET
      status = 'opened',
      open_date = ?,
      computed_due_date = ?,
      updated_at = ?
    WHERE id = ?
    `,
    openDate,
    toDbValue(computedDueDate),
    new Date().toISOString(),
    id,
  );

  return requireItem(db, id);
}

export async function markItemUsedUp(db: SQLiteDatabase, id: string): Promise<ItemWithImages> {
  await db.runAsync(
    `
    UPDATE items SET
      status = 'used_up',
      remaining_percent = 0,
      updated_at = ?
    WHERE id = ?
    `,
    new Date().toISOString(),
    id,
  );

  return requireItem(db, id);
}

export async function updateRemainingPercent(
  db: SQLiteDatabase,
  id: string,
  remainingPercent: number,
): Promise<ItemWithImages> {
  const nextRemainingPercent = Number.isFinite(remainingPercent)
    ? Math.max(0, Math.min(100, Math.round(remainingPercent)))
    : 0;

  await db.runAsync(
    `
    UPDATE items SET
      remaining_percent = ?,
      updated_at = ?
    WHERE id = ?
    `,
    nextRemainingPercent,
    new Date().toISOString(),
    id,
  );

  return requireItem(db, id);
}

export async function addItemImage(
  db: SQLiteDatabase,
  itemId: string,
  localUri: string,
  sortOrder: number,
): Promise<ItemImage> {
  const image = {
    id: createImageId(),
    itemId,
    localUri,
    sortOrder,
    createdAt: new Date().toISOString(),
  };

  await db.runAsync(
    `
    INSERT INTO item_images (id, item_id, local_uri, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?)
    `,
    image.id,
    image.itemId,
    image.localUri,
    image.sortOrder,
    image.createdAt,
  );

  return image;
}

export async function replaceItemImages(
  db: SQLiteDatabase,
  itemId: string,
  imageLocalUris: string[],
): Promise<{ insertedImages: ItemImage[]; removedImageUris: string[] }> {
  const currentImages = await listImagesForItem(db, itemId);
  const now = new Date().toISOString();
  let insertedImages: ItemImage[] = [];

  await runWriteTransaction(db, async (txn) => {
    insertedImages = await replaceImagesOnConnection(txn, itemId, imageLocalUris, now);
  });

  return {
    insertedImages,
    removedImageUris: currentImages
      .filter((image) => !imageLocalUris.includes(image.localUri))
      .map((image) => image.localUri),
  };
}

export async function deleteItemImage(
  db: SQLiteDatabase,
  imageId: string,
): Promise<{ removedImageUri: string | null }> {
  const row = await db.getFirstAsync<{ local_uri: string }>(
    'SELECT local_uri FROM item_images WHERE id = ? LIMIT 1',
    imageId,
  );

  await db.runAsync('DELETE FROM item_images WHERE id = ?', imageId);

  return { removedImageUri: row?.local_uri ?? null };
}

async function updateArchiveState(
  db: SQLiteDatabase,
  id: string,
  isArchived: boolean,
): Promise<ItemWithImages> {
  await db.runAsync(
    `
    UPDATE items SET
      is_archived = ?,
      updated_at = ?
    WHERE id = ?
    `,
    isArchived ? 1 : 0,
    new Date().toISOString(),
    id,
  );

  return requireItem(db, id);
}

async function requireItem(db: SQLiteDatabase, id: string): Promise<ItemWithImages> {
  const item = await getItemById(db, id);

  if (!item) {
    throw new Error('Item not found.');
  }

  return item;
}

async function attachImages(
  db: SQLiteDatabase,
  rows: ItemRow[],
): Promise<ItemWithImages[]> {
  const imageMap = await listImagesForItems(db, rows.map((row) => row.id));
  return rows.map((row) => mapItemRow(row, imageMap.get(row.id) ?? []));
}

async function listImagesForItem(db: SQLiteDatabase, itemId: string): Promise<ItemImage[]> {
  const rows = await db.getAllAsync<ItemImageRow>(
    `
    SELECT * FROM item_images
    WHERE item_id = ?
    ORDER BY sort_order ASC, created_at ASC
    `,
    itemId,
  );

  return rows.map(mapImageRow);
}

async function listImagesForItems(
  db: SQLiteDatabase,
  itemIds: string[],
): Promise<Map<string, ItemImage[]>> {
  const map = new Map<string, ItemImage[]>();

  if (itemIds.length === 0) {
    return map;
  }

  const placeholders = itemIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<ItemImageRow>(
    `
    SELECT * FROM item_images
    WHERE item_id IN (${placeholders})
    ORDER BY item_id ASC, sort_order ASC, created_at ASC
    `,
    itemIds,
  );

  rows.forEach((row) => {
    const image = mapImageRow(row);
    map.set(image.itemId, [...(map.get(image.itemId) ?? []), image]);
  });

  return map;
}

async function insertImages(
  db: SQLiteDatabase,
  itemId: string,
  imageLocalUris: string[],
  now: string,
): Promise<ItemImage[]> {
  const images = imageLocalUris.slice(0, 3).map((localUri, index) => ({
    id: createImageId(),
    itemId,
    localUri,
    sortOrder: index,
    createdAt: now,
  }));

  for (const image of images) {
    await db.runAsync(
      `
      INSERT INTO item_images (id, item_id, local_uri, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?)
      `,
      image.id,
      image.itemId,
      image.localUri,
      image.sortOrder,
      image.createdAt,
    );
  }

  return images;
}

async function replaceImagesOnConnection(
  db: SQLiteDatabase,
  itemId: string,
  imageLocalUris: string[],
  now: string,
): Promise<ItemImage[]> {
  await db.runAsync('DELETE FROM item_images WHERE item_id = ?', itemId);
  return insertImages(db, itemId, imageLocalUris, now);
}

function mapItemRow(row: ItemRow, images: ItemImage[]): ItemWithImages {
  const item: Item = {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    brand: row.brand,
    series: row.series,
    shade: row.shade,
    status: row.status,
    remainingPercent: row.remaining_percent ?? 100,
    purchaseDate: row.purchase_date,
    purchasePrice: row.purchase_price,
    purchaseChannel: row.purchase_channel,
    expiryDate: row.expiry_date,
    openDate: row.open_date,
    afterOpenMonths: row.after_open_months,
    computedDueDate: row.computed_due_date,
    storageLocation: row.storage_location,
    repurchaseRating: row.repurchase_rating,
    notes: row.notes,
    isArchived: row.is_archived === 1,
    favorite: row.favorite === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return {
    ...item,
    images,
    category: mapJoinedCategory(row),
  };
}

function mapImageRow(row: ItemImageRow): ItemImage {
  return {
    id: row.id,
    itemId: row.item_id,
    localUri: row.local_uri,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

function mapJoinedCategory(row: ItemRow): Category | null {
  if (!row.category_id || !row.category_name || !row.category_created_at) {
    return null;
  }

  return {
    id: row.category_id,
    name: row.category_name,
    icon: row.category_icon,
    sortOrder: row.category_sort_order ?? 0,
    createdAt: row.category_created_at,
  };
}

function toDbValue<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}
