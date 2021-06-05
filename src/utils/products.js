import { getAttributeValues, getMaxAttributeValue, getMinAttributeValue } from "./attributes";
import { getCategoriesWithAttributes } from "./categories";
import { convertMeasure } from "./entities";

export const getProductCategoryMinMaxAttributes = (category, foodUnitAttribute, attributeId, categories = [], attributes = []) => {
  const portionAttribute = category.attributes.find(a => a.attribute.id === foodUnitAttribute.id);
  if (!portionAttribute) {
    return;
  }
  let minAttributeValue, minCategoryAttribute, maxAttributeValue, maxCategoryAttribute;
  const result = getCategoriesWithAttributes(categories, category.id, Number(attributeId));
  const [, categoryAttributes] = result?.[0] || [undefined, undefined];
  const attributeResult = getAttributeValues(portionAttribute.unit, portionAttribute.value, 1, undefined, categoryAttributes, attributes);
  if (attributeResult.length) {
    [minAttributeValue, minCategoryAttribute] = getMinAttributeValue(attributeResult);
    [maxAttributeValue, maxCategoryAttribute] = getMaxAttributeValue(attributeResult);
  }

  if (!minAttributeValue && !maxAttributeValue && category.contributions?.length) {
    const totalAmount = category.contributions.reduce((previousValue, currentValue) => previousValue.amount+currentValue.amount, 0);
    category.contributions.forEach(contributionContribution => {
      const result = getCategoriesWithAttributes(categories, contributionContribution.contributionId, Number(attributeId));
      const [, categoryAttributes] = result?.[0] || [undefined, undefined];
      const attributeResult = getAttributeValues(portionAttribute.unit, portionAttribute.value*contributionContribution.amount/totalAmount, 1, undefined, categoryAttributes, attributes);
      if (attributeResult.length) {
        [minAttributeValue, minCategoryAttribute] = getMinAttributeValue(attributeResult);
        [maxAttributeValue, maxCategoryAttribute] = getMaxAttributeValue(attributeResult);
      }
    });
  }
  return {minAttributeValue, minCategoryAttribute, maxAttributeValue, maxCategoryAttribute};
};

export const resolveProductAttributes = (product, attributeIds, foodUnitAttribute, categories = [], attributes = []) => {
  let measure,
      productAttributes = [];
  if (foodUnitAttribute) {
    const category = categories.find(c => c.id === product.categoryId);
    attributeIds.forEach(attributeId => {
      let minValue = 0,
          maxValue = 0,
          unit;
      
      product.contributions.forEach(productContribution => {
        const contribution = categories.find(category => category.id === productContribution.contributionId);
        const result = getProductCategoryMinMaxAttributes(contribution, foodUnitAttribute, attributeId, categories, attributes);
        if (result?.minCategoryAttribute) {
          const {minAttributeValue, minCategoryAttribute, maxAttributeValue} = result;
          minValue+= minAttributeValue || 0;
          maxValue+= maxAttributeValue || 0;
          unit = minCategoryAttribute.unit.split('/')[0];
        } else {
          return true;
        }
      });

      if (category) {
        const result = getProductCategoryMinMaxAttributes(category, foodUnitAttribute, attributeId, categories, attributes);
        if (result?.minCategoryAttribute) {
          const {minCategoryAttribute} = result;
          minValue = result.minAttributeValue;
          maxValue = result.maxAttributeValue;
          unit = minCategoryAttribute.unit.split('/')[0];
        }
      }
      
      const attribute = attributes.find(a => a.id === attributeId);
      if (minValue === maxValue) {
        productAttributes.push({
          value: minValue,
          unit,
          attribute
        });
      } else {
        productAttributes.push({
          value: minValue,
          type: 'MIN_VALUE',
          unit,
          attribute
        });
        productAttributes.push({
          value: maxValue,
          type: 'MAX_VALUE',
          unit,
          attribute
        });
      }
    });

    measure = product.contributions.reduce((total, productContribution) => {
      const contribution = categories.find(category => category.id === productContribution.contributionId);
      const portionAttribute = contribution.attributes.find(a => a.attribute.id === foodUnitAttribute.id);
      return total+convertMeasure(portionAttribute?.value, portionAttribute?.unit, 'kg');
    }, 0);

    if (category) {
      const portionAttribute = category.attributes.find(a => a.attribute.id === foodUnitAttribute.id);
      measure = convertMeasure(portionAttribute?.value, portionAttribute?.unit, 'kg');
    }
  }
  return {productAttributes, measure};
};
