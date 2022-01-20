import moment from "moment";
import stringSimilarity from "string-similarity-js";

import { stripDetails, stripName } from "./transactions";
import Category, { CategoryShape } from "../models/Category";
import Manufacturer from "../models/Manufacturer";
import Product, { ProductPartialShape, ProductShape } from "../models/Product";
import { getAttributeValues, getMaxAttributeValue, getMinAttributeValue } from "./attributes";
import { getCategoriesWithAttributes } from "./categories";
import { convertMeasure } from "./entities";
import { LevenshteinDistance } from './levenshteinDistance';
import { AttributeShape } from "../models/Attribute";
import { CategoryContributionShape } from "../models/CategoryContribution";
import { ProductAttributePartialShape } from "../models/ProductAttribute";
import { NameTranslations, ObjectEntries, Token } from "./types";
import { ProductContributionPartialShape } from "../models/ProductContribution";

export const getProductCategoryMinMaxAttributes = (
  category?: CategoryShape,
  contribution?: ProductContributionPartialShape,
  product?: ProductPartialShape,
  foodUnitAttribute?: AttributeShape,
  attributeId?: AttributeShape['id'],
  categories: CategoryShape[] = [],
  productAttributes: ProductAttributePartialShape[] = [],
  attributes: AttributeShape[] = []
) => {
  let unit: CategoryContributionShape['unit'] | ProductShape['unit'],
      measure: CategoryContributionShape['amount'] | ProductShape['measure'],
      portionAttribute;

  if (!category) return;
  
  if (foodUnitAttribute) {
    portionAttribute = category.attributes.find(a => a.attributeId === foodUnitAttribute.id);
  }
  if (contribution?.amount) {
    measure = contribution.amount;
    unit = contribution.unit;
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
    const totalAmount = category.contributions.reduce((previousValue, currentValue) => {
      return previousValue+currentValue.amount;
    }, 0);
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

export const resolveProductAttributes = (
  product: ProductPartialShape,
  attributeIds: AttributeShape['id'][],
  foodUnitAttribute: AttributeShape,
  categories: CategoryShape[] = [],
  attributes: AttributeShape[] = []
) => {
  let measure,
      productAttributes: ProductAttributePartialShape[] = [];

  const category = categories.find(c => c.id === product.categoryId);
  attributeIds.forEach(attributeId => {
    let minValue = 0,
        maxValue = 0,
        unit,
        initialProductAttributes = product.attributes?.filter(productAttribute => productAttribute.attributeId === attributeId);
    
    product.contributions?.forEach(productContribution => {
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

  measure = product.contributions?.reduce((total, productContribution) => {
    console.log('productContribution', productContribution, convertMeasure(productContribution.amount, productContribution.unit, 'kg'));
    if (foodUnitAttribute) {
      const contribution = categories.find(category => category.id === productContribution.contributionId);
      if (contribution) {
        const portionAttribute = contribution.attributes.find(a => a.attributeId === foodUnitAttribute.id);
        return total+convertMeasure(portionAttribute?.value, portionAttribute?.unit, 'kg');
      }
    } else if (productContribution.amount) {
      return total+convertMeasure(productContribution.amount, productContribution.unit, 'kg');
    }
  }, 0);

  if (category && foodUnitAttribute) {
    const portionAttribute = category.attributes.find(a => a.attributeId === foodUnitAttribute.id);
    measure = convertMeasure(portionAttribute?.value, portionAttribute?.unit, 'kg');
  }

  return {productAttributes, measure};
};

export const getClosestProduct = (name: Product['name'], products: Product[]): [
  Product?,
  Token?
] => {
  if (!name) return [undefined, undefined];

  const strippedName = stripDetails(name);

  let bestToken: Token,
      bestProduct: Product;

  products.forEach((product) => {
    const {aliases} = product;
    const tokens: [Token, string][] = [];
    tokens.push([LevenshteinDistance(product.name.toLowerCase(), name.toLowerCase(), {search: true}) as Token, product.name.toLowerCase()]);
    tokens.push([LevenshteinDistance(product.name.toLowerCase(), strippedName.toLowerCase(), {search: true}) as Token, product.name.toLowerCase()]);
    aliases?.forEach(alias => {
      tokens.push([LevenshteinDistance(alias.toLowerCase(), name.toLowerCase(), {search: true}) as Token, alias.toLowerCase()]);
      tokens.push([LevenshteinDistance(alias.toLowerCase(), strippedName.toLowerCase(), {search: true}) as Token, alias.toLowerCase()]);
    });
    //tokens.push([LevenshteinDistance(category.parent?.name[locale]?.toLowerCase() || '', strippedName.toLowerCase(), {search: true}), category.parent?.name[locale]?.toLowerCase() || '']);

    let token: Token;
    tokens.forEach(comparableToken => {
      comparableToken[0].accuracy = (comparableToken[0].substring.length-comparableToken[0].distance)/name.length;
      if (comparableToken[0].distance < 1 && comparableToken[0].accuracy > 0.1 && comparableToken[0].accuracy >= (token ? token.accuracy : 0)) {
        token = comparableToken[0];
        console.log('name', name, 'product', product.name, 'token', comparableToken);
      }
    });

    if (token?.accuracy >= (bestToken ? bestToken.accuracy : 0)) {
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

export const getProductsFromOpenFoodFactsRecords = async (records: {
  quantity: string,
  brands: string,
  product_name: string
}[]) => {
  const categories = (await Category.query().withGraphFetched('attributes')) as (Category & {strippedName?: NameTranslations})[];
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
        ObjectEntries(category.strippedName).forEach(([locale, translation]) => {
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
