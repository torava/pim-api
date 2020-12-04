import Transaction from '../models/Transaction';
import Product from '../models/Product';
import Category from '../models/Category';
import Manufacturer from '../models/Manufacturer';
import Jimp from 'jimp';
import fs from 'fs';
import child_process from 'child_process';
import _ from 'lodash';
import Receipt from '../models/Receipt';
import cv from '../static/lib/opencv';
import { extractBarCode, getCVSrcFromBase64, rotate, getBufferFromCVSrc, decodeBase64Image } from '../utils/imageProcessing';

export default app => {

/*const upload = multer({
  dest: upload_path,
  limits: {fileSize: 10000000}
}).single('file');*/

const RECEIPT_UPLOAD_PATH = __dirname+"/../../resources/uploads";

function uploadReceiptFromBase64(name, base64Data) {
  return new Promise((resolve, reject) => {
    const buffer = decodeBase64Image(base64Data);
    if (buffer && buffer.data) {
      return uploadReceipt(name, buffer.data)
      .then(path => resolve(path))
      .catch(error => reject(error));
    }
    else reject('Encountered invalid file while uploading receipt');
  });
}

function uploadReceipt(name, data) {
  return new Promise((resolve, reject) => {
    const path = `${RECEIPT_UPLOAD_PATH}/${name}`;
    fs.writeFile(path, data, error => {
      if (error) {
        reject(error);
      }
      console.log('Uploaded '+path);
      resolve(path);
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
  const path = RECEIPT_UPLOAD_PATH+'/'+id+'_pre';

  child_process.execFile('tesseract', [
    '-l', 'fin',
    '-c', 'tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890,.-% ',
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
  const path = RECEIPT_UPLOAD_PATH+'/'+id+'_pre';

  child_process.execFile('tesseract', [
    '-l', 'fin',
    '--psm', '0',
    '-c', 'tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890,.-% ',
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

app.post('/api/receipt/recognize/', async function(req, res) {
  const base64Data = req.body.src;
  const id = req.body.id;
  const name = id+'_pre';
  const path = RECEIPT_UPLOAD_PATH+'/'+name;

  const nameNoBarcode = `${id}_nobarcode`;
  let pathNoBarcode = RECEIPT_UPLOAD_PATH+'/'+nameNoBarcode;

  //console.log('cv', cv.getBuildInformation());

  await uploadReceiptFromBase64(name, base64Data)
  .catch(error => {
    console.error(error);
    return res.sendStatus(500);
  });

  return child_process.execFile('tesseract', [
    '-l', 'fin',
    '--psm', '0',
    '-c', 'tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890,.-/% ',
    '-c', 'textord_max_noise_size=15',
    //'-c', 'textord_noise_sizelimit=1',
    path,
    'stdout',
  ], async function(error, stdout, stderr) {
    if (error) console.error(error);
    process.stdout.write(stdout);
    process.stderr.write(stderr);

    console.log('stdout', stdout);

    try {
      let src = getCVSrcFromBase64(base64Data);
      const rotation = stdout.match(/Rotate: (\d+)/);
      console.log('rotate', rotation);
      if (rotation && parseInt(rotation[1])) {
        const angle = 360-parseInt(rotation[1]);
        src = rotate(src, angle);
        const buffer = getBufferFromCVSrc(src);
        await uploadReceipt(name, buffer);
      }
      
      src = extractBarCode(src, id);
  
      const buffer = getBufferFromCVSrc(src);
      console.log('buffer', buffer);
      await uploadReceipt(nameNoBarcode, buffer);
  
      src.delete();
    } catch(error) {
      console.info('No bar code extracted', error);
      pathNoBarcode = path;
    }

    return child_process.execFile('tesseract', [
      '-l', 'fin',
      '--psm', '4',
      '-c', 'tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890,.:-/% ',
      '-c', 'textord_max_noise_size=15',
      //'-c', 'textord_noise_sizelimit=1',
      pathNoBarcode,
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
  });
});

function processReceipt(data, language, id) {
  return new Promise((resolve, reject) => {
    let filepath = RECEIPT_UPLOAD_PATH+"/"+id;

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

app.post('/api/receipt/original', (req, res) => {
  var base64Data = req.body.src;
  var name = req.body.id+'_original';

  return uploadReceiptFromBase64(name, base64Data)
  .then(name => res.send(name))
  .catch(error => res.sendStatus(500));
});

app.post('/api/receipt/picture', (req, res) => {
  var base64Data = req.body.src;
  var name = req.body.id+'_edited';

  return uploadReceiptFromBase64(name, base64Data)
  .then(name => res.send(name))
  .catch(error => res.sendStatus(500));
});

app.post('/api/receipt/pre', (req, res) => {
  var base64Data = req.body.src;
  var name = req.body.id+'_pre';

  return uploadReceiptFromBase64(name, base64Data)
  .then(name => res.send(name))
  .catch(error => res.sendStatus(500));
});

app.get('/api/receipt/original/:id', function (req, res) {
	var file_path = RECEIPT_UPLOAD_PATH+"/"+req.params.id+'_original';
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
	var file_path = RECEIPT_UPLOAD_PATH+"/"+req.params.id+"_edited";
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
	var file_path = RECEIPT_UPLOAD_PATH+"/"+req.params.id+'_pre';
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