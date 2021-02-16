import moment from 'moment';

import { locale } from "../components/locale";
import { convertMeasure } from './entities';

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
      price_sum: sum.price_sum+(category.price_sum || 0),
      weight_sum: sum.weight_sum+(category.weight_sum || 0),
      volume_sum: sum.volume_sum+(category.volume_sum || 0)
    };
  }, {
    price_sum: 0,
    volume_sum: 0,
    weight_sum: 0
  });
  return categories;
};

export const getCategoryWithAttribute = (categories, categoryId, attributeId) => {
  if (!categoryId) return;

  const category = categories.find(c => c.id === categoryId);
  let attribute = Object.values(category?.attributes || {}).find(attribute => attribute.attributeId === attributeId);
  if (attribute) {
    return category;
  } else {
    const parentCategory = getCategoryWithAttribute(categories, category?.parentId, attributeId);
    return parentCategory;
  }
};

const CSV_SEPARATOR = ";";

export async function getCategoriesFromCsv(csv) {
  let columns,
      item_index = 0,
      rows = csv.replace(/\r/g, '').trim().split('\n'),
      sep = rows[0].trim().match(/^SEP=(.{1})$/),
      separator,
      items = [],
      item,
      column_name,
      elements,
      found,
      year,
      source,
      sources,
      attribute,
      note,
      attributes = await Attribute.query(),
      categories = await Category.query(),
      attribute_object,
      value,
      ref,
      refs = {};
  if (sep) {
    separator = sep[1];
    rows.shift();
  }
  else {
    separator = CSV_SEPARATOR;
  }

  let column_names = rows[0].split(separator);

  for (let i = 1; i < rows.length; i++) {
    columns = rows[i].split(separator);
    item = {};
    note = '';
    for (let n in columns) {
      column_name = column_names[n];
      attribute = column_name.match(/^attribute\:(.*)(\s\((.*)\))/i) ||
                  column_name.match(/^attribute\:(.*)/i);
      let nameMatch = column_name.match(/^(name|nimi)\["([a-z-]+)"\]$/i),
          name,
          locale;
      if (nameMatch) {
        name = nameMatch[1];
        locale = nameMatch[2];
      }
      if (attribute) {
        if (columns[n] !== "") {
          found = false;
          for (let m in attributes) {
            if (attribute[1] == attributes[m].name) {
              attribute_object = {
                id: attributes[m].id
              }
              found = true;
              break;
            }
          }
          if (!found) {
            ref = 'attribute:'+attribute[1];
            if (ref in refs) {
              attribute_object = {
                '#ref': ref
              }
            }
            else {
              refs[ref] = true;
              attribute_object = {
                '#id': ref,
                name: {
                  'fi-FI': attribute[1],
                  'en-US': attribute[1]
                }
              }
            }
          }
          value = parseFloat(columns[n].replace(',', '.'));
          Object.assign(item, {
            attributes: [
              {
                attribute: attribute_object,
                value,
                unit: attribute[3]
              }
            ]
          });
        }
      }
      else if (column_name.toLowerCase() === 'note') {
        if (columns[n] !== '') {
          note = columns[n];
        }
      }
      else if (column_name.toLowerCase() === 'sourceid') {
        if (columns[n] === '') continue;
        for (let m in item.attributes) {
          if (!item.attributes[m].sources) {
            item.attributes[m].sources = [];
          }
          item.attributes[m].sources.push({
            sourceId: columns[n],
            note
          });
        }
      }
      else if (name && locale) {
        if (columns[n] === '') continue;
        for (let i in categories) {
          if (categories[i].name && categories[i].name[locale] == columns[n]) {
            item.id = categories[i].id;
            break;
          }
        }
        if (!item.id) {
          ref = 'category:'+columns[n];
          if (ref in refs && !item['#id']) {
            item['#ref'] = ref;
          }
          else {
            if (!item['#id']) {
              refs[ref] = true;
              item['#id'] = ref;
            }
            if (!item.name) item.name = {};
            item.name[locale] = columns[n];
          }
        }
      }
      else if (['isä', 'parent'].indexOf(column_name.toLowerCase()) !== -1) {
        if (columns[n] === '') continue;
        for (let i in categories) {
          if (categories[i].name && categories[i].name['fi-FI'] == columns[n]) {
            item.parent = {
              id: categories[i].id
            }
            break;
          }
        }
        if (!item.parent) {
          item.parent = {};
          ref = 'category:'+columns[n];
          if (ref in refs) {
            item.parent['#ref'] = ref;
          }
          else {
            refs[ref] = true;
            item.parent['#id'] = ref;
            item.parent.name = {
              'fi-FI': columns[n]
            }
          }
        }      
      }
      else if (column_name.toLowerCase() === 'aliases' && columns[n] !== '') {
        if (!columns[n]) continue;
        try {
          const aliases = JSON.parse(columns[n]);
          if (aliases) {
            _.set(item, column_name.toLowerCase().replace('[i]', `[${i-1}]`), aliases);
          }
        } catch (error) {
          console.log('Aliases parse error', columns[n], error);
        }
      }
      else if (column_name !== '' && columns[n] !== '') {
        _.set(item, column_name.toLowerCase().replace('[i]', `[${i-1}]`), columns[n]);
      }
    }
    items.push(item);
  }
  return items;
}
