import type { ISODateTimeString } from '@/types/common';

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  createdAt: ISODateTimeString;
}

export interface CategoryWithCount extends Category {
  activeCount: number;
}
