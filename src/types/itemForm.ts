import type { ISODateString } from '@/types/common';
import type { ItemStatus } from '@/types/item';

export type ItemFormImageState = 'existing' | 'new';

export interface ItemFormImage {
  id?: string;
  uri: string;
  state: ItemFormImageState;
}

export interface ItemFormData {
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
  storageLocation: string | null;
  repurchaseRating: number | null;
  favorite: boolean;
  notes: string | null;
  images: ItemFormImage[];
}
