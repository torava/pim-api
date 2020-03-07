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
import AWS from 'aws-sdk';
import Vision from '@google-cloud/vision';

const vision = new Vision.ImageAnnotatorClient();

export default app => {

AWS.config.update({
  region: 'eu-west-2'
});

const textract = new AWS.Textract();

const upload_path = __dirname+"/../../resources/uploads";

const upload = multer({
  dest: upload_path,
  limits: {fileSize: 10000000}
}).single('file');

// Decoding base-64 image
// Source: http://stackoverflow.com/questions/20267939/nodejs-write-base64-image-file
function decodeBase64Image(dataString) {
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

app.post('/api/receipt/recognize/', function(req, res) {
  const base64Data = req.body.src;
  const id = req.body.id;
  const name = id+'_pre';
  const path = upload_path+'/'+name;

  return uploadReceipt(name, base64Data)
  .then(() => {
    return child_process.execFile('tesseract', [
      '-l', 'fin_fast',
      '--psm', '0',
      '-c', 'tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890,.- ',
      '-c', 'textord_max_noise_size=20',
      //'-c', 'textord_noise_sizelimit=1',
      path,
      'stdout',
    ], function(error, stdout, stderr) {
      if (error) console.error(error);
      process.stdout.write(stdout);
      process.stderr.write(stderr);

      console.log(stdout);

      return res.send({
        result: stdout,
        id
      });
    });
  })
  .catch(error => {
    console.error(error);
    throw new Error();
  });
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

function uploadReceipt(name, base64Data) {
  return new Promise((resolve, reject) => {
    try {
      var imageBuffer = decodeBase64Image(base64Data);
      var image_path = upload_path+'/'+name;

      // Save decoded binary image to disk
      require('fs').writeFile(image_path, imageBuffer.data, () => {
        console.log('Uploaded '+image_path);
        resolve(name);
      });
    }
    catch(error) {
      console.error(error);
      reject(error);
    }
  });
}

app.post('/api/receipt/original', (req, res) => {
  var base64Data = req.body.src;
  var name = req.body.id+'_original';

  return uploadReceipt(name, base64Data)
  .then(name => res.send(name))
  .catch(error => res.sendStatus(500));
});

app.post('/api/receipt/picture', (req, res) => {
  var base64Data = req.body.src;
  var name = req.body.id+'_edited';

  return uploadReceipt(name, base64Data)
  .then(name => res.send(name))
  .catch(error => res.sendStatus(500));
});

app.post('/api/receipt/pre', (req, res) => {
  var base64Data = req.body.src;
  var name = req.body.id+'_pre';

  return uploadReceipt(name, base64Data)
  .then(name => res.send(name))
  .catch(error => res.sendStatus(500));
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

app.get('/api/receipt/pre/:id', function (req, res) {
	var file_path = upload_path+"/"+req.params.id+'_pre';
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

}