import Transaction from '../models/Transaction';
import Product from '../models/Product';
import Category from '../models/Category';
import Manufacturer from '../models/Manufacturer';
import multer from 'multer';
import Jimp from 'jimp';
import fs from 'fs';
import child_process from 'child_process';
import _ from 'lodash';
import {JSDOM} from 'jsdom';
import sizeOf from 'image-size';
import moment from 'moment';
import crypto from 'crypto';
import Receipt from '../models/Receipt';
import Vision from '@google-cloud/vision';

const vision = new Vision.ImageAnnotatorClient();

export default app => {

const upload_path = __dirname+"/../../resources/uploads";

const upload = multer({
  dest: upload_path,
  limits: {fileSize: 10000000}
}).single('file');

// Decoding base-64 image
// Source: http://stackoverflow.com/questions/20267939/nodejs-write-base64-image-file
function decodeBase64Image(dataString) 
{
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  var response = {};

  if (matches.length !== 3) 
  {
    return new Error('Invalid input string');
  }

  response.type = matches[1];
  response.data = Buffer.from(matches[2], 'base64');

  return response;
}

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
        if (date && moment(date).isValid()) {
          console.log(line_date, date);
          data.date = date;

          found_attribute = 'date';
        }

        if (!date || !line_date[6]) {
          // 1:12 1-1-12
          line_date = line.match(/((\d{1,2}:)(\d{1,2}:)?(\d{1,2})?)?(\s)?((\d{1,2})[\-|\.](\d{1,2})[\-|\.](\d{2,4}))/);
          date = line_date && parseYear(line_date[9])+'-'+line_date[8]+'-'+line_date[7]+' '+line_date[1];
          if (date && moment(date).isValid()) {
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
                  '-auto-orient',
                  '-type', 'grayscale',
                  '-background', 'white',
                  '-bordercolor', 'white',
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
    
    console.log(script.join(' '));
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
              '-strip',
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
  const id = req.id;
  const path = upload_path+'/'+id+'_pre';

  child_process.execFile('tesseract', [
    '-l', 'fin',
    '-c', 'tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890,.- ',
    //'-c', 'textord_max_noise_size=30',
    //'-c', 'textord_noise_sizelimit=1',
    path,
    'stdout',
    'output',
    'hocr',
  ], function(error, stdout, stderr) {
    if (error) console.error(error);
    process.stdout.write(stdout);
    process.stderr.write(stderr);

    //const json = xmlParser.parse(stdout);

    res.send({
      result: stdout,
      id
    });
  })
  .catch(error => {
    console.error(error);
    throw new Error();
  });
});

app.post('/api/receipt/osd/', function(req, res) {
  const id = req.id;
  const path = upload_path+'/'+id+'_pre';

  child_process.execFile('tesseract', [
    '-l', 'fin',
    '--psm', '0',
    '-c', 'tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890,.- ',
    //'-c', 'textord_max_noise_size=30',
    //'-c', 'textord_noise_sizelimit=1',
    path,
    'stdout',
  ], function(error, stdout, stderr) {
    if (error) console.error(error);
    process.stdout.write(stdout);
    process.stderr.write(stderr);

    res.send({
      result: stdout,
      id
    });
  })
  .catch(error => {
    console.error(error);
    throw new Error();
  });
});

app.post('/api/receipt/recognize/', async (req, res) => {
  try {
    const content = decodeBase64Image(req.body.src).data;
    const request = {
      image: {
        content
      },
      "features": [{
        type: 'TEXT_DETECTION',
        maxResults:1
      }],
      "imageContext": {
        "languageHints": [
          "fi"
        ]
      }
    };

    const [detections] = await vision.annotateImage(request);
    const annotation = detections.textAnnotations[0];
    const text = annotation ? annotation.description : '';
    console.log('Text:', text);

    res.send(text);
  } catch(error) {
    console.error(error);
    res.status(500).send(error);
  }
});

function processReceipt(data, language, id) {
  return new Promise((resolve, reject) => {
    let filepath = upload_path+"/"+id;

    return Category.query()
    .then(category => {
      data.categories = category;
      return Product.query()
      .then(product => {
        data.products = product;

        return Manufacturer.query()
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
          })
        })
      })
    })
    .catch(error => {
      console.error(error);
      reject(error);
    });
  })
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

app.post('/api/receipt', (req, res) => {
  Receipt
  .query()
  .insert({})
  .then(receipt => {
    res.send(receipt);
  })
  .catch(error => {
    console.error(error);
    throw new Error();
  });
});

function uploadReceipt(res, name, base64Data) {
  try {
    var imageBuffer = decodeBase64Image(base64Data);
    var image_path = upload_path+'/'+name;

    // Save decoded binary image to disk
    require('fs').writeFile(image_path, imageBuffer.data, () => {
      console.log('Uploaded '+image_path);
      res.send(name);
    });
  }
  catch(error) {
    console.error(error);
    res.sendStatus(500);
  }
}

app.post('/api/receipt/original', (req, res) => {
  var base64Data = req.body.src;
  var name = req.body.id+'_original';

  uploadReceipt(res, name, base64Data);
});

app.post('/api/receipt/picture', (req, res) => {
  var base64Data = req.body.src;
  var name = req.body.id+'_edited';

  uploadReceipt(res, name, base64Data);
});

app.post('/api/receipt/pre', (req, res) => {
  var base64Data = req.body.src;
  var name = req.body.id+'_pre';

  uploadReceipt(res, name, base64Data);
});

app.get('/api/receipt/original/:id', function (req, res) {
	var file_path = upload_path+"/"+req.params.id+'_original';
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