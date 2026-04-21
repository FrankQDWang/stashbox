import { nanoid } from 'nanoid/non-secure';

export function createItemId(): string {
  return `item_${nanoid(12)}`;
}

export function createImageId(): string {
  return `img_${nanoid(12)}`;
}

export function createSettingId(): string {
  return `setting_${nanoid(12)}`;
}
