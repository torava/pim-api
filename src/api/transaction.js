import Transaction from '../models/Transaction';
import Category from '../models/Category';
import moment from 'moment';
import fs from 'fs';
import _ from 'lodash';
import {NlpManager, SimilarSearch} from 'node-nlp';
import { stringSimilarity } from "string-similarity-js";
import Item from '../models/Item';
import {details, trimDetails, escapeRegExp, getParentPath, CSVToArray, toTitleCase} from '../utils/transaction';

const similarSearch = new SimilarSearch({normalize: true});

export default app => {

app.delete('/api/transaction/:id', function(req, res) {
  Transaction.query()
    .delete()
    .where('id', req.params.id)
    .then(transaction => {
      console.log(transaction);
      res.send(String(transaction));
    })
    .catch(error => {
      console.error(error);
      throw new Error();
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
  async function resolveCategories(transaction) {
    let trimmed_accuracy,
        type,
        trimmed_item_name,
        trimmed_distance,
        distance,
        item_categories,
        accuracy;

    const items = await Item.query()
    .eager('[product.[category]]')
    .then(items => {
      return items;
    });

    const trimmed_categories = await Category.query()
    .eager('[children, parent.^]')
    .then(categories => {
      let n = 0, name, entity_name, entities, category;
      categories.filter(async category => {
        if (!category.children.length) {
          name = category.name;
          category.trimmed_name = {...name};
          if (name && name['fi-FI']) {
            for (let i in details) {
              for (let j in details[i]) {
                details[i][j].forEach(detail => {
                  category.trimmed_name['fi-FI'] = category.trimmed_name['fi-FI']
                  .replace(new RegExp(escapeRegExp(detail)), "")
                });
              }
            }
            category.trimmed_name['fi-FI'] = category.trimmed_name['fi-FI']
            .trim()
            .replace(/,|\s{2,}|/g, '');
            n++;
          }
        }
        return !category.children.length;
      });
      //fs.writeFileSync('./ner.json', JSON.stringify(manager.save()));
      return categories;
    });

    transaction.items.forEach(item => {
      item_categories = [];
      trimmed_item_name = trimDetails(item.product.name);
  
      items.forEach(comparable_item => {
        if (comparable_item.product && comparable_item.product.category && comparable_item.text) {
          distance = stringSimilarity(item.product.name.toLowerCase(), comparable_item.text.toLowerCase());
          
          if (distance > 0.8) {
            console.log(item.product.name, comparable_item.text, distance);
            item_categories.push({
              id: comparable_item.product.category.id,
              original_name: comparable_item.product.category.name['fi-FI'],
              item_name: item.product.name,
              trimmed_item_name: trimmed_item_name,
              parents: getParentPath(comparable_item.product.category.parent),
              distance: distance
            });
          }
        }
      });
  
      trimmed_categories.forEach((category, index) => {
        if (category.trimmed_name && category.trimmed_name['fi-FI']) {
          distance = Math.max(
            stringSimilarity(trimmed_item_name.toLowerCase(), category.trimmed_name['fi-FI'].toLowerCase()),
            stringSimilarity(item.product.name.toLowerCase(), category.name['fi-FI'].toLowerCase())
          );
          //accuracy = (trimmed_item_name.length-distance)/trimmed_item_name.length;
  
          if (distance > 0.4) {
            item_categories.push({
              id: category.id,
              original_name: category.name['fi-FI'],
              item_name: item.product.name,
              trimmed_item_name: trimmed_item_name,
              name: category.trimmed_name['fi-FI'],
              parents: getParentPath(category.parent),
              distance: distance
            });
          }
        }
      });

      if (item.product.category && item.product.category.name) {
        trimmed_categories.forEach((category, index) => {
          distance = stringSimilarity(item.product.category.name['fi-FI'].toLowerCase(), category.name['fi-FI'].toLowerCase());
          //accuracy = (trimmed_item_name.length-distance)/trimmed_item_name.length;
  
          if (distance > 0.4) {
            item_categories.push({
              id: category.id,
              original_name: category.name['fi-FI'],
              item_name: item.product.name,
              trimmed_item_name: trimmed_item_name,
              parents: getParentPath(category.parent),
              distance: distance
            });
          }
        });
      }
      
      if (item_categories.length) {
        item_categories.sort((a, b) => b.distance-a.distance);
  
        item.product.category = {id: item_categories[0].id};
      }

      console.log(item_categories);
    });
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
        if (!column_name) continue;

        let value = columns[n];

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
        console.log(i, column_name, value);
        if (column_name !== 'id') {
          _.set(transaction[column_key], column_name, value);
        }
      }
      item_index++;
    }
    let promises = [];
    for (let i in transaction) {
      await resolveCategories(transaction[i]);

      promises.push(
        Transaction.query()
        .upsertGraph(transaction[i], {relate: true})
      );
    }
    return Promise.all(promises)
    .then(transaction => {
      console.dir(transaction, {depth:null});
      res.send(transaction);
    })
    .catch(error => {
      console.dir(transaction, {depth:null});
      console.error(error);
      res.status(500).send(error);
    });
  }
  else {
    transaction = req.body[0];

    await resolveCategories(transaction);

    return Transaction.query()
    .upsertGraph(transaction, {relate: true})
    .then(transaction => {
      res.send(transaction);
    })
    .catch(error => {
      console.dir(transaction, {depth:null});
      console.error(error);
      res.status(500).send(error);
    });
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
      });
  }
});

}