import express from 'express';
//import Jimp from 'jimp';
import fs from 'fs';
import child_process from 'child_process';
import _ from 'lodash';
import { extractBarCode, getCVSrcFromBase64, rotate, getBufferFromCVSrc, decodeBase64Image } from '@torava/product-utils/dist/utils/imageProcessing';
import { extractTextFromFile, getTransactionsFromReceipt, processReceiptImage } from '@torava/product-utils/dist/utils/receipts';

import Transaction from '../models/Transaction';
import Product from '../models/Product';
import Category from '../models/Category';
import Manufacturer from '../models/Manufacturer';
import Receipt from '../models/Receipt';
import CategoryShape from '@torava/product-utils/dist/models/Category';
import ProductShape from '@torava/product-utils/dist/models/Product';
import ManufacturerShape from '@torava/product-utils/dist/models/Manufacturer';
import ReceiptShape from '@torava/product-utils/dist/models/Receipt';
import TransactionShape from '@torava/product-utils/dist/models/Transaction';

export default (app: express.Application) => {

/*const upload = multer({
  dest: upload_path,
  limits: {fileSize: 10000000}
}).single('file');*/

const RECEIPT_UPLOAD_PATH = `${__dirname}/../../resources/uploads`;

const uploadReceiptFromBase64 = (name: string, base64Data: string) => {
  try {
    const buffer = decodeBase64Image(base64Data);
    if (buffer && buffer.data) {
      return uploadReceipt(name, buffer.data);
    }
    else console.error('Encountered invalid file while uploading receipt');
  } catch (error) {
    console.error(error);
  }
};

const uploadReceipt = (name: string, data: Buffer) => {
  const path = `${RECEIPT_UPLOAD_PATH}/${name}`;
  try {
    fs.writeFileSync(path, data);
    console.log(`Uploaded ${path}`);
    return path;
  } catch (error) {
    console.error(error);
  }
};

app.get('/api/receipt/data/:id', async (req, res) => {
  const data = req.body;
  const { id } = req.params;
  try {
    const category = await Category.query();
    data.categories = category;
    const product = await Product.query()
    data.products = product;
    const manufacturer = await Manufacturer.query();
    data.manufacturers = manufacturer;
    const transaction = await Transaction.query()
    .where('id', id)
    .withGraphFetched('[items.[product.[category, manufacturer]], party, receipts]')
    .modifyGraph('items.product.category', builder => {
      builder.select('id', 'name');
    });
    data.transactions = transaction;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

/*app.post('/api/receipt/prepare/', function(req, res) {
  let script,
      color,
      width,
      height,
      originalWidth: number,
      originalHeight: number,
      distances = {
        nw: 999,
        ne: 999,
        se: 999,
        sw: 999
      },
      distance,
      bounds,
      ratio;
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
        originalWidth = original.bitmap.width;
        originalHeight = original.bitmap.height;
        bounds = {
          x: originalWidth,
          y: originalHeight,
          width: 0,
          height: 0
        }
        Jimp.read(file.path+'_median', (err, image) => {
          width = image.bitmap.width;
          height = image.bitmap.height;
          ratio = originalWidth/width;
          image.scan(0, 0, width, height, function (x, y, index) {
            color = image.getPixelColor(x, y);
            if (color == '0xFFFFFFFF') {
              bounds.x = Math.min(bounds.x, x*ratio);
              bounds.y = Math.min(bounds.y, y*ratio);
              bounds.width = Math.max(bounds.width, x*ratio-bounds.x);
              bounds.height = Math.max(bounds.height, y*ratio-bounds.y);
              
              // how about polygon
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
              }
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
});*/

app.post('/api/receipt/hocr/', (req, res) => {
  const id = req.query.id;
  const path = `${RECEIPT_UPLOAD_PATH}/${id}_pre`;

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
  });
});

app.post('/api/receipt/osd/', function(req, res) {
  const id = req.query.id;
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
  });
});

app.post('/api/receipt/recognize/', async (req, res) => {
  const base64Data = req.body.src;
  const id: string = req.body.id;
  const name = `${id}_pre`;
  const path = `${RECEIPT_UPLOAD_PATH}/${name}`;

  const nameNoBarcode = `${id}_nobarcode`;
  let pathNoBarcode = `${RECEIPT_UPLOAD_PATH}/${nameNoBarcode}`;

  //console.log('cv', cv.getBuildInformation());

  try {
    uploadReceiptFromBase64(name, base64Data);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }

  return child_process.execFile('tesseract', [
    '-l', 'fin',
    '--psm', '0',
    '-c', 'tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890,.-/% ',
    '-c', 'textord_max_noise_size=15',
    //'-c', 'textord_noise_sizelimit=1',
    path,
    'stdout',
  ], async (error: Error, stdout: string, stderr: string) => {
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
      
      src = extractBarCode(src);
  
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
      '-c', 'tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890-,.:/% ',
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

const processReceipt = async (
  data: ReceiptShape & { categories?: CategoryShape[], products?: ProductShape[], manufacturers?: ManufacturerShape[], transactions?: TransactionShape[] },
  language: string,
  id: string
) => {
  let filepath = `${RECEIPT_UPLOAD_PATH}/${id}`;

  try {
    const category = await Category.query();
    data.categories = category;
    const product = await Product.query();
    data.products = product;
    const manufacturer = await Manufacturer.query();
    data.manufacturers = manufacturer;
    const response = await processReceiptImage(filepath, data, true);
    const text = await extractTextFromFile(filepath, language);
    if (text) {
      data = await getTransactionsFromReceipt(data, text, language, id);
      //data.transactions[0].receipts = [{}];
      //data.transactions[0].receipts[0].text = text;
      data.transactions[0].receipts[0].file = id;
    }
    else {
      data = {
        file: id
      }
    }
    return data;
  } catch (error) {
    console.error(error);
  }
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
    res.sendStatus(500);
  });
});

app.post('/api/receipt', async (req, res) => {
  try {
    const receipt = await Receipt.query().insert({});
    res.send(receipt);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/api/receipt/original', (req, res) => {
  const base64Data = req.body.src;
  const name = `${req.body.id}_original`;

  try {
    const path = uploadReceiptFromBase64(name, base64Data);
    res.send(path);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/api/receipt/picture',  (req, res) => {
  const base64Data = req.body.src;
  const name = `${req.body.id}_edited`;

  try {
    const path = uploadReceiptFromBase64(name, base64Data);
    res.send(path);
  } catch(error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/api/receipt/pre', (req, res) => {
  const base64Data = req.body.src;
  const name = `${req.body.id}_pre`;

  try {
    const path = uploadReceiptFromBase64(name, base64Data);
    res.send(path);
  } catch(error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get('/api/receipt/original/:id', (req, res) => {
	const filePath = `${RECEIPT_UPLOAD_PATH}/${req.params.id}_original`;
	fs.access(filePath, fs.constants.R_OK, (err) => {
		if (err) {
			console.error(err);
			res.sendStatus(404);
      return;
		}
		//res.setHeader('Content-Type', picture.mimetype);
		fs.createReadStream(filePath).pipe(res);
	});
});

app.get('/api/receipt/picture/:id', (req, res) => {
	const filePath = `${RECEIPT_UPLOAD_PATH}/${req.params.id}_edited`;
	fs.access(filePath, fs.constants.R_OK, (err) => {
		if (err) {
			console.error(err);
			res.sendStatus(404);
			return;
		}
		//res.setHeader('Content-Type', 'image/jpeg');
		fs.createReadStream(filePath).pipe(res);
	});
});

app.get('/api/receipt/pre/:id', (req, res) => {
	const filePath = `${RECEIPT_UPLOAD_PATH}/${req.params.id}_pre`;
	fs.access(filePath, fs.constants.R_OK, (err) => {
		if (err) {
			console.error(err);
			res.sendStatus(404);
			return;
		}
		//res.setHeader('Content-Type', picture.mimetype);
		fs.createReadStream(filePath).pipe(res);
	});
});

}
