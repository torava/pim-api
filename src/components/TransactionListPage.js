'use strict';

import React from 'react';
//import ReactTable from 'react-table';
import AsteriskTable from 'react-asterisk-table';
import tree from 'react-asterisk-table/lib/Tree';
import sortable from 'react-asterisk-table/lib/Sortable';
import DataStore from './DataStore';
import {locale} from './locale';
import axios from 'axios';
//import Timeline from 'react-visjs-timeline';
import _ from 'lodash';
import {Link} from 'react-router-dom';

const TreeTable = sortable(tree(AsteriskTable));
const Table = sortable(AsteriskTable);

export default class TransactionList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selected_transactions: {},
      editable_item: {}
    };

    Promise.all([
      DataStore.getCategories(),
      DataStore.getTransactions()
    ])
    .then(([categories, transactions]) => {
      this.setState({transactions});
    })
    .catch(function(error) {
      console.error(error);
    });

    this.editable_item = {};

    this.selectTransaction = this.selectTransaction.bind(this);
    this.selectItem = this.selectItem.bind(this);
    this.removeSelected = this.removeSelected.bind(this);
    this.itemEdited = this.itemEdited.bind(this);
    this.itemSaved = this.itemSaved.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleItemCategoryChange = this.handleItemCategoryChange.bind(this);
  }
  handleEdit() {
    this.setState({
        editable_item: {
        id: parseInt(event.target.parentNode.dataset.id),
        field: event.target.parentNode.dataset.field
      }
    });
  }
  handleCancel() {
    if (event.key == 'Escape') {
      event.target.innerHTML = event.target.dataset.value;
      this.setState({editable_item: {}});
    }
  }
  handleItemCategoryChange() {
    let value = event.target.value,
        item_id = parseInt(event.target.parentNode.dataset.id),
        product_id = parseInt(event.target.parentNode.dataset.productid),
        category_id;

    let option = document.querySelector('#'+event.target.getAttribute('list')+' option[value="'+value+'"]');

    if (option) category_id = parseInt(option.dataset.id);

    let item = {
      id: item_id,
      product: {
        id: product_id,
        category: {}
      }
    };

    if (category_id) item.product.category.id = category_id;
    else if (value) item.product.category.name = value;
    else return;

    return axios.post('/api/item/', item)
    .then(response => {
      console.log(response);
      this.setState({editable_item: {}});
      return DataStore.getTransactions(true);
    })
    .catch(error => {
      console.error(error);
    });
  }
  itemEdited(event) {
    if (event.key == 'Escape') {
      event.target.innerHTML = event.target.dataset.value;
      event.target.blur();
    }
  }
  itemSaved(event) {
    let id = parseInt(event.target.dataset.id),
        productid = parseInt(event.target.dataset.productid),
        field = event.target.dataset.field,
        value = event.target.innerHTML,
        item = {};

    item.id = id;
    item.product = {id: productid};
    _.set(item, field, value);

    return axios.post('/api/item/', item)
    .then(function(response) {
      console.log(response);
      return DataStore.getTransactions(true);
    })
    .catch(function(error) {
      console.error(error);
    });
  }
  removeSelected() {
    let queue = [];
    for (let id in this.state.selected_transactions) {
      if (this.state.selected_transactions[id]) {
        queue.push(axios.delete('/api/transaction/'+id));
      }
    }
    for (let id in this.state.selected_items) {
      if (this.state.selected_items[id]) {
        queue.push(axios.delete('/api/item/'+id));
      }
    }
    Promise.all(queue).then(() => {
      return DataStore.getTransactions()
      .then(transactions => {
        this.setState({transactions});
      });
    })
    .catch(function(error) {
      console.error(error);
    });
  }
  selectTransaction(transaction, selected) {
    let selected_transactions = {...this.state.selected_transactions};
    if (selected) {
      selected_transactions[transaction.id] = true;
    }
    else {
      delete selected_transactions[transaction.id];
    }
    this.setState({selected_transactions});
  }
  selectItem(item, selected) {
    let selected_items = {...this.state.selected_items};
    if (selected) {
      selected_items[item.id] = true;
    }
    else {
      delete selected_items[item.id];
    }
    this.setState({selected_items});
  }
  getTransactionColumns() {
    return [
      {
        id: 'select_transaction',
        label: <input type="checkbox"
                      onClick={event => this.selectTransaction(null, event.target.checked)}/>,
        formatter: (value, item) => <input type="checkbox"
                                           onClick={event => this.selectTransaction(item, event.target.checked)}/>,
        class: 'nowrap'
      },
      {
        id: 'date',
        label: 'Date',
        formatter: (value, item) => <span><Link to={"/edit/"+item.id}>{new Date(value).toLocaleString()}</Link></span>
      },
      {
        label: 'Store',
        property: item => item.party.name
      },
      {
        id: 'total_price',
        label: 'Total Price'
      }
    ];
  }
  getItemColumns() {
    return [
      {
        id: 'select_item',
        formatter: (value, item) => <input type="checkbox"
                                           onClick={event => this.selectItem(item, event.target.checked)}/>,
        class: 'nowrap'
      },
      {
        id: 'name',
        label: 'Name',
        property: item => item.product.name,
        formatter: (value, item) => <span contentEditable
                                          onKeyUp={this.itemEdited}
                                          onBlur={this.itemSaved}
                                          data-value={value}
                                          data-field="product.name"
                                          data-id={item.id}
                                          data-productid={item.product.id}
                                          suppressContentEditableWarning={true}>
                                          {value}
                                    </span>
      },
      {
        label: 'Manufacturer',
        property: item => item.product.manufacturer && item.product.manufacturer.name
      },
      {
        id: 'quantity',
        label: 'Quantity',
        property: item => item.product.quantity || item.quantity,
        formatter: value => <span contentEditable suppressContentEditableWarning={true}>{value}</span>
      },
      {
        id: 'measure',
        label: 'Measure',
        property: item => item.product.measure || item.measure,
        formatter: value => <span contentEditable suppressContentEditableWarning={true}>{value}</span>
      },
      {
        id: 'unit',
        label: 'Unit',
        property: item => item.product.unit || item.unit,
        formatter: value => <span contentEditable suppressContentEditableWarning={true}>{value}</span>
      },
      {
        id: 'category',
        label: 'Category',
        property: item => item.product.category && item.product.category.name['fi-FI'],
        formatter: (value, item) => <div data-field="category"
                                         data-id={item.id}
                                         data-productid={item.product.id}>
                                      {this.state.editable_item.id !== item.id || this.state.editable_item.field !== 'category' ?
                                        <div onClick={this.handleEdit}>
                                                {value && <a href={"/category/"+item.product.category.id}>
                                                  {value}
                                                </a>}
                                        </div> :
                                        <input type="search"
                                              list="categories"
                                              defaultValue={value}
                                              onKeyUp={this.handleCancel}
                                              onBlur={this.handleItemCategoryChange}/>}
                                    </div>
      },
      {
        id: 'price',
        label: 'Price',
        property: item => {
          let currency = localStorage.getItem('currency');
          return item.price;
        },
        formatter: value => <span contentEditable suppressContentEditableWarning={true}>{value}</span>
      },
      {
        id: 'pricemeasure',
        label: 'Price/Measure',
        property: item => {
          return item.product.measure || item.measure ? (item.price/locale.convertMeasure(item.product.measure || item.measure, item.product.unit || item.unit, 'kg')).toLocaleString() : null;
        }
      }
    ];
  }
  render() {
    if (!DataStore.transactions || !DataStore.categories) return null;
    return (
      <div>
        <datalist id="categories">
          {DataStore.categories.map(function(item, i) {
            if (item.parentId !== null) return <option data-id={item.id} value={item.name}/>
          })}
        </datalist>
        <button onClick={this.removeSelected}>Remove Selected</button>
        <TreeTable
          columns={this.getTransactionColumns()}
          items={DataStore.transactions}
          childView={(transaction) => {
            return <Table
              columns={this.getItemColumns()}
              items={transaction.items}
            />
          }}
        />
      </div>
    );
    /*return (
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
    );*/
  }
}