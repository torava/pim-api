import React from 'react';

import AsteriskTable from 'react-asterisk-table';
import sortable from 'react-asterisk-table/lib/Sortable';
import tree from 'react-asterisk-table/lib/Tree';

const TreeTable = sortable(tree(AsteriskTable));

export default function Categories() {
  const getColumns = () => {
    let attribute_aggregate_columns = [],
        attribute_aggregates = Object.assign({}, this.state.attribute_aggregates),
        aggregate;
    for (let id in attribute_aggregates) {
      aggregate = attribute_aggregates[id];
      if (id > 0 && aggregate && !aggregate.children.length) {
        let label = locale.getNameLocale(aggregate.name)+(aggregate.unit ? " ("+aggregate.unit+")" : '');
        let target_unit = locale.getAttributeUnit(aggregate.name['en-US']);
        if (target_unit) {
          label = locale.getNameLocale(aggregate.name)+" ("+target_unit+")";
        }
        attribute_aggregate_columns.push({
          id: aggregate.name[locale.getLocale()]+'_sum',
          property: 'attribute_sum['+id+']',
          formatter: (value, item) => {
            return item.attribute_sum && 
                   item.attribute_sum[id] &&
                   item.attribute_sum[id].toLocaleString(locale.getLocale(), {minimumFractionDigits: 2,maximumFractionDigits:2});
          },
          label
        });
      }
    }
    return [
      {
        id: 'name',
        label: 'Name',
        property: item => locale.getNameLocale(item.name),
        formatter: (value, item) => <Link to={"/category/"+item.id}>{locale.getNameLocale(value)}</Link>,
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
    ].concat(this.state.attribute_aggregates[-1] ? [{
      id: 'price_sum',
      formatter: value => value && value.toFixed(2),
      label: 'Price'
    }] : [])
    .concat(attribute_aggregate_columns);
  }
  return <>
    <select
      value={this.state.average_range}
      onChange={event => this.setAverageRange(event.target.value)}>
      <option value="">All</option>
      <option value="365">Yearly average</option>
      <option value="30">Monthly average</option>
      <option value="7">Weekly average</option>
      <option value="1">Daily average</option>
    </select>
    <TreeTable
      columns={this.state.columns}
      items={this.state.resolved_categories}
      resolveItems={items => items.filter(item => item.price_sum > 0)}/>
  </>;
}
