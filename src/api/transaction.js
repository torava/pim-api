import Transaction from '../models/Transaction';
import Category from '../models/Category';
import natural from 'natural';
import moment from 'moment';
import fs from 'fs';

export default app => {

let details = {};

details.weighting = ['punnittu', 'kivineen', 'kivetön', 'kuorineen', 'kuorittu', 'keskiarvo'];
details.cooking = ['keitetty', 'leivitetty', 'paistettu', 'grillattu', 'tuore', 'kuivattu', 'suurustamaton', 'ei kastiketta'];
details.spicing = ['suolattu', 'suolaton', 'tomaattinen', 'sokeroitu', 'sokeroimaton', 'maustettu', 'maustamaton'];
details.type = ['luomu', 'irto', 'ruukku', 'lakt', 'laktoositon', 'vähälakt', 'vähälaktoosinen', 'suolavedessä'];
details.manufacturers = ['dan sukker', 'vitasia', 'pohjolanmeijeri', 'myllykivi', 'milbona', 'kanamestari', 'kultamuna', 'palmolive', 'goldensun', 'belbaka', 'freshona'];

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

function trimDetails(name) {
  var token, distance;
  Object.entries(details).forEach(([detail_category, d]) => {
    d.forEach(detail => {
      token = natural.LevenshteinDistance(detail, name, {search: true});
      //distance = natural.JaroWinklerDistance(token.substring, detail);
      if (token.distance/detail.length < 0.3) {
        name = token ? name.replace(new RegExp(',?\\s?'+token.substring+'\\s?'), '') : name;
        //console.log('detail is ' + detail + ', token is ' + JSON.stringify(token) + ', distance is ' + distance);
      }
    });
  });
  return name;
}

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
    let token, trimmed_token, category_name, trimmed_category_name, jarowinkler, category_names = [], type, trimmed_category_names = [], item_name, trimmed_item_name, distance, distance_rate, trimmed_distance_rate;
    transaction = req.body[0];
    console.dir(transaction, {depth:null});
    Category.query()
    .eager('[children, parent.^]')
    .then(categories => {
      categories = categories.filter((category, index) => {
        if(!category.children.length) {
          category_name = category.name['fi-FI'];
          category.trimmed_category_name = trimDetails(category_name);
        }
        return !category.children.length;
      });

      transaction.items.forEach(item => {
        item.categories = [];
        categories.forEach((category, index) => {
          category_name = category.trimmed_category_name;
          /*item_name = item.product.name;
          token = natural.LevenshteinDistance(category_name.toLowerCase(), item_name.toLowerCase(), {search: true});
          distance_rate = token.substring.length/item_name.length;
          if (distance_rate < 0.3) {
            //distance = natural.JaroWinklerDistance(item_name, category_name);
            //console.log('category is '+categories[index].name['fi-FI'] + ', trimmed category is '+category_name+', distance is '+(token.distance/category_name.length));
            //console.log('item is ' + item_name+', token is '+JSON.stringify(token));
          }*/
          trimmed_item_name = trimDetails(item.product.name);
          trimmed_token = natural.LevenshteinDistance(trimmed_item_name, category_name, {search: true});
          trimmed_distance_rate = trimmed_token.distance/trimmed_item_name.length;
          if (trimmed_token.distance < 8 /* && trimmed_distance_rate < distance_rate*/) {
            jarowinkler = natural.JaroWinklerDistance(category_name, trimmed_item_name);
            if (jarowinkler > 0.6) {
              jarowinkler = natural.JaroWinklerDistance(trimmed_token.substring, trimmed_item_name);
              if (jarowinkler > 0.75) {
                //distance = natural.JaroWinklerDistance(trimmed_item_name, category_name);
                //if (distance > 0.7) {
                //console.log('trimmed item is ' + trimmed_item_name + ', token is ' + JSON.stringify(token)+', distance is '+(token.distance/category_name.length));
                type = categories[index].parent &&
                      categories[index].parent.parent &&
                      categories[index].parent.parent.parent &&
                      categories[index].parent.parent.parent.name['fi-FI'];
                if (!item.categories[type] || !item.categories[type].length) item.categories[type] = [];
                item.categories[type].push({
                  original_name: categories[index].name['fi-FI'],
                  trimmed_item_name: trimmed_item_name,
                  name: category_name,
                  parents: getParentPath(categories[index].parent),
                  token: trimmed_token,
                  distance_rate: trimmed_distance_rate,
                  length_rate: category_name.length/trimmed_item_name.length,
                  jarowinkler: jarowinkler
                });
              }
            }
          }
          /*if (distance_rate > 0.4) {
            item.categories.push({
              original_name: categories[index].name['fi-FI'],
              name: category_name,
              token: token,
              distance_rate: distance_rate,
              length_rate: category_name.length/item_name.length,
              jarowinkler: natural.JaroWinklerDistance(item_name, category_name)
            });
          }*/
        });
        item.categories['Ruokalaji'] && item.categories['Ruokalaji'].sort((a,b) => b.jarowinkler-a.jarowinkler);
        item.categories['Raaka-aine'] && item.categories['Raaka-aine'].sort((a,b) => b.jarowinkler-a.jarowinkler);
        console.dir(item, {depth: null});
      });
      res.send();
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