import moment from 'moment';

import { locale } from "../components/locale";

export const getAverageRate = (filter, average_range) => {
  const {start_date, end_date} = filter;
  const rate = average_range ? average_range/moment.duration(moment(end_date).diff(moment(start_date))).asDays() : 1;
  //console.log(rate, this.state, moment(start_date));
  return rate;
};

export const aggregateCategoryAttribute = (resolvedCategories, attributeAggregates, average_rate) => {
  let categories = [...resolvedCategories],
      parent_value;
  for (let attribute_id in attributeAggregates) {
    categories.reduce(function resolver(sum, category) {
      let measure,
          item_measure = 0,
          value = 0,
          measured_value = 0;
      if (category.hasOwnProperty('products') && category.products.length) {
        category.products.map(product => {
          product.items.map(item => {
            measure = locale.convertMeasure(product.measure || item.measure, product.unit || item.unit, 'kg');
            item_measure+=(product.quantity || item.quantity || 1)*measure;
          });
        });
      }
      if (category.attributes.hasOwnProperty(attribute_id) || parent_value) {
        if (!category.hasOwnProperty('attribute_sum')) {
          category.attribute_sum = {};
        }
        value = category.attributes.hasOwnProperty(attribute_id) && category.attributes[attribute_id].value || 0;
        measured_value = value*item_measure;
        category.attribute_sum[attribute_id] = measured_value || parent_value*item_measure || 0;
        category.attribute_sum[attribute_id]*= average_rate;
        let target_unit = locale.getAttributeUnit(attribute_aggregates[attribute_id].name['en-US']);
        if (target_unit) {
          let rate = config.unit_conversions[attribute_aggregates[attribute_id].unit][target_unit];
          if (rate) {
            category.attribute_sum[attribute_id]*= rate;
          }
        } 
      }
      if (category.hasOwnProperty('children') && category.children.length) {
        if (!category.hasOwnProperty('attribute_sum')) {
          category.attribute_sum = {};
        }
        parent_value = value;
        category.attribute_sum[attribute_id] = category.children.reduce(resolver, 0);
      }
      return sum+(category.attribute_sum && category.attribute_sum[attribute_id] || 0);
    }, 0);
  }
  return categories;
};

export const aggregateCategoryPrice = (resolvedCategories, average_rate) => {
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
      category.price_sum = item_prices*average_rate;
      category.weight_sum = item_weights*average_rate;
      category.volume_sum = item_volumes*average_rate;
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
}