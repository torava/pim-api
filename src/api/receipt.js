const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Attribute = require('../models/Attribute');
const Manufacturer = require('../models/Manufacturer');
const multer = require('multer');
const express = require('express');
const Jimp = require('jimp');
const app = express();
const fs = require('fs');
const child_process = require('child_process');
const _ = require('lodash');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const sizeOf = require('image-size');
const moment = require('moment');

module.exports = function (app) {

const upload_path = __dirname+"/../../resources/uploads";

const upload = multer({
  dest: upload_path,
  limits: {fileSize: 10000000}
}).single('file');

function getClosestCategory(toCompare, locale) {
  return new Promise((resolve, reject) => {
    Category.query()
    .then(categories => {
      let name, category, response = null, max_distance = 0, distance, match;
      toCompare = toCompare.toLowerCase();
      for (let i in categories) {
        category = categories[i];
        name = category.name[locale];
        if (!name) continue;
        match = new RegExp('\\b'+_.escapeRegExp(name)+'\\b', 'i');
        distance = toCompare.match(match) && name.length/toCompare.length;
        if (distance > max_distance) {
          max_distance = distance;
          response = category;
        }
      }
      resolve(response);
    })
    .catch(reject);
  });
}

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

function localeToLanguage(locale) {
  let ocr_languages = {
    'fi-FI': 'fin',
    'es-AR': 'spa'
  }

  return ocr_languages[locale];
}

async function getDataFromReceipt(result, text, locale) {
  text = text
  .replace(/ﬂ|»|'|´|`|‘|“|"|”|\|/g, '')
  .replace(/(\d) *(\.,|\,|\.|_|\-|;) *(\d)/g, '$1.$3')
  .replace(/\.,|\,|_|\-|;/g, '')
  .replace(/—/g, '-')
  .replace(/ +/g, ' ');

  let line, line_name, line_product_name, line_price, line_prices, item_number, line_text,
    line_total, line_date, line_address, line_vat, line_item_details, quantity, measure,
    line_number_format, total_price_computed = 0, name, date, line_item, line_phone_number,
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
  if (locale == "fi-FI") {
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
        line_date = line.match(/((\d{1,2})[\.|\,](\d{1,2})[\.|\,](\d{2,4}))(\s)?((\d{1,2}):((\d{1,2})\:)?(\d{1,2})?)?/);
        date = line_date && parseYear(line_date[4])+'-'+line_date[3]+'-'+line_date[2]+' '+line_date[6];
        if (date) {
          console.log(line_date, date);
          data.date = date;

          found_attribute = 'date';
        }

        if (!date || !line_date[6]) {
          // 1:12 1-1-12
          line_date = line.match(/((\d{1,2}:)(\d{1,2}:)?(\d{1,2})?)?(\s)?((\d{1,2})[\-|\.](\d{1,2})[\-|\.](\d{2,4}))/);
          date = line_date && parseYear(line_date[9])+'-'+line_date[8]+'-'+line_date[7]+' '+line_date[1];
          if (date) {
            console.log(line_date, date);
            data.date = date;

            found_attribute = 'date';
          }
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
      line_total = line_number_format.match(/^(total|summa|yhteensä|yhteensa).*[^0-9]((\d+\.\d{2})(\-)?\s)?((\d+\.\d{2})(\-)?)$/i);
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
      if (previous_line === 'item') {
        // 1234 1,000 x 1,00
        line_item_details = line_number_format.match(/^((\d+)\s)?((((\d+)|((\d+\.\d{2,3})(\s?kg)?))\s?x\s?)?((\d+\.\d{2})\s?)(\s?EUR\/kg)?)$/i);

        if (line_item_details) {
          items[items.length-1].item_number = line_item_details[2];
          items[items.length-1].quantity = parseFloat(line_item_details[6]);
          items[items.length-1].measure = parseFloat(line_item_details[8]);
          previous_line = 'details';
          continue;
        }
      }
      
      // item line
      if (!has_discount && !data.total_price_read && !line.match(/käteinen|kateinen|käte1nen|kate1nen|taka1s1n|takaisin/i)) {
        line_price = line_number_format.match(/\s((\d+\.\d{2})(\-)?){1,2}\s*.{0,3}$/i);
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
  else if (locale == 'es-AR') {
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
  else return;

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

function processReceiptImage(filepath, data, resize) {
  return new Promise((resolve, reject) => {
    let script = [filepath,
                  //'-auto-orient',
                  '-type', 'grayscale',
                  '-background', 'none',
                  '-bordercolor', 'none',
                  '-border', '10',
                  //'-normalize',
                  //'-contrast-stretch', '0'
                ],
        parameters = {threshold: 10, blur: 1, sharpen: 1};

    if (!data) data = {};

    if ('blur' in data) {
      parameters.blur = parseInt(data.blur || 0);
    }
    if ('threshold' in data) {
      parameters.threshold = parseInt(data.threshold || 10);
    }
    if ('sharpen' in data) {
      parameters.sharpen = parseInt(data.sharpen || 0);
    }

    // ./textcleaner -g -e normalize -T -f 50 -o 5 -a 0.1 -t 10 -u -s 1 -p 20 test.jpg test.png
    if (data.rotate)
      script = script.concat(['-gravity', 'Center', '-rotate', parseFloat(data.rotate), '+repage']);
    if (data.width && data.height)
      script = script.concat(['-gravity', 'NorthWest', '-crop', parseInt(data.width)+'x'+parseInt(data.height)+'+'+parseInt(data.x)+'+'+parseInt(data.y), '+repage']);

    if (resize) {
      script = script.concat(['-adaptive-resize', resize === true ? '800x' : resize,
      ]);
    }

    if (parameters.blur)
      script = script.concat(['-adaptive-blur', parameters.blur]);
    if (parameters.sharpen)
      script = script.concat(['-sharpen', '0x'+parameters.sharpen]);

    script = script.concat(['-lat', '50x50-'+parameters.threshold+'%']);

    script = script.concat([
        '-set', 'option:deskew:autocrop', '1',
        '-deskew', '40%',
        '-fuzz', '5%',
        '-trim',
        '+repage',
        '-strip',
        'PNG:'+filepath+'_edited']);
    console.log(script);
    child_process.execFile('convert', script, function(error, stdout, stderr) {
      if (error) console.error(error);
      process.stdout.write(stdout);
      process.stderr.write(stderr);
      resolve();
    });
  });
}

function extractTextFromFile(filepath, locale) {
  let language = localeToLanguage(locale);

  return new Promise((resolve, reject) => {
    child_process.execFile('tesseract', [
      '-l',
      ['fin'].indexOf(language) !== -1 ? language : 'eng',
      '-psm', 6,
      filepath+'_edited',
      'stdout'
    ], function(error, stdout, stderr) {
      if (error) console.error(error);
      process.stdout.write(stdout);
      process.stderr.write(stderr);

      resolve(stdout);
    });
  });
}

app.post('/api/receipt/picture', function(req, res) {
  upload(req, res, function(err) {
    if (err) {
      console.error(error);
      throw new Error();
    }

    let file = req.file;

    processReceiptImage(file.path, {}, '800x').then((response) => {
      child_process.execFile('tesseract', [
        '-l', 'fin',
        file.path+'_edited',
        'stdout',
        'hocr',
      ], function(error, stdout, stderr) {
        if (error) console.error(error);
        process.stdout.write(stdout);
        process.stderr.write(stderr);

        let dimensions = sizeOf(file.path);

        const { document } = (new JSDOM(stdout)).window;

        let words = document.querySelectorAll('.ocrx_word'),
            boundaries = {},
            coords,
            left, top, right, bottom,
            factor = dimensions.width/800;

        for (let i in words) {
          if (!words[i] || !words[i].textContent || !words[i].textContent.trim()) continue;
          coords = words[i].title.split(';')[0].substring(5).split(' ');
          left = coords[0];
          top = coords[1];
          right = coords[2];
          bottom = coords[3];

          if (boundaries.hasOwnProperty('left')) {
            boundaries.left = Math.min(left, boundaries.left);
            boundaries.top = Math.min(top, boundaries.top);
            boundaries.right = Math.max(right, boundaries.right);
            boundaries.bottom = Math.max(bottom, boundaries.bottom);
          }
          else {
            boundaries.left = left;
            boundaries.top = top;
            boundaries.right = right;
            boundaries.bottom = bottom;
          }
        }
        let data = {
            x: (boundaries.left-15)*factor,
            y: (boundaries.top-15)*factor,
            width: (boundaries.right-boundaries.left+30)*factor,
            height: (boundaries.bottom-boundaries.top+30)*factor
        };

        processReceipt(data, 'fi-FI', file.filename).then((response) => {
          res.send(response);
        });
      });
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
  });
});

app.get('/api/receipt/data/:id', function(req, res) {
  let data = req.body,
      language = data.language,
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
          })
      })
    })
  })
  .catch(error => {
    console.error(error);
    throw new Error();
  });
});

app.post('/api/receipt/prepare/', function(req, res) {
  let script,
      color,
      width,
      height,
      original_width,
      original_height,
      distances = {
        nw: 999,
        ne: 999,
        se: 999,
        sw: 999
      },
      bounds,
      ratio,
      distance;
  upload(req, res, (err) => {
    let file = req.file;
    script = [file.path,
              '-auto-orient',
              '-resize', '100',
              //'-median', '1',
              //'-lat', '100x100-1%',
              '-median', 10,
              '-normalize',
              '-threshold', '50%',
              'PNG:'+file.path+'_median'];

    child_process.execFile('convert', script, function(error, stdout, stderr) {
      if (error) console.error(error);
      process.stdout.write(stdout);
      process.stderr.write(stderr);
      
      Jimp.read(file.path, (err, original) => {
        original_width = original.bitmap.width;
        original_height = original.bitmap.height;
        bounds = {
          x: original_width,
          y: original_height,
          width: 0,
          height: 0
        }
        Jimp.read(file.path+'_median', (err, image) => {
          width = image.bitmap.width;
          height = image.bitmap.height;
          ratio = original_width/width;
          image.scan(0, 0, width, height, function (x, y, index) {
            color = image.getPixelColor(x, y);
            if (color == '0xFFFFFFFF') {
              bounds.x = Math.min(bounds.x, x*ratio);
              bounds.y = Math.min(bounds.y, y*ratio);
              bounds.width = Math.max(bounds.width, x*ratio-bounds.x);
              bounds.height = Math.max(bounds.height, y*ratio-bounds.y);
              /*
              how about polygon
              distance = Math.sqrt(Math.pow(x-0, 2)+Math.pow(y-0, 2));
              if (distances.nw > distance) {
                bounds.nw = [x,y];
                distances.nw = distance;
                return true;
              }
              distance = Math.sqrt(Math.pow(x-width, 2)+Math.pow(y-0, 2));
              if (distances.ne > distance) {
                bounds.ne = [x,y];
                distances.ne = distance;
                return true;
              }
              distance = Math.sqrt(Math.pow(x-0, 2)+Math.pow(y-height, 2));
              if (distances.sw > distance) {
                bounds.sw = [x,y];
                distances.sw = distance;
                return true;
              }
              distance = Math.sqrt(Math.pow(x-width, 2)+Math.pow(y-height, 2));
              if (distances.se > distance) {
                bounds.se = [x,y];
                distances.se = distance;
                return true;
              }*/
            }
          });
          res.send({
            bounds,
            id: file.filename
          })
        });
      });
    });
  });
});

app.post('/api/receipt/hocr/', function(req, res) {
  upload(req, res, function(err) {
    if (err) {
      console.error(error);
      throw new Error();
    }

    let file = req.file;

    console.log(file);

    processReceiptImage(file.path, {}, true).then((response) => {
      child_process.execFile('tesseract', [
        '-l', 'fin',
        file.path+'_edited',
        'stdout',
        'output',
        'hocr',
      ], function(error, stdout, stderr) {
        if (error) console.error(error);
        process.stdout.write(stdout);
        process.stderr.write(stderr);

        res.send({
          hocr: stdout,
          id: file.filename
        });
      });
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
  });
});

function processReceipt(data, language, id) {
  return new Promise((resolve, reject) => {
    let filepath = upload_path+"/"+id;

    Category.query()
    .then(category => {
      data.categories = category;
      Product.query()
      .then(product => {
        data.products = product;

        Manufacturer.query()
        .then(manufacturer => {
          data.manufacturers = manufacturer;
          return processReceiptImage(filepath, data, true).then(response => {
            return extractTextFromFile(filepath, language).then(async (text) => {
              if (text) {
                data = await getDataFromReceipt(data, text, language);
                //data.transactions[0].receipts = [{}];
                //data.transactions[0].receipts[0].text = text;
                data.transactions[0].receipts[0].file = id;
              }
              else {
                data = {
                  file: id
                }
              }
              resolve(data);
            })
            .catch(error => {
              console.error(error);
              throw new Error();
            });
          })
          .catch(error => {
            console.error(error);
            throw new Error();
          });
        })
        .catch(error => {
          console.error(error);
          throw new Error();
        });
      })
      .catch(error => {
        console.error(error);
        throw new Error();
      });
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
  })
  .catch(error => {
    console.error(error);
    throw new Error();
  });
}

app.post('/api/receipt/data/:id', function(req, res) {
  let data = req.body,
      language = data.language || 'fi-FI',
      id = req.params.id;

  processReceipt(data, language, id).then((response) => {
    res.send(response);
  })
  .catch(error => {
    console.error(error);
    throw new Error();
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

}