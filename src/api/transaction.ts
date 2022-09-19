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
    `items[${i}].product.product_number`,
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
  let transaction: Record<string, TransactionShape> = {};
  const template = req.query.template || 'default';
  const indexes = TRANSACTION_CSV_INDEXES[template as keyof typeof TRANSACTION_CSV_INDEXES];
  const startingRow = (
    TRANSACTION_CSV_STARTING_ROW[template as keyof typeof TRANSACTION_CSV_STARTING_ROW] ||
    TRANSACTION_CSV_STARTING_ROW['default']
  );

  let columns: string[],
      tokens,
      measure,
      itemIndex = 0,
      rows = getEntitiesFromCsv(req.files.transactions.data, {
        delimiter: CSV_SEPARATOR[template as keyof typeof CSV_SEPARATOR],
        columns: false
      }),
      categoryRefs: string[] = [];

  try {
    for (let i = startingRow; i < rows.length; i++) {
      let columnKey = '';
      columns = rows[i];
      indexes.forEach(index => {
          columnKey+= columns[index];
      });
      if (!(columnKey in transaction)) {
        itemIndex = 0;
        transaction[columnKey] = {items: [], party: {}, receipts: [], totalPrice: 0};
      }
      for (let n in columns) {
        let columnName = TRANSACTION_CSV_COLUMNS[template as keyof typeof TRANSACTION_CSV_COLUMNS](itemIndex)[n];

        let value = columns[n];
        let numberValue: number;

        if (!columnName || !value) continue;

        console.log(i, columnName, value);

        if (columnName.split('.').includes('name') || columnName.split('.').includes(`name['fi-FI']`)) {
          value = toTitleCase(value);

          if (columnName.split('.').includes('category')) {
            if (categoryRefs.some(ref => ref === value)) {
              columnName = columnName.replace(`name['fi-FI']`, '#ref');
            }
            else {
              categoryRefs.push(value);
              _.set(transaction[columnKey], columnName.replace(`name['fi-FI']`, '#id'), value);
            }
          }

          tokens = value.match(/(\d{1,4})\s?((m|k)?((g|9)|(l|1)))/);
          measure = tokens && parseFloat(tokens[1]);
          if (measure) {
            _.set(transaction[columnKey], `items[${itemIndex}].measure`, measure);
            _.set(transaction[columnKey], `items[${itemIndex}].unit`, tokens[2]);
          }
        }

        if (columnName.split('.')[1] === 'quantity_or_measure') {
          if (value.match(/^\d+\.\d{3}$/)) {
            columnName = columnName.replace('quantity_or_measure', 'measure');
            numberValue = getNumber(value);
          }
          else {
            columnName = columnName.replace('quantity_or_measure', 'quantity');
            numberValue = parseFloat(value);
          }
        }
        else if (columnName === 'date_fi_FI') {
          let date = value.split('.');
          value = moment().format(`${date[2]}-${date[1].padStart(2, '0')}-${date[0].padStart(2, '0')}`);
          columnName = 'date';
        }
        else if (columnName === 'time') {
          let time = value.split(':');
          value = moment(transaction[columnKey].date).add(time[0], 'hours').add(time[1], 'minutes').format();
          columnName = 'date';
        }
        else if (columnName.split('.')[1] === 'price') {
          numberValue = getNumber(value);
          transaction[columnKey].totalPrice += numberValue;
        }
        if (columnName !== 'id') {
          _.set(transaction[columnKey], columnName, numberValue || value);
        }
      }
      itemIndex++;
    }
  } catch (error) {
    console.error(error);
  }
  
  let promises = [];
  for (let i in transaction) {
    try {
      await resolveCategories(transaction[i]);
    } catch (error) {
      console.error(error);
      return res.sendStatus(500);
    }

    promises.push(
      Transaction.query()
      .upsertGraph(transaction[i], {relate: true})
    );
  }
  return Promise.all(promises)
  .then(transaction => {
    console.dir(transaction, {depth:null});
    return res.send(transaction);
  })
  .catch(error => {
    console.dir(transaction, {depth:null});
    console.error(error);
    return res.sendStatus(500);
  });
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

}