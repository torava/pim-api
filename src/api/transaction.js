import Transaction from '../models/Transaction';
import Category from '../models/Category';
import natural from 'natural';
import moment from 'moment';
import fs from 'fs';
import {NlpManager, SimilarSearch} from 'node-nlp';
import { stringSimilarity } from "string-similarity-js";
import Item from '../models/Item';

const similarSearch = new SimilarSearch({normalize: true});

export default app => {

let details = {};

details.weighting = {
  weighted: ['punnittu'],
  stone: ['kivineen'],
  stoneless: ['kivetön'],
  withpeel: ['kuorineen'],
  peeled: ['kuorittu'],
  average: ['tuotekeskiarvo', 'keskiarvo']
}
details.cooking = {
  boiled: ['keitetty'],
  breaded: ['leivitetty'],
  fried: ['paistettu'],
  grilled: ['grillattu'],
  fresh: ['tuore'],
  dried: ['kuivattu'],
  withegg: ['kananmunaa'],
  thickened: ['suurustettu'],
  nonthickened: ['suurustamaton'],
  withoutsauce: ['ei kastiketta'],
  coldsmoked: ['kylmäsavu', 'kylmäsavustettu'],
  smoked: ['savustettu', 'savu']
}
details.spicing = {
  salted: ['suolattu', 'suolaa'],
  withoutsalt: ['suolaton'],
  withtomato: ['tomaattinen'],
  withchocolate: ['suklainen'],
  sugared: ['sokeroitu'],
  nonsugared: ['sokeroimaton'],
  flavored: ['maustettu'],
  nonflavored: ['maustamaton']
}
details.type = {
  natural: ['luomu'],
  bulk: ['irto'],
  pott: ['ruukku'],
  withfat: ['rasvaa'],
  nonfat: ['rasvaton'],
  sliced: ['paloiteltu', 'pala', 'palat'],
  nonlactose: ['laktoositon'],
  thickened: ['puuroutuva'],
  parboiled: ['kiehautettu', 'parboiled'],
  lowlactose: ['vähälaktoosinen'],
  insaltwater: ['suolavedessä', 'suolaved'],
  frozenfood: ['pakasteateria', 'pakastettu', 'pakaste'],
  bag: ['pussi']
}
details.origin = {
  finnish: ['suomi', 'suomalainen']
}
details.manufacturers = {
  'dan sukker': ['dan sukker'],
  'vitasia': ['vitasia'],
  'pohjolanmeijeri': ['pohjolanmeijeri'],
  'myllykivi': ['myllykivi'],
  'milbona': ['milbona'],
  'kanamestari': ['kanamestari'],
  'kultamuna': ['kultamuna'],
  'palmolive': ['palmolive'],
  'goldensun': ['goldensun'],
  'belbaka': ['belbaka'],
  'freshona': ['freshona'],
  'coquette': ['coquette'],
  'oceansea': ['oceansea'],
  'culinea': ['culinea'],
  'kalaneuvos': ['kalaneuvos'],
  'snellman': ['snellman'],
  'isokari': ['isokari'],
  'pirkka': ['pirkka'],
  'k-menu': ['k-menu'],
  'reilun kaupan': ['reilun kaupan'],
  'gold&green': ['gold&green'],
  'sandels': ['sandels'],
  'knorr': ['knorr'],
  'magners': ['magners'],
  'trattoria alfredo': ['trattoria alfredo'],
  'arla': ['arla'],
  'serla': ['serla'],
  'kotkot': ['kotkot'],
  'marlene': ['marlene'],
  'koskikylan': ['koskikylan'],
  'italiamo': ['italiamo'],
  'santa maria': ['santa maria'],
  'oululainen': ['oululainen']
}

let trimmed_categories,
    items;

Item.query()
.eager('[product.[category]]')
.then(i => {
  items = i;
});

Category.query()
.eager('[children, parent.^]')
.then(categories => {
  let n = 0, name, entity_name, entities, category;
  console.log(moment().format()+' [NerManager] Adding categories');
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
  console.log(moment().format()+' [NerManager] Added '+n+' categories');
  trimmed_categories = categories;
});

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
  var token,
      accuracy;
  for (let i in details) {
    for (let j in details[i]) {
      details[i][j].forEach(detail => {
        //token = similarSearch.getBestSubstring(name, detail);
        // Didn't work with compound words like ruukkutilli
        token = natural.LevenshteinDistance(detail, name.toLowerCase(), {search: true});
        accuracy = (detail.length-token.distance)/detail.length;
        if (accuracy > 0.7) {
          //name = name.substring(0, token.start)+name.substring(token.end+1);
          name = name.replace(new RegExp(token.substring, 'i'), '');
          //console.log(detail, name, accuracy, token);
        }
      });
    }
  }
  name = name.trim().replace(/,|\s{2,}/g, '');
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
      console.log(transaction);
      res.send(String(transaction));
    })
    .catch(error => {
      console.error(error);
      throw new Error();
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
    let trimmed_accuracy,
        type,
        trimmed_item_name,
        trimmed_distance,
        distance,
        item_categories,
        accuracy;

    transaction = req.body[0];

    transaction.items.forEach(item => {
      item_categories = [];
      trimmed_item_name = trimDetails(item.product.name);

      items.forEach(comparable_item => {
        if (comparable_item.product && comparable_item.product.category) {
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
          distance = stringSimilarity(trimmed_item_name.toLowerCase(), category.trimmed_name['fi-FI'].toLowerCase());
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
      
      console.log(item_categories);
      
      if (item_categories.length) {
        item_categories.sort((a, b) => b.distance-a.distance);

        item.product.category = {id: item_categories[0].id};
      }
    });
  }
  console.dir(transaction, {depth:null});
  Transaction.query()
    .upsertGraph(req.body, {relate: true})
    .then(transaction => {
      res.send(transaction);
    })
    .catch(error => {
      console.dir(transaction, {depth:null});
      console.error(error);
      res.status(500).send(error);
    });
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