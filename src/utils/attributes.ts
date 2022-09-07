import AttributeShape from "@torava/product-utils/dist/models/Attribute";
import CategoryAttributeShape from "@torava/product-utils/dist/models/CategoryAttribute";
import ProductAttributeShape from "@torava/product-utils/dist/models/ProductAttribute";

import { convertMeasure } from "./entities";

export const getAttributeValues = (
  unit: CategoryAttributeShape['unit'],
  measure: number,
  quantity: number = 1,
  price: number = undefined,
  attributeValues: ProductAttributeShape[] | CategoryAttributeShape[] = [],
  attributes: AttributeShape[] = []
) => {
  const result: [number, CategoryAttributeShape][] = [];
  for (const categoryAttribute of attributeValues) {
    const foundAttributes = attributes.filter(a => a.id === categoryAttribute.attributeId);
    foundAttributes.forEach(() => {
      const perUnit = categoryAttribute?.unit?.split('/')?.[1];
      
      let value,
          rate = 1;

      if (perUnit === 'EUR' && !isNaN(price)) {
        value = rate*categoryAttribute.value;
      } else if (perUnit && perUnit.match(/l|g$/i)) {
        value = rate*categoryAttribute?.value*convertMeasure(measure, unit, perUnit)*quantity;
      } else if (!unit || !perUnit) {
        value = rate*categoryAttribute?.value*quantity;
      }
      if (!isNaN(value)) {
        result.push([value, categoryAttribute]);
      }
    });
  }
  return result;
};

export const getMinAttributeValue = (attributeResult: [number, CategoryAttributeShape][]): [number?, CategoryAttributeShape?] => (
  attributeResult.reduce((a, b) => a[0] < b[0] ? a : b) || [undefined, undefined]
);
export const getMaxAttributeValue = (attributeResult: [number, CategoryAttributeShape][]): [number?, CategoryAttributeShape?] => (
  attributeResult.reduce((a, b) => a[0] > b[0] ? a : b) || [undefined, undefined]
);
