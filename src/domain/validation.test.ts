import { getDefaultItemFormData, itemFormSchema, normalizeItemFormData } from '@/domain/validation';

describe('itemFormSchema', () => {
  it('accepts name-only item data', () => {
    const result = itemFormSchema.safeParse({
      ...getDefaultItemFormData(),
      name: '防晒霜',
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty names', () => {
    const result = itemFormSchema.safeParse(getDefaultItemFormData());

    expect(result.success).toBe(false);
  });

  it('rejects invalid percent and image overflow', () => {
    const result = itemFormSchema.safeParse({
      ...getDefaultItemFormData(),
      name: '香水',
      remainingPercent: 120,
      images: [
        { uri: 'a', state: 'new' },
        { uri: 'b', state: 'new' },
        { uri: 'c', state: 'new' },
        { uri: 'd', state: 'new' },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe('normalizeItemFormData', () => {
  it('trims text and converts blank optional text to null', () => {
    expect(
      normalizeItemFormData({
        ...getDefaultItemFormData(),
        name: '  面霜  ',
        brand: '   ',
        notes: '  放在抽屉  ',
      }),
    ).toMatchObject({
      name: '面霜',
      brand: null,
      notes: '放在抽屉',
    });
  });
});
