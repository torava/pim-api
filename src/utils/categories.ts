import moment from 'moment';
import _ from 'lodash';

import Attribute from '../models/Attribute';
import Category, { CategoryPartialShape } from '../models/Category';
import Manufacturer from '../models/Manufacturer';
import Source, { SourcePartialShape } from '../models/Source';
import { convertMeasure } from './entities';
import { getTranslation } from '../utils/entities';
import { stripName, stripDetails, getDetails } from './transactions';
import { LevenshteinDistance } from './levenshteinDistance';
import { measureRegExp } from './receipts';
import CategoryAttribute from '../models/CategoryAttribute';
import { Locale, NameTranslations, ObjectEntries, Token } from './types';
import { CategoryContributionPartialShape } from '../models/CategoryContribution';

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

export const getCategoryById = (categories: Category[], categoryId: Category['id']) => (
  categories.find(c => c.id === categoryId)
);

export const getCategoryAttributes = (category: Category, attributeId: CategoryAttribute['id']) => (
  Object.values(category?.attributes || {}).filter(attribute => attribute.attributeId === attributeId)
);

export const getCategoryWithAttributes = (
  categories: Category[],
  categoryId: Category['id'],
  attributeId: CategoryAttribute['id']
): [
  Category,
  CategoryAttribute[]
] => {
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
  categories: Category[],
  categoryId: Category['id'],
  attributeId: CategoryAttribute['id']
) => {
  if (!categoryId) return;

  let results: [Category, CategoryAttribute[]][] = [];
  
  const result = getCategoryWithAttributes(categories, categoryId, attributeId);
  if (result) {
    let [populatedCategory, attributes] = result;
    results.push([populatedCategory, attributes]);
    while (attributes.length) {
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
      resolvedAttributes: {[key: CategoryAttribute['id']]: CategoryAttribute},
      item;
  for (let i in items) {
    item = items[i];
    resolvedAttributes = {};
    itemAttributes = item.attributes;
    for (let n in itemAttributes) {
      if (itemAttributes[n].attribute) {
        itemAttributes[n].attribute.name = getTranslation(itemAttributes[n].attribute.name, locale);

        let parent = itemAttributes[n].attribute.parent;
        while (parent) {
          parent.name = getTranslation(parent.name, locale);
          parent = parent.parent;
        }
      }
      resolvedAttributes[itemAttributes[n].attributeId] = itemAttributes[n];
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

export const getStrippedCategories = (categories: (Category & {
  strippedName?: NameTranslations
})[], manufacturers: Manufacturer[] = []) => {
  return categories.map(category => {
    const name = category.name;
    category.strippedName = stripName(name, manufacturers);
    return category;
  });
};

export const getClosestCategory = (
  name: string,
  categories: (Category & {
    strippedName?: NameTranslations
  })[],
  acceptLocale: Locale,
  strippedName?: string
): [
  Category,
  Token
] => {
  if (!name) return [undefined, undefined];

  if (!strippedName) strippedName = stripDetails(name);

  let bestToken: Token, bestCategory: Category;

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

        if (token?.accuracy > (bestToken ? bestToken.accuracy : 0)) {
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

export const getTokensFromContributionList = (list: string) => (
  list?.replace(/[([][^)\]]*[)\]]|\./g, '')
  .replace(/\s{2,}/g, ' ')
  .trim()
  .split(/,\s|\sja\s|\sand\s|\soch\s|\s?&\s?/gi)
);

export const getContributionsFromList = (
  list: string,
  contentLanguage: Locale,
  categories: Category[] = [],
  attributes: Attribute[] = []
) => {
  const tokens = getTokensFromContributionList(list);
  const contributions: CategoryContributionPartialShape[] = [];
  tokens?.forEach(contributionToken => {
    const measureMatch = contributionToken.match(measureRegExp);
    const measure = measureMatch && parseFloat(measureMatch[1]);
    let foodUnitAttribute: Attribute;
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
    let contribution: CategoryContributionPartialShape = {
      contribution: contributionContribution,
      contributionId: contributionContribution.id
    };
    if (contribution) {
      if (foodUnitAttribute) {
        const {value, unit} = contribution.contribution.attributes.find(attribute => attribute.attributeId === foodUnitAttribute.id) || {};
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
      while (contribution && contributionToken && strippedContributionToken) {
        contributionToken = contributionToken.replace(new RegExp(token.substring, 'i'), '').trim();
        strippedContributionToken = stripDetails(contributionToken).replace(new RegExp(token.substring, 'i'), '').trim();
        contributions.push(contribution);
        [contribution, token] = getClosestCategory(contributionToken, categories, contentLanguage);
        if (contribution) {
          if (foodUnitAttribute) {
            const {value, unit} = contribution.contribution.attributes.find(attribute => attribute.attributeId === foodUnitAttribute.id) || {};
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
    } else if (contribution) {
      contributions.push(contribution);
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
