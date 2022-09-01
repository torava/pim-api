import _ from 'lodash';
import express from 'express';
import ItemShape from '@torava/product-utils/dist/models/Item';
import ProductShape from '@torava/product-utils/dist/models/Product';
import { NameTranslations } from '@torava/product-utils/dist/utils/types';
import TransactionShape from '@torava/product-utils/dist/models/Transaction';
import moment from 'moment';

import { CSVToArray, getNumber, resolveCategories, toTitleCase } from '../utils/transactions';
import Category, { CategoryShape } from '../models/Category';
import Item from '../models/Item';
import Manufacturer from '../models/Manufacturer';
import Product from '../models/Product';
import Transaction from '../models/Transaction';

export default (app: express.Application) => {

const TRANSACTION_CSV_INDEXES = {
  sryhma: [0, 1]
};

const TRANSACTION_CSV_STARTING_ROW = {
  sryhma: 10
};
  

const TRANSACTION_CSV_COLUMNS = {
  sryhma: (i: string) => [
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
  kesko: (i: string) => [
    'id',
    'date_fi_FI',
    'party.name',
    `items[${i}].product.name`,
    `items[${i}].quantity_or_measure`,
    `items[${i}].price`
  ],
  default: (i: string) => [
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
      for (let n in transactions) {
        let items = transactions[n].items;
        for (let i in items) {
          // transaction id, transaction date, party id, party name, product name, item price
          response.push(_.at(transactions[n], TRANSACTION_CSV_COLUMNS.default(i) as (keyof TransactionShape)[]).join(CSV_SEPARATOR.default));
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

app.post('/api/transaction', async (req, res) => {
  if ('fromcsv' in req.query) {
    let transaction: TransactionShape = {};
    const template = (req.query.template || 'default') as keyof typeof TRANSACTION_CSV_INDEXES;
    const indexes = TRANSACTION_CSV_INDEXES[template] || [0];
    const startingRow = TRANSACTION_CSV_STARTING_ROW[template] || 1;

    let columns: string[],
        tokens,
        measure,
        item_index = 0,
        rows = CSVToArray(req.body.transaction, CSV_SEPARATOR[template] || ';'),
        categoryRefs: string[] = [];

    try {
      for (let i = startingRow; i < rows.length; i++) {
        let columnKey = '';
        columns = rows[i];
        indexes.forEach(index => {
            columnKey+= columns[index];
        });
        if (!(columnKey in transaction)) {
          item_index = 0;
          transaction[columnKey as keyof TransactionShape] = {items: [], party: {}, receipts: [], total_price: 0};
        }
        for (let n in columns) {
          let column_name = TRANSACTION_CSV_COLUMNS[template](item_index)[n];

          let value = columns[n];

          if (!column_name || !value) continue;

          console.log(i, column_name, value);

          if (column_name.split('.').includes('name') || column_name.split('.').includes(`name['fi-FI']`)) {
            value = toTitleCase(value);

            if (column_name.split('.').includes('category')) {
              if (categoryRefs.some(ref => ref === value)) {
                column_name = column_name.replace(`name['fi-FI']`, '#ref');
              }
              else {
                categoryRefs.push(value);
                _.set(transaction[columnKey], column_name.replace(`name['fi-FI']`, '#id'), value);
              }
            }

            tokens = value.match(/(\d{1,4})\s?((m|k)?((g|9)|(l|1)))/);
            measure = tokens && parseFloat(tokens[1]);
            if (measure) {
              _.set(transaction[columnKey], `items[${item_index}].measure`, measure);
              _.set(transaction[columnKey], `items[${item_index}].unit`, tokens[2]);
            }
          }

          if (column_name.split('.')[1] === 'quantity_or_measure') {
            if (value.match(/^\d+\.\d{3}$/)) {
              column_name = column_name.replace('quantity_or_measure', 'measure');
              value = getNumber(value);
            }
            else {
              column_name = column_name.replace('quantity_or_measure', 'quantity');
              value = parseFloat(value);
            }
          }
          else if (column_name === 'date_fi_FI') {
            let date = value.split('.');
            value = moment().format(`${date[2]}-${date[1].padStart(2, '0')}-${date[0].padStart(2, '0')}`);
            column_name = 'date';
          }
          else if (column_name === 'time') {
            let time = value.split(':');
            value = moment(transaction[columnKey].date).add(time[0], 'hours').add(time[1], 'minutes').format();
            column_name = 'date';
          }
          else if (column_name.split('.')[1] === 'price') {
            value = getNumber(value);
            transaction[columnKey].total_price += value;
          }
          if (column_name !== 'id') {
            _.set(transaction[columnKey], column_name, value);
          }
        }
        item_index++;
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
  } else {
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
  }
});

}