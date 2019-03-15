import Transaction from '../models/Transaction';
import Category from '../models/Category';
import { NerManager } from 'node-nlp';
import moment from 'moment';
import fs from 'fs';

export default app => {

const manager = new NerManager({ language: 'fi', threshold: 0.5 });
const meta_manager = new NerManager({ language: 'fi', threshold: 0.8 });

meta_manager.addNamedEntityText(
  'details',
  'weighting',
  ['fi'],
  ['punnittu', 'kivineen', 'kivetön', 'kuorineen', 'kuorittu', 'keskiarvo'],
);
meta_manager.addNamedEntityText(
  'details',
  'cooking',
  ['fi'],
  ['keitetty', 'paistettu', 'tuore', 'kuivattu', 'suurustamaton', 'ei kastiketta'],
);
meta_manager.addNamedEntityText(
  'details',
  'spicing',
  ['fi'],
  ['suolattu', 'suolaton', 'tomaattinen', 'sokeroitu', 'sokeroimaton', 'maustettu', 'maustamaton'],
);
meta_manager.addNamedEntityText(
  'details',
  'type',
  ['fi'],
  ['luomu', 'irto', 'laktoositon', 'vähälaktoosinen'],
);

Category.query()
.eager('[children, parent.^]')
.then(async categories => {
  let n = 0, name, entity_name, entities, category;
  console.log(moment().format()+' [NerManager] Adding categories');
  for (let i in categories) {
    category = categories[i];
    if (!category.children.length) {
      name = category.name['fi-FI'];
      entity_name = name;
      if (name) {
        entities = await meta_manager.findEntities(
          name,
          'fi',
        ).then(result => {
          return result;
        });
        entities.map(entity => {
          entity_name = entity_name.replace(new RegExp(escapeRegExp(entity.sourceText)+",?\s?"), "")
                                    .replace(/^,?\s*/, "")
                                    .replace(/,?(\sja)?\s*$/, "");
        });
        manager.addNamedEntityText(getParentPath(category), stringToSlug(name, "_"), ['fi'], [entity_name]);
        n++;
      }
    }
  }
  fs.writeFileSync('./ner.json', JSON.stringify(manager.save()));
  console.log(moment().format()+' [NerManager] Added '+n+' categories');
});

function getParentPath(item) {
  let result = "",
      parent = item,
      name;
  if (parent) {
    while (parent = parent.parent) {
      name = getNameLocale(parent.name, 'fi-FI');
      if (!name) continue;
      result = stringToSlug(name, "_")+(result ? "."+result : "");
    }
  }
  return result;
}

function getNameLocale(name, locale, strict) {
  if (!name) {
    return name;
  }
  if (typeof name === 'string') {
    return name;
  } 
  else if (name.hasOwnProperty(locale)) {
    return name[locale];
  }
  else if (!strict) {
    return first(name);
  }
  else return '';
}

function escapeRegExp(stringToGoIntoTheRegex) {
  return stringToGoIntoTheRegex.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function stringToSlug(str,  sep) {
  let sep_regexp = escapeRegExp(sep);

  str = str.replace(/^\s+|\s+$/g, ""); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  var from = "åàáãäâèéëêìíïîòóöôùúüûñç·/_,:;";
  var to = "aaaaaaeeeeiiiioooouuuunc------";

  for (var i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }

  str = str
    .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
    .replace(/\s+/g, "-") // collapse whitespace and replace by -
    .replace(new RegExp("-+", "g"), sep) // collapse dashes
    .replace(new RegExp(sep_regexp+"+"), "") // trim - from start of text
    .replace(new RegExp(sep_regexp+"+$"), ""); // trim - from end of text

  return str;
}

app.delete('/api/transaction/:id', function(req, res) {
  Transaction.query()
    .delete()
    .where('id', req.params.id)
    .then(transaction => {
      res.send(transaction);
    });
});

const TRANSACTION_CSV_COLUMNS = i => [
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
];
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
const CSV_SEPARATOR = ";";

app.post('/api/transaction', function(req, res) {
  let transaction = {},
      promises = [];
  if ('fromcsv' in req.query) {
    let columns,
        item_index = 0,
        rows = req.body.transaction.split('\n');
    for (let i = 2; i < rows.length; i++) {
      columns = rows[i].split(CSV_SEPARATOR);
      if (!(columns[0] in transaction)) {
        item_index = 0;
        transaction[columns[0]] = {items:[], party:{}, receipts:[]};
      }
      for (let n in columns) {
        console.log(i, TRANSACTION_CSV_COLUMNS(i-1)[n]);
        _.set(transaction[columns[0]], TRANSACTION_CSV_COLUMNS(item_index)[n], columns[n]);
      }
      item_index++;
    }
    console.dir(transaction, {depth:null});
    res.send(transaction);
    return;
  }
  else {
    transaction = req.body[0];
    console.dir(transaction, {depth:null});
    transaction.items.forEach(item => {
      promises.push(
        manager.findEntities(item.text, 'fi').then(entities => {
          console.log(entities);
        })
      );
    });
    Promise.all(promises).then(entities => {
      res.send(entities);
    });
  }
  /*
  Transaction.query()
    .upsertGraph(req.body, {relate: true})
    .then(transaction => {
      res.send(transaction);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });*/
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