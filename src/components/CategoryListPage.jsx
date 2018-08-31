'use strict';

import axios from 'axios';
import React, {Component} from 'react';
import EditableTable from './EditableTable';

class CategoryList extends Component {
  constructor(props) {
    super(props);

    let that = this;

    this.state = {};

    axios.get('/api/attribute/?parent')
    .then(function(attributes) {
      that.setState({attributes: attributes.data});
      
      axios.get('/api/category/?attributes&parent&locale=fi-FI')
      .then(function(categories) {
        that.setState({
          categories: categories.data,
          columns: that.getColumns()
        });

        document.title = "Categories";
      });
    });
  }
  getAttributeColumn(attributes) {
    let that = this;
    return attributes.map((value, key) => {
      let column = {
        id: key,
        label: value.name['fi-FI']+(value.unit ? " "+value.unit.toLowerCase() : ""),
        property: 'attributes['+value.id+'].value'
      }
      if (value.children) {
        column.columns = that.getAttributeColumn(value.children);
      }
      return column;
    });
  }
  getColumns() {
    return [
      {
        id: 'name',
        label: 'Name',
        property: 'name',
        formatter: (value, item) => <a href={"/category/"+item.id}>{value}</a>,
        width: '700'
      },
      {
        id: 'price',
        label: 'Price'
      },
    ].concat(this.getAttributeColumn(this.state.attributes));
  }
  render() {
    if (!this.state || !this.state.columns || !this.state.attributes) return null;
    return (
      <EditableTable
        columns={this.state.columns}
        items={this.state.categories}
      />
    );
  }
}

module.exports = CategoryList;