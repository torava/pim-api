import moment from 'moment';

import { locale } from "../client/components/locale";
import { convertMeasure } from './entities';
import { getTranslation } from '../utils/entities';
import { stripName, stripDetails } from './transaction';
import { LevenshteinDistance } from './levenshteinDistance';

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
    if (category.products?.length) {
      let item_prices = 0,
          item_weights = 0,
          item_volumes = 0;
      category.products.map(product => {
        product.items.map(item => {
          item_prices+= item.price;
          if (item.unit == 'l' || product.unit == 'l') {
            item_volumes+= (product.quantity || item.quantity || 1)*(product.measure || item.measure || 0);
          }
          else {
            item_weights+= (product.quantity || item.quantity || 1)*convertMeasure(product.measure || item.measure, product.unit || item.unit, 'kg');
          }
        });
      });
      category.price_sum = item_prices*averageRate;
      category.weight_sum = item_weights*averageRate;
      category.volume_sum = item_volumes*averageRate;
    }
    if (category.children?.length) {
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

export const getCategoryAttributes = (category, attributeId) => (
  Object.values(category?.attributes || {}).filter(attribute => attribute.attributeId === attributeId)
);

export const getCategoryWithAttributes = (categories, categoryId, attributeId) => {
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

export const getCategoriesWithAttributes = (categories, category, attributeId) => {
  if (!category) return;

  let results = [];
  
  const result = getCategoryWithAttributes(categories, category.id, attributeId);
  if (result) {
    let [populatedCategory, attributes] = result;
    results.push([populatedCategory, attributes]);
    while (attributes.length) {
      const result = getCategoryWithAttributes(categories, populatedCategory.parentId, attributeId);
      if (result) {
        [populatedCategory, attributes] = result;
        results.push([populatedCategory, attributes]);
      } else {
        attributes = false;
      }
    }
  }
  return results;
};

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

export const getStrippedCategories = (categories, manufacturers = []) => {
  return categories.map(category => {
    const name = category.name;
    category.strippedName = stripName(name, manufacturers);
    return category;
  });
};

export const getClosestCategory = (name, categories, acceptLocale) => {
  if (!name) return [undefined, undefined];

  const strippedName = stripDetails(name);

  let bestToken, bestCategory;

  console.log('strippedName', strippedName);

  categories.forEach((category) => {
    Object.entries(category.strippedName).forEach(([locale, translation]) => {
      if (acceptLocale && locale !== acceptLocale) return true;
      if (translation) {
        const tokens = [];
        tokens.push([LevenshteinDistance(translation.toLowerCase(), strippedName.toLowerCase(), {search: true}), translation.toLowerCase()]);
        tokens.push([LevenshteinDistance(category.name[locale].toLowerCase(), name.toLowerCase(), {search: true}), category.name[locale].toLowerCase()]);
        category.aliases?.forEach(alias => {
          tokens.push([LevenshteinDistance(alias.toLowerCase(), strippedName.toLowerCase(), {search: true}), alias.toLowerCase()]);
          tokens.push([LevenshteinDistance(alias.toLowerCase(), name.toLowerCase(), {search: true}), alias.toLowerCase()]);
        });
        //tokens.push([LevenshteinDistance(category.parent?.name[locale]?.toLowerCase() || '', strippedName.toLowerCase(), {search: true}), category.parent?.name[locale]?.toLowerCase() || '']);

        let token;
        tokens.forEach(t => {
          t[0].accuracy = (t[0].substring.length-t[0].distance)/name.length;
          if (t[0].distance <= 1 && t[0].accuracy > 0.2 && t[0].accuracy >= (token ? token.accuracy : 0)) {
            token = t[0];
            console.log(name, translation, t);
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
    'closest category for name',
    'name', name,
    'stripped name', strippedName,
    'category name', bestCategory?.name,
    'token', bestToken
  );
  return bestToken?.substring.length ? [bestCategory, bestToken] : [undefined, undefined];
};
