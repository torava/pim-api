import { locale } from "../client/components/locale";
import config from "../config/default";
import { convertMeasure } from "./entities";

export const getAttributeValues = (unit, measure, quantity = 1, price = undefined, attributeValues = [], attributes = []) => {
  const result = [];
  for (const categoryAttribute of attributeValues) {
    const foundAttributes = attributes.filter(a => a.id === categoryAttribute.attributeId);
    foundAttributes.forEach(attribute => {
      const perUnit = categoryAttribute?.unit?.split('/')?.[1];
      
      let value,
          rate = 1;
      
      const currentAttributeUnit = locale.getAttributeUnit(attribute?.name['en-US']);

      if (currentAttributeUnit) {
        rate = config.unitConversionRates[categoryAttribute.unit]?.[currentAttributeUnit] || 1;
      }
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

export const getMinAttributeValue = (attributeResult) => attributeResult.reduce((a, b) => a[0] < b[0] ? a : b) || [undefined, undefined];
export const getMaxAttributeValue = (attributeResult) => attributeResult.reduce((a, b) => a[0] > b[0] ? a : b) || [undefined, undefined];
