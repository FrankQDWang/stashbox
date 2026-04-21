import { z } from 'zod';

import type { ItemFormData } from '@/types/itemForm';
import { isDateOnlyString } from '@/utils/date';

const emptyToNull = (value: unknown) => {
  if (value === undefined || value === '') {
    return null;
  }

  return value;
};

const nullableTextSchema = z.preprocess(
  emptyToNull,
  z.string().trim().max(120, '内容太长啦').nullable(),
);

const nullableLongTextSchema = z.preprocess(
  emptyToNull,
  z.string().trim().max(1000, '备注太长啦').nullable(),
);

const nullableDateSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .refine((value) => isDateOnlyString(value), '日期格式需要是 YYYY-MM-DD')
    .nullable(),
);

const nullablePercentSchema = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? 100 : Number(value)),
  z.number().int().min(0, '不能小于 0').max(100, '不能大于 100'),
);

const nullableNumberSchema = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? null : Number(value)),
  z.number().min(0, '不能小于 0').nullable(),
);

const nullableIntegerSchema = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? null : Number(value)),
  z.number().int().min(1).nullable(),
);

export const itemStatusSchema = z.union([
  z.literal('unopened'),
  z.literal('opened'),
  z.literal('used_up'),
  z.literal('idle'),
]);

export const itemFormSchema = z
  .object({
    name: z.string().trim().min(1, '给宝贝起个名字吧').max(80, '名字太长啦'),
    categoryId: z.preprocess(emptyToNull, z.string().nullable()),
    brand: nullableTextSchema,
    series: nullableTextSchema,
    shade: nullableTextSchema,
    status: itemStatusSchema,
    remainingPercent: nullablePercentSchema,
    purchaseDate: nullableDateSchema,
    purchasePrice: nullableNumberSchema,
    purchaseChannel: nullableTextSchema,
    expiryDate: nullableDateSchema,
    openDate: nullableDateSchema,
    afterOpenMonths: nullableIntegerSchema,
    storageLocation: nullableTextSchema,
    repurchaseRating: z.preprocess(
      (value) => (value === '' || value === undefined || value === null ? null : Number(value)),
      z.number().int().min(1).max(4).nullable(),
    ),
    favorite: z.boolean(),
    notes: nullableLongTextSchema,
    images: z
      .array(
        z.object({
          id: z.string().optional(),
          uri: z.string().min(1),
          state: z.union([z.literal('existing'), z.literal('new')]),
        }),
      )
      .max(3, '最多添加 3 张照片'),
  })
  .superRefine((data, context) => {
    if (data.status === 'opened' && data.afterOpenMonths && !data.openDate) {
      context.addIssue({
        code: 'custom',
        path: ['openDate'],
        message: '填写开封后保质期时需要开封日期',
      });
    }
  });

export type ItemFormSchemaData = z.infer<typeof itemFormSchema>;

export interface NormalizedItemFormData extends Omit<ItemFormData, 'name'> {
  name: string;
}

export function normalizeItemFormData(data: ItemFormData): NormalizedItemFormData {
  return {
    ...data,
    name: data.name.trim(),
    brand: normalizeText(data.brand),
    series: normalizeText(data.series),
    shade: normalizeText(data.shade),
    purchaseChannel: normalizeText(data.purchaseChannel),
    storageLocation: normalizeText(data.storageLocation),
    notes: normalizeText(data.notes),
  };
}

export function getDefaultItemFormData(): ItemFormData {
  return {
    name: '',
    categoryId: null,
    brand: null,
    series: null,
    shade: null,
    status: 'unopened',
    remainingPercent: 100,
    purchaseDate: null,
    purchasePrice: null,
    purchaseChannel: null,
    expiryDate: null,
    openDate: null,
    afterOpenMonths: null,
    storageLocation: null,
    repurchaseRating: null,
    favorite: false,
    notes: null,
    images: [],
  };
}

function normalizeText(value: string | null): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}
