import { locale } from "../client/components/locale";
import { convertMeasure } from "./entities";
import config from '../config/default';

export const getItemNameByDepth = (item, depth) => {
  let name,
      id = false;
  if (!item || !item.product) {
    id = 0;
    name = 'Uncategorized';
    return {id, name};
  }
  if (depth > 2) {
    let current_depth, child = false;
    if (item.product.category) {
      //child = item.product.category;
      if (item.product.category.parent) {
        current_depth = depth-2;
        child = item.product.category.parent;
        while (current_depth > 0) {
          if (child && child.parent) {
            child = child.parent;
            current_depth-= 1;
          }
          else {
            //child = false;
            break;
          }
        }
      }
    }
    if (child) {
      id = 'c'+child.id;
      name = child.name;
    }
  }
  if ((!id || depth == 2) && item.product.category && item.product.category.parent) {
    id = 'c'+item.product.category.parent.id;
    name = item.product.category.parent.name;
  }
  if ((!id || depth == 1) && item.product.category) {
    id = 'c'+item.product.category.id;
    name = item.product.category.name;
  }
  if (depth == 0) {
    id = 'p'+item.product.id;
    name = item.product.name;
  }
  if (id === false) {
    id = 0;
    name = 'Uncategorized';
  }
  return {id, name};
};

export const getAttributeValues = (unit, measure, quantity = 1, price = undefined, categoryAttributes = [], attributes = []) => {
  const result = [];
  for (const categoryAttribute of categoryAttributes) {
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
      } else if (perUnit && ['l', 'g'].includes(perUnit.substring(1))) {
        value = rate*categoryAttribute?.value*convertMeasure(measure, unit, perUnit)*quantity;
      } else if (!unit) {
        value = rate*categoryAttribute?.value*quantity;
      }
      if (!isNaN(value)) {
        result.push([value, categoryAttribute]);
      }
    });
  }
  return result;
};

export const getItemAttributeValue = (item, categoryAttributes = [], attributes = []) => {
  const quantity = getItemQuantity(item) || 1;
  const unit = getItemUnit(item);
  const measure = convertMeasure(getItemMeasure(item), unit, 'kg');

  return getAttributeValues(unit, measure, quantity, item.price, categoryAttributes, attributes)?.[0];
};

export const findItemCategoryAttributeValue = (item, category, attributeId) => {
  let value, attribute;
  Object.values(category?.attributes || {}).forEach(currentAttribute => {
    if (currentAttribute.attributeId === attributeId) {
      const currentValue = getItemAttributeValue(item, currentAttribute);
      
      if (typeof currentValue !== 'undefined') {
        value = currentValue;
        attribute = currentAttribute;
        return false;
      }
    }
  });
  return [value, attribute];
};

export const getItemQuantity = item => item.quantity || item.product.quantity;
export const getItemMeasure = item => item.measure || item.product.measure;
export const getItemUnit = item => item.unit || item.product.unit;
