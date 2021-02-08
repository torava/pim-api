import { convertMeasure } from "./entities";

export const getItemNameByDepth = (item, depth) => {
  let name,
      id = false;
  if (!item || !item.product) {
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

export const getItemAttributeValue = (item, attribute) => {
  const quantity = getItemQuantity(item);
  const measure = convertMeasure(getItemMeasure(item), unit, 'kg');
  const unit = getItemUnit(item);
  
  let value;
  if (!unit) {
    value = attribute?.value*quantity || undefined;  
  } else {
    value = attribute?.value*measure*(quantity || 1) || undefined;
  }
  return value;
};

export const getItemQuantity = item => item.quantity || item.product.quantity;
export const getItemMeasure = item => item.measure || item.product.measure;
export const getItemUnit = item => item.unit || item.product.unit;
