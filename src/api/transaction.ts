import _ from 'lodash';
import express from 'express';
import TransactionShape from '@torava/product-utils/dist/models/Transaction';
import moment from 'moment';
import { getNumber, resolveCategories, toTitleCase } from '@torava/product-utils/dist/utils/transactions';

import Category from '../models/Category';
import Item from '../models/Item';
import Manufacturer from '../models/Manufacturer';
import Product from '../models/Product';
import Transaction from '../models/Transaction';
import { getEntitiesFromCsv } from '../utils/import';
import { DeepPartial } from '@torava/product-utils/dist/utils/types';

export default (app: express.Application) => {

const TRANSACTION_CSV_INDEXES = {
  sryhma: [0, 1],
  default: [0]
};

const TRANSACTION_CSV_STARTING_ROW = {
  sryhma: 10,
  default: 1
};
  

const TRANSACTION_CSV_COLUMNS = {
  sryhma: (i: number) => [
    'date_fi_FI',
    'time',
    'party.name',
    `items[${i}].product.category.name['fi-FI']`,
    `items[${i}].product.name`,
    `items[${i}].product.productNumber`,
    null,
    `items[${i}].quantity_or_measure`,
    null,
    null,
    `items[${i}].price`
  ],
  kesko: (i: number) => [
    'id',
    'date_fi_FI',
    'party.name',
    `items[${i}].product.name`,
    `items[${i}].quantity_or_measure`,
    `items[${i}].price`
  ],
  default: (i: number) => [
    'id',
    'date',
    'receipts[0].id',
    'receipts[0].file',
    'receipts[0].locale',
    'party.id',
    'party.name',
    'items['+i+'].product.name',
    'items['+i+'].product.category.id',
    'items['+i+'].product.category.name[fi-FI]',
    'items['+i+'].price',
    'items['+i+'].quantity',
    'items['+i+'].measure',
    'items['+i+'].unit'
  ]
};

const TRANSACTION_CSV_COLUMN_NAMES = [
  'Id',
  'Date',
  'Receipt id',
  'Receipt file',
  'Receipt locale',
  'Party id',
  'Party name',
  'Product name',
  'Product category id',
  'Product category name',
  'Item price',
  'Item quantity',
  'Item measure',
  'Item unit'
];
const CSV_SEPARATOR = {
  sryhma: ';',
  kesko: ',',
  default: ';'
};

app.get('/api/transaction', async (req, res) => {
  try {
    if ('tocsv' in req.query) {
      let response = [['SEP='+CSV_SEPARATOR], TRANSACTION_CSV_COLUMN_NAMES.join(CSV_SEPARATOR.default)];
      const transactions = await Transaction.query()
      .withGraphFetched('[items.[product.[category, manufacturer, attributes]], party, receipts]');
      for (const n in transactions) {
        let items = transactions[n].items;
        for (const i in items) {
          // transaction id, transaction date, party id, party name, product name, item price
          response.push(_.at(transactions[n], TRANSACTION_CSV_COLUMNS.default(Number(i)) as (keyof TransactionShape)[]).join(CSV_SEPARATOR.default));
        }
      }
      res.send(response.join('\n'));
    }
    else if (req.query.hasOwnProperty('categories')) {
      const transactions = await Transaction.query()
      .withGraphFetched('[items.[product.[category.[parent.^], manufacturer]], party, receipts]')
      res.send(transactions);
    }
    else {
      const transactions = await Transaction.query()
      .orderBy('id')
      .withGraphFetched('[items.[product.[category.[attributes], manufacturer, attributes]], party, receipts]')
      res.send(transactions);
    }
  } catch (error) {
    console.error(error);
  }
});

app.post('/api/transaction/csv', async (req, res) => {
  // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/40915#issuecomment-563917863
  if (Array.isArray(req.files.transactions)) {
    throw new Error('Please upload only one file');
  }
  let transactions: Record<string, DeepPartial<Transaction>> = {};
  const template = req.query.template || 'default';
  console.log('template', template);
  const indexes =
    TRANSACTION_CSV_INDEXES[template as keyof typeof TRANSACTION_CSV_INDEXES] ||
    TRANSACTION_CSV_INDEXES.default;
  const startingRow =
    TRANSACTION_CSV_STARTING_ROW[template as keyof typeof TRANSACTION_CSV_STARTING_ROW] ||
    TRANSACTION_CSV_STARTING_ROW.default;

  let columns: string[],
      tokens,
      measure,
      itemIndex = 0,
      rows = getEntitiesFromCsv(req.files.transactions.data, {
        delimiter: CSV_SEPARATOR[template as keyof typeof CSV_SEPARATOR],
        columns: false,
      });

  try {
    for (let i = startingRow; i < rows.length; i++) {
      let columnKey = '';
      columns = rows[i];
      indexes.forEach(index => {
          columnKey+= columns[index];
      });
      if (!(columnKey in transactions)) {
        itemIndex = 0;
        transactions[columnKey] = {items: [], party: {}, receipts: [], totalPrice: 0};
      }
      for (const n in columns) {
        let columnName = TRANSACTION_CSV_COLUMNS[template as keyof typeof TRANSACTION_CSV_COLUMNS](itemIndex)[n];

        let value = columns[n];
        let numberValue: number;

        if (!columnName || !value) continue;

        console.log(i, columnName, value);

        if (columnName.split('.').includes('name') || columnName.split('.').includes(`name['fi-FI']`)) {
          value = toTitleCase(value);

          const quantityAndMeasureTokens = value.toLocaleLowerCase().match(/(\d+)x(\d+(,\d+)?)\s?((m|k)?(g|l))(\s|$)/);
          let quantity = quantityAndMeasureTokens && getNumber(quantityAndMeasureTokens[1]);
          const quantityTokens = value.toLocaleLowerCase().match(/(\d+)\s?(p|kpl)(\s|$)/);
          if (quantityTokens) {
            quantity = getNumber(quantityTokens[1]);
          }
          if (quantity) {
            _.set(transactions[columnKey], `items[${itemIndex}].quantity`, quantity);
          } else {
            const measureTokens = value.toLocaleLowerCase().match(/\s((m|k)?(g|l))(\s|$)/);
            if (measureTokens) {
              _.set(transactions[columnKey], `items[${itemIndex}].unit`, measureTokens[1]);
            }
            tokens = value.toLocaleLowerCase().match(/(\d+(,\d+)?)\s?((m|k)?(g|l))(\s|$)/);
            measure = tokens && getNumber(tokens[1]);
            if (measure) {
              _.set(transactions[columnKey], `items[${itemIndex}].measure`, measure);
              _.set(transactions[columnKey], `items[${itemIndex}].unit`, tokens[3]);
            }
          }
        }

        if (columnName.split('.')[1] === 'quantity_or_measure') {
          if (value.match(/^-?\d+(\.|,)\d+$/)) {
            columnName = columnName.replace('quantity_or_measure', 'measure');
            numberValue = getNumber(value);
          }
          else {
            columnName = columnName.replace('quantity_or_measure', 'quantity');
            numberValue = getNumber(value);
          }
        }
        else if (columnName === 'date_fi_FI') {
          let date = value.split('.');
          value = moment().format(`${date[2]}-${date[1].padStart(2, '0')}-${date[0].padStart(2, '0')}`);
          columnName = 'date';
        }
        else if (columnName === 'time') {
          let time = value.split(':');
          value = moment(transactions[columnKey].date).add(time[0], 'hours').add(time[1], 'minutes').format();
          columnName = 'date';
        }
        else if (columnName.split('.')[1] === 'price') {
          numberValue = getNumber(value);
          transactions[columnKey].totalPrice += numberValue;
        }
        if (columnName !== 'id') {
          if (typeof numberValue === 'number') {
            if (columnName.includes('quantity')) {
              _.set(transactions[columnKey], columnName, numberValue * (_.get(transactions[columnKey], columnName) || 1));
            } else {
              _.set(transactions[columnKey], columnName, numberValue);
            }
          } else {
            _.set(transactions[columnKey], columnName, value);
          }
        }
      }
      itemIndex++;
    }
  } catch (error) {
    console.error(error);
  }

  const items = await Item.query();
  const products = await Product.query();
  const categories = await Category.query().withGraphFetched('[attributes]');
  const leafCategories = categories.filter((parent) => !categories.some((child) => child.parentId === parent.id))
  const manufacturers = await Manufacturer.query();
  
  let promises = [];
  for await (let transaction of Object.values(transactions)) {
    transaction.items = transaction.items.filter((item) => item);
    try {
      await resolveCategories(transaction, items, products, leafCategories, manufacturers);
    } catch (error) {
      console.error(error);
      return res.sendStatus(500);
    }

    /*for (const item of transaction.items) {
      if (!item.product.categoryId) {
        const name = item.product.category.name['fi-FI'];
        console.log('Skipping orphan category', name);
        delete item.product.category;
      }
    }*/

    console.log('transaction');
    console.dir(transaction, { depth: null });

    promises.push(
      Transaction.query()
      .insertGraph(transaction, {relate: true})
    );
  }
  
  try {
    const transactions = await Promise.all(promises);
    console.dir(transactions, {depth:null});
    res.send(transactions);
  }
  catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/api/transaction', async (req, res) => {
  const transaction = req.body[0];
  try {
    const items = await Item.query()
    .withGraphFetched('[product.[category]]');
    const categories = await Category.query()
    .withGraphFetched('[children, parent]');
    const products = await Product.query();
    const manufacturers = await Manufacturer.query();

    await resolveCategories(transaction, items, products, categories, manufacturers);

    console.dir(transaction, {depth:null});

    return res.send(transaction);
  } catch (error) {
    console.dir(transaction, {depth:null});
    console.error(error);
    return res.sendStatus(500);
  }
});

};
