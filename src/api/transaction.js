import Transaction from '../models/Transaction';
import Category from '../models/Category';
import moment from 'moment';
import fs from 'fs';
import _ from 'lodash';
import {NlpManager, SimilarSearch} from 'node-nlp';
import { stringSimilarity } from "string-similarity-js";
import Item from '../models/Item';
import {details, stripDetails, escapeRegExp, getParentPath, CSVToArray, toTitleCase, stripName, getOpenFoodFactsProduct} from '../utils/transaction';

const similarSearch = new SimilarSearch({normalize: true});

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
    })
    .catch(error => {
      console.error(error);
    });

    const trimmed_categories = await Category.query()
    .eager('[children, parent.^]')
    .then(categories => {
      let n = 0, name, entity_name, entities, category;
      categories.filter(async category => {
        if (!category.children.length) {
          name = category.name;
          category.trimmed_name = stripName(name);
        } else {
          category.trimmed_name = {};
        }
        return !category.children.length;
      });
      //fs.writeFileSync('./ner.json', JSON.stringify(manager.save()));
      return categories;
    })
    .catch(error => {
      console.error(error);
    });
    
    try {
      for (let item of transaction.items) {
        if (!item) continue;
        
        item_categories = [];
        trimmed_item_name = stripDetails(item.product.name);
    
        items.forEach(comparable_item => {
          if (comparable_item.product && comparable_item.product.category && comparable_item.text) {
            const productName = item.product.name.toLowerCase() || '';
            const itemName = comparable_item.text.toLowerCase() || '';
            distance = stringSimilarity(productName, itemName);
            
            if (distance > 0.8) {
              console.log('comparing product to items', productName, itemName, distance);
              console.log(item.product.name, comparable_item.text, distance);
              item_categories.push({
                category: comparable_item.product.category,
                item_name: item.product.name,
                trimmed_item_name: trimmed_item_name,
                parents: getParentPath(comparable_item.product.category.parent),
                distance: distance
              });
            }
          }
        });
    
        trimmed_categories.forEach((category, index) => {
          Object.entries(category.trimmed_name).forEach(([locale, nameLocale]) => {
            if (category.trimmed_name && category.trimmed_name[locale]) {
              distance = stringSimilarity(trimmed_item_name.toLowerCase() || '', category.trimmed_name[locale].toLowerCase() || '');
              distance+= stringSimilarity(item.product.name.toLowerCase() || '', category.name[locale].toLowerCase() || '');
              category.aliases?.forEach(alias => {
                distance+= stringSimilarity(trimmed_item_name.toLowerCase() || '', alias.toLowerCase() || '');
                distance+= stringSimilarity(item.product.name.toLowerCase() || '', alias.toLowerCase() || '');
              });
              if (category.parent) {
                distance+= stringSimilarity(trimmed_item_name || '', category.parent.name[locale] || '');
              }
              //accuracy = (trimmed_item_name.length-distance)/trimmed_item_name.length;
      
              if (distance > 1) {
                console.log('comparing item to categories', item.product.name, category.name[locale], distance);
                item_categories.push({
                  category,
                  item_name: item.product.name,
                  trimmed_item_name: trimmed_item_name,
                  name: category.trimmed_name[locale],
                  parents: getParentPath(category.parent),
                  distance: distance
                });
              }
            }
          });
        });

        if (item.product.category && item.product.category.name) {
          trimmed_categories.forEach((category, index) => {
            Object.entries(category.name).forEach(([locale, categoryTranslation]) => {
              const productCategoryName = item.product.category.name[locale]?.toLowerCase();
              const categoryName = categoryTranslation.toLowerCase();
              distance = stringSimilarity(productCategoryName, categoryName);
              //accuracy = (trimmed_item_name.length-distance)/trimmed_item_name.length;
      
              if (distance > 0.4) {
                console.log('comparing product category to categories', productCategoryName, categoryName, distance);
                item_categories.push({
                  category,
                  item_name: item.product.name,
                  trimmed_item_name: trimmed_item_name,
                  parents: getParentPath(category.parent),
                  distance: distance
                });
              }
            });
          });
        }
        
        if (item_categories.length) {
          item_categories.sort((a, b) => b.distance-a.distance);
    
          item.product.category = {id: item_categories[0].category.id};

          console.log(item_categories[0]);
        }

        if (!item.measure) {
          const itemCategory = item_categories.length && item_categories[0].category;
          const itemCategoryName = itemCategory && itemCategory.name && itemCategory.name['en-US'] || '';
          console.log('get off product', `${trimmed_item_name} ${itemCategoryName}`);
          const offProduct = await getOpenFoodFactsProduct(`${trimmed_item_name} ${itemCategoryName}`);
          if (offProduct && parseFloat(offProduct.product_quantity)) {
            item.product.measure = parseFloat(offProduct.product_quantity);
            item.product.unit = 'g';
            console.log(item);
          }
        }

        //console.log(item_categories);
      }
    } catch (error) {
      console.error(error);
    }
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
        res.sendStatus(500);
      }

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
      res.sendStatus(500);
    });
  }
  else {
    transaction = req.body[0];

    try {
      await resolveCategories(transaction);
    } catch (error) {
      console.error(error);
      res.sendStatus(500);
    }

    console.dir(transaction, {depth:null});

    return Transaction.query()
    .upsertGraph(transaction, {relate: true})
    .then(transaction => {
      res.send(transaction);
    })
    .catch(error => {
      console.dir(transaction, {depth:null});
      console.error(error);
      res.sendStatus(500);
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
    })
    .catch(error => {
      console.error(error);
    });
  }
});

}