import React, { useCallback, useState } from 'react';
import AsteriskTable from 'react-asterisk-table';
import tree from 'react-asterisk-table/lib/Tree';
import sortable from 'react-asterisk-table/lib/Sortable';
import {Link} from 'react-router-dom';

import { downloadString, exportTransactions, getCsvFromObject, getXlsxFromObject } from '../utils/export';
import { convertMeasure } from '../../utils/entities';
import { locale } from './locale';
import { getCategoriesWithAttributes } from '../../utils/categories';
import { getItemAttributeValue } from '../../utils/items';

import './TransactionList.scss';

const TreeTable = sortable(tree(AsteriskTable));
const Table = sortable(AsteriskTable);

export default function TransactionList({
  transactions,
  categories,
  attributes,
  attributeAggregates,
  format
}) {
  const selectItemFormatter = (value, item) => (
    <input
      type="checkbox"
      onChange={event => selectItem(item, event.target.checked)}
      checked={selectedItemIds[item.id]}/>
  );
  const itemColumns = [
    {
      id: 'select_item',
      formatter: selectItemFormatter,
      class: 'nowrap'
    },
    {
      id: 'name',
      label: 'Name',
      property: item => item.product.name
    },
    {
      id: 'quantity',
      label: 'Quantity',
      property: item => item.product.quantity || item.quantity
    },
    {
      id: 'measure',
      label: 'Measure',
      property: item => item.product.measure || item.measure
    },
    {
      id: 'unit',
      label: 'Unit',
      property: item => item.product.unit || item.unit
    },
    {
      id: 'category',
      label: 'Category',
      property: item => (
        item.product.categoryId &&
        categories.find(category => category.id === item.product.categoryId)?.name[locale.getLocale()]
      )
    },
    {
      id: 'price',
      label: 'Price',
      property: item => {
        //let currency = localStorage.getItem('currency');
        return item.price.toLocaleString();
      }
    },
    {
      id: 'pricemeasure',
      label: 'Price/Measure',
      property: item => {
        const measure = item.product.measure || item.measure;
        const unit = item.product.unit || item.unit;
        return measure ? (item.price/convertMeasure(measure, unit, 'kg')).toLocaleString() : null;
      }
    }
  ];

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

  const selectTransactionFormatter = (value, item) => (
    <input
      type="checkbox"
      onChange={event => selectTransaction(item, event.target.checked)}
      checked={selectedTransactionIds[item.id] ? true : false}/>
  );
  const transactionDateFormatter = (value, item) => (
    <span><Link to={"/edit/"+item.id}>{new Date(value).toLocaleString()}</Link></span>
  );
  
  const transactionColumns = () => [
    {
      id: 'select_transaction',
      label: <input type="checkbox"
                    onClick={event => selectTransaction(null, event.target.checked)}/>,
      formatter: selectTransactionFormatter,
      class: 'nowrap'
    },
    {
      id: 'date',
      label: 'Date',
      formatter: transactionDateFormatter
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
  
  const exportSelected = async () => {
    console.log(transactions);
    const selectedTransactions = transactions.filter(transaction => selectedTransactionIds[transaction.id]);
    
    /*const csv = exportTransactions(selectedTransactions, categories, attributes, attributeAggregates);
    console.log(csv);
    downloadString(csv, 'text/csv', 'items.csv');*/

    const rows = exportTransactions(selectedTransactions, categories, attributes, attributeAggregates);
    if (format === 'text/csv') {
      const csv = await getCsvFromObject(rows);
      downloadString(csv, format, 'items.csv');
    } else if (format === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const xlsx = await getXlsxFromObject(rows);
      downloadString(xlsx, format, 'items.xlsx');
    }
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
  .map(([attributeId, attribute]) => ({
    label: locale.getNameLocale(attribute.name),
    property: item => {
      /*const category = getCategoryWithAttributes(categories, item.product.category?.id, attribute.id);
      const categoryAttribute = Object.values(category?.attributes || {}).find(a => a.attributeId === attribute.id);
      return getItemAttributeValue(item, categoryAttribute, attributes);*/

      const productCategory = categories.find(category => category.id === item.product.categoryId);
      const result = getCategoriesWithAttributes(categories, productCategory, Number(attributeId));
      const [, itemAttributes] = result?.[0] || [undefined, undefined];
      const [attributeValue] = getItemAttributeValue(item, itemAttributes, attributes) || [undefined, undefined];
      return attributeValue?.toLocaleString();
    }
  }));

  if (!transactions || !categories) return null;
  else return (
    <>
      <button onClick={exportSelected}>Export Selected</button>
      <TreeTable
        columns={transactionColumns()}
        items={transactions}
        childView={transaction => {
          console.log(transaction, transaction.items);
          return <Table
            columns={[...itemColumns, ...attributeColumns]}
            items={transaction.items}
          />;
        }}
      />
    </>
  );
}