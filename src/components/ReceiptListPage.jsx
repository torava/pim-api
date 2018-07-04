'use strict';

import React from 'react';
import {Link} from 'react-router';
import axios from 'axios';
import ReactTable from 'react-table';

function convertMeasure(measure, from_unit, to_unit) {
  const factors = {
    y: -24,
    z: -21,
    a: -16,
    f: -15,
    p: -12,
    n: -9,
    µ: -6,
    m: -3,
    c: -2,
    d: -1,
    '': 0,
    da: 1,
    h: 2,
    k: 3,
    M: 6,
    G: 9,
    T: 12,
    P: 15,
    E: 18,
    Z: 21,
    Y: 24
  }
  if (from_unit && from_unit.length > 1) {
    from_unit = from_unit.substring(0,1);
    from_unit = from_unit.toLowerCase();
  }
  else {
    from_unit = '';
  }
  if (to_unit && to_unit.length > 1) {
    to_unit = to_unit.substring(0,1);
    to_unit = to_unit.toLowerCase();
  }
  else {
    to_unit = '';
  }
  let conversion = factors[from_unit]-factors[to_unit];
  console.log(conversion, from_unit, to_unit);
  return measure*Math.pow(10, conversion);
}

const transaction_columns = [
  {
    Header: 'Date',
    accessor: 'date',
    Cell: props => <span><a href={"/edit/"+props.original.id}>{new Date(props.value).toLocaleString()}</a></span>
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
    Header: 'Quantity',
    id: 'quantity'
  },
  {
    Header: 'Measure',
    id: 'measure'
  },
  {
    Header: 'Category',
    accessor: d => d.product.category && d.product.category.name['fi-FI'],
    id: 'category_name',
    Cell: props => props.value ? <span><a href={"/category/"+props.original.product.category.id}>{props.value}</a></span> : <span></span>
  },
  {
    Header: 'Price',
    id: 'price',
    accessor: d => {
      let currency = localStorage.getItem('currency');
      console.log(currency, d);
      return d.price;
    }
  },
  {
    Header: 'Price/Measure',
    id: 'pricepermeasure',
    accessor: d => {
      return d.measure ? d.price/convertMeasure(d.measure, d.unit, 'kg') : null;
    }
  }
]

export default class ReceiptList extends React.Component {
  constructor(props) {
    super(props);

    let that = this;

    this.state = {};

    axios.get('/api/attribute/')
    .then(function(attributes) {
      that.setState({attributes: attributes.data});
      axios.get('/api/transaction/')
      .then(function(response) {
        that.setState({
          transactions: response.data
        });
      })
      .catch(function(error) {
        console.error(error);
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
        pageSize={this.state.transactions ? this.state.transactions.length : 1}
        showPagination={false}
        SubComponent={row => {
          return (
            <ReactTable
              data={this.state.transactions[row.index].items}
              pageSize={this.state.transactions[row.index].items ? this.state.transactions[row.index].items.length : 1}
              showPagination={false}
              columns={item_columns}
              />
          );
        }}
      />
    );
  }
}