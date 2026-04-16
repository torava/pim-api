import { convertMeasure } from '@torava/pim-utils';
import AttributeShape from '@torava/pim-utils/dist/models/Attribute';
import CategoryAttributeShape from '@torava/pim-utils/dist/models/CategoryAttribute';
import ProductAttributeShape from '@torava/pim-utils/dist/models/ProductAttribute';

export const getAttributeValues = (
  unit: CategoryAttributeShape['unit'],
  measure: number = 0,
  quantity: number = 1,
  price: number = 0,
  attributeValues: ProductAttributeShape[] | CategoryAttributeShape[] = [],
  attributes: AttributeShape[] = []
) => {
  const result: [number, CategoryAttributeShape][] = [];
  for (const categoryAttribute of attributeValues) {
    const foundAttributes = attributes.filter((a) => a.id === categoryAttribute.attributeId);
    foundAttributes.forEach(() => {
      const perUnit = categoryAttribute?.unit?.split('/')?.[1];

      let value = 0;
      const rate = 1;

      if (perUnit === 'EUR' && !isNaN(price as number)) {
        value = rate * (categoryAttribute.value || 0);
      } else if (perUnit && perUnit.match(/l|g$/i)) {
        value = rate * (categoryAttribute?.value || 0) * convertMeasure(measure, unit, perUnit) * quantity;
      } else if (!unit || !perUnit) {
        value = rate * (categoryAttribute?.value || 0) * quantity;
      }
      if (!isNaN(value as number)) {
        result.push([value, categoryAttribute]);
      }
    });
  }
  return result;
};

export const getMinAttributeValue = (
  attributeResult: [number, CategoryAttributeShape][]
): [number?, CategoryAttributeShape?] =>
  attributeResult.reduce((a, b) => (a[0] < b[0] ? a : b)) || [undefined, undefined];
export const getMaxAttributeValue = (
  attributeResult: [number, CategoryAttributeShape][]
): [number?, CategoryAttributeShape?] =>
  attributeResult.reduce((a, b) => (a[0] > b[0] ? a : b)) || [undefined, undefined];
