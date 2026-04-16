import _ from 'lodash';
import moment from 'moment';
import { convertMeasure, getTranslation, Locale, measureRegExp, NameTranslations } from '@torava/pim-utils';
import AttributeShape from '@torava/pim-utils/dist/models/Attribute';
import BrandShape from '@torava/pim-utils/dist/models/Brand';
import CategoryShape from '@torava/pim-utils/dist/models/Category';
import CategoryAttributeShape from '@torava/pim-utils/dist/models/CategoryAttribute';
import CategoryContributionShape from '@torava/pim-utils/dist/models/CategoryContribution';
import ItemShape from '@torava/pim-utils/dist/models/Item';
import ProductShape from '@torava/pim-utils/dist/models/Product';
import SourceShape from '@torava/pim-utils/dist/models/Source';

import Attribute from '../models/Attribute';
import Category from '../models/Category';
import Source from '../models/Source';
import { ObjectEntries, Token } from './types';
import { getAttributeValues, getMinAttributeValue, getMaxAttributeValue } from './attributes';
import { getDetails, stripDetails, stripName } from './transactions';
import { LevenshteinDistance } from './levenshteinDistance';

export const getCategoryById = (categories: CategoryShape[], categoryId: CategoryShape['id']) => (
  categories.find(c => c.id === categoryId)
);

export const getCategoryAttributes = (category?: CategoryShape, attributeId?: CategoryAttributeShape['id']) => (
  Object.values(category?.attributes || {}).filter(attribute => attribute.attributeId === attributeId)
);

export const getCategoryWithAttributes = (
  categories: CategoryShape[],
  categoryId: CategoryShape['id'],
  attributeId: CategoryAttributeShape['id']
): [
  CategoryShape | undefined,
  CategoryAttributeShape[]
] | undefined => {
  if (!categories.length || !categoryId || !attributeId) return;

  const category = getCategoryById(categories, categoryId);
  const attributes = getCategoryAttributes(category, attributeId);

  if (attributes.length) {
    return [category, attributes];
  } else {
    const result = getCategoryWithAttributes(categories, category?.parentId, attributeId);
    if (result) {
      const [parentCategory, parentAttributes] = result;
      return [parentCategory, parentAttributes];
    }
  }
};

export const getCategoriesWithAttributes = (
  categories: CategoryShape[],
  categoryId: CategoryShape['id'],
  attributeId: CategoryAttributeShape['id']
) => {
  if (!categoryId) return;

  const results: [CategoryShape | undefined, CategoryAttributeShape[]][] = [];
  
  const result = getCategoryWithAttributes(categories, categoryId, attributeId);
  if (result) {
    let [populatedCategory, attributes] = result;
    results.push([populatedCategory, attributes]);
    while (attributes?.length) {
      const result = getCategoryWithAttributes(categories, populatedCategory?.parentId, attributeId);
      if (result) {
        [populatedCategory, attributes] = result;
        results.push([populatedCategory, attributes]);
      } else {
        attributes = [];
      }
    }
  }
  return results;
};

export function resolveCategories(items: CategoryShape[], locale: Locale) {
  if (!locale) return;
  let itemAttributes: CategoryAttributeShape[],
      resolvedAttributes: {[key: number]: CategoryAttributeShape},
      item;
  for (const i in items) {
    item = items[i];
    resolvedAttributes = {};
    itemAttributes = item.attributes || [];
    for (const n in itemAttributes) {
      if (itemAttributes[n].attribute) {
        itemAttributes[n].attribute.name = getTranslation(itemAttributes[n].attribute.name, locale);

        let parent = itemAttributes[n].attribute.parent;
        while (parent) {
          parent.name = getTranslation(parent.name, locale);
          parent = parent.parent;
        }
      }
      if (itemAttributes[n].attributeId) {
        resolvedAttributes[itemAttributes[n].attributeId] = itemAttributes[n];
      }
    }
    item.attributes = Object.values(resolvedAttributes);
    if (item.children) {
      resolveCategories(item.children, locale);
    }
    item.name = getTranslation(item.name, locale);

    let parent = item.parent;
    while (parent) {
      parent.name = getTranslation(parent.name, locale);
      parent = parent.parent;
    }
  }
}

export const resolveCategoryPrices = (categories: (CategoryShape & {
  priceSum?: number
})[]) => {
  categories && categories.reduce(function resolver(sum, category): number {
    if (category.products?.length) {
      let itemPrices = 0;
      category.products.map(product => {
        product.items?.map(item => {
          itemPrices+= item.price || 0;
        });
      });
      category.priceSum = (category.priceSum || 0)+itemPrices; 
    }
    if (category.children?.length) {
      category.priceSum = (category.priceSum || 0)+category.children.reduce(resolver, 0);
    }
    return sum+(category.priceSum || 0);
  }, 0);
};

export const resolveCategoryContributionPrices = (
  category: CategoryShape,
  products: ProductShape[] = [],
  items: ItemShape[] = [],
  foodUnitAttribute: AttributeShape,
  contributionCoverageThreshold = 0) => {
  let categoryContributionCoverageMeasure = 0;
    
  const portionAttribute = category.attributes?.find(a => a.attributeId === foodUnitAttribute.id);
  const portionMeasure = convertMeasure(portionAttribute?.value, portionAttribute?.unit, 'kg');

  let totalMeasure = 0;
  
  const sum = category?.contributions?.reduce(function resolver(sum, categoryContribution) {
    console.log('categoryContribution', categoryContribution);
    const convertedAmount = convertMeasure(categoryContribution.amount, categoryContribution.unit, 'kg');
    totalMeasure+= categoryContribution.contribution?.contributions?.length ? 0 : convertedAmount;
    products.every(product => {
      if (product.categoryId === categoryContribution.contributionId) {
        const productItem = items.find(item => {
          if (item.productId === product.id) {
            if (item?.price && (item.measure || product.measure) && (item.unit || product.unit)) {
              console.log('item, product', item, product);
              const itemAmount = convertMeasure(item.measure || product.measure, item.unit || product.unit, 'kg');
              const amountPrice = item.price/itemAmount*convertedAmount;
              console.log('amountPrice', amountPrice);
              sum+= amountPrice;
              categoryContributionCoverageMeasure+= convertedAmount;
              return true;
            }
          }
        });
        return productItem ? false : true;
      }
      return true;
    });
    if (categoryContribution.contribution?.contributions?.length) {
      sum+= categoryContribution.contribution.contributions.reduce(resolver, 0);
    }
    return sum;
  }, 0);
  console.log(
    'categoryContributionCoverageMeasure, totalMeasure, contributionCoverageThreshold',
    categoryContributionCoverageMeasure,
    totalMeasure,
    contributionCoverageThreshold
  );
  return categoryContributionCoverageMeasure/totalMeasure > contributionCoverageThreshold ? (sum || 0) * portionMeasure : undefined;
};

export const getStrippedCategories = (categories: (CategoryShape & {
  strippedName?: NameTranslations
})[], brands: BrandShape[] = []) => {
  return categories.map(category => {
    const name = category.name;
    category.strippedName = name && stripName(name, brands);
    return category;
  });
};

export const getClosestCategory = (
  name: string,
  categories: (CategoryShape & {
    strippedName?: NameTranslations
  })[],
  acceptLocale?: Locale,
  strippedName?: string
): [
  CategoryShape | undefined,
  Token | undefined
] => {
  if (!name) return [undefined, undefined];

  if (!strippedName) strippedName = stripDetails(name);

  let bestToken!: Token, bestCategory!: CategoryShape;

  categories.forEach((category) => {
    Object.entries(category.strippedName || {}).forEach(([locale, translation]) => {
      if (acceptLocale && locale !== acceptLocale) return true;
      if (translation) {
        const tokens: [Token, string, number?][] = [];
        tokens.push([LevenshteinDistance(translation.toLowerCase(), strippedName.toLowerCase(), {search: true}) as Token, translation.toLowerCase(), 0.1]);
        tokens.push([
          LevenshteinDistance(category.name?.[locale as Locale]?.toLowerCase() || '',
          name.toLowerCase(), {search: true}) as Token, category.name?.[locale as Locale]?.toLowerCase() || ''
        ]);
        category.aliases?.forEach(alias => {
          tokens.push([LevenshteinDistance(alias.toLowerCase(), strippedName.toLowerCase(), {search: true}) as Token, alias.toLowerCase(), 0.1]);
          tokens.push([LevenshteinDistance(alias.toLowerCase(), name.toLowerCase(), {search: true}) as Token, alias.toLowerCase()]);
        });

        let token!: Token;
        tokens.forEach(t => {
          t[0].accuracy = (t[0].substring.length-t[0].distance-(t[2] || 0))/name.length;
          if (t[0].distance < 1 && t[0].accuracy > 0.1 && t[0].accuracy >= (token?.accuracy || 0)) {
            token = t[0];
          }
        });

        if (token?.accuracy && token.accuracy > (bestToken?.accuracy || 0)) {
          bestCategory = category;
          bestToken = token;
        }
      }
    });
  });
  console.log(
    'closest category',
    'name', name,
    'stripped name', strippedName,
    'category name', bestCategory?.name,
    'token', bestToken
  );
  return bestToken?.substring.length ? [bestCategory, bestToken] : [undefined, undefined];
};

export const findMeasure = (text?: string) => {
  let measure = undefined,
      unit = undefined;
  if (text) {
    const measureMatch = text.match(measureRegExp);
    measure = measureMatch && parseFloat(measureMatch[1].replace(',', '.'));
    if (measure && !isNaN(measure)) {
      if (measureMatch?.[4]) {
        unit = 'kg';
      }
      else if (measureMatch?.[5]) {
        unit = 'g';
      }
      else if (measureMatch?.[6]) {
        unit = 'l';
      }
    }
  }
  return {measure, unit};
};

export const findFoodUnitAttribute = (text?: string, attributes: AttributeShape[] = []) => {
  let foodUnitAttribute: AttributeShape | undefined;
  if (text) {
    const {size} = getDetails();
    Object.entries(size).forEach(([code, details]) => {
      if (details.some(detail => text.match(detail))) {
        foodUnitAttribute = attributes.find(attribute => attribute.code === code);
      }
    });
  }
  return foodUnitAttribute;
};

export const getTokensFromContributionList = (list: string) => (
  list?.replace(/[([][^)\]]*[)\]]|\./g, '')
  .replace(/\s{2,}/g, ' ')
  .trim()
  .split(/,\s|\sja\s|\sand\s|\soch\s|\s?&\s?/gi)
);

export const getContributionsFromList = (
  list: string,
  contentLanguage: Locale | undefined,
  categories: CategoryShape[] = [],
  attributes: AttributeShape[] = []
) => {
  const tokens = getTokensFromContributionList(list);
  const contributions: CategoryContributionShape[] = [];
  tokens?.forEach(contributionToken => {
    const measureMatch = contributionToken.match(measureRegExp);
    const measure = measureMatch && parseFloat(measureMatch[1]);
    let foodUnitAttribute: AttributeShape | undefined;
    let unit;
    if (measure && !isNaN(measure)) {
      if (measureMatch[4]) {
        unit = 'kg';
      }
      else if (measureMatch[5]) {
        unit = 'g';
      }
      else if (measureMatch[6]) {
        unit = 'l';
      }
    }
    const {size} = getDetails();
    Object.entries(size).forEach(([code, details]) => {
      if (details.some(detail => contributionToken.match(detail))) {
        foodUnitAttribute = attributes.find(attribute => attribute.code === code);
      }
    });
    let strippedContributionToken = stripDetails(contributionToken);
    let [contributionContribution, token] = getClosestCategory(contributionToken, categories, contentLanguage, strippedContributionToken);
    let contribution: CategoryContributionShape = {
      contribution: contributionContribution,
      contributionId: contributionContribution?.id
    };
    if (contribution.contribution) {
      if (foodUnitAttribute) {
        const {value, unit} = contribution.contribution.attributes?.find(attribute => attribute.attributeId === foodUnitAttribute?.id) || {};
        if (value) {
          contribution.amount = value;
          contribution.unit = unit;
        }
      } else if (measure) {
        contribution.amount = measure;
        contribution.unit = unit;
      }
    }
    if (contributionToken.split(' ').length > 2) {
      while (contributionContribution && contributionToken && strippedContributionToken) {
        contributionToken = contributionToken.replace(new RegExp(token?.substring || '', 'i'), '').trim();
        strippedContributionToken = stripDetails(contributionToken).replace(new RegExp(token?.substring || '', 'i'), '').trim();
        contributions.push(contribution);
        [contributionContribution, token] = getClosestCategory(contributionToken, categories, contentLanguage);
        contribution = {
          contribution: contributionContribution,
          contributionId: contributionContribution?.id
        };
        if (contribution) {
          if (foodUnitAttribute) {
            const {value, unit} = contribution.contribution?.attributes?.find(attribute =>
              attribute.attributeId === foodUnitAttribute?.id
            ) || {};
            if (value) {
              contribution.amount = value;
              contribution.unit = unit;
            }
          } else if (measure) {
            contribution.amount = measure;
            contribution.unit = unit;
          }
        }
      }
    } else if (contribution.contribution) {
      contributions.push(contribution);
    }
  });
  return contributions;
};

export const getStrippedChildCategories = async (categories: CategoryShape[] = [], brands: BrandShape[] = []) => {
  //const categories = (await CategoryShape.query()
  //.withGraphFetched('[contributions, children, attributes]'));

  const childCategories = categories.filter(category => !category.children?.length);
  //const manufacturers = await ManufacturerShape.query();
  const strippedCategories = getStrippedCategories(childCategories, brands);

  return strippedCategories;
};

export const getCategoryMinMaxAttributesWithMeasure = (
  category: CategoryShape | undefined,
  measure: CategoryContributionShape['amount'],
  unit: CategoryContributionShape['unit'],
  attributeId: AttributeShape['id'],
  categories: CategoryShape[] = [],
  categoryOwnAttributes: CategoryAttributeShape[] = [],
  attributes: AttributeShape[] = []
) => {
  let minAttributeValue, minCategoryAttribute, maxAttributeValue, maxCategoryAttribute;
  const result = getCategoriesWithAttributes(categories, category?.id, attributeId);
  const [, categoryAttributes] = result?.[0] || [undefined, undefined];
  let attributeResult = getAttributeValues(unit, measure, 1, undefined, categoryOwnAttributes, attributes);
  if (!attributeResult.length) {
    attributeResult = getAttributeValues(unit, measure, 1, undefined, categoryAttributes, attributes);
  }
  if (attributeResult.length) {
    [minAttributeValue, minCategoryAttribute] = getMinAttributeValue(attributeResult);
    [maxAttributeValue, maxCategoryAttribute] = getMaxAttributeValue(attributeResult);
  }
  if (!minAttributeValue && !maxAttributeValue && category?.contributions?.length) {
    category.contributions.forEach(contributionContribution => {
      const result = getCategoriesWithAttributes(categories, contributionContribution.contributionId, Number(attributeId));
      const [, categoryAttributes] = result?.[0] || [undefined, undefined];
      let attributeResult = getAttributeValues(unit, measure, 1, undefined, categoryOwnAttributes, attributes);
      if (!attributeResult.length) {
        attributeResult = getAttributeValues(unit, measure, 1, undefined, categoryAttributes, attributes);
      }
      if (attributeResult.length) {
        [minAttributeValue, minCategoryAttribute] = getMinAttributeValue(attributeResult);
        [maxAttributeValue, maxCategoryAttribute] = getMaxAttributeValue(attributeResult);
      }
    });
  }
  return {minAttributeValue, minCategoryAttribute, maxAttributeValue, maxCategoryAttribute};
};

export const getCategoryMinMaxAttributes = (
  category: CategoryShape | undefined,
  contribution: CategoryContributionShape | undefined,
  foodUnitAttribute: AttributeShape,
  attributeId: AttributeShape['id'],
  categories: CategoryShape[] = [],
  categoryOwnAttributes: CategoryAttributeShape[] = [],
  attributes: AttributeShape[] = []
) => {
  let unit: CategoryContributionShape['unit'],
      measure: CategoryContributionShape['amount'],
      portionAttribute;
  
  if (foodUnitAttribute) {
    portionAttribute = category?.attributes?.find(a => a.attributeId === foodUnitAttribute.id);
  }
  if (contribution?.amount) {
    measure = contribution.amount;
    unit = contribution.unit;
  } else if (portionAttribute) {
    measure = portionAttribute.value;
    unit = portionAttribute.unit;
  } else {
    return;
  }
  
  return getCategoryMinMaxAttributesWithMeasure(category, measure, unit, attributeId, categories, categoryOwnAttributes, attributes);
};

export const getCategoryPortion = (
  category?: CategoryShape,
  foodUnitAttribute?: AttributeShape,
) => category?.attributes?.find(a => a.attributeId === foodUnitAttribute?.id);

export const getCategoryPortionMeasure = (
  category?: CategoryShape,
  foodUnitAttribute?: AttributeShape,
) => {
  const portionAttribute = getCategoryPortion(category, foodUnitAttribute);
  return convertMeasure(portionAttribute?.value, portionAttribute?.unit, 'kg');
};

export const getCategoryMeasure = (
  category: CategoryShape,
  foodUnitAttribute: AttributeShape,
  categories: CategoryShape[] = [],
) => {
  if (foodUnitAttribute) {   
    if (category.attributes) {
      return getCategoryPortionMeasure(category, foodUnitAttribute);
    } else {
      return category.contributions?.reduce((total, productContribution) => {
        const contribution = categories.find(category => category.id === productContribution.contributionId);
        return total+getCategoryPortionMeasure(contribution, foodUnitAttribute);
      }, 0);
    }
  }
};

export const getCategoryPrice = (
  category: CategoryShape,
  measure: number = 0,
  amount: number,
  foodUnitAttribute: AttributeShape,
  products: ProductShape[],
  items: ItemShape[]
) => {
  const categoryProduct = products.find(
    (product) =>
      product.categoryId === category.id &&
      product.items?.length &&
      product.items.some((item) => item.price && ((item.measure && item.unit) || (item.quantity && item.quantity > 1)))
  );
  const categoryProductItem = categoryProduct?.items?.find(
    (item) => item.price && ((item.measure && item.unit) || (item.quantity && item.quantity > 1))
  );
  const price =
    resolveCategoryContributionPrices(category, products, items, foodUnitAttribute, 0.8) ||
    (categoryProductItem?.price || 0) /
      (convertMeasure(categoryProductItem?.measure, categoryProductItem?.unit, 'kg') || 1) /
      (categoryProductItem?.quantity || 1) ||
    0;
  console.log(categoryProduct, categoryProductItem, price);
  return !categoryProductItem?.measure ? price * amount : price * measure * amount;
};

export const resolveCategoryAttributes = (
  category: CategoryShape,
  attributeIds: AttributeShape['id'][],
  foodUnitAttribute: AttributeShape,
  amount: number,
  categories: CategoryShape[] = [],
  attributes: AttributeShape[] = [],
  contributionCoverageThreshold = 0
) => {
  const measure = getCategoryMeasure(category, foodUnitAttribute, categories);
  const portionMeasure = getCategoryPortionMeasure(category, foodUnitAttribute);
  const categoryAttributes: CategoryAttributeShape[] = [];

  attributeIds.forEach(attributeId => {
    let minValue = 0,
        maxValue = 0,
        unit = 'kg',
        categoryContributionCoverageMeasure = 0,
        categoryContributionTotalMeasure = 0;

    const initialProductAttributes = category.attributes?.filter(productAttribute => productAttribute.attributeId === attributeId);
    
    category.contributions?.forEach(categoryContribution => {
      const contribution = categories.find(category => category.id === categoryContribution.contributionId);
      const result = getCategoryMinMaxAttributes(
        contribution,
        categoryContribution,
        foodUnitAttribute,
        attributeId,
        categories,
        initialProductAttributes,
        attributes
      );
      categoryContributionTotalMeasure+= convertMeasure(categoryContribution.amount, categoryContribution.unit, 'kg');
      if (result?.minCategoryAttribute) {
        const {minAttributeValue, minCategoryAttribute, maxAttributeValue} = result;
        minValue+= minAttributeValue || 0;
        maxValue+= maxAttributeValue || 0;
        unit = minCategoryAttribute.unit?.split('/')[0] || '';
        categoryContributionCoverageMeasure+= convertMeasure(categoryContribution.amount, categoryContribution.unit, 'kg');
      } else {
        return true;
      }
    });

    minValue*= portionMeasure/categoryContributionTotalMeasure || 1;
    maxValue*= portionMeasure/categoryContributionTotalMeasure || 1;

    const result = getCategoryMinMaxAttributes(
      { ...category, contributions: [] },
      undefined,
      foodUnitAttribute,
      attributeId,
      categories,
      initialProductAttributes,
      attributes
    );
    console.log(
      categoryContributionCoverageMeasure, '/', categoryContributionTotalMeasure, '=',
      categoryContributionCoverageMeasure/categoryContributionTotalMeasure, contributionCoverageThreshold
    );
    if (result?.minCategoryAttribute) {
      const {minCategoryAttribute} = result;
      minValue = (result.minAttributeValue || 0) * amount;
      maxValue = (result.maxAttributeValue || 0) * amount;
      unit = minCategoryAttribute.unit?.split('/')[0] || '';
    } else if (categoryContributionCoverageMeasure/categoryContributionTotalMeasure <= contributionCoverageThreshold) {
      console.log('insufficient contributions skipped for', category.name?.['en-US']);
      return true;
    }
    
    const attribute = attributes.find(a => a.id === attributeId);
    if (minValue === maxValue) {
      categoryAttributes.push({
        value: minValue,
        unit,
        attribute
      });
    } else {
      categoryAttributes.push({
        value: minValue,
        type: 'MIN_VALUE',
        unit,
        attribute
      });
      categoryAttributes.push({
        value: maxValue,
        type: 'MAX_VALUE',
        unit,
        attribute
      });
    }
  });

  return { categoryAttributes, measure };
};

export const getCategoriesFromCsv = async (records: {[key: string]: string}[], sourceRecords: {[key: string]: string}[], sourceRecordIdMap: {[key: string]: SourceShape} = {}) => {
  try {
    let item: CategoryShape,
        found,
        attribute,
        note,
        attributes = await Attribute.query(),
        categories = await Category.query(),
        attributeObject,
        value;

    for await (const sourceRecord of sourceRecords) {
      let source = sourceRecordIdMap[sourceRecord.id];
      if (!source) {
        const sourceRecordWithoutId: SourceShape = {...sourceRecord};
        delete sourceRecordWithoutId.id;
        try {
          source = await Source.query().insertAndFetch(sourceRecordWithoutId).returning('*');
          sourceRecordIdMap[sourceRecord.id] = {id: source.id};
        } catch (error) {
          console.error('Error while adding source', sourceRecord);
        }
      }
    }

    for (const columns of records) {
      item = {};
      note = '';
      const ids = [];
      for (const [columnName, column] of ObjectEntries(columns)) {
        if (columnName !== '' && column !== '') {
          attribute = columnName.match(/^attribute:(.*)(\s\((.*)\))/i) ||
                      columnName.match(/^attribute:(.*)/i);
          let nameMatch = columnName.match(/^(name|nimi)\["([a-z-]+)"\]$/i),
              name,
              locale;
          if (nameMatch) {
            name = nameMatch[1];
            locale = nameMatch[2] as Locale;
          }
          if (attribute) {
            found = false;
            for (let m in attributes) {
              if (Object.values(attributes[m].name || {}).includes(attribute[1])) {
                attributeObject = {
                  id: attributes[m].id
                }
                found = true;
                break;
              }
            }
            if (!found) {
              attributeObject = {
                name: {
                  'fi-FI': attribute[1],
                  'en-US': attribute[1]
                }
              };
            }
            value = parseFloat(column.replace(',', '.'));
            item = {
              ...item || {},
              attributes: [
                ...item.attributes || [],
                {
                  attribute: attributeObject,
                  value,
                  unit: attribute[3]
                }
              ]
            };
          } else if (columnName.toLowerCase() === 'note') {
            note = column;
          } else if (columnName.toLowerCase() === 'sourceid') {
            const sourceRecord = sourceRecords.find(source => source.id === column);
            let source = sourceRecordIdMap[sourceRecord?.id || ''];
            if (sourceRecord) {
              for (const attribute of item.attributes || []) {
                if (!attribute.sources) {
                  attribute.sources = [];
                }
                attribute.sources.push({
                  sourceId: source.id,
                  note
                });
              }
            } else {
              console.error('Source not found for id', column);
            }
          } else if (name && locale) {
            if (!item.id) {
              for (const category of categories) {
                if (category.name?.[locale] && category.name[locale]?.toLowerCase().trim() === column?.toLowerCase().trim()) {
                  item.id = category.id;
                  ids.push(category.id);
                  delete item.name;
                }
              }
              if (!item.id) {
                if (!item.name) item.name = {};
                item.name[locale] = column;
              }
            }
          } else if (columnName.toLowerCase() === 'aliases') {
            try {
              const aliases = JSON.parse(column);
              if (aliases) {
                _.set(item, columnName, aliases);
              }
            } catch (error) {
              console.error('Aliases parse error', column, error);
            }
          } else if (['parent'].indexOf(columnName.toLowerCase()) === -1) {
            _.set(item, columnName, column);
          }
        }
      }
      if (ids.length > 1) {
        for await (const id of ids) {
          await Category.query().upsertGraph({...item, id} as Category, {
            noDelete: true,
            relate: true
          });
        }
      } else {
        await Category.query().upsertGraph(item as Category, {
          noDelete: true,
          relate: true
        });
      }
      categories = await Category.query();
      attributes = await Attribute.query();
    }
    console.log(`read ${records.length} records`);
    //console.dir(items, {depth: null, maxArrayLength: null});
  } catch (error) {
    console.error(error);
  }
};

export const getCategoryParentsFromCsv = async (records: {[key: string]: string}[]) => {
  try {
    let items: CategoryShape[] = [],
        item: CategoryShape,
        categories = await Category.query();

    records.forEach(columns => {
      item = {};
      Object.entries(columns).forEach(([columnName, column]) => {
        let nameMatch = columnName.match(/^(name|nimi)\["([a-z-]+)"\]$/i),
            name,
            locale;
        if (nameMatch) {
          name = nameMatch[1];
          locale = nameMatch[2] as Locale;
        }
        if (name && locale) {
          if (column === '') return true;
          if (!item.id) {
            for (let i in categories) {
              if (categories[i].name?.[locale] && categories[i].name[locale]?.toLowerCase().trim() === column?.toLowerCase().trim()) {
                item.id = categories[i].id;
                break;
              }
            }
          }
        }
        else if (['parent'].indexOf(columnName.toLowerCase()) !== -1) {
          if (column === '') return true;
          for (let i in categories) {
            if (categories[i].name && Object.values(categories[i].name).some(category => category.toLowerCase().trim() === column.toLowerCase().trim())) {
              item.parent = {
                id: categories[i].id
              }
              break;
            }
          }
        }
      });
      if (item.parent) {
        items.push(item);
      }
    });
    console.log(`read ${records.length} records and found ${items.length} category parents`);
    //console.dir(items, {depth: null, maxArrayLength: null});
    return items;
  } catch (error) {
    console.error(error);
  }
};
