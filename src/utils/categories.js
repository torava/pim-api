import moment from 'moment';

import { locale } from "../components/locale";

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
            measure = locale.convertMeasure(product.measure || item.measure, product.unit || item.unit, 'kg');
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
            item_weights+= (product.quantity || item.quantity || 1)*locale.convertMeasure(product.measure || item.measure, product.unit || item.unit, 'kg');
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
