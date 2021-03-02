import moment from 'moment';
import _ from 'lodash';
import parse from 'csv-parse/lib/sync';

import Category from '../models/Category';
import { locale } from "../components/locale";
import { convertMeasure } from './entities';
import Attribute from '../models/Attribute';
import { getTranslation } from '../utils/entities';

export const getAverageRate = (filter, average_range) => {
  const {start_date, end_date} = filter;
  const rate = average_range ? average_range/moment.duration(moment(end_date).diff(moment(start_date))).asDays() : 1;
  //console.log(rate, this.state, moment(start_date));
  return rate;
};

export const aggregateCategoryAttribute = (resolvedCategories, attributeAggregates, averageRate) => {
  let categories = [...resolvedCategories],
      parent_value;
  for (let attributeId in attributeAggregates) {
    categories.reduce(function resolver(sum, category) {
      let measure,
          itemMeasure = 0,
          value = 0,
          measuredValue = 0;
      if (category.hasOwnProperty('products') && category.products.length) {
        category.products.map(product => {
          product.items.map(item => {
            measure = convertMeasure(product.measure || item.measure, product.unit || item.unit, 'kg');
            itemMeasure+=(product.quantity || item.quantity || 1)*measure;
          });
        });
      }
      if (category.attributes.hasOwnProperty(attributeId) || parent_value) {
        if (!category.hasOwnProperty('attribute_sum')) {
          category.attribute_sum = {};
        }
        value = category.attributes.hasOwnProperty(attributeId) && category.attributes[attributeId].value || 0;
        measuredValue = value*itemMeasure;
        category.attribute_sum[attributeId] = measuredValue || parent_value*itemMeasure || 0;
        category.attribute_sum[attributeId]*= averageRate;
        const targetUnit = locale.getAttributeUnit(attributeAggregates[attributeId].name['en-US']);
        if (targetUnit) {
          const rate = config.unit_conversions[attributeAggregates[attributeId].unit][targetUnit];
          if (rate) {
            category.attribute_sum[attributeId]*= rate;
          }
        } 
      }
      if (category.hasOwnProperty('children') && category.children.length) {
        if (!category.hasOwnProperty('attribute_sum')) {
          category.attribute_sum = {};
        }
        parent_value = value;
        category.attribute_sum[attributeId] = category.children.reduce(resolver, 0);
      }
      return sum+(category.attribute_sum && category.attribute_sum[attributeId] || 0);
    }, 0);
  }
  return categories;
};

export const aggregateCategoryPrice = (resolvedCategories, averageRate) => {
  let categories = [...resolvedCategories];
  categories.reduce(function resolver(sum, category) {
    if (category.hasOwnProperty('products') && category.products.length) {
      let item_prices = 0,
          item_weights = 0,
          item_volumes = 0;
      category.products.map(product => {
        product.items.map(item => {
          item_prices+= item.price;
          if (item.unit == 'l' || product.unit == 'l') {
            item_volumes+= (product.quantity || item.quantity || 1)*(product.measure || item.measure || 0);
          }
          else {
            item_weights+= (product.quantity || item.quantity || 1)*convertMeasure(product.measure || item.measure, product.unit || item.unit, 'kg');
          }
        });
      });
      category.price_sum = item_prices*averageRate;
      category.weight_sum = item_weights*averageRate;
      category.volume_sum = item_volumes*averageRate;
    }
    if (category.hasOwnProperty('children') && category.children.length) {
      let sum = category.children.reduce(resolver, {
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

export const getCategoryById = (categories, categoryId) => categories.find(c => c.id === categoryId);

export const getCategoryAttribute = (category, attributeId) => (
  Object.values(category?.attributes || {}).find(attribute => attribute.attributeId === attributeId)
);

export const getCategoryWithAttribute = (categories, categoryId, attributeId) => {
  if (!categoryId) return;

  const category = getCategoryById(categories, categoryId);
  const attribute = getCategoryAttribute(category, attributeId);
  
  if (attribute) {
    return [category, attribute];
  } else {
    const [parentCategory, parentAttribute] = getCategoryWithAttribute(categories, category?.parentId, attributeId);
    return [parentCategory, parentAttribute];
  }
};

export const getCategoriesWithAttribute = (categories, categoryId, attributeId) => {
  if (!categoryId) return;

  let results = [];

  let [attribute, category] = getCategoryWithAttribute(categories, categoryId, attributeId);
  while (attribute) {
    results.push([category, attribute]);
    [category, attribute] = getCategoryWithAttribute(categories, categoryId, attributeId);
  }
  return results;
};

export const getCategoriesFromCsv = async (csv, sourceIdOffset = 0) => {
  try {
    let items = [],
        item,
        found,
        attribute,
        note,
        attributes = await Attribute.query(),
        categories = await Category.query(),
        attributeObject,
        value,
        ref,
        refs = {};

    const records = parse(csv, {
      columns: true,
      skipEmptyLines: true
    });

    records.forEach(columns => {
      item = {};
      note = '';
      Object.entries(columns).forEach(([columnName, column]) => {
        attribute = columnName.match(/^attribute:(.*)(\s\((.*)\))/i) ||
                    columnName.match(/^attribute:(.*)/i);
        let nameMatch = columnName.match(/^(name|nimi)\["([a-z-]+)"\]$/i),
            name,
            locale;
        if (nameMatch) {
          name = nameMatch[1];
          locale = nameMatch[2];
        }
        if (attribute) {
          if (column !== "") {
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
              ref = 'attribute:'+attribute[1];
              if (ref in refs) {
                attributeObject = {
                  '#ref': ref
                }
              }
              else {
                refs[ref] = true;
                attributeObject = {
                  '#id': ref,
                  name: {
                    'fi-FI': attribute[1],
                    'en-US': attribute[1]
                  }
                }
              }
            }
            value = parseFloat(column.replace(',', '.'));
            Object.assign(item, {
              attributes: [
                {
                  attribute: attributeObject,
                  value,
                  unit: attribute[3]
                }
              ]
            });
          }
        }
        else if (columnName.toLowerCase() === 'note') {
          if (column !== '') {
            note = column;
          }
        }
        else if (columnName.toLowerCase() === 'sourceid') {
          if (column === '') return true;
          for (let m in item.attributes) {
            if (!item.attributes[m].sources) {
              item.attributes[m].sources = [];
            }
            item.attributes[m].sources.push({
              source: {
                id: parseInt(column)+sourceIdOffset,
              },
              note
            });
          }
        }
        else if (name && locale) {
          if (column === '') return true;
          if (!item.id) {
            for (let i in categories) {
              if (categories[i].name?.[locale] && categories[i].name[locale].toLowerCase().trim() === column?.toLowerCase().trim()) {
                item.id = categories[i].id;
                delete item['#ref'];
                delete item['#id'];
                delete item.name;
                break;
              }
            }
            if (!item.id) {
              ref = `category:${column}`;
              if (ref in refs && !item['#id'] && !item['#ref']) {
                item['#ref'] = ref;
              }
              else {
                if (!item['#id'] && !item['#ref']) {
                  refs[ref] = true;
                  item['#id'] = ref;
                }
                if (!item.name) item.name = {};
                item.name[locale] = column;
              }
            }
          }
        }
        else if (['isä', 'parent'].indexOf(columnName.toLowerCase()) !== -1) {
          if (column === '') return true;
          for (let i in categories) {
            if (categories[i].name && Object.values(categories[i].name).some(category => category.toLowerCase().trim() === column.toLowerCase().trim())) {
              item.parent = {
                id: categories[i].id
              }
              break;
            }
          }
          if (!item.parent) {
            item.parent = {};
            ref = `category:${column}`;
            item.parent['#ref'] = ref;
          }      
        }
        else if (columnName.toLowerCase() === 'aliases' && column !== '') {
          if (column === '') return true;
          try {
            const aliases = JSON.parse(column);
            if (aliases) {
              _.set(item, columnName, aliases);
            }
          } catch (error) {
            console.log('Aliases parse error', column, error);
          }
        }
        else if (columnName !== '' && column !== '') {
          _.set(item, columnName, column);
        }
      });
      items.push(item);
    });
    //console.dir(items, {depth: null, maxArrayLength: null});
    return items;
  } catch (error) {
    console.error(error);
  }
};

function getCategories(parent) {
  return new Promise((resolve, reject) => {
    Category.query()
    .where('parent', parent)
    .eager('products.[items]')
    .then(category => {
      getCategories(category.id)
      .then((categories) => {
        category.children = categories;
        resolve(category);
      })
      .catch(reject);
    });
  });
}

export async function getClosestCategory(toCompare, locale) {
  let entity_name = toCompare;
  meta_manager.findEntities(
    toCompare,
    'fi'
  )
  .then(meta_entities => {
    meta_entities.map(meta_entity => {
      entity_name = entity_name.replace(new RegExp(escapeRegExp(meta_entity.sourceText)+",?\s?"), "")
                               .replace(/^,?\s*/, "")
                               .replace(/,?(\sja)?\s*$/, "");
    });
    manager.findEntities(
      entity_name,
      'fi',
    ).then(entities => {
      console.log(meta_entities);
      console.log(entities);
    });
  });

  return new Promise((resolve, reject) => {
    Category.query()
    .then(categories => {
      let name, category, response = null, max_distance = 0, distance, match;
      toCompare = toCompare.toLowerCase();
      for (let i in categories) {
        category = categories[i];
        name = category.name[locale];
        if (!name) continue;
        match = new RegExp('\\b'+_.escapeRegExp(name)+'\\b', 'i');
        distance = toCompare.match(match) && name.length/toCompare.length;
        if (distance > max_distance) {
          max_distance = distance;
          response = category;
        }
      }
      resolve(response);
    })
    .catch(reject);
  });
}

export function resolveCategories(items, locale) {
  if (!locale) return;
  let item_attributes,
      resolved_attributes,
      item,
      index;
  for (let i in items) {
    item = items[i];
    resolved_attributes = {};
    item_attributes = item.attributes;
    for (let n in item_attributes) {
      if (item_attributes[n].attribute) {
        item_attributes[n].attribute.name = getTranslation(item_attributes[n].attribute.name, locale);

        let parent = item_attributes[n].attribute.parent;
        while (parent) {
          parent.name = getTranslation(parent.name, locale);
          parent = parent.parent;
        }
      }
      resolved_attributes[item_attributes[n].attributeId] = item_attributes[n];
    }
    item.attributes = resolved_attributes;
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

export function resolveCategoryPrices(categories) {
  categories && categories.reduce(function resolver(sum, category) {
    if (category.hasOwnProperty('products') && category.products.length) {
      let item_prices = 0;
      category.products.map(product => {
        product.items.map(item => {
          item_prices+= item.price;
        });
      });
      category.price_sum = (category.price_sum || 0)+item_prices; 
    }
    if (category.hasOwnProperty('children') && category.children.length) {
      category.price_sum = (category.price_sum || 0)+category.children.reduce(resolver, 0);
    }
    return sum+(category.price_sum || 0);
  }, 0);
}
