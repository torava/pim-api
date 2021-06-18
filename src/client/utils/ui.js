import React from 'react';

import config from '../../config/default';
import { getCategoryWithAttributes } from '../../utils/categories';
import { convertMeasure } from '../../utils/entities';
import { locale } from '../components/locale';

export const getAttributeColumns = (selectedAttributes, categories = [], attributeUnits = {}, sampleQuantity, sampleMeasure, sampleUnit, samplePrice) => {
  const columns = [];
  for (const key in selectedAttributes) {
    const selectedAttribute = selectedAttributes[key];
    const column = {
      id: selectedAttribute.id,
      label: selectedAttribute.name[locale.getLocale()],
      formatter: (attribute => (
        (_, category) => {
          const [categoryWithAttribute, attributes] = getCategoryWithAttributes(categories, category.id, attribute.id) || [undefined, [{}]];
          const {
            value,
            unit
          } = attributes[0];

          let rate = 1;

          const targetUnit = attributeUnits[selectedAttribute.name['en-US']];
          if (targetUnit) {
            rate = config.unitConversionRates?.[unit]?.[targetUnit] || 1;
          }

          const convertedValue = rate*value;

          const [primaryUnit, perUnit] = (targetUnit || unit)?.split('/') || [undefined, undefined];

          let sampleValue,
              formattedValue,
              quantity = 1;

          if (perUnit === 'EUR' && samplePrice) {
            sampleValue = convertedValue*samplePrice;
            quantity = sampleQuantity || 1;
          } else if (perUnit && sampleMeasure) {
            sampleValue = convertMeasure(convertedValue, sampleUnit, perUnit)*sampleMeasure;
            quantity = sampleQuantity || 1;
          } else if (!perUnit) {
            quantity = sampleQuantity || 1;
          }

          if (sampleValue) {
            formattedValue = `${new Intl.NumberFormat(locale.getLocale()).format(quantity*sampleValue)} ${primaryUnit}`;
          } else {
            formattedValue = `${new Intl.NumberFormat(locale.getLocale()).format(quantity*convertedValue)} ${targetUnit || unit}`;
          }
          
          if (!categoryWithAttribute) {
            return '';
          } else {
            return (
              <span style={{
                color: categoryWithAttribute.id !== category.id ? 'gray' : 'inherit',
                whiteSpace: 'nowrap'
              }}>
                {formattedValue}
              </span>
            );
          }
        }
      ))(selectedAttribute)
    };
    columns.push(column);
  }
  return columns;
};
