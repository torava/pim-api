'use strict';

import React from 'react';
import {Link} from 'react-router';
import axios from 'axios';
import ReactTable from 'react-table';

const transaction_columns = [
  {
    Header: 'Date',
    accessor: 'date',
    Cell: props => <span>{new Date(props.value).toLocaleString()}</span>
  },
  {
    Header: 'Store',
    id: 'party_name',
    accessor: d => d.party.name
  },
  {
    Header: 'Total Price',
    accessor: 'total_price'
  }
]

const item_columns = [
  {
    Header: 'Name',
    accessor: d => d.product.name,
    id: 'product_name'
  },
  {
    Header: 'Category',
    accessor: d => d.category && d.category.name,
    id: 'category_name'
  },
  {
    Header: 'Price',
    accessor: 'price'
  }
]

export default class ReceiptList extends React.Component {
  constructor(props) {
    super(props);

    let that = this;

    this.state = {};

    axios.get('/api/transaction/')
    .then(function(response) {
      that.setState({
        transactions: response.data
      });
    })
    .catch(function(error) {
      console.error(error);
    });
  }
  render() {
    return (
      <ReactTable
        data={this.state.transactions}
        columns={transaction_columns}
        SubComponent={row => {
          return (
            <ReactTable
              data={this.state.transactions[row.index].items}
              columns={item_columns}
              />
          );
        }}
      />
    );
  }
}