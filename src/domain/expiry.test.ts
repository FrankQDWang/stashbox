import { computeDueDate, getExpiryLevel, getExpiryText } from '@/domain/expiry';

describe('getExpiryLevel', () => {
  const today = '2026-04-21';

  it('returns unknown when due date is missing', () => {
    expect(getExpiryLevel(null, today)).toBe('unknown');
  });

  it('returns expired for past due date', () => {
    expect(getExpiryLevel('2026-04-20', today)).toBe('expired');
  });

  it('returns urgent for today and next 7 days', () => {
    expect(getExpiryLevel('2026-04-21', today)).toBe('urgent');
    expect(getExpiryLevel('2026-04-28', today)).toBe('urgent');
  });

  it('returns soon for days 8 to 30', () => {
    expect(getExpiryLevel('2026-04-29', today)).toBe('soon');
    expect(getExpiryLevel('2026-05-21', today)).toBe('soon');
  });

  it('returns safe after 30 days', () => {
    expect(getExpiryLevel('2026-05-22', today)).toBe('safe');
  });
});

describe('computeDueDate', () => {
  it('uses expiry date when only expiry date exists', () => {
    expect(computeDueDate({ expiryDate: '2027-01-01' })).toBe('2027-01-01');
  });

  it('uses open date plus months when only after-open rule exists', () => {
    expect(computeDueDate({ openDate: '2026-04-21', afterOpenMonths: 12 })).toBe('2027-04-21');
  });

  it('uses earlier date when both candidates exist', () => {
    expect(
      computeDueDate({
        expiryDate: '2028-01-01',
        openDate: '2026-04-21',
        afterOpenMonths: 6,
      }),
    ).toBe('2026-10-21');
  });

  it('returns null when no candidate exists', () => {
    expect(computeDueDate({})).toBeNull();
  });
});

describe('getExpiryText', () => {
  it('returns warm Chinese due copy', () => {
    expect(getExpiryText(null, '2026-04-21')).toBe('无到期');
    expect(getExpiryText('2026-04-21', '2026-04-21')).toBe('今天到期');
    expect(getExpiryText('2026-04-20', '2026-04-21')).toBe('已过期 1 天');
    expect(getExpiryText('2026-04-23', '2026-04-21')).toBe('2 天后到期');
  });
});
