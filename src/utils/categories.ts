import moment from 'moment';
import _ from 'lodash';

import Attribute, { AttributeShape } from '../models/Attribute';
import Category, { CategoryPartialShape, CategoryShape } from '../models/Category';
import Manufacturer, { ManufacturerShape } from '../models/Manufacturer';
import Source, { SourcePartialShape } from '../models/Source';
import { convertMeasure } from './entities';
import { getTranslation } from '../utils/entities';
import { stripName, stripDetails, getDetails } from './transactions';
import { LevenshteinDistance } from './levenshteinDistance';
import { measureRegExp } from './receipts';
import CategoryAttribute, { CategoryAttributePartialShape, CategoryAttributeShape } from '../models/CategoryAttribute';
import { Locale, NameTranslations, ObjectEntries, Token } from './types';
import { CategoryContributionPartialShape, CategoryContributionShape } from '../models/CategoryContribution';
import { getAttributeValues, getMaxAttributeValue, getMinAttributeValue } from './attributes';

export const getAverageRate = (filter: {start_date: string, end_date: string}, averageRange: number) => {
  const {start_date, end_date} = filter;
  const rate = averageRange ? averageRange/moment.duration(moment(end_date).diff(moment(start_date))).asDays() : 1;
  //console.log(rate, this.state, moment(start_date));
  return rate;
};

export const aggregateCategoryPrice = (resolvedCategories: (Category & {
  price_sum: number,
  weight_sum: number,
  volume_sum: number
})[], averageRate: number) => {
  let categories = [...resolvedCategories];
  categories.reduce(function resolver(sum, category) {
    if (category.products?.length) {
      let itemPrices = 0,
          itemWeights = 0,
          itemVolumes = 0;
      category.products.map(product => {
        product.items.map(item => {
          itemPrices+= item.price;
          if (item.unit == 'l' || product.unit == 'l') {
            itemVolumes+= (product.quantity || item.quantity || 1)*(product.measure || item.measure || 0);
          }
          else {
            itemWeights+= (product.quantity || item.quantity || 1)*convertMeasure(product.measure || item.measure, product.unit || item.unit, 'kg');
          }
        });
      });
      category.price_sum = itemPrices*averageRate;
      category.weight_sum = itemWeights*averageRate;
      category.volume_sum = itemVolumes*averageRate;
    }
    if (category.children?.length) {
      let sum: {
        price_sum: number,
        weight_sum: number,
        volume_sum: number
      } = category.children.reduce(resolver, {
        price_sum: 0,
        volume_sum: 0,
        weight_sum: 0
      });
      category.price_sum = sum.price_sum;
      category.weight_sum = sum.weight_sum;
      category.volume_sum = sum.volume_sum;
    }
    return {
      price_sum: sum.price_sum+(category.price_sum || 0),
      weight_sum: sum.weight_sum+(category.weight_sum || 0),
      volume_sum: sum.volume_sum+(category.volume_sum || 0)
    };
  }, {
    price_sum: 0,
    volume_sum: 0,
    weight_sum: 0
  });
  return categories;
};

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
  CategoryShape,
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

  let results: [CategoryShape, CategoryAttributeShape[]][] = [];
  
  const result = getCategoryWithAttributes(categories, categoryId, attributeId);
  if (result) {
    let [populatedCategory, attributes] = result;
    results.push([populatedCategory, attributes]);
    while (attributes?.length) {
      const result = getCategoryWithAttributes(categories, populatedCategory.parentId, attributeId);
      if (result) {
        [populatedCategory, attributes] = result;
        results.push([populatedCategory, attributes]);
      } else {
        attributes = undefined;
      }
    }
  }
  return results;
};

export function resolveCategories(items: Category[], locale: Locale) {
  if (!locale) return;
  let itemAttributes: CategoryAttribute[],
      resolvedAttributes: {[key: CategoryAttribute['id']]: CategoryAttribute};
  for (const item of items) {
    resolvedAttributes = {};
    itemAttributes = item.attributes;
    for (const itemAttribute of itemAttributes) {
      if (itemAttribute.attribute) {
        itemAttribute.attribute.name = getTranslation(itemAttribute.attribute.name, locale);

        let parent = itemAttribute.attribute.parent;
        while (parent) {
          parent.name = getTranslation(parent.name, locale);
          parent = parent.parent;
        }
      }
      resolvedAttributes[itemAttribute.attributeId] = itemAttribute;
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

export function resolveCategoryPrices(categories: (Category & {
  price_sum: number
})[]) {
  categories && categories.reduce(function resolver(sum, category) {
    if (category.products?.length) {
      let item_prices = 0;
      category.products.map(product => {
        product.items.map(item => {
          item_prices+= item.price;
        });
      });
      category.price_sum = (category.price_sum || 0)+item_prices; 
    }
    if (category.children?.length) {
      category.price_sum = (category.price_sum || 0)+category.children.reduce(resolver, 0);
    }
    return sum+(category.price_sum || 0);
  }, 0);
}

export const getStrippedCategories = (categories: (CategoryShape & {
  strippedName?: NameTranslations
})[], manufacturers: ManufacturerShape[] = []) => {
  return categories.map(category => {
    const name = category.name;
    category.strippedName = stripName(name, manufacturers);
    return category;
  });
};

export const getClosestCategory = (
  name: string,
  categories: (CategoryShape & {
    strippedName?: NameTranslations
  })[],
  acceptLocale: Locale,
  strippedName?: string
): [
  CategoryShape | undefined,
  Token | undefined
] => {
  if (!name) return [undefined, undefined];

  if (!strippedName) strippedName = stripDetails(name);

  let bestToken: Token, bestCategory: CategoryShape;

  console.log('strippedName', strippedName);

  categories.forEach((category) => {
    ObjectEntries(category.strippedName).forEach(([locale, translation]) => {
      if (acceptLocale && locale !== acceptLocale) return true;
      if (translation) {
        const tokens: [Token, string, number?][] = [];
        tokens.push([LevenshteinDistance(translation.toLowerCase(), strippedName.toLowerCase(), {search: true}) as Token, translation.toLowerCase(), 0.1]);
        tokens.push([LevenshteinDistance(category.name[locale].toLowerCase(), name.toLowerCase(), {search: true}) as Token, category.name[locale].toLowerCase()]);
        category.aliases?.forEach(alias => {
          tokens.push([LevenshteinDistance(alias.toLowerCase(), strippedName.toLowerCase(), {search: true}) as Token, alias.toLowerCase(), 0.1]);
          tokens.push([LevenshteinDistance(alias.toLowerCase(), name.toLowerCase(), {search: true}) as Token, alias.toLowerCase()]);
        });
        //tokens.push([LevenshteinDistance(category.parent?.name[locale]?.toLowerCase() || '', strippedName.toLowerCase(), {search: true}), category.parent?.name[locale]?.toLowerCase() || '']);

        let token: Token;
        tokens.forEach(t => {
          t[0].accuracy = (t[0].substring.length-t[0].distance-(t[2] || 0))/name.length;
          if (t[0].distance < 1 && t[0].accuracy > 0.1 && t[0].accuracy >= (token ? token.accuracy : 0)) {
            token = t[0];
            console.log('name', name, 'translation', translation, 'token', t);
          }
        });

        if (token?.accuracy >= (bestToken ? bestToken.accuracy : 0)) {
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
  }
  return {measure, unit};
};

export const findFoodUnitAttribute = (text?: string, attributes: AttributeShape[] = []) => {
  let foodUnitAttribute: AttributeShape;
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
  contentLanguage: Locale,
  categories: CategoryShape[] = [],
  attributes: AttributeShape[] = []
) => {
  const tokens = getTokensFromContributionList(list);
  const contributions: CategoryContributionPartialShape[] = [];
  tokens?.forEach(contributionToken => {
    const { measure, unit } = findMeasure(contributionToken);
    const foodUnitAttribute = findFoodUnitAttribute(contributionToken, attributes);
    let strippedContributionToken = stripDetails(contributionToken);
    let [contributionContribution, token] = getClosestCategory(contributionToken, categories, contentLanguage, strippedContributionToken);
    let contribution: CategoryContributionPartialShape;
    if (contributionContribution) {
      contributionToken = contributionToken.replace(new RegExp(token.substring, 'i'), '').trim();
      contribution = {
        contribution: contributionContribution,
        contributionId: contributionContribution?.id
      };
      if (measure) {
        contribution.amount = measure;
        contribution.unit = unit;
      } else if (foodUnitAttribute) {
        const {value, unit} = contribution.contribution?.attributes.find(attribute => attribute.attributeId === foodUnitAttribute.id) || {};
        if (value) {
          contribution.amount = value;
          contribution.unit = unit;
        }
      }
      if (contribution) {
        contributions.push(contribution);
      }
    }
    while (contributionContribution && contributionToken && strippedContributionToken) {
      console.log('contributionContribution', contributionContribution?.name, 'contributionToken', contributionToken, 'strippedContributionToken', strippedContributionToken);
      [contributionContribution, token] = getClosestCategory(contributionToken, categories, contentLanguage);
      if (contributionContribution) {
        contribution = {
          contribution: contributionContribution,
          contributionId: contributionContribution?.id
        };
        if (contribution) {
          if (foodUnitAttribute) {
            const {value, unit} = contribution.contribution?.attributes.find(attribute => attribute.attributeId === foodUnitAttribute.id) || {};
            if (value) {
              contribution.amount = value;
              contribution.unit = unit;
            }
          } else if (measure) {
            contribution.amount = measure;
            contribution.unit = unit;
          }
          contributions.push(contribution);
        }
        contributionToken = contributionToken.replace(new RegExp(token.substring, 'i'), '').trim();
        strippedContributionToken = stripDetails(contributionToken).replace(new RegExp(token.substring, 'i'), '').trim();
      }
      console.log('contributionContribution', contributionContribution?.name, 'contributionToken', contributionToken, 'strippedContributionToken', strippedContributionToken);
    }
  });
  return contributions;
};

export const getCategoriesFromCsv = async (records: {[key: string]: string}[], sourceRecords: {[key: string]: string}[]) => {
  try {
    let item: CategoryPartialShape,
        found,
        attribute,
        note,
        attributes = await Attribute.query(),
        categories = await Category.query(),
        sourceRecordIdMap: {[key: string]: SourcePartialShape} = {},
        attributeObject,
        value;

    for (const columns of records) {
      item = {};
      note = '';
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
              if (Object.values(attributes[m].name).includes(attribute[1])) {
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
            if (sourceRecord) {
              let source = sourceRecordIdMap[sourceRecord.id];
              if (!source) {
                const sourceRecordWithoutId: SourcePartialShape = {...sourceRecord};
                delete sourceRecordWithoutId.id;
                try {
                  source = await Source.query().insertAndFetch(sourceRecordWithoutId).returning('*');
                  sourceRecordIdMap[sourceRecord.id] = {id: source.id};
                } catch (error) {
                  console.error('Error while adding source', sourceRecord);
                }
              }
              
              for (const m in item.attributes) {
                if (!item.attributes[m].sources) {
                  item.attributes[m].sources = [];
                }
                item.attributes[m].sources.push({
                  source,
                  note
                });
              }
            } else {
              console.error('Source not found for id', column);
            }
          } else if (name && locale) {
            if (!item.id) {
              for (const i in categories) {
                if (categories[i].name?.[locale] && categories[i].name[locale].toLowerCase().trim() === column?.toLowerCase().trim()) {
                  item.id = categories[i].id;
                  delete item.name;
                  break;
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
      await Category.query().upsertGraph(item as Category, {
        noDelete: true,
        relate: true
      });
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
    let items: CategoryPartialShape[] = [],
        item: CategoryPartialShape,
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
              if (categories[i].name?.[locale] && categories[i].name[locale].toLowerCase().trim() === column?.toLowerCase().trim()) {
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

export const getStrippedChildCategories = async () => {
  const categories = (await Category.query()
  .withGraphFetched('[contributions, children, attributes]'));

  const childCategories = categories.filter(category => !category.children?.length);
  const manufacturers = await Manufacturer.query();
  const strippedCategories = getStrippedCategories(childCategories, manufacturers);

  return strippedCategories;
};

export const getCategoryMinMaxAttributes = (
  category: CategoryPartialShape,
  contribution: CategoryContributionPartialShape,
  foodUnitAttribute: AttributeShape,
  attributeId: AttributeShape['id'],
  categories: CategoryShape[] = [],
  categoryOwnAttributes: CategoryAttributePartialShape[] = [],
  attributes: AttributeShape[] = []
) => {
  let unit: CategoryContributionShape['unit'],
      measure: CategoryContributionShape['amount'],
      portionAttribute;
  
  if (foodUnitAttribute) {
    portionAttribute = category.attributes.find(a => a.attributeId === foodUnitAttribute.id);
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
  
  let minAttributeValue: number,
      minCategoryAttribute: CategoryAttributePartialShape,
      maxAttributeValue: number,
      maxCategoryAttribute: CategoryAttributePartialShape;
  const result = getCategoriesWithAttributes(categories, category.id, Number(attributeId));
  const [, categoryAttributes] = result?.[0] || [undefined, undefined];
  let attributeResult = getAttributeValues(unit, measure, 1, undefined, categoryOwnAttributes, attributes);
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
      let attributeResult = getAttributeValues(unit, measure*contributionContribution.amount/totalAmount, 1, undefined, categoryOwnAttributes, attributes);
      if (!attributeResult.length) {
        attributeResult = getAttributeValues(unit, measure*contributionContribution.amount/totalAmount, 1, undefined, categoryAttributes, attributes);
      }
      if (attributeResult.length) {
        [minAttributeValue, minCategoryAttribute] = getMinAttributeValue(attributeResult);
        [maxAttributeValue, maxCategoryAttribute] = getMaxAttributeValue(attributeResult);
      }
      console.log('minAttributeValue', minAttributeValue, 'minCategoryAttribute', minCategoryAttribute, 'measure', measure, 'contributionContributoin', contributionContribution, 'totalAmount', totalAmount);
    });
  }
  return {minAttributeValue, minCategoryAttribute, maxAttributeValue, maxCategoryAttribute};
};

export const resolveCategoryAttributes = (
  category: CategoryPartialShape,
  attributeIds: AttributeShape['id'][],
  foodUnitAttribute: AttributeShape,
  categories: CategoryShape[] = [],
  attributes: AttributeShape[] = []
) => {
  let measure,
      categoryAttributes: CategoryAttributePartialShape[] = [];

  attributeIds.forEach(attributeId => {
    let minValue = 0,
        maxValue = 0,
        unit,
        initialProductAttributes = category.attributes?.filter(productAttribute => productAttribute.attributeId === attributeId);
    
    category.contributions?.forEach(productContribution => {
      const contribution = categories.find(category => category.id === productContribution.contributionId);
      const result = getCategoryMinMaxAttributes(contribution, productContribution, foodUnitAttribute, attributeId, categories, initialProductAttributes, attributes);
      if (result?.minCategoryAttribute) {
        const {minAttributeValue, minCategoryAttribute, maxAttributeValue} = result;
        minValue+= minAttributeValue || 0;
        maxValue+= maxAttributeValue || 0;
        unit = minCategoryAttribute.unit.split('/')[0];
        console.log('result', result);
      } else {
        return true;
      }
    });

    const result = getCategoryMinMaxAttributes(category, undefined, foodUnitAttribute, attributeId, categories, initialProductAttributes, attributes);
    if (result?.minCategoryAttribute) {
      const {minCategoryAttribute} = result;
      minValue = result.minAttributeValue;
      maxValue = result.maxAttributeValue;
      unit = minCategoryAttribute.unit.split('/')[0];
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

  if (foodUnitAttribute) {   
    measure = category.contributions?.reduce((total, productContribution) => {
      const contribution = categories.find(category => category.id === productContribution.contributionId);
      const portionAttribute = contribution.attributes.find(a => a.attributeId === foodUnitAttribute.id);
      return total+convertMeasure(portionAttribute?.value, portionAttribute?.unit, 'kg');
    }, 0);

    if (category) {
      const portionAttribute = category.attributes.find(a => a.attributeId === foodUnitAttribute.id);
      measure = convertMeasure(portionAttribute?.value, portionAttribute?.unit, 'kg');
    }
  }

  return { categoryAttributes, measure };
};
