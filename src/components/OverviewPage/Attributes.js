import React from 'react';

import AsteriskTable from 'react-asterisk-table';
import sortable from 'react-asterisk-table/lib/Sortable';
import tree from 'react-asterisk-table/lib/Tree';

import { locale } from '../locale';

const TreeTable = sortable(tree(AsteriskTable));

export default function Attributes(props) {
  const {
    attributes,
    attributeAggregates,
    setAttributeAggregates
  } = props;

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
    function set(attribute, visible, aggregates) {
      attribute.children.forEach(child => {
        set(child, visible, aggregates);
      });
      if (visible) aggregates[attribute.id] = attribute;
      else delete aggregates[attribute.id];
    }
    let aggregates = {...attributeAggregates};

    if (attribute) {
      set(attribute, visible, aggregates);
    }
    else {
      this.state.attributes.forEach(a => {
        set(a, visible, aggregates);
      });
    }
    
    setAttributeAggregates(aggregates);
  }
  return (
    <TreeTable
      columns={getColumns()}
      items={[{id: -1, name: 'Price', children: []}, ...attributes]}/>
  );
}
