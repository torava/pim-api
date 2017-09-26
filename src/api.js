const objection = require('objection');
const multer = require('multer');
const express = require('express');
const tesseract = require('node-tesseract');
const app = express();
const im = require('imagemagick');
const fs = require('fs');
const shell = require('shelljs');

module.exports = function (app) {

const upload_path = __dirname+"/resources/uploads";

const upload = multer({
  dest: upload_path,
  limits: {fileSize: 10000000}
}).single('file');

function getDataFromReceipt(text, language) {
  let line, line_name, line_product_name, line_price, line_prices, line_id,
    line_total, line_date, line_address, line_vat, total_price_computed = 0,
    total_price, store, address, vat, date, item_price,
    items = [], line_number = 0,
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

      line = ines[i].trim().replace(/—/g, '-');
      if (line.length <= 1) continue;
      line_name = line.match(/[\u00C0-\u017F-a-z0-9 -.%\/]+/i);
      if (!line_name || line_name[0].length <= 1) continue;

      line_id = line.match(/^[0-9]{9}$/);

      line_price = line.replace(/(.,|,)/g, '.');
      line_prices = line_price.match(/([0-9]+\s*\.\s*[0-9]{2})/ig);
      line_price = line_price.match(/([0-9]+\s*\.\s*[0-9]{2})([\s|T|1]1)?$/i);
      if (line_price) item_price = parseFloat(line_price[1].replace(/\s/g, ''));

      if (line_price && line_price.index && !total_price) {
        line_product_name = line.substring(0, line_price.index);
        if (line_id) {
          line_product_name = line_product_name.substring(line_id[0].length);
        };
        line_product_name = line_product_name.match(/[\u00C0-\u017F-a-z0-9 -.%\/\(\){}]+/i);
      }

      line_total = line.match(/(yhteensä|yhteensa)/i);

      line_address = line.match(/[\u00C0-\u017F-a-z\/\s]+ [0-9]+/i);

      line_vat = line.match(/(y-tunnus )?([0-9]{7}[-|>][0-9]{1})/);

      line_date = line.match(/(([0-9]{1,2})[\.|,]([0-9]{1,2})[\.|,]([0-9]{2,4}))(\s)?(([0-9]{1,2}:)([0-9]{1,2}:)?([0-9]{1,2})?)?/);
      if (line_date) {
        date = Date.parse(line_date[4]+'/'+line_date[3]+'/'+line_date[2]+' '+line_date[6]);
      }
      console.log(line_product_name && line_product_name[0], item_price);
      if (line_total && line_price && line_prices.length == 1) {
        total_price = item_price;
      }
      else if (line_product_name && line_product_name.length && line_price && 
              line_product_name[0].length > 1 &&
              line_product_name[0].match(/käteinen|kateinen|käte1nen|kate1nen|taka1s1n|takaisin|yhteensä|yhteensa/i) === null) {
        items.push({
          name: line_product_name[0],
          price: item_price
        });
        if (item_price) total_price_computed+= item_price;
      }
      else if (line_id && line_id[0] && items.length) {
        items[items.length-1].id = line_id[0];
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
        line_product_name = line.substring(0, line_price.index);
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
        total_price = item_price;
      }
      else if (line_product_name && line_product_name.length && line_price && 
              line_product_name[0].length > 1 &&
              line_product_name[0].match(/subtotal|total|suma|suna|tarjeta|vuelta|uueltu/i) === null) {
        items.push({
          id: line_id && line_id[0].trim(),
          name: line_product_name[0],
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

  return {
    metadata: {
      store: store,
      total_price: total_price,
      total_price_computed: total_price_computed,
      date: date,
      address: address,
      vat: vat
    },
    items: items
  };
}

app.post('/api/receipt/picture', function(req, res) {
  upload(req, res, function(err) {
    if (err) {
      console.error(err);
      res.send(err);
      return;
    }

    var file = req.file;

    res.json({
      file: file.filename
    });
    res.end();
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

app.post('/api/receipt/data/:id', function(req, res) {
  let data = req.body,
      id = req.params.id,
      filepath = upload_path+"/"+id,
      convert_params = [filepath, '-gravity', 'northwest'],
      language = 'fin';
  // ./textcleaner -g -e normalize -T -f 50 -o 5 -a 0.1 -t 10 -u -s 1 -p 20 test.jpg test.png
  if (data.width && data.height)
      convert_params.push('-crop', parseInt(data.width)+'x'+parseInt(data.height)+'+'+parseInt(data.x)+'+'+parseInt(data.y));

  convert_params.push('-respect-parenthesis',
                      '-colorspace', 'gray',
                      '-type', 'grayscale',
                      '-normalize',
                      '-clone', 0,
                      '-negate',
                      '-contrast-stretch 0',
                      '-lat 50x50+5%',
                      '-blur', '1x65535',
                      '-level', '10x100%',
                      '-compose', 'copy_opacity',
                      '-composite',
                      '-fill', 'white',
                      '-opaque', 'none',
                      '-alpha', 'off',
                      '-background', 'white',
                      '-deskew', '40%',
                      '-sharpen', '0x1',
                      '-adaptive-blur', 0.1,
                      '-trim',
                      '+repage',
                      '-compose', 'over',
                      '-bordercolor', 'white',
                      '-border', 20,
                      filepath+'_edited');

  /*convert_params.push('-adaptive-resize', '600>',
                      '-lat', '50x50-7%',
                      filepath+'_edited');*/

  im.convert(convert_params,
              function(error, stdout, stderr) {
    if (error) console.error(error);
    process.stdout.write(stdout);
    process.stderr.write(stderr);

    tesseract.process(filepath+'_edited', {
      l: language in ['fin', 'eng', 'spa'] ? language : 'eng'
    }, function(err, text) {
      if (err) console.error(err);

      if (text) {
        data = getDataFromReceipt(text, language);
        data.text = text;
        data.file = id;
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