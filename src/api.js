const Transaction = require('./models/Transaction');
const Product = require('./models/Product');
const Category = require('./models/Category');
const multer = require('multer');
const express = require('express');
const tesseract = require('node-tesseract');
const app = express();
const im = require('imagemagick');
const fs = require('fs');
const child_process = require('child_process');

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
  return str.replace(/([^\s:\-])([^\s:\-]*)/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function getDataFromReceipt(result, text, language) {
  let line, line_name, line_product_name, line_price, line_prices,
    line_total, line_date, line_address, line_vat, line_item_details, quantity,
    line_number_format, total_price_computed = 0, name, line_item, line_phone_number,
    total_price, price, has_discount, previous_line, found_attribute,
    items = [], line_number = 0, data = {party:{}},
    ines = text.split("\n");
  
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
    /*for (let i in ines) {
      line = ines[i].trim().replace(/—/g, '-');
      if (line.length <= 1) continue;
      line_name = line.match(/[\u00C0-\u017F-a-z0-9 -.%\/]+/i);
      if (!line_name || line_name[0].length <= 1) continue;

      line_price = line.match(/([0-9]+[,|.][0-9]{2})/i);
      line_prices = line.match(/([0-9]+[,|.][0-9]{2})/ig);
      if (line_price && line_price.index) {
        line_product_name = line.substring(0, line_price.index).match(/[\u00C0-\u017F-a-z0-9 -.%\/]+/i);
      }
      line_total = line.match(/(yhteensä|yhteensa)/i);

      line_address = line.match(/[\u00C0-\u017F-a-z\/\s]+ [0-9]+/i);

      line_vat = line.match(/(y-tunnus )?([0-9]{7}[-|>][0-9]{1})/);

      line_date = line.match(/(([0-9]{1,2})[\.|,]([0-9]{1,2})[\.|,]([0-9]{2,4}))(\s)?(([0-9]{1,2}:)([0-9]{1,2}:)?([0-9]{1,2})?)?/);
      if (line_date) {
        date = Date.parse(line_date[4]+'/'+line_date[3]+'/'+line_date[2]+' '+line_date[6]);
      }

      if (line_total && line_price && line_prices.length == 1) {
        total_price = line_price[1];
      }
      else if (line_product_name && line_product_name.length && line_price && line_prices.length == 1 && 
              line_product_name[0].length > 1 &&
              line_product_name[0].match(/käteinen|kateinen|käte1nen|kate1nen|taka1s1n|takaisin|yhteensä|yhteensa/i) === null) {
        items.push({name: line_product_name[0], price: line_price[1]});
      }
      else if (line_number == 0 && line_name) {
        store = line_name[0];
      }
      else if (!address && line_address) {
        address = line_address[0];
      }
      else if (!vat && line_vat) {
        vat = line_vat[1];
      }
      line_number++;
    }*/
    for (let i in ines) {
      line_product_name = null;

      found_attribute = null;

      line = ines[i].trim().replace(/—/g, '-');
      line_number_format = line.replace(/\s*(\.,|\,)\s*/g, '.');

      if (line.length <= 1) continue;
      line_name = line.match(/^[\u00C0-\u017F-a-z0-9\s\-\.%\/]+$/i);
      //if (!line_name || line_name[0].length <= 1) continue;

      line_number++;

      // Attributes to find only once
      if (!data.party.vat) {
        line_vat = line.match(/[0-9]{7}[-|>][0-9]{1}/);
        if (line_vat) {
          data.party.vat = line_vat[0];

          found_attribute = 'party.vat';
        }
      }

      if (!data.party.phone_number) {
        line_phone_number = line.replace(/\s/g, '').match(/[0-9]{10}|\+[0-9]{12}/);
        if (line_phone_number) {
          data.party.phone_number = line_phone_number[0];

          found_attribute = 'party.phone_number';
        }
      }

      if (!data.date) {
        // 1.1.12 1:12
        line_date = line.match(/(([0-9]{1,2})[\.|,]([0-9]{1,2})[\.|,]([0-9]{2,4}))(\s)?(([0-9]{1,2}:)([0-9]{1,2}:)?([0-9]{1,2})?)?/);
        if (line_date) {
          data.date = Date.parse(parseYear(line_date[4])+'/'+line_date[3]+'/'+line_date[2]+' '+line_date[6]);

          found_attribute = 'date';
        }

        // 1:12 1-1-12
        line_date = line.match(/(([0-9]{1,2}:)([0-9]{1,2}:)?([0-9]{1,2})?)?(\s)?(([0-9]{1,2})\-([0-9]{1,2})\-([0-9]{2,4}))/);
        if (line_date) {
          data.date = Date.parse(parseYear(line_date[9])+'/'+line_date[8]+'/'+line_date[7]+' '+line_date[1]);

          found_attribute = 'date';
        }
      }

      if (!data.party.street_name) {
        line_address = line.match(/^([\u00C0-\u017F-a-z\/]+)\s?([0-9]+)[,|.]?\s?([0-9]{5})[,|.]?\s?([\u00C0-\u017F-a-z\/]+)$/i);
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

      /*price_re = /([0-9]+\s*[\.|\,|\,\.]\s*[0-9]{2})(\-)?\s?/;
      name_re = /[\u00C0-\u017F-a-z0-9 -.%\/\(\){}]/;
      id_re = /[0-9]+(?=\s)/;
      quantity_re = /([0-9]+\s*[\.|\,|\,\.]\s*[0-9]{3})(\s?kg)?\sx\s(([0-9]+\s*[\.|\,|\,\.]\s*[0-9]{2})\s?)(\s?EUR\/kg)?/;
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
      line_total = line_number_format.match(/^(yhteensä|yhteensa).*[^0-9](([0-9]+\.[0-9]{2})(\-)?\s)?(([0-9]+\.[0-9]{2})(\-)?)$/i);
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
        line_item_details = line.match(/^[0-9]+$/);

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
        line_item_details = line_number_format.match(/^(([0-9]+)\s)?((([0-9]+\.[0-9]{2,3})(\s?kg)?\s?x\s?)?(([0-9]+\.[0-9]{2})\s?)(\s?EUR\/kg)?)$/i);

        if (line_item_details) {
          items[items.length-1].item_number = line_item_details[2];
          items[items.length-1].quantity = parseFloat(line_item_details[7]);
          previous_line = 'details';
          continue;
        }
      }
      
      // item line
      if (!has_discount && !data.total_price_read) {
        line_price = line_number_format.match(/\s(([0-9]+\.[0-9]{2})(\-)?\s?){1,2}([\s|T|1|A|B|8])?$/i);
        if (line_price) {
          line_item = line.substring(0, line_price.index).match(/^(([0-9]+)\s)?([\u00C0-\u017F-a-z0-9\s\-\.%\/\(\)\{\}]+)$/i);
          if (line_item) {
            price = parseFloat(line_price[1]);
            name = line_item[3];

            if (line_price[3] === '-') {
              has_discount = true;
              price = 0-price;
            }

            items.push({
              item_number: line_item[2] || '',
              text: line_item[0],
              //category: {},
              product: {
                name: name
              },
              price: price,
              quantity: quantity
            });

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
      
      /*// General attributes recognization
      line_id = line.match(/^([0-9]+)\s([\u00C0-\u017F-a-z0-9 -.%\/\(\){}]+)\s([0-9]+\s*\.\s*[0-9])(\-)?\s([0-9]+\s*\.\s*[0-9])(\-)?\s([0-9]+\s*\.\s*[0-9])(\-)?([\s|T|1]1)?$/);

      line_id = line.match(/^([0-9]+(?=\s))?(([0-9]+\s*\.\s*[0-9]{3})(\-)?\s?)(\skg)?\sx\s(([0-9]+\s*\.\s*[0-9]{2})(\-)?\s?)\s(EUR\/kg)/i);

      line.match(/^([0-9]+(?=\s))?([\u00C0-\u017F-a-z0-9\s\-%\/\(\){}]+)(([0-9]+\s*\.\s*[0-9]{2})(\-)?\s?){1,2}[\s|T|1|A|B]?$/i);

      line_price = line.replace(/(\.,|,)/g, '.');
      line_prices = line_price.match(/([0-9]+\s*\.\s*[0-9]{2})/ig);
      line_price = line_price.match(/([0-9]+\s*\.\s*[0-9]{2})(\-)?([\s|T|1]1)?$/i);
      if (line_price) {
        item_price = parseFloat(line_price[1].replace(/\s/g, ''));
        if (line_price[2] === '-') {
          has_discount = true;
          item_price = 0-item_price;
        }
      }
      
      if (line_price && line_price.index) {
        line_product_name = line.substring(0, line_price.index-1);
        if (line_id) {
          line_product_name = line_product_name.substring(line_id[0].length);
        };
        console.log(line_id, line_price, line_product_name);
        line_product_name = line_product_name.match(/[\u00C0-\u017F-a-z0-9 -.%\/\(\){}]+/i);
      }

      line_total = line.match(/^(yhteensä|yhteensa)/i);
      
      // General attributes setting
      if (line_total && line_price && line_prices.length == 1) {
        data.total_price_read = item_price;
        previous_line = 'total_price';
      }
      else if (line_product_name && line_product_name.length && line_price && 
              line_prices.length <= 2 &&
              (!has_discount || line_price[2] === '-') &&
              line_product_name[0].length > 1 &&
              line_product_name[0].match(/käteinen|kateinen|käte1nen|kate1nen|taka1s1n|takaisin|yhteensä|yhteensa/i) === null) {
        items.push({
          barcode: line_id && line_id[0].trim() || '',
          text: line_product_name[0],
          //category: {},
          product: {
            name: line_product_name[0]
          },
          price: item_price
        });

        let found = false;
        for (i in result.products) {
          if (result.products[i].name === line_product_name[0]) {
            found = true;
            break;
          }
        }
        !found && result.products.push({label: line_product_name[0], name: line_product_name[0]});

        if (item_price) total_price_computed+= item_price;

        previous_line = 'item';
      }
      else if (previous_line === 'item' && line_id && line_id[0] && items.length) {
        items[items.length-1].id = line_id[0];

        previous_line = 'item.id';
      }
      else if (line_number == 1 && line_name) {
        data.party.name = toTitleCase(line_name[0]);

        previous_line = 'party.name';
      }
      else {
        previous_line = null;
      }*/
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

      line = ines[i].trim().replace(/—/g, '-');
      if (line.length <= 1) continue;
      line_name = line.match(/[\u00C0-\u017F-a-z0-9 -.%\/]+/i);
      if (!line_name || line_name[0].length <= 1) continue;

      line_id = line.match(/^[0-9]{6}\s/);

      line_price = line.replace(/(.,|,)/g, '.');
      line_prices = line_price.match(/([0-9]+\s*\.\s*[0-9]{2})/ig);
      line_price = line_price.match(/([0-9]+\s*\.\s*[0-9]{2})$/i);
      if (line_price) item_price = parseFloat(line_price[1].replace(/\s/g, ''));

      if (line_price && line_price.index && !total_price) {
        line_product_name = line.substring(0, line_price.index-1);
        if (line_id) {
          line_product_name = line_product_name.substring(line_id[0].length);
        };
        line_product_name = line_product_name.match(/[\u00C0-\u017F-a-z0-9 -.%\/\(\){}]+/i);
      }

      line_total = !line.match(/(sub)/i) && line.match(/(total)/i);

      line_address = line.match(/[\u00C0-\u017F-a-z\/\s]+ [0-9]+/i);

      line_vat = line.match(/(cuit nro\s?\.?)?([0-9]{2}[-|>][0-9]{8}[-|>][0-9]{1})/);

      line_date = line.match(/(fecha|facha|feche|fache)? (([0-9]{1,2})[/]([0-9]{1,2})[/]([0-9]{2,4}))(\s)? (hora)? (([0-9]{1,2}:)([0-9]{1,2}:)?([0-9]{1,2})?)?/i);
      if (line_date) {
        date = Date.parse('20'+line_date[5]+'/'+line_date[4]+'/'+line_date[3]+' '+line_date[8]);
      }
      
      if (line_total && line_price && line_prices.length == 1) {
        console.log('yhteensä', line);
        total_price = item_price;
      }
      else if (line_product_name && line_product_name.length && line_price && 
              line_product_name[0].length > 1 &&
              line_product_name[0].match(/subtotal|total|suma|suna|tarjeta|vuelta|uueltu/i) === null) {
        items.push({
          barcode: line_id && line_id[0].trim(),
          category: {},
          text: line_product_name[0],
          product: {
            name: line_product_name[0]
          },
          price: item_price
        });
        if (item_price) total_price_computed+= item_price;
      }
      else if (line_number == 0 && line_name) {
        store = line_name[0];
      }
      else if (!address && line_address) {
        address = line_address[0];
      }
      else if (!vat && line_vat) {
        vat = line_vat[1];
      }
      line_number++;
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
  
  return result;
}

function extractTextFromFile(id, data, language, cb) {
  let filepath = upload_path+"/"+id,
      script = [filepath, '-auto-orient'];

  // ./textcleaner -g -e normalize -T -f 50 -o 5 -a 0.1 -t 10 -u -s 1 -p 20 test.jpg test.png
  if (data.width && data.height)
    script = script.concat(['-crop', parseInt(data.width)+'x'+parseInt(data.height)+'+'+parseInt(data.x)+'+'+parseInt(data.y)]);

  script = script.concat([
      '-adaptive-resize', '700x',
      '-type', 'grayscale',
      '-normalize',
      '-lat', '50x50-7%',
      '-adaptive-blur', '3',
      '-sharpen', '0x3',
      '-set', 'option:deskew:autocrop', 'true',
      '-deskew', '40%',
      '-trim',
      '+repage',
      '-bordercolor', 'white',
      '-border', '20',
      '-format', 'png',
      filepath+'_edited']);

  console.log(script);
  child_process.execFile('convert', script, function(error, stdout, stderr) {
    if (error) console.error(error);
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    tesseract.process(filepath+'_edited', {
      l: ['fin', 'eng', 'spa'].indexOf(language) !== -1 ? language : 'eng'
    }, function(err, text) {
      if (err) console.error(err);

      cb(text);
    });
  });
}

app.post('/api/transaction', function(req, res) {
  Transaction.query()
    .insertGraph(req.body)
    .then(transaction => {
      res.send(transaction);
    });
});

app.get('/api/transaction', function(req, res) {
  Transaction.query()
    .eager('[items.[product, category], party, receipts]')
    .then(transaction => {
      res.send(transaction);
    });
});

app.get('/api/category', function(req, res) {
  Category.query()
    .then(category => {
      res.send(category);
    });
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

      extractTextFromFile(id, data, language, function(text) {
        if (text) {
          data = getDataFromReceipt(data, text, language);
          data.transactions[0].receipts = [{}];
          data.transactions[0].receipts[0].text = text;
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