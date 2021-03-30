'use strict';

import axios from 'axios';
import React, {Component} from 'react';
import AsteriskTable from 'react-asterisk-table';
import tree from 'react-asterisk-table/lib/Tree';
import sortable from 'react-asterisk-table/lib/Sortable';

import { locale } from './locale';
import config from '../../config/default.json';
import DataStore from './DataStore';

const TreeTable = sortable(tree(AsteriskTable));

export default class CategoryList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selected_attributes: {},
      searchCategoryName: ''
    };

    Promise.all([
      DataStore.getAttributes(),
      axios.get('/api/category/?parent&locale='+locale.getLocale())
    ])
    .then(([attributes, categories]) => {
      this.setState({
        categories: categories.data,
        resolvedCategories: categories.data,
        attributes: attributes
      }, () => {
        this.setState({
          columns: this.getColumns(),
          attribute_selector_columns: this.getAttributeSelectorColumns()
        });
      });
    })
    .catch(error => {
      console.error(error);
    });

    this.setAttributeVisibility = this.setAttributeVisibility.bind(this);
    this.selectCategory = this.selectCategory.bind(this);
    this.copyAttributes = this.copyAttributes.bind(this);
    this.setSearchCategoryName = this.setSearchCategoryName.bind(this);
  }
  setAttributeVisibility(attribute, visible) {
    function set(attribute, visible, selected_attributes) {
      attribute.children.forEach(child => {
        set(child, visible, selected_attributes);
      });
      if (visible) selected_attributes[attribute.id] = attribute;
      else delete selected_attributes[attribute.id];
    }
    let selected_attributes = {...this.state.selected_attributes};
    if (attribute) {
      set(attribute, visible, selected_attributes);
    }
    else {
      this.state.attributes.forEach(a => {
        set(a, visible, selected_attributes);
      });
    }

    this.setState({selected_attributes},
    () => {
      this.setState({columns: this.getColumns()});
    });
  }
  getAttributeColumns(attributes) {
    let columns = [];
    let value;
    for (let key in attributes) {
      value = attributes[key];
      let column = {
        id: value.id,
        label: value.name['fi-FI']+(value.unit ? " "+value.unit : ""),
        property: 'attributes['+value.id+'].value'
      }
      let target_unit = locale.getAttributeUnit(value.name['en-US']);
      if (target_unit) {
        let rate = config.unit_conversions[value.unit][target_unit];
        if (rate) {
          column.label = value.name['fi-FI']+" "+target_unit;
          column.formatter = (v, i) => {
            let result = rate*v;
            return result ? result.toFixed(2) : '';
          }
        }
      }
      if (value.children) {
        column.columns = this.getAttributeColumns(value.children);
      }
      columns.push(column);
    }
    return columns;
  }
  getAttributeSelectorColumns() {
    return [
      {
        id: 'checkbox',
        label: <input type="checkbox"
                      id={"toggle-attribute-all"}
                      onChange={event => this.setAttributeVisibility(null, event.target.checked)}/>,
        formatter: (value, attribute) => <input type="checkbox"
                                                id={"toggle-attribute-"+attribute.id}
                                                checked={this.state.selected_attributes[attribute.id]}
                                                onChange={event => this.setAttributeVisibility(attribute, event.target.checked)}/>
      },
      {
        id: 'name',
        label: 'Name',
        property: attribute => locale.getNameLocale(attribute.name),
        formatter: (value, attribute) => <label htmlFor={"toggle-attribute-"+attribute.id}>{locale.getNameLocale(value)}</label>
      },
      {
        id: 'unit',
        label: 'Unit'
      }
    ];
  }
  getColumns() {
    return [
      {
        label: <input type="checkbox"
                      onClick={event => this.selectCategory(null, event.target.checked)}/>,
        formatter: (value, item) => <input type="checkbox"
                                           onClick={event => this.selectCategory(item, event.target.checked)}/>,
        class: 'nowrap'
      },
      {
        id: 'name',
        label: 'Name',
        property: 'name',
        formatter: (value, item) => {
          const searchCategoryName = this.state.searchCategoryName;
          const index = value.toLowerCase().indexOf(searchCategoryName.toLowerCase());
          let content = value;
          if (index !== -1) {
            content = <>
              {value.slice(0, index)}
              <b>{value.slice(index, index+searchCategoryName.length)}</b>
              {value.slice(index+searchCategoryName.length)}
            </>;
          }
          return <a href={"/category/"+item.id}>
            {content}
          </a>;
        },
        width: '700'
      },
      {
        id: 'price',
        label: 'Price'
      },
    ].concat(this.getAttributeColumns(this.state.selected_attributes));
  }
  selectCategory(category, selected) {
    let selected_categories = {...this.state.selected_categories};
    if (selected) {
      selected_categories[category.id] = true;
    }
    else {
      delete selected_categories[category.id];
    }
    this.setState({selected_categories});
  }
  copyAttributes() {
    axios.post('/api/category/attribute/copy', {
      attributes: Object.keys(this.state.selected_attributes),
      categories: Object.keys(this.state.selected_categories)
    })
    .then(result => {
      console.log(result);
      DataStore.getCategoriesWithAttributes(true)
      .then(categories => {
        this.setState({categories});
      });
    })
    .catch(error => {
      console.error(error);
    });
  }
  setSearchCategoryName(searchCategoryName) {
    this.setState({
      searchCategoryName
    }, () => {
      if (searchCategoryName !== '') {
        const resolvedCategories = this.state.categories.filter(category => (
          category.name.toLowerCase().indexOf(searchCategoryName.toLowerCase()) !== -1
        ));
        this.setState({
          resolvedCategories
        });
      } else {
        this.setState({
          resolvedCategories: this.state.categories
        });
      }
    });
  }
  render() {
    if (!this.state || !this.state.columns || !this.state.attributes) return null;
    return (
      <div>
        <button onClick={this.copyAttributes}>Copy Selected Attributes</button>
        <TreeTable
          columns={this.state.attribute_selector_columns}
          items={this.state.attributes}/>
        <p>
          <label>
            Search category:&nbsp;
            <input
              type="search"
              value={this.state.searchCategoryName}
              onChange={event => this.setSearchCategoryName(event.target.value)}/>
          </label>
        </p>
        <TreeTable
          columns={this.state.columns}
          items={this.state.resolvedCategories}/>
      </div>
    );
  }
}