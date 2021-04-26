import React from 'react';

import config from '../../config/default';
import { getCategoryWithAttributes } from '../../utils/categories';
import { locale } from '../components/locale';

export const getAttributeColumns = (selectedAttributes, categories = [], attributeUnits = {}) => {
  let columns = [];
  let selectedAttribute;
  for (let key in selectedAttributes) {
    selectedAttribute = selectedAttributes[key];
    let column = {
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
          
          if (!categoryWithAttribute) {
            return '';
          } else {
            return (
              <span style={{
                color: categoryWithAttribute.id !== category.id ? 'gray' : 'inherit',
                whiteSpace: 'nowrap'
              }}>
                {`${new Intl.NumberFormat(locale.getLocale()).format(rate*value)} ${targetUnit || unit}`}
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
