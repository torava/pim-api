import React, { useMemo } from 'react';
import AsteriskTable from 'react-asterisk-table';
import sortable from 'react-asterisk-table/lib/Sortable';
import tree from 'react-asterisk-table/lib/Tree';
import classNames from 'classnames';

import { locale } from '../locale';

const TreeTable = sortable(tree(AsteriskTable));

export default function Attributes(props) {
  const {
    attributeAggregates,
    setAttributeAggregates,
    selectedAttributeId,
    setSelectedAttributeId,
    attributeGoals,
    setAttributeGoals
  } = props;

  const attributes = [{id: -1, name: 'Price', children: []}, ...props.attributes];

  const selectedAttribute = useMemo(() => attributes.find(attribute => attribute.id === selectedAttributeId), [attributes, selectedAttributeId]);

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
        formatter: (value, attribute) => (
          <span
            className={classNames('attributes__attribute-name', attribute.id === selectedAttributeId && 'attributes__attribute-name--selected')}
            onClick={() => setSelectedAttributeId(attribute.id)}>
              {locale.getNameLocale(value)}
          </span>
        )
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
  const setAttributeGoal = (goal) => {
    setAttributeGoals({
      ...attributeGoals,
      [selectedAttributeId]: goal
    });
  };
  return <>
    <TreeTable
      columns={getColumns()}
      items={attributes}/>
    <p>
      Selected: {locale.getNameLocale(selectedAttribute?.name)}
    </p>
    <p>
      Goal: <input
        type="number"
        value={attributeGoals[selectedAttributeId]}
        onChange={event => setAttributeGoal(event.target.value)}/>
    </p>
  </>;
}
