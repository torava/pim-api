'use strict';

import React from 'react';
import {Link} from 'react-router';
import axios from 'axios';
import ReactTable from 'react-table';
import matchSorter from 'match-sorter';

const item_columns = [
  {
    Header: 'Name',
    accessor: d => d.product.name,
    id: 'product_name',
    filterMethod: (filter, rows) =>
      matchSorter(rows, filter.value, { keys: ["product.name"] })
  },
  {
    Header: 'Category',
    accessor: d => d.product.category && d.product.category.name,
    id: 'category_name',
    Cell: props => props.value ? <span><a href={"/category/"+props.original.product.category.id}>{props.value}</a></span> : <span></span>,
    filterMethod: (filter, rows) =>
      matchSorter(rows, filter.value, { keys: ["category.name"] })
  },
  {
    Header: 'Price',
    accessor: 'price'
  }
]

export default class ItemList extends React.Component {
  constructor(props) {
    super(props);

    let that = this;

    this.state = {};

    axios.get('/api/item/')
    .then(function(response) {
      that.setState({
        items: response.data
      });
    })
    .catch(function(error) {
      console.error(error);
    });
  }
  render() {
    return (
      <ReactTable
        data={this.state.items}
        columns={item_columns}
        filterable
        pageSize={this.state.items ? this.state.items.length : 1}
        showPagination={false}
        //pivotBy={"category_name"}
      />
    );
  }
}