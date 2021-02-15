import React, { useCallback, useEffect, useMemo, useState } from 'react';
//import ReactTable from 'react-table';
import AsteriskTable from 'react-asterisk-table';
import tree from 'react-asterisk-table/lib/Tree';
import sortable from 'react-asterisk-table/lib/Sortable';
import axios from 'axios';
//import Timeline from 'react-visjs-timeline';
import _ from 'lodash';
import {Link} from 'react-router-dom';

import DataStore from './DataStore';
import { downloadString, exportTransactions } from '../utils/export';
import { convertMeasure } from '../utils/entities';
import Attributes from './shared/Attributes';
import { locale } from './locale';
import { getCategoryWithAttribute } from '../utils/categories';
import { getItemAttributeValue } from '../utils/items';

import './TransactionListPage.scss';

const TreeTable = sortable(tree(AsteriskTable));
const Table = sortable(AsteriskTable);

export default function TransactionList() {
  const [groups, setGroups] = useState();
  useEffect(() => {
    async function fetchGroups() {
      const groups = await DataStore.getGroups();
      setGroups(groups);
    }
    fetchGroups();
  }, []);
  const transactionColumns = () => [
    {
      id: 'select_transaction',
      label: <input type="checkbox"
                    onClick={event => selectTransaction(null, event.target.checked)}/>,
      formatter: (value, item) => (
        <input
          type="checkbox"
          onChange={event => selectTransaction(item, event.target.checked)}
          checked={selectedTransactionIds[item.id] ? true : false}/>
      ),
      class: 'nowrap'
    },
    {
      id: 'date',
      label: 'Date',
      formatter: (value, item) => <span><Link to={"/edit/"+item.id}>{new Date(value).toLocaleString()}</Link></span>
    },
    {
      id: 'group',
      label: 'Group',
      property: transaction => groups.find(group => group.id === transaction.groupId)?.name
    },
    {
      id: 'store',
      label: 'Store',
      property: item => item.party.name
    },
    {
      id: 'total_price',
      label: 'Total Price'
    }
  ];

  const itemColumns = [
    {
      id: 'select_item',
      formatter: (value, item) => (
        <input
          type="checkbox"
          onChange={event => selectItem(item, event.target.checked)}
          checked={selectedItemIds[item.id]}/>
      ),
      class: 'nowrap'
    },
    {
      id: 'name',
      label: 'Name',
      property: item => item.product.name,
      formatter: (value, item) => (
        <span contentEditable
          onKeyUp={itemEdited}
          onBlur={itemSaved}
          data-value={value}
          data-field="product.name"
          data-id={item.id}
          data-productid={item.product.id}
          suppressContentEditableWarning={true}>
          {value}
        </span>
      )
    },
    {
      id: 'manufacturer',
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
      formatter: (value, item) => (
        <div
          data-field="category"
          data-id={item.id}
          data-productid={item.product.id}>
            {editableItem.id !== item.id || editableItem.field !== 'category' ?
            <div onClick={handleEdit}>
              {value && <a href={"/category/"+item.product.category.id}>
                {value}
              </a>}
            </div> :
            <input
              type="search"
              list="categories"
              defaultValue={value}
              onKeyUp={handleCancel}
              onBlur={handleItemCategoryChange}/>}
        </div>
      )
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
        const measure = item.product.measure || item.measure;
        const unit = item.product.unit || item.unit;
        return measure ? (item.price/convertMeasure(measure, unit, 'kg')).toLocaleString() : null;
      }
    }
  ];

  const initialAttributes = itemColumns.filter(column => column.label)
  .map(column => ({
    id: column.id,
    name: column.label
  }));

  let initialAttributeAggregates = {};

  itemColumns.filter(column => column.label)
  .forEach(column => {
    initialAttributeAggregates[column.id] = {
      id: column.id,
      name: column.label
    }
  });

  const [selectedTransactionIds, setSelectedTransactionIds] = useState({});
  const [selectedItemIds, setSelectedItemIds] = useState({});
  const [editableItem, setEditableItem] = useState({});
  const [transactions, setTransactions] = useState();
  const [categories, setCategories] = useState();
  const [attributes, setAttributes] = useState([]);
  const [attributeAggregates, setAttributeAggregates] = useState(initialAttributeAggregates);

  useEffect(() => {
    Promise.all([
      DataStore.getCategories(),
      DataStore.getTransactions(),
      DataStore.getAttributes()
    ])
    .then(([categories, transactions, attributes]) => {
      setCategories(categories);
      setTransactions(transactions);
      setAttributes(attributes);
    })
    .catch(function(error) {
      console.error(error);
    });
  }, []);

  const handleEdit = (event) => {
    setEditableItem({
      id: parseInt(event.target.parentNode.dataset.id),
      field: event.target.parentNode.dataset.field
    });
  };
  const handleCancel = (event) => {
    if (event.key == 'Escape') {
      event.target.innerHTML = event.target.dataset.value;
      setEditableItem({});
    }
  };
  const handleItemCategoryChange = (event) => {
    let value = event.target.value,
        item_id = parseInt(event.target.parentNode.dataset.id),
        product_id = parseInt(event.target.parentNode.dataset.productid),
        category_id;

    let option = document.querySelector(`#${event.target.getAttribute('list')} option[value="${value}"]`);

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
      setEditableItem({});
      return DataStore.getTransactions(true);
    })
    .catch(error => {
      console.error(error);
    });
  };

  const itemEdited = (event) => {
    if (event.key == 'Escape') {
      event.target.innerHTML = event.target.dataset.value;
      event.target.blur();
    }
  };

  const itemSaved = async (event) => {
    let id = parseInt(event.target.dataset.id),
        productid = parseInt(event.target.dataset.productid),
        field = event.target.dataset.field,
        value = event.target.innerHTML,
        item = {};

    item.id = id;
    item.product = {id: productid};
    _.set(item, field, value);

    try {
      const response = await axios.post('/api/item/', item);
      console.log(response);
      return await DataStore.getTransactions(true);
    } catch (error) {
      console.error(error);
    }
  };
  
  const removeSelected = () => {
    const queue = [];
    for (const id in selectedTransactionIds) {
      if (selectedTransactionIds[id]) {
        queue.push(axios.delete('/api/transaction/'+id));
      }
    }
    for (const id in selectedItemIds) {
      if (selectedItemIds[id]) {
        queue.push(axios.delete('/api/item/'+id));
      }
    }
    Promise.all(queue).then(() => {
      return DataStore.getTransactions()
      .then(transactions => {
        setTransactions(transactions);
      });
    })
    .catch(function(error) {
      console.error(error);
    });
  };
  const exportSelected = () => {
    console.log(transactions);
    const selectedTransactions = transactions.filter(transaction => selectedTransactionIds[transaction.id]);
    const csv = exportTransactions(selectedTransactions, categories, groups);
    console.log(csv);
    downloadString(csv, 'text/csv', 'items.csv');
  };

  const selectTransaction = useCallback((transaction, selected) => {
    let updatedTransactionIds = {...selectedTransactionIds};
    if (transaction) {
      if (selected) {
        updatedTransactionIds[transaction.id] = true;
      } else {
        delete updatedTransactionIds[transaction.id];
      }
    } else {
      if (selected) {
        transactions.forEach(transaction => {
          updatedTransactionIds[transaction.id] = true;
        });
      } else {
        updatedTransactionIds = {};
      }
    }
    console.log(transaction, selected, transactions, updatedTransactionIds);
    setSelectedTransactionIds(updatedTransactionIds);
  }, [transactions, selectedTransactionIds]);

  const selectItem = (item, selected) => {
    let updatedItemIds = {...selectedItemIds};
    if (selected) {
      updatedItemIds[item.id] = true;
    }
    else {
      delete updatedItemIds[item.id];
    }
    setSelectedItemIds(updatedItemIds);
  };

  const filteredItemColumns = itemColumns.filter(column => attributeAggregates[column.id]);
  const attributeColumns = Object.entries(attributeAggregates)
  .filter(([id]) => !itemColumns.some(column => column.id === id))
  .map(([id, attribute]) => ({
    label: locale.getNameLocale(attribute.name),
    property: item => {
      const category = getCategoryWithAttribute(categories, item.product.category?.id, attribute.id);
      const categoryAttribute = Object.values(category?.attributes || {}).find(a => a.attributeId === attribute.id);
      return getItemAttributeValue(item, categoryAttribute);
    }
  }));

  if (!transactions || !categories) return null;
  else return (
    <div className="transaction-list-page__container">
      <div className="transaction-list-page__content">
        <datalist id="categories">
          {categories.map((item, i) => (
            item.parentId !== null &&
            <option key={`category-option-${item.id}`} data-id={item.id} value={item.name}/>
          ))}
        </datalist>
        <TreeTable
          columns={transactionColumns()}
          items={transactions}
          childView={transaction => (
            <Table
              columns={[...filteredItemColumns, ...attributeColumns]}
              items={transaction.items}
            />
          )}
        />
      </div>
      <div className="transaction-list-page__options">
        <p>
          <button onClick={removeSelected}>Remove Selected</button>
          <button onClick={exportSelected}>Export Selected</button>
        </p>
        <h3>Item Attributes</h3>
        <Attributes
          attributes={[...initialAttributes, ...attributes]}
          attributeAggregates={attributeAggregates}
          setAttributeAggregates={setAttributeAggregates}/>
      </div>
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