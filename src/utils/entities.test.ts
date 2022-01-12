import { convertMeasure } from "./entities";

describe('entities utils', () => {
  it('converts measure from ml to kg', () => {
    expect(convertMeasure(500, 'ml', 'kg')).toBe(0.5);
  });

  it('converts measure from l to kg', () => {
    expect(convertMeasure(5, 'l', 'kg')).toBe(5);
  });

  it('converts measure from kg to ml', () => {
    expect(convertMeasure(0.5, 'kg', 'ml')).toBe(500);
  });

  it('converts measure from kg to l', () => {
    expect(convertMeasure(5, 'kg', 'l')).toBe(5);
  });
});
