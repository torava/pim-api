import Transaction from '../models/Transaction';
import Category from '../models/Category';
import natural from 'natural';
import moment from 'moment';
import fs from 'fs';
import _ from 'lodash';
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
  bag: ['pussi'],
  glutenfree: ['gton', 'gluteeniton']
}
details.origin = {
  finnish: ['suomi', 'suomalainen', 'suomesta']
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
  'oululainen': ['oululainen'],
  'kotimaista': ['kotimaista'],
  'rainbow': ['rainbow'],
  'valio': ['valio'],
  'vaasan': ['vaasan'],
  'hyväapaja': ['hyvä apaja']
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

function CSVToArray( strData, strDelimiter ){
  // Check to see if the delimiter is defined. If not,
  // then default to comma.
  strDelimiter = (strDelimiter || ",");

  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(
      (
          // Delimiters.
          "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

          // Quoted fields.
          "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

          // Standard fields.
          "([^\"\\" + strDelimiter + "\\r\\n]*))"
      ),
      "gi"
      );


  // Create an array to hold our data. Give the array
  // a default empty first row.
  var arrData = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  var arrMatches = null;


  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while (arrMatches = objPattern.exec( strData )){

      // Get the delimiter that was found.
      var strMatchedDelimiter = arrMatches[ 1 ];

      // Check to see if the given delimiter has a length
      // (is not the start of string) and if it matches
      // field delimiter. If id does not, then we know
      // that this delimiter is a row delimiter.
      if (
          strMatchedDelimiter.length &&
          strMatchedDelimiter !== strDelimiter
          ){

          // Since we have reached a new row of data,
          // add an empty row to our data array.
          arrData.push( [] );

      }

      var strMatchedValue;

      // Now that we have our delimiter out of the way,
      // let's check to see which kind of value we
      // captured (quoted or unquoted).
      if (arrMatches[ 2 ]){

          // We found a quoted value. When we capture
          // this value, unescape any double quotes.
          strMatchedValue = arrMatches[ 2 ].replace(
              new RegExp( "\"\"", "g" ),
              "\""
              );

      } else {

          // We found a non-quoted value.
          strMatchedValue = arrMatches[ 3 ];

      }


      // Now that we have our value string, let's add
      // it to the data array.
      arrData[ arrData.length - 1 ].push( strMatchedValue );
  }

  // Return the parsed data.
  return( arrData );
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

function toTitleCase(str) {
  if (!str) return str;

  return  str.replace(/([^\s:\-])([^\s:\-]*)/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
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
    null,//`items[${i}].product.category.name['fi-FI']`,
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
const CSV_SEPARATOR = ';';
const CSV_COLUMN_WRAPPER = '"';

app.post('/api/transaction', function(req, res) {
  function getNumber(value) {
    return parseFloat(value.replace('−', '-').replace(',', '.'));
  }
  function resolveCategories(transaction) {
    let trimmed_accuracy,
        type,
        trimmed_item_name,
        trimmed_distance,
        distance,
        item_categories,
        accuracy;
        
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
      
      console.log(item_categories);
      
      if (item_categories.length) {
        item_categories.sort((a, b) => b.distance-a.distance);
  
        item.product.category = {id: item_categories[0].id};
      }
    });
  }
  let transaction = {};
  if ('fromcsv' in req.query) {
    const template = req.query.template || 'default';
    const indexes = TRANSACTION_CSV_INDEXES[template] || [0];
    const starting_row = TRANSACTION_CSV_STARTING_ROW[template] || 1;

    let columns,
        tokens,
        measure,
        item_index = 0,
        rows = CSVToArray(req.body.transaction, CSV_SEPARATOR);
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
        if (column_name === 'date_fi_FI') {
          let date = value.split('.');
          value = moment().format(`${date[2]}-${date[1].padStart(2, '0')}-${date[0].padStart(2, '0')}`);
          column_name = 'date';
        }

        if (column_name === 'time') {
          let time = value.split(':');
          value = moment(transaction[column_key].date).add(time[0], 'hours').add(time[1], 'minutes').format();
          column_name = 'date';
        }
        if (column_name.split('.')[1] === 'price') {
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
      resolveCategories(transaction[i]);

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

    resolveCategories(transaction);

    Transaction.query()
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