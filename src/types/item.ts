import type { Category } from '@/types/category';
import type { ISODateString, ISODateTimeString } from '@/types/common';

export type ItemStatus = 'unopened' | 'opened' | 'used_up' | 'idle';

export type ExpiryLevel = 'expired' | 'urgent' | 'soon' | 'safe' | 'unknown';

export interface Item {
  id: string;
  name: string;
  categoryId: string | null;
  brand: string | null;
  series: string | null;
  shade: string | null;
  status: ItemStatus;
  remainingPercent: number;
  purchaseDate: ISODateString | null;
  purchasePrice: number | null;
  purchaseChannel: string | null;
  expiryDate: ISODateString | null;
  openDate: ISODateString | null;
  afterOpenMonths: number | null;
  computedDueDate: ISODateString | null;
  storageLocation: string | null;
  repurchaseRating: number | null;
  notes: string | null;
  isArchived: boolean;
  favorite: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface ItemImage {
  id: string;
  itemId: string;
  localUri: string;
  sortOrder: number;
  createdAt: ISODateTimeString;
}

export interface ItemWithImages extends Item {
  images: ItemImage[];
  category: Category | null;
}
