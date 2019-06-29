'use strict';

import React from 'react';
import ReactTable from 'react-table';
import DataStore from './DataStore';
import {locale} from './locale';
//import Timeline from 'react-visjs-timeline';

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
    id: 'quantity',
    accessor: d => d.product.quantity || d.quantity
  },
  {
    Header: 'Measure',
    id: 'measure',
    accessor: d => d.product.measure || d.measure
  },
  {
    Header: 'Unit',
    id: 'unit',
    accessor: d => d.product.unit || d.unit
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
      return d.product.measure || d.measure ? (d.price/locale.convertMeasure(d.product.measure || d.measure, d.product.unit || d.unit, 'kg')).toLocaleString() : null;
    }
  }
]

export default class TransactionList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ready: false
    };

    DataStore.getTransactions()
    .then(result => {
      this.setState({
        ready: true
      });
    })
    .catch(function(error) {
      console.error(error);
    });
  }
  render() {
    return (
      <div>
        <ReactTable
          data={DataStore.transactions}
          columns={transaction_columns}
          pageSize={DataStore.transactions ? DataStore.transactions.length : 1}
          showPagination={false}
          SubComponent={row => {
            return (
              <ReactTable
                data={DataStore.transactions[row.index].items}
                pageSize={DataStore.transactions[row.index].items ? DataStore.transactions[row.index].items.length : 1}
                showPagination={false}
                columns={item_columns}
                />
            );
          }}
        />
      </div>
    );
  }
}