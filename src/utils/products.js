import moment from "moment";
import stringSimilarity from "string-similarity-js";

import { stripDetails, stripName } from "./transactions";
import Category from "../models/Category";
import Manufacturer from "../models/Manufacturer";
import Product from "../models/Product";
import { getAttributeValues, getMaxAttributeValue, getMinAttributeValue } from "./attributes";
import { getCategoriesWithAttributes } from "./categories";
import { convertMeasure } from "./entities";
import { LevenshteinDistance } from './levenshteinDistance';

export const getProductCategoryMinMaxAttributes = (category, contribution, product, foodUnitAttribute, attributeId, categories = [], productAttributes = [], attributes = []) => {
  let unit, measure, portionAttribute;
  
  if (foodUnitAttribute) {
    portionAttribute = category.attributes.find(a => a.attributeId === foodUnitAttribute.id);
  }
  if (contribution?.contribution?.amount) {
    measure = contribution.contribution.amount;
    unit = contribution.contribution.unit;
  } else if (portionAttribute) {
    measure = portionAttribute.value;
    unit = portionAttribute.unit;
  } else if (product?.measure) {
    measure = product.measure;
    unit = product.unit;
  } else {
    return;
  }
  
  let minAttributeValue, minCategoryAttribute, maxAttributeValue, maxCategoryAttribute;
  const result = getCategoriesWithAttributes(categories, category.id, Number(attributeId));
  const [, categoryAttributes] = result?.[0] || [undefined, undefined];
  let attributeResult = getAttributeValues(unit, measure, 1, undefined, productAttributes, attributes);
  if (!attributeResult.length) {
    attributeResult = getAttributeValues(unit, measure, 1, undefined, categoryAttributes, attributes);
  }
  if (attributeResult.length) {
    [minAttributeValue, minCategoryAttribute] = getMinAttributeValue(attributeResult);
    [maxAttributeValue, maxCategoryAttribute] = getMaxAttributeValue(attributeResult);
  }

  if (!minAttributeValue && !maxAttributeValue && category.contributions?.length) {
    const totalAmount = category.contributions.reduce((previousValue, currentValue) => previousValue.amount+currentValue.amount, 0);
    category.contributions.forEach(contributionContribution => {
      const result = getCategoriesWithAttributes(categories, contributionContribution.contributionId, Number(attributeId));
      const [, categoryAttributes] = result?.[0] || [undefined, undefined];
      let attributeResult = getAttributeValues(unit, measure*contributionContribution.amount/totalAmount, 1, undefined, productAttributes, attributes);
      if (!attributeResult.length) {
        attributeResult = getAttributeValues(unit, measure*contributionContribution.amount/totalAmount, 1, undefined, categoryAttributes, attributes);
      }
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

  const category = categories.find(c => c.id === product.categoryId);
  attributeIds.forEach(attributeId => {
    let minValue = 0,
        maxValue = 0,
        unit,
        initialProductAttributes = product.attributes?.filter(a => a.attributeId === attributeId);
    
    product.contributions.forEach(productContribution => {
      const contribution = categories.find(category => category.id === productContribution.contributionId);
      const result = getProductCategoryMinMaxAttributes(contribution, productContribution, undefined, foodUnitAttribute, attributeId, categories, initialProductAttributes, attributes);
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
      const result = getProductCategoryMinMaxAttributes(category, undefined, product, foodUnitAttribute, attributeId, categories, initialProductAttributes, attributes);
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

  if (foodUnitAttribute) {   
    measure = product.contributions.reduce((total, productContribution) => {
      const contribution = categories.find(category => category.id === productContribution.contributionId);
      const portionAttribute = contribution.attributes.find(a => a.attributeId === foodUnitAttribute.id);
      return total+convertMeasure(portionAttribute?.value, portionAttribute?.unit, 'kg');
    }, 0);

    if (category) {
      const portionAttribute = category.attributes.find(a => a.attributeId === foodUnitAttribute.id);
      measure = convertMeasure(portionAttribute?.value, portionAttribute?.unit, 'kg');
    }
  }

  return {productAttributes, measure};
};

export const getClosestProduct = (name, products) => {
  if (!name) return [undefined, undefined];

  const strippedName = stripDetails(name);

  let bestToken, bestProduct;

  products.forEach((product) => {
    const {aliases} = product;
    const tokens = [];
    tokens.push([LevenshteinDistance(product.name.toLowerCase(), name.toLowerCase(), {search: true}), product.name.toLowerCase()]);
    tokens.push([LevenshteinDistance(product.name.toLowerCase(), strippedName.toLowerCase(), {search: true}), product.name.toLowerCase()]);
    aliases?.forEach(alias => {
      tokens.push([LevenshteinDistance(alias.toLowerCase(), name.toLowerCase(), {search: true}), alias.toLowerCase()]);
      tokens.push([LevenshteinDistance(alias.toLowerCase(), strippedName.toLowerCase(), {search: true}), alias.toLowerCase()]);
    });
    //tokens.push([LevenshteinDistance(category.parent?.name[locale]?.toLowerCase() || '', strippedName.toLowerCase(), {search: true}), category.parent?.name[locale]?.toLowerCase() || '']);

    let token;
    tokens.forEach(t => {
      t[0].accuracy = (t[0].substring.length-t[0].distance)/name.length;
      if (t[0].distance < 1 && t[0].accuracy > 0.1 && t[0].accuracy >= (token ? token.accuracy : 0)) {
        token = t[0];
        console.log('name', name, 'product', product.name, 'token', t);
      }
    });

    if (token?.accuracy > (bestToken ? bestToken.accuracy : 0)) {
      bestProduct = product;
      bestToken = token;
    }
  });
  console.log(
    'closest product for',
    'name', name,
    'category name', bestProduct?.name,
    'token', bestToken
  );
  return bestToken?.substring.length ? [bestProduct, bestToken] : [undefined, undefined];
};

export const getProductsFromOpenFoodFactsRecords = async (records) => {
  const categories = await Category.query().withGraphFetched('attributes');
  const manufacturers = await Manufacturer.query();

  const strippedCategories = categories.filter(category => (
    category.attributes?.length ? true : false
  )).map(category => {
    const name = category.name;
    category.strippedName = stripName(name, manufacturers);
    return category;
  });

  let n = 0;

  for (const record of records) {
    const {
      quantity,
      brands,
      product_name
    } = record;
    const measureMatch = quantity.match(/([0-9]+)\s?([m|k]?[g|l])/);
    const measure = Number(measureMatch?.[1]);
    const unit = measureMatch?.[2];
    if (measure && unit && product_name !== '') {

      const brand = brands.split(',')[0];

      const productNameWithBrand = `${brand} ${product_name}`;
      const strippedProductName = stripDetails(product_name);

      let bestDistance = 0.4,
          categoryId;
      strippedCategories.forEach((category) => {
        Object.entries(category.strippedName).forEach(([locale, translation]) => {
          if (translation) {
            let distance = stringSimilarity(strippedProductName.toLowerCase() || '', translation.toLowerCase() || '');
            distance = Math.max(distance, stringSimilarity(productNameWithBrand.toLowerCase() || '', category.name[locale].toLowerCase() || '')+0.1);
            category.aliases?.forEach(alias => {
              distance = Math.max(distance, stringSimilarity(strippedProductName.toLowerCase() || '', alias.toLowerCase() || '')+0.1);
              distance = Math.max(distance, stringSimilarity(productNameWithBrand.toLowerCase() || '', alias.toLowerCase() || '')+0.1);
            });
            if (category.parent) {
              distance = Math.max(distance, stringSimilarity(strippedProductName || '', category.parent.name[locale] || ''));
            }

            if (distance > bestDistance) {
              bestDistance = distance;
              categoryId = category.id;
            }
          }
        });
      });

      await Product.query().insert({
        name: productNameWithBrand,
        measure,
        unit,
        categoryId
      });
      n++;
    }
  }

  console.log('added', n, 'products', moment().format());
};
