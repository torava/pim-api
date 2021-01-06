import React from 'react';

import AsteriskTable from 'react-asterisk-table';
import sortable from 'react-asterisk-table/lib/Sortable';
import tree from 'react-asterisk-table/lib/Tree';

import { locale } from '../locale';

const TreeTable = sortable(tree(AsteriskTable));

export default function Attributes() {
  const [columns, setColumns] = useState(getColumns());
  const [attributeAggregates, setAttributeAggregates] = useState();

  const getColumns = () => {
    return [
      {
        id: 'checkbox',
        label: <input type="checkbox"
                      id={"toggle-attribute-all"}
                      onChange={event => setAttributeAggregateVisibility(null, event.target.checked)}/>,
        formatter: (value, attribute) => <input type="checkbox"
                                                id={"toggle-attribute-"+attribute.id}
                                                checked={attributeAggregates.hasOwnProperty(attribute.id)}
                                                onChange={event => setAttributeAggregateVisibility(attribute, event.target.checked)}/>
      },
      {
        id: 'name',
        label: 'Name',
        property: attribute => locale.getNameLocale(attribute.name),
        formatter: (value, attribute) => <label htmlFor={"toggle-attribute-"+attribute.id}>{locale.getNameLocale(value)}</label>
      }
    ]
  }
  const setAttributeAggregateVisibility = (attribute, visible) => {
    function set(attribute, visible, attribute_aggregates) {
      attribute.children.forEach(child => {
        set(child, visible, attribute_aggregates);
      });
      if (visible) attribute_aggregates[attribute.id] = attribute;
      else delete attribute_aggregates[attribute.id];
    }
    let aggregates = {...attributeAggregates};

    if (attribute) {
      set(attribute, visible, attribute_aggregates);
    }
    else {
      this.state.attributes.forEach(a => {
        set(a, visible, attribute_aggregates);
      });
    }
    
    setAttributeAggregates(aggregates);
    
    let resolvedCategories = this.state.resolved_categories;
  
    const averageRate = getAverageRate(this.state.filter, this.state.average_range);
    
    resolvedCategories = aggregateCategoryAttribute(resolvedCategories, attributeAggregates, averageRate);
    resolvedCategories = aggregateCategoryPrice(resolvedCategories, averageRate);

    this.setState({
      columns: this.getColumns(),
      resolved_categories: resolvedCategories
    });
  }
  return (
    <TreeTable
      columns={columns}
      items={[{id: -1, name: 'Price', children: []}, ...this.state.attributes]}/>
  );
}
