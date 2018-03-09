const Transaction = require('./models/Transaction');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Attribute = require('./models/Attribute');
const Manufacturer = require('./models/Manufacturer');
const Item = require('./models/Item');
const multer = require('multer');
const express = require('express');
const app = express();
const im = require('imagemagick');
const fs = require('fs');
const request = require('request');
const child_process = require('child_process');
const _ = require('lodash');
const moment = require('moment');

module.exports = function (app) {

const upload_path = __dirname+"/resources/uploads";

const upload = multer({
  dest: upload_path,
  limits: {fileSize: 10000000}
}).single('file');

function parseYear(year) {
  if (year.length == 2) {
    if (year > new Date().getFullYear().toString().substr(-2)) {
      year = '19'+year;
    }
    else {
      year = '20'+year;
    }
  }
  return year;
}
function toTitleCase(str) {
  if (!str) return str;

  return  str.replace(/([^\s:\-])([^\s:\-]*)/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

async function getDataFromReceipt(result, text, language) {
  text = text
  .replace(/ﬂ|»|'|´|`|‘|“|"|”|\|/g, '')
  .replace(/(\d) *(\.,|\,|\.|_|\-|;) *(\d)/g, '$1.$3')
  .replace(/\.,|\,|_|\-|;/g, '')
  .replace(/—/g, '-')
  .replace(/ +/g, ' ');

  console.log(text);

  let line, line_name, line_product_name, line_price, line_prices, item_number, line_text,
    line_total, line_date, line_address, line_vat, line_item_details, quantity, measure,
    line_number_format, total_price_computed = 0, name, line_item, line_phone_number,
    total_price, price, has_discount, previous_line, found_attribute, category,
    items = [], line_number = 0, data = {party:{}},
    lines = text.split("\n");

  let ines = [];
  for (let i in lines) {
    line = lines[i].trim();
    if (line.length > 1) {
      ines.push(line);
    }
  }
  
  /*
  suomi, Suomi
  store
  address
  y-tunnus 1234567-1
  item 1,23 1
  123456
  yhteensä EUR 1,23
  käteinen 1,23
  takaisin 1,23
  aika 1.2.2003 01:02
  */
  if (language == "fin") {
    for (let i in ines) {
      line_product_name = null;

      found_attribute = null;

      line = ines[i].trim();
      line_number_format = line.replace(/\s*(\.,|\,|\.)\s*/g, '.');

      line_name = line.match(/^[\u00C0-\u017F-a-z0-9\s\-\.%\/]+$/i);
      //if (!line_name || line_name[0].length <= 1) continue;

      line_number++;

      // Attributes to find only once
      if (!data.party.vat) {
        line_vat = line.match(/\d{7}[-|>]\d{1}/);
        if (line_vat) {
          data.party.vat = line_vat[0];

          found_attribute = 'party.vat';
        }
      }

      if (!data.party.phone_number) {
        line_phone_number = line.replace(/\s|-/g, '').match(/\d{10}|\+\d{12}/);
        if (line_phone_number) {
          data.party.phone_number = line_phone_number[0];

          found_attribute = 'party.phone_number';
        }
      }

      if (!data.date) {
        // 1.1.12 1:12
        line_date = line.match(/((\d{1,2})[\.|\,](\d{1,2})[\.|\,](\d{2,4}))(\s)?((\d{1,2}:)(\d{1,2}:)?(\d{1,2})?)?/);
        if (line_date) {
          data.date = Date.parse(parseYear(line_date[4])+'/'+line_date[3]+'/'+line_date[2]+' '+line_date[6]);

          found_attribute = 'date';
        }

        // 1:12 1-1-12
        line_date = line.match(/((\d{1,2}:)(\d{1,2}:)?(\d{1,2})?)?(\s)?((\d{1,2})\-(\d{1,2})\-(\d{2,4}))/);
        if (line_date) {
          data.date = Date.parse(parseYear(line_date[9])+'/'+line_date[8]+'/'+line_date[7]+' '+line_date[1]);

          found_attribute = 'date';
        }
      }

      if (!data.party.street_name) {
        line_address = line.match(/^([\u00C0-\u017F-a-z\/]+)\s?(\d+)[,|.]?\s?(\d{5})[,|.]?\s?([\u00C0-\u017F-a-z\/]+)$/i);
        if (line_address) {
          data.party.street_name = toTitleCase(line_address[1]);
          data.party.street_number = line_address[2];
          data.party.postal_code = line_address[3];
          data.party.city = toTitleCase(line_address[4]);

          found_attribute = 'party.street_name';
          continue;
        }
      }

      if (found_attribute) {
        previous_line = found_attribute;
        continue;
      }

      /*price_re = /(\d+\s*[\.|\,|\,\.]\s*\d{2})(\-)?\s?/;
      name_re = /[\u00C0-\u017F-a-z0-9 -.%\/\(\){}]/;
      id_re = /\d+(?=\s)/;
      quantity_re = /(\d+\s*[\.|\,|\,\.]\s*\d{3})(\s?kg)?\sx\s((\d+\s*[\.|\,|\,\.]\s*\d{2})\s?)(\s?EUR\/kg)?/;
      line_item_re = '('+id_re+')?('+name_re+')('+price_re+'){1,2}[\s|T|1|A|B]?$';
      line_id_re = '('+id_re+')('+quantity_re+')?';*/

      // store name
      if (line_number == 1 && line_name) {
        data.party.name = toTitleCase(line_name[0]);

        previous_line = 'party.name';
        continue;
      }

      // general attributes

      // total line
      line_total = line_number_format.match(/^(yhteensä|yhteensa).*[^0-9]((\d+\.\d{2})(\-)?\s)?((\d+\.\d{2})(\-)?)$/i);
      if (line_total) {
        if (line_total[2]) continue;

        price = parseFloat(line_total[6]);
        
        if (price[7] === '-') {
          has_discount = true;
          price = 0-price;
        }

        data.total_price_read = price;
        previous_line = 'total_price';
        continue;
      }

      // serial number line
      if (previous_line === 'item' && previous_line === 'details') {
        line_item_details = line.match(/^\d+$/);

        if (line_item_details) {
          items[items.length-1].item_number = line;

          previous_line = 'details';
          continue;
        }
      }
      
      // details line
      line_item_details = null;
      console.log(previous_line, line);
      if (previous_line === 'item') {
        // 1234 1,000 x 1,00
        line_item_details = line_number_format.match(/^((\d+)\s)?(((\d+\.\d{2,3})(\s?kg)?\s?x\s?)?((\d+\.\d{2})\s?)(\s?EUR\/kg)?)$/i);

        if (line_item_details) {
          items[items.length-1].item_number = line_item_details[2];
          items[items.length-1].quantity = parseFloat(line_item_details[7]);
          previous_line = 'details';
          continue;
        }
      }
      
      // item line
      if (!has_discount && !data.total_price_read && !line.match(/käteinen|kateinen|käte1nen|kate1nen|taka1s1n|takaisin/i)) {
        line_price = line_number_format.match(/\s((\d+\.\d{2})(\-)?\s?){1,2}[\s|T|1|A|B|8|\[|\]]{0,2}$/i);
        if (line_price) {
          line_item = line.substring(0, line_price.index).match(/^((\d+)\s)?([\u00C0-\u017F-a-z0-9\s\-\.\,\+\&\%\=\/\(\)\{\}\[\]]+)$/i);
          if (line_item) {
            price = parseFloat(line_price[1]);
            name = toTitleCase(line_item[3]);

            if (line_price[3] === '-') {
              has_discount = true;
              price = 0-price;
            }

            items.push({
              item_number: line_item[2] || '',
              text: line_item[0],
              product: {
                name: name
              },
              price: price
            });

            category = await getClosestCategory(name, 'fi-FI');

            if (quantity) items[items.length-1].quantity = quantity;
            if (measure) items[items.length-1].measure = measure;
            if (category) items[items.length-1].product.category = {id: category.id, name: category.locales && category.locales['fi-FI'] || category.name};

            let found = false;
            for (i in result.products) {
              if (result.products[i].name === name) {
                found = true;
                break;
              }
            }
            !found && result.products.push({label: name, name: name});

            if (price) total_price_computed+= price;

            previous_line = 'item';
            continue;
          }
        }
      }
    }
  }
  /* español, Argentina
  store
  address
  cuit nro. 12-12345678-12
  fecha 01/02/03 hora 01:02
  123456 item (1.23) 1.23
  subtotal 1.23
  discuenta -1.23
  total 1.23
  tarjeta 1.23
  su vuelta 1.23
  */
  else if (language == 'spa') {
    for (let i in ines) {
      line_product_name = null;

      found_attribute = null;

      measure = null;
      
      quantity = null;

      line = ines[i];
      line_number_format = line.replace(/\s*(\.,|\,|\.)\s*/g, '.');

      line_name = line.match(/^[\u00C0-\u017F-a-z0-9\s\-\.%\/]+$/i);
      //if (!line_name || line_name[0].length <= 1) continue;

      line_number++;

      // Attributes to find only once
      if (!data.party.vat) {
        line_vat = line.match(/\d{2}\-?\d{8}\-?\d/);
        if (line_vat) {
          data.party.vat = line_vat[0];

          found_attribute = 'party.vat';
        }
      }

      if (!data.party.phone_number) {
        line_phone_number = line.match(/\d{4}\-\d{4}/);
        if (line_phone_number) {
          data.party.phone_number = line_phone_number[0];

          found_attribute = 'party.phone_number';
        }
      }

      if (!data.date) {
        // fecha 01/02/17 hora 01:02:03
        line_date = line.match(/(fecha\s?)?((\d{1,2})[\/|\-](\d{1,2})[\/|\-](\d{2,4}))(\s?hora\s)?((\d{1,2}:)(\d{1,2}:)?(\d{1,2})?)?/);
        if (line_date) {
          data.date = Date.parse(parseYear(line_date[4])+'/'+line_date[3]+'/'+line_date[2]+' '+line_date[6]);

          found_attribute = 'date';
        }
      }

      if (!data.party.street_name) {
        line_address = line.match(/([\u00C0-\u017F-a-z\/]+)\s?(\d+)/i);
        if (line_address) {
          data.party.street_name = toTitleCase(line_address[1]);
          data.party.street_number = line_address[2];
          data.party.postal_code = line_address[3];
          data.party.city = toTitleCase(line_address[4]);

          found_attribute = 'party.street_name';
          continue;
        }
      }

      if (found_attribute) {
        previous_line = found_attribute;
        continue;
      }

      /*price_re = /(\d+\s*[\.|\,|\,\.]\s*\d{2})(\-)?\s?/;
      name_re = /[\u00C0-\u017F-a-z0-9 -.%\/\(\){}]/;
      id_re = /\d+(?=\s)/;
      quantity_re = /(\d+\s*[\.|\,|\,\.]\s*\d{3})(\s?kg)?\sx\s((\d+\s*[\.|\,|\,\.]\s*\d{2})\s?)(\s?EUR\/kg)?/;
      line_item_re = '('+id_re+')?('+name_re+')('+price_re+'){1,2}[\s|T|1|A|B]?$';
      line_id_re = '('+id_re+')('+quantity_re+')?';*/

      // store name
      if (line_number == 1 && line_name) {
        data.party.name = toTitleCase(line_name[0]);

        previous_line = 'party.name';
        continue;
      }

      // general attributes

      // total line
      line_total = line_number_format.match(/^(total).*[^0-9]((\d+\.\d{2})(\-)?\s)?((\d+\.\d{2})(\-)?)$/i);
      if (line_total) {
        if (line_total[2]) continue;

        price = parseFloat(line_total[6]);
        
        if (price[7] === '-') {
          has_discount = true;
          price = 0-price;
        }

        data.total_price_read = price;
        previous_line = 'total_price';
        continue;
      }

      // serial number line
      if (previous_line === 'item' && previous_line === 'details') {
        line_item_details = line.match(/^\d+$/);

        if (line_item_details) {
          items[items.length-1].item_number = line;
          items[items.length-1].text = items[items.length-1].text+line_text;

          previous_line = 'details';
          continue;
        }
      }
      /*
      // details line
      line_item_details = null;
      console.log(previous_line, line);
      if (previous_line === 'item') {
        line_price = line_number_format.match(/\s((\d+\.\d{2})(\-)?\s?){1,2}$/i);

        line_item_details = line_number_format;
        if (line_price)
          line_item_details = line_item_details.substring(0, line_price.index);
        // 1234 1,000 x 1,00
        line_item_details = line_item_details
        .match(/^((\d+)\s)?(((\d+(\.\d{2,3})?)([g|b|8|0|6][r|7])?\s?[x|\/|k]\s?)?((\d+(\.\d{1,3})?)\s?)(k[g|9]\.?)?)(\s?(\(|\[)\d+\.\d{2}(\-)?(\)|\]))?$/i);
        console.log(line_item_details);
        if (line_item_details) {
          items[items.length-1].item_number = line_item_details[2];
          items[items.length-1].quantity = parseFloat(line_item_details[7]);
          items[items.length-1].text = items[items.length-1].text+line_text;
          previous_line = 'details';
          continue;
        }
      }*/
      
      // item line
      if (!has_discount && !data.total_price_read && !line.match(/subtotal|tarjeta|su\svuelta/i)) {
        line_price = line_number_format.match(/\s((\d+\.\d{2})(\-)?\s?){1,2}$/i);
        if (line_price) {
          price = parseFloat(line_price[1]);
          name = null;

          // 1.23Gr/1.23Kg. [12.34]
          line_item_details = line_number_format.substring(0, line_price.index)
          .match(/^((\d+)\s)?(((\d+(\.\d{2,3})?)([g|b|8|0|6][r|7])?\s?[x|\/|k]\s?)?((\d+(\.\d{1,3})?)\s?)(k[g|9]\.?)?)(\s?(\(|\[)\d+\.\d{2}(\-)?(\)|\]))?$/i);

          item_number = '';
          console.log(line_item_details, line_item);
          if (line_item_details) {
            item_number = line_item_details[2];
            
            if (line_item_details[7]) {
              measure = parseFloat(line_item_details[5]);
            }
            else {
              quantity = parseFloat(line_item_details[5]);
            }

            line_item = ines[i-1].match(/^((\d+)\s?)?([\u00C0-\u017F-a-z0-9\s\-\.&%\/\(\)\{\}]+)$/i);
          }
          else {
            line_item = line.substring(0, line_price.index).match(/^((\d+)\s)?([\u00C0-\u017F-a-z0-9\s\-\.\,\+\&\%\=\/\(\)\{\}]+)$/i);
          }
          
          if (line_item) {
            name = toTitleCase(line_item[3]);
            if (line_item[2]) item_number = line_item[2];
            line_text = line_item[0];

            if (line_price[3] === '-') {
              has_discount = true;
              price = 0-price;
            }

            items.push({
              item_number: item_number,
              text: line_text,
              //category: {},
              product: {
                name: name
              },
              price: price
            });

            if (quantity) items[items.length-1].quantity = quantity;
            if (measure) items[items.length-1].measure = measure;

            let found = false;
            for (i in result.products) {
              if (result.products[i].name === name) {
                found = true;
                break;
              }
            }
            !found && result.products.push({label: name, name: name});

            if (price) total_price_computed+= price;

            previous_line = 'item';
            continue;
          }

          previous_line = null;
        }
      }
    }
  }

  data.total_price = Math.round(total_price_computed*100)/100;
  data.items = items;

  /*return {
    store: store,
    total_price_read: total_price,
    total_price: Math.round(total_price_computed*100)/100,
    date: date,
    address: address,
    vat: vat,
    items: items
  };*/

  result.transactions = [data];
  result.transactions[0].receipts = [{}];
  result.transactions[0].receipts[0].text = text;
  
  return result;
}

function extractTextFromFile(id, data, language, cb) {
  let filepath = upload_path+"/"+id,
      script = [filepath,
                '-type', 'grayscale',
                '-background', 'none'],
      parameters = {threshold: 10, blur: 1, sharpen: 1};

  if ('blur' in data) {
    parameters.blur = parseInt(data.blur || 0);
  }
  if ('threshold' in data) {
    parameters.threshold = parseInt(data.threshold || 1);
  }
  if ('sharpen' in data) {
    parameters.sharpen = parseInt(data.sharpen || 0);
  }

  // ./textcleaner -g -e normalize -T -f 50 -o 5 -a 0.1 -t 10 -u -s 1 -p 20 test.jpg test.png
  if (data.rotate)
    script = script.concat(['-gravity', 'Center', '-rotate', parseFloat(data.rotate), '+repage']);
  if (data.width && data.height)
    script = script.concat(['-gravity', 'NorthWest', '-crop', parseInt(data.width)+'x'+parseInt(data.height)+'+'+parseInt(data.x)+'+'+parseInt(data.y), '+repage']);

  script = script.concat(['-adaptive-resize', '800x',
      '-normalize',
      //'-contrast-stretch', '0'
  ]);

  if (parameters.blur)
    script = script.concat(['-adaptive-blur', parameters.blur]);
  if (parameters.sharpen)
    script = script.concat(['-sharpen', '0x'+parameters.sharpen]);

  script = script.concat(['-lat', '50x50-'+parameters.threshold+'%']);

  script = script.concat([
      //'-set', 'option:deskew:autocrop', 'true',
      //'-deskew', '40%',
      //'-bordercolor', 'white',
      //'-border', '50',
      '-trim',
      '+repage',
      '-format', 'png',
      '-strip',
      filepath+'_edited']);

  console.log(script);
  child_process.execFile('convert', script, function(error, stdout, stderr) {
    if (error) console.error(error);
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    child_process.execFile('tesseract', [
      '-l',
      ['fin'].indexOf(language) !== -1 ? language : 'eng',
      filepath+'_edited',
      'stdout'
    ], function(error, stdout, stderr) {
      if (error) console.error(error);
      process.stdout.write(stdout);
      process.stderr.write(stderr);

      cb(stdout);
    });
  });
}

async function csvToObject(csv) {
    let columns,
        item_index = 0,
        rows = csv.trim().split('\n'),
        sep = rows[0].match(/^SEP=(.{1})$/),
        separator,
        items = [],
        item,
        column_name,
        elements,
        found,
        year,
        source,
        sources,
        attribute,
        attributes = await Attribute.query(),
        attribute_object,
        ref,
        refs = {};

    if (sep) {
      separator = sep[1];
      rows.shift();
    }
    else {
      separator = CSV_SEPARATOR;
    }

    let column_names = rows[0].split(separator);

    for (let i = 1; i < rows.length; i++) {
      columns = rows[i].split(separator);
      item = {};
      for (let n in columns) {
        column_name = column_names[n];
        attribute = column_name.match(/^attribute\:(.*)/i);
        if (attribute) {
          found = false;
          for (let m in attributes) {
            if (attribute[1] in attributes[m].name) {
              attribute_object = {
                id: attributes[m].id
              }
              found = true;
              break;
            }
          }
          if (!found) {
            ref = 'attribute:'+attribute[1];
            if (ref in refs) {
              attribute_object = {
                '#ref': ref
              }
            }
            else {
              refs[ref] = true;
              attribute_object = {
                '#id': ref,
                name: {
                  'fi-FI': attribute[1]
                }
              }
            }
          }
          Object.assign(item, {
            attributes: [
              {
                attribute: attribute_object,
                value: columns[n]
              }
            ]
          });
        }
        else if (['source', 'lähde'].indexOf(column_name.toLowerCase()) !== -1) {
          sources = columns[n].split(',');
          for (let m in item.attributes) {
            for (let j in sources) {
              elements = sources[j].match(/^(.*)\s([0-9]{4})/);
              if (elements) {
                source = elements[1].trim();
                year = elements[2].trim();
              }
              else {
                source = sources[j].trim();
                year = null;
              }
              ref = 'source:'+source+','+year;
              if (ref in refs) {
                item.attributes[m].source = {
                  '#ref': ref
                }
              }
              else {
                refs[ref] = true,
                item.attributes[m].source = {
                  '#id': ref,
                  name: source,
                  year
                }
              }
            }
          }
        }
        else {
          _.set(item, column_name.replace('[i]', '['+(i-1)+']'), columns[n]);
        }
      }
      items.push(item);
    }
    return items;
}

app.post('/api/category', async function(req, res) {
  let category;
  if (req.body.csv) {
    category = await csvToObject(req.body.csv).catch(error => { console.log(error) });
  }
  else {
    category = req.body;
  }
  console.dir(category, {depth:null});
  return;
  Category.query()
    .upsertGraph(category)
    .then(category => {
      res.send(category);
    });
});

app.get('/api/item', function(req, res) {
  Item.query()
    .eager('[product.[category, manufacturer], transaction.[party]]')
    //.where('product.category.id', '5')
    .then(items => {
      items = items.filter(item => {
        if (req.body.category && item.product.category.id !== req.body.category) {
          return false;
        }
        else {
          return true;
        }
      });
      res.send(items);
    });
});

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
  let transaction = {};
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
    transaction = req.body;
  }
  console.dir(req.body, {depth:null});
  Transaction.query()
    .upsertGraph(req.body, {relate: true})
    .then(transaction => {
      res.send(transaction);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
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

function getCategories(parent) {
  return new Promise((resolve, reject) => {
    Category.query()
    .where('parent', parent)
    .eager('products.[items]')
    .then(category => {
      getCategories(category.id)
      .then((categories) => {
        category.children = categories;
        resolve(category);
      })
      .catch(reject);
    });
  });
}

function getClosestCategory(toCompare, locale) {
  return new Promise(resolve => {
    Category.query()
    .then(categories => {
      let name, category, response = null, max_distance = 0, distance;
      toCompare = toCompare.toLowerCase();
      for (let i in categories) {
        category = categories[i];
        name = category.name[locale];
        if (!name) continue;
        name = name.toLowerCase();
        distance = toCompare.match(name) && name.length/toCompare.length;
        if (distance > max_distance) {
          max_distance = distance;
          response = category;
        }
      }
      resolve(response);
    });
  });
}

function getAttributes(builder) {
  builder.eager('[products.[items], attributes, children(getAttributes)]', {getAttributes});
}

app.get('/api/category', function(req, res) {
  /*if (req.query.nested) {
    res.send(getCategories(req.query.parent || -1));
  }
  else */
  if (req.query.match) {
    res.send(getClosestCategory(req.query.match).id.toString());
    /*
    Category.query()
    //.eager('[products.[items], attributes, children.^]')
    .then(categories => {
      /*for (let i in categories) {
        category = categories[i];
        name = req.query.locale && category.locales ? category.locales[req.query.locale] : category.name;
        distance = levenshtein(name.toLowerCase(), req.query.match.toLowerCase());
        /*if (distance > max_distance) {
          max_distance = distance;
          response = name;
        }
        response.push({distance, name});
      }
      response = response.sort(function(a,b) {
        return a.distance < b.distance
      });
      res.send(response);
    });*/
  }
  else if ('parent' in req.query) {
    Category.query()
    .limit(1)
    .where('parentId', req.query.parent || null)
    .eager('[products.[items], children(getAttributes)]', {getAttributes})
    .then(categories => {
      res.send(categories);
    });
  }
  else if (req.query.hasOwnProperty('attributes')) {
    Category.query()
    .limit(200)
    .eager('[attributes]')
    .then(categories => {
      if (req.query.locale) {
        for (let i in categories) {
          if (categories[i].locales) {
            categories[i].name = categories[i].locales[req.query.locale];
            delete categories[i].locales;
          }
        }
      }
      res.send(categories);
    });
  }
  else {
    Category.query()
    //.limit(2000)
    .then(categories => {
      if (req.query.locale) {
        for (let i in categories) {
          if (categories[i].locales) {
            categories[i].name = categories[i].locales[req.query.locale];
            delete categories[i].locales;
          }
        }
      }
      res.send(categories);
    });
  }
});

app.get('/api/attribute', function(req, res) {
  Attribute.query()
  .where('parentId', null)
  .eager('[children.^]')
  .then(attributes => {
    res.send(attributes);
  })
});

app.get('/api/product', function(req, res) {
  Product.query()
    .then(product => {
      res.send(product);
    });
});

app.post('/api/receipt/picture', function(req, res) {
  upload(req, res, function(err) {
    if (err) {
      console.error(err);
      res.send(err);
      return;
    }

    let file = req.file;

    res.json({
      file: file.filename
    });
    res.end();
  });
});

app.get('/api/receipt/data/:id', function(req, res) {
  let data = req.body,
      language = data.language || 'fin',
      id = req.params.id;

  Category.query()
  .then(category => {
    data.categories = category;
    Product.query()
    .then(product => {
      data.products = product;

      Manufacturer.query()
      .then(manufacturer => {
        data.manufacturers = manufacturer;

        Transaction.query()
          .where('id', req.params.id)
          .eager('[items.[product.[category, manufacturer]], party, receipts]')
          .modifyEager('items.product.category', builder => {
            builder.select('id', 'name');
          })
          .then(transaction => {
            data.transactions = transaction;
            res.json(data);
          });
      });
    });
  });
});

app.post('/api/receipt/data/:id', function(req, res) {
  let data = req.body,
      language = data.language || 'fin',
      id = req.params.id;

  Category.query()
  .then(category => {
    data.categories = category;
    Product.query()
    .then(product => {
      data.products = product;

      Manufacturer.query()
      .then(manufacturer => {
        data.manufacturers = manufacturer;

        extractTextFromFile(id, data, language, async function(text) {
          if (text) {
            data = await getDataFromReceipt(data, text, language);
            //data.transactions[0].receipts = [{}];
            //data.transactions[0].receipts[0].text = text;
            data.transactions[0].receipts[0].file = id;
            res.json(data);
          }
          else {
            res.json({
              file: id
            })
          }
          res.end();
        });
      });
    });
  });
});

app.get('/api/receipt/original/:id', function (req, res) {
	var file_path = upload_path+"/"+req.params.id;
	fs.access(file_path, fs.R_OK, function(err) {
		if (err) {
			console.error(err);
			res.sendStatus(404);
			return;
		}
		//res.setHeader('Content-Type', picture.mimetype);
		fs.createReadStream(file_path).pipe(res);
	});
});

app.get('/api/receipt/picture/:id', function (req, res) {
	var file_path = upload_path+"/"+req.params.id+"_edited";
	fs.access(file_path, fs.R_OK, function(err) {
		if (err) {
			console.error(err);
			res.sendStatus(404);
			return;
		}
		//res.setHeader('Content-Type', 'image/jpeg');
		fs.createReadStream(file_path).pipe(res);
	});
});

app.get('/api/util/getexternalcategoriesfineli', function(req, res) {
  console.log('files '+moment().format());

  let food_rows = fs.readFileSync(__dirname+'/../fineli/food.csv', 'utf8').split('\n'),
      fuclass_rows = fs.readFileSync(__dirname+'/../fineli/fuclass_FI.csv', 'utf8').split('\n'),
      igclass_rows = fs.readFileSync(__dirname+'/../fineli/igclass_FI.csv', 'utf8').split('\n'),
      fuclass_en_rows = fs.readFileSync(__dirname+'/../fineli/fuclass_EN.csv', 'utf8').split('\n'),
      igclass_en_rows = fs.readFileSync(__dirname+'/../fineli/igclass_EN.csv', 'utf8').split('\n'),
      fuclass_sv_rows = fs.readFileSync(__dirname+'/../fineli/fuclass_SV.csv', 'utf8').split('\n'),
      igclass_sv_rows = fs.readFileSync(__dirname+'/../fineli/igclass_SV.csv', 'utf8').split('\n'),
      component_value_rows = fs.readFileSync(__dirname+'/../fineli/component_value.csv', 'utf8').split('\n'),
      component_rows = fs.readFileSync(__dirname+'/../fineli/component.csv', 'utf8').split('\n'),
      cmpclass_rows = fs.readFileSync(__dirname+'/../fineli/cmpclass_FI.csv', 'utf8').split('\n'),
      eufdname_rows = fs.readFileSync(__dirname+'/../fineli/eufdname_FI.csv', 'utf8').split('\n'),
      cmpclass_en_rows = fs.readFileSync(__dirname+'/../fineli/cmpclass_EN.csv', 'utf8').split('\n'),
      eufdname_en_rows = fs.readFileSync(__dirname+'/../fineli/eufdname_EN.csv', 'utf8').split('\n'),
      cmpclass_sv_rows = fs.readFileSync(__dirname+'/../fineli/cmpclass_SV.csv', 'utf8').split('\n'),
      eufdname_sv_rows = fs.readFileSync(__dirname+'/../fineli/eufdname_SV.csv', 'utf8').split('\n'),
      foodname_fi_rows = fs.readFileSync(__dirname+'/../fineli/foodname_FI.csv', 'utf8').split('\n'),
      foodname_en_rows = fs.readFileSync(__dirname+'/../fineli/foodname_EN.csv', 'utf8').split('\n'),
      foodname_sv_rows = fs.readFileSync(__dirname+'/../fineli/foodname_SV.csv', 'utf8').split('\n'),
      parent_ref, parent_name, second_parent_name, second_parent_ref, third_parent_ref,
      attr_ref,
      attr_refs = {},
      parent_attr_refs = {},
      second_parent_attr_refs = {},
      fuclass = {},
      igclass = {},
      component = {},
      cmpclass = {},
      eufdname = {},
      foodname = {},
      attribute_count = 0,
      value,
      attribute,
      food_row,
      row,
      parent,
      attribute_index = 1,
      refs = {
        '#food': true,
        '#ingredients': true,
        '#recipes': true
      },
      categories = {},
      category_values = [],
      attributes = {},
      attribute_values = [],
      base_categories = [
        {
          '#id': 'c4food',
          name: {
            'fi-FI': 'Ruoka',
            'en-US': 'Food',
            'sv-SV': 'Mat'
          }
        },
        {
          '#id': 'c3ingredient',
          name: {
            'fi-FI': 'Raaka-aine',
            'en-US': 'Ingredient',
            'sv-SV': 'Råvara'
          },
          parent: {
            '#ref': 'c4food',
          }
        },
        {
          '#id': 'c3dish',
          name: {
            'fi-FI': 'Ruokalaji',
            'en-US': 'Dish',
            'sv-SV': 'Maträtt'
          },
          parent: {
            '#ref': 'c4food'
          }
        }
      ];

  console.log('meta '+moment().format());

  Category.query()
    .insertGraph(base_categories)
    .then(async base_categories => {
      for (let i in foodname_fi_rows) {
        value = {};
        row = foodname_fi_rows[i].trim().split(';');
        value['fi-FI'] = row[1];
        row = foodname_en_rows[i].trim().split(';');
        value['en-US'] = row[1];
        row = foodname_sv_rows[i].trim().split(';');
        value['sv-SV'] = row[1];
        foodname[row[0]] = value;
      }

      for (let i in fuclass_rows) {
        value = {};
        row = fuclass_rows[i].trim().split(';');
        value['fi-FI'] = row[1];
        row = fuclass_en_rows[i].trim().split(';');
        value['en-US'] = row[1];
        row = fuclass_sv_rows[i].trim().split(';');
        value['sv-SV'] = row[1];
        fuclass[row[0]] = value;
      }

      for (let i in igclass_rows) {
        value = {};
        row = igclass_rows[i].trim().split(';');
        value['fi-FI'] = row[1];
        row = igclass_en_rows[i].trim().split(';');
        value['en-US'] = row[1];
        row = igclass_sv_rows[i].trim().split(';');
        value['sv-SV'] = row[1];
        igclass[row[0]] = value;
      }

      for (let i in component_rows) {
        row = component_rows[i].trim().split(';');
        component[row[0]] = row;
      }

      for (let i in cmpclass_rows) {
        value = {};
        row = cmpclass_rows[i].trim().split(';');
        value['fi-FI'] = row[1];
        row = cmpclass_en_rows[i].trim().split(';');
        value['en-US'] = row[1];
        row = cmpclass_sv_rows[i].trim().split(';');
        value['sv-SV'] = row[1];
        cmpclass[row[0]] = value;
      }

      for (let i in eufdname_rows) {
        value = {};
        row = eufdname_rows[i].trim().split(';');
        value['fi-FI'] = row[1];
        row = eufdname_en_rows[i].trim().split(';');
        value['en-US'] = row[1];
        row = eufdname_sv_rows[i].trim().split(';');
        value['sv-SV'] = row[1];
        eufdname[row[0]] = value;
      }

      console.log('food');

      for (let i = 1; i < food_rows.length; i++) {
        food_row = food_rows[i].trim().split(';');

        if (!food_row[0] || food_row[0] == 'FOODID') {
          continue;
        }

        if (food_row[6] == 'NONINGR') {
          parent_ref = food_row[7];
          parent_name = fuclass[parent_ref];
          second_parent_ref = food_row[8];
          second_parent_name = fuclass[second_parent_ref];
          third_parent_ref = base_categories[2].id; // dish
        }
        else {
          parent_ref = food_row[5];
          parent_name = igclass[parent_ref];
          second_parent_ref = food_row[6];
          second_parent_name = igclass[second_parent_ref];
          third_parent_ref = base_categories[1].id; // ingredient
        }

        if (parent_ref in refs) {
          parent = {
            '#ref': 'c1'+parent_ref
          };
        }
        else {
          refs[parent_ref] = true;
          parent = {
            '#id': 'c1'+parent_ref,
            name: parent_name
          };
          if (second_parent_ref in refs) {
            parent.parent = {
              '#ref': 'c2'+second_parent_ref
            }
          }
          else {
            refs[second_parent_ref] = true;
            parent.parent = {
              '#id': 'c2'+second_parent_ref,
              name: second_parent_name,
              parent: {
                'id': third_parent_ref,
              }
            }
          }
        }
      

        categories[food_row[0]] = {
          name: foodname[food_row[0]],
          //type: food_row[2],
          //process: food_row[3],
          //portion: food_row[4],
          parent
        };
      }

      for (let i in categories) {
        category_values.push(categories[i]);
      }

      await Category.query()
        .upsertGraph(category_values, {relate: true})
        .then(async category => {
          console.log('written '+moment().format());
          
          let n = 0;
          for (let i in categories) {
            categories[i] = category[n];
            n++;
          }

          for (let n = attribute_index; n < component_value_rows.length; n++) {
            row = component_value_rows[n].split(';');

            if (!row[0] || row[0] == 'FOODID')
              continue;

            /*  if (row[0] != food_row[0]) {
              attribute_index = n;
              break;
            }*/

            if (!(row[0] in attributes))
              attributes[row[0]] = {
                id: categories[row[0]].id,
                attributes: []
              };

            attr_ref = row[1];

            if (attr_ref in attr_refs) {
              attribute = {
                id: attr_refs[attr_ref]
              }
            }
            else {
              attribute = {
                name: eufdname[attr_ref],
                unit: component[attr_ref][1].toLowerCase()
              }

              parent_ref = component[row[1]][2];

              if (parent_ref in parent_attr_refs) {
                attribute.parent = {
                  id: parent_attr_refs[parent_ref]
                }
              }
              else {
                attribute.parent = {
                  name: cmpclass[parent_ref]
                }

                second_parent_ref = component[row[1]][3];

                if (second_parent_ref in second_parent_attr_refs) {
                  attribute.parent.parent = {
                    id: second_parent_attr_refs[second_parent_ref]
                  }
                }
                else {
                  attribute.parent.parent = {
                    name: cmpclass[second_parent_ref]
                  }
                }
              }

              await Attribute.query()
                .upsertGraph(attribute, {relate: true})
                .then(result => {
                  if (!(attr_ref in attr_refs))
                    attr_refs[attr_ref] = result.id;
                  if (!(parent_ref in parent_attr_refs))
                    parent_attr_refs[parent_ref] = result.parent.id;
                  if (!(second_parent_ref in second_parent_attr_refs))
                    second_parent_attr_refs[second_parent_ref] = result.parent.parent.id;

                  attribute = {id: result.id};
                })
                .catch(error => {
                  console.error(error);
                  throw new Error('Attribute error');
                });
            }

            if (row[2] != "")
            attributes[row[0]].attributes.push({
              attribute,
              value: parseFloat(row[2].replace(',', '.'))
            });

            attribute_count++;
          }
      })
      .catch(error => {
        console.error(error);
        throw new Error('Category values error');
      });

      let n = 0;
      for (let i in attributes) {
        attribute_values.push(attributes[i]);

        if (i % 20 == 0 || n == attribute_count-1) {
          await Category.query()
            .upsertGraph(attribute_values, {relate: true})
            .then(category => {
              console.log('done '+i+'/'+attribute_count+' '+moment().format());
            })
            .catch(error => {
              console.dir(attribute_values, {depth: null});
              console.log('error '+i+'/'+attribute_count+' '+moment().format());
              console.error(error);
              throw new Error('CategoryAttribute error');
            });
          attribute_values = [];
        }
        n++;
      }

      res.send(category);
      //attribute_values = attribute_values.slice(0,1);
      //console.dir(attribute_values, {depth:null});
    })
    .catch(error => {
      console.error(error);
      throw new Error('Base category error');
    });
});

app.get('/api/util/getexternalcategoriesfineliresultset', function(req, res) {
  request("https://fineli.fi/fineli/en/elintarvikkeet/resultset.csv", function(error, response, data) {
    request("https://fineli.fi/fineli/fi/elintarvikkeet/resultset.csv", async (error_fi, response_fi, data_fi) => {
      let rows = data.split('\n'),
          rows_fi = data_fi.split('\n'),
          column_titles = rows[0].split(';'),
          column_names = [],
          column_units = [],
          columns,
          columns_fi,
          rows_index_fi = {},
          categories = [],
          id,
          name,
          unit,
          attributes,
          attribute_names = [],
          parts,
          error = false;
  
      for (let r = 1; r < rows_fi.length; r++) {
        columns = rows_fi[r].split(';');
        rows_index_fi[columns[0]] = columns[1];
      }
  
      for (let c = 2; c < column_titles.length; c++) {
        parts = column_titles[c].trim().split('(');
        unit = parts[parts.length-1].substring(0,parts[parts.length-1].length-1);
        name = column_titles[c].substring(0, column_titles[c].length-unit.length-3);
        attribute_names.push({name, unit, group: 'nutrition'});
      }
  
      for (let r = 1; r < rows.length; r++) {
        columns = rows[r].split(';');
        id = columns[0];
        name = columns[1];
        attributes = {};
        error = false;
        if (!name || !rows_index_fi[id]) continue;
        for (let c = 2; c < columns.length; c++) {
          if (!attribute_names[c-2]) {
            error = true;
            break;
          }
          attributes[attribute_names[c-2].name] = parseFloat(columns[c].replace(/\r|</g, '')) || 0;
        }
        if (error) continue;
        categories.push({name, attributes, locales: {'fi-FI': rows_index_fi[id]}});

        if (r % 500 == 0) {
          console.log('ok1', r);
          await Category.query()
          .insertGraph(categories)
          .then(category => {
            console.log('ok2', r);
          });
          categories = [];
        }
      }
      console.log('ok3');
      //console.dir(categories, {depth:null});
      await Category.query()
      .insertGraph(categories)
      .then(category => {
        console.log('ok4');
      });
      await Attribute.query()
      .insertGraph(attribute_names)
      .then(attribute => {
        console.log('ok5');
      });
      console.log('ok6');
      res.send('ok');
      res.end();
    });
  });
});

}

// from https://github.com/thinkphp/String.levenshtein/blob/master/Source/String.levenshtein.js but no depencencies
function levenshtein(str1, str2) {
  var cost = new Array(),
    n = str1.length,
    m = str2.length,
    i, j;

  var minimum = function(a, b, c) {
    var min = a;
    if (b < min) {
      min = b;
    }
    if (c < min) {
      min = c;
    }
    return min;
  }

  if (n == 0) {
    return;
  }
  if (m == 0) {
    return;
  }

  for (var i = 0; i <= n; i++) {
    cost[i] = new Array();
  }

  for (i = 0; i <= n; i++) {
    cost[i][0] = i;
  }

  for (j = 0; j <= m; j++) {
    cost[0][j] = j;
  }

  for (i = 1; i <= n; i++) {
    var x = str1.charAt(i - 1);

    for (j = 1; j <= m; j++) {
      var y = str2.charAt(j - 1);

      if (x == y) {
        cost[i][j] = cost[i - 1][j - 1];
      } else {
        cost[i][j] = 1 + minimum(cost[i - 1][j - 1], cost[i][j - 1], cost[i - 1][j]);
      }

    } //endfor

  } //endfor

  return cost[n][m];
}