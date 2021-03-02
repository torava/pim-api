import Transaction from '../models/Transaction';
import Category from '../models/Category';
import moment from 'moment';
import _ from 'lodash';
import Item from '../models/Item';
import {CSVToArray, toTitleCase, resolveCategories} from '../../utils/transaction';

export default app => {

app.delete('/api/transaction/:id', function(req, res) {
  return Transaction.query()
    .delete()
    .where('id', req.params.id)
    .then(transaction => {
      console.log(transaction);
      res.send(String(transaction));
    })
    .catch(error => {
      console.error(error);
      res.sendStatus(500);
    });
});

const TRANSACTION_CSV_INDEXES = {
  sryhma: [0, 1]
};

const TRANSACTION_CSV_STARTING_ROW = {
  sryhma: 10
};

const TRANSACTION_CSV_COLUMNS = {
  sryhma: i => [
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
  kesko: i => [
    'id',
    'date_fi_FI',
    'party.name',
    `items[${i}].product.name`,
    `items[${i}].quantity_or_measure`,
    `items[${i}].price`
  ],
  default: i => [
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
  kesko: ','
};

const CSV_COLUMN_WRAPPER = '"';

app.post('/api/transaction', async function(req, res) {
  function getNumber(value) {
    return parseFloat(value.replace('−', '-').replace(',', '.'));
  }
  let transaction = {};
  if ('fromcsv' in req.query) {
    const template = req.query.template || 'default';
    const indexes = TRANSACTION_CSV_INDEXES[template] || [0];
    const starting_row = TRANSACTION_CSV_STARTING_ROW[template] || 1;

    let columns,
        tokens,
        measure,
        item_index = 0,
        rows = CSVToArray(req.body.transaction, CSV_SEPARATOR[template] || ';'),
        category_refs = [];

    try {
      for (let i = starting_row; i < rows.length; i++) {
        let column_key = '';
        columns = rows[i];
        indexes.forEach(index => {
            column_key+= columns[index];
        });
        if (!(column_key in transaction)) {
          item_index = 0;
          transaction[column_key] = {items:[], party:{}, receipts:[], total_price: 0};
        }
        for (let n in columns) {
          let column_name = TRANSACTION_CSV_COLUMNS[template](item_index)[n];

          let value = columns[n];

          if (!column_name || !value) continue;

          console.log(i, column_name, value);

          if (column_name.split('.').includes('name') || column_name.split('.').includes(`name['fi-FI']`)) {
            value = toTitleCase(value);

            if (column_name.split('.').includes('category')) {
              if (category_refs.some(ref => ref === value)) {
                column_name = column_name.replace(`name['fi-FI']`, '#ref');
              }
              else {
                category_refs.push(value);
                _.set(transaction[column_key], column_name.replace(`name['fi-FI']`, '#id'), value);
              }
            }

            tokens = value.match(/(\d{1,4})\s?((m|k)?((g|9)|(l|1)))/);
            measure = tokens && parseFloat(tokens[1]);
            if (measure) {
              _.set(transaction[column_key], `items[${item_index}].measure`, measure);
              _.set(transaction[column_key], `items[${item_index}].unit`, tokens[2]);
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
            value = moment(transaction[column_key].date).add(time[0], 'hours').add(time[1], 'minutes').format();
            column_name = 'date';
          }
          else if (column_name.split('.')[1] === 'price') {
            value = getNumber(value);
            transaction[column_key].total_price += value;
          }
          if (column_name !== 'id') {
            _.set(transaction[column_key], column_name, value);
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
  }
  else {
    try {
      transaction = req.body[0];

      const items = await Item.query()
      .withGraphFetched('[product.[category]]');

      const categories = await Category.query()
      .withGraphFetched('[children, parent]');

      await resolveCategories(transaction, items, categories);

      console.dir(transaction, {depth:null});

      const upsertedTransactions = await Transaction.query()
      .upsertGraph(transaction, {relate: true});
      return res.send(upsertedTransactions);
    } catch (error) {
      console.dir(transaction, {depth:null});
      console.error(error);
      return res.sendStatus(500);
    }
  }
});

app.get('/api/transaction', function(req, res) {
  if ('tocsv' in req.query) {
    let response = [['SEP='+CSV_SEPARATOR], TRANSACTION_CSV_COLUMN_NAMES.join(CSV_SEPARATOR)];
    Transaction.query()
      .eager('[items.[product.[category, manufacturer, attributes]], party, receipts]')
      .then(transactions => {
        for (let n in transactions) {
          let items = transactions[n].items;
          for (let i in items) {
            // transaction id, transaction date, party id, party name, product name, item price
            response.push(_.at(transactions[n], TRANSACTION_CSV_COLUMNS(i)).join(CSV_SEPARATOR));
          }
        }
        res.send(response.join('\n'));
      });   
  }
  else if (req.query.hasOwnProperty('categories')) {
    Transaction.query()
      .eager('[items.[product.[category.[parent.^], manufacturer]], party, receipts]')
      .modifyEager('items.product.category', builder => {
        builder.select('id', 'name');
      })
      .then(transactions => {
        if (req.query.hasOwnProperty('depth')) {
          let index, found, id, name,
              indexed_items = [0];
          transactions.map(transaction => {
            let resolved_items = [];
            transaction.items.map(item => {
              id = false;
              if (req.query.depth > 2) {
                let current_depth, child = item.product;
                if (item.product.category) {
                  child = item.product.category;
                  if (item.product.category.parent) {
                    current_depth = req.query.depth-2;
                    child = item.product.category.parent;
                    while (current_depth > 0) {
                      if (child && child.parent) {
                        child = child.parent;
                        current_depth-= 1;
                      }
                      else {
                        //child = false;
                        break;
                      }
                    }
                  }
                }
                if (child) {
                  id = 'c'+child.id;
                  name = child.name;
                }
              }
              if ((!id || req.query.depth == 2) && item.product.category && item.product.category.parent) {
                id = 'c'+item.product.category.parent.id;
                name = item.product.category.parent.name;
              }
              if ((!id || req.query.depth == 1) && item.product.category) {
                id = 'c'+item.product.category.id;
                name = item.product.category.name;
              }
              if (!id || req.query.depth == 0) {
                id = 'p'+item.product.id;
                name = item.product.name;
              }
              if (id === false) {
                resolved_items[0] = {
                  id: 0,
                  name: 'Uncategorized',
                  price: (resolved_items[0] && resolved_items[0].price || 0)+item.price
                }
                return;
              }
              
              // if item is already in resolved items then sum to price
              found = false;
              resolved_items.map(resolved_item => {
                if (resolved_item.id === id) {
                  resolved_item.price+= item.price;
                  resolved_item.item_names.push(item.product.name);
                  found = true;
                  return;
                }
              });
              // otherwise check indexed items
              if (!found) {
                index = indexed_items.indexOf(id);
                if (index === -1) {
                  indexed_items.push(id);
                  index = indexed_items.length-1;
                }
                resolved_items[index] = {
                  id: id,
                  name: name.hasOwnProperty('fi-FI') ? name['fi-FI'] : name,
                  price: item.price,
                  item_names: [item.product.name]
                }
              }
            });
            transaction.items = resolved_items;
          });
        }
        res.send(transactions);
      });
  }
  else {
    Transaction.query()
    .orderBy('id')
    .eager('[items.[product.[category.[attributes], manufacturer, attributes]], party, receipts]')
    .modifyEager('items.product.category', builder => {
      builder.select('id', 'name');
    })
    .then(transaction => {
      res.send(transaction);
    })
    .catch(error => {
      console.error(error);
    });
  }
});

}