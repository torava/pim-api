import { getAttributeValues, getMaxAttributeValue, getMinAttributeValue } from "./attributes";
import { getCategoriesWithAttributes } from "./categories";
import { convertMeasure } from "./entities";

export const resolveProductAttributes = (product, attributeIds, foodUnitAttribute, categories = [], attributes = []) => {
  let measure,
      productAttributes = [];
  if (foodUnitAttribute) {
    attributeIds.forEach(attributeId => {
      let minValue = 0,
          maxValue = 0,
          unit;
      product.contributions.forEach(productContribution => {
        const contribution = categories.find(category => category.id === productContribution.contributionId);
        const portionAttribute = contribution.attributes.find(a => a.attribute.id === foodUnitAttribute.id);
        if (!portionAttribute) {
          return true;
        }

        const result = getCategoriesWithAttributes(categories, contribution.id, Number(attributeId));
        const [, categoryAttributes] = result?.[0] || [undefined, undefined];
        const attributeResult = getAttributeValues(portionAttribute.unit, portionAttribute.value, 1, undefined, categoryAttributes, attributes);
        if (attributeResult.length) {
          const [minAttributeValue, minCategoryAttribute] = getMinAttributeValue(attributeResult);
          const [maxAttributeValue] = getMaxAttributeValue(attributeResult);
          minValue+= minAttributeValue || 0;
          maxValue+= maxAttributeValue || 0;
          unit = minCategoryAttribute.unit.split('/')[0];
        }

        if (!minValue && !maxValue && contribution.contributions?.length) {
          const totalAmount = contribution.contributions.reduce((previousValue, currentValue) => previousValue.amount+currentValue.amount, 0);
          contribution.contributions.forEach(contributionContribution => {
            const result = getCategoriesWithAttributes(categories, contributionContribution.contributionId, Number(attributeId));
            const [, categoryAttributes] = result?.[0] || [undefined, undefined];
            const attributeResult = getAttributeValues(portionAttribute.unit, portionAttribute.value*contributionContribution.amount/totalAmount, 1, undefined, categoryAttributes, attributes);
            if (attributeResult.length) {
              const [minAttributeValue, minCategoryAttribute] = getMinAttributeValue(attributeResult);
              const [maxAttributeValue] = getMaxAttributeValue(attributeResult);
              minValue+= minAttributeValue || 0;
              maxValue+= maxAttributeValue || 0;
              unit = minCategoryAttribute.unit.split('/')[0];
            }
          });
        }
      });
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
  }
  return {productAttributes, measure};
};
