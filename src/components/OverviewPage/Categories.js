import React from 'react';

import AsteriskTable from 'react-asterisk-table';
import sortable from 'react-asterisk-table/lib/Sortable';
import tree from 'react-asterisk-table/lib/Tree';
import { Link } from 'react-router-dom';

import { aggregateCategoryAttribute, aggregateCategoryPrice, getAverageRate } from '../../utils/categories';
import { locale } from '../locale';

const TreeTable = sortable(tree(AsteriskTable));

export default function Categories(props) {
  const {
    categories,
    attributeAggregates,
    filter,
    averageRange
  } = props;

  const getResolvedCategories = () => {
    let resolvedCategories = [...categories];
    
    const averageRate = getAverageRate(filter, averageRange);
    
    resolvedCategories = aggregateCategoryAttribute(resolvedCategories, attributeAggregates, averageRate);
    resolvedCategories = aggregateCategoryPrice(resolvedCategories, averageRate);

    return resolvedCategories;
  };

  const getColumns = () => {
    let attribute_aggregate_columns = [],
        attribute_aggregates = {...attributeAggregates},
        aggregate;
    for (const id in attributeAggregates) {
      aggregate = attributeAggregates[id];
      if (id > 0 && aggregate && !aggregate.children.length) {
        const name = locale.getNameLocale(aggregate.name);
        let label = `${name}${aggregate.unit ? ` ${aggregate.unit})` : ''}`;
        let target_unit = locale.getAttributeUnit(aggregate.name['en-US']);
        if (target_unit) {
          label = `${name} (${target_unit})`;
        }
        attribute_aggregate_columns.push({
          id: `${aggregate.name[locale.getLocale()]}_sum`,
          property: `attribute_sum[${id}]`,
          formatter: (value, item) => (
            item.attribute_sum?.[id]?.toLocaleString(locale.getLocale(), {minimumFractionDigits: 2,maximumFractionDigits:2})
          ),
          label
        });
      }
    }
    return [
      {
        id: 'name',
        label: 'Name',
        property: item => locale.getNameLocale(item.name),
        formatter: (value, item) => <Link to={`/category/${item.id}`}>{locale.getNameLocale(value)}</Link>,
        width: '700'
      },
      {
        id: 'weight_sum',
        formatter: value => value && value.toFixed(2),
        label: 'Weight'
      },
      {
        id: 'volume_sum',
        formatter: value => value && value.toFixed(2),
        label: 'Volume'
      }
    ].concat(attribute_aggregates[-1] ? [{
      id: 'price_sum',
      formatter: value => value && value.toFixed(2),
      label: 'Price'
    }] : [])
    .concat(attribute_aggregate_columns);
  }
  return <>
    <select
      value={averageRange}
      onChange={event => this.setAverageRange(event.target.value)}>
      <option value="">All</option>
      <option value="365">Yearly average</option>
      <option value="30">Monthly average</option>
      <option value="7">Weekly average</option>
      <option value="1">Daily average</option>
    </select>
    <TreeTable
      columns={getColumns()}
      items={getResolvedCategories()}
      resolveItems={items => items.filter(item => item.price_sum > 0)}/>
  </>;
}
