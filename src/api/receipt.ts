import express from 'express';
//import Jimp from 'jimp';
import fs from 'fs';
import child_process from 'child_process';
import _ from 'lodash';

import Transaction, { TransactionShape } from '../models/Transaction';
import Product, { ProductShape } from '../models/Product';
import Category, { CategoryShape } from '../models/Category';
import Manufacturer, { ManufacturerShape } from '../models/Manufacturer';
import Receipt, { ReceiptShape } from '../models/Receipt';
import { decodeBase64Image, getCVSrcFromBase64, rotate, getBufferFromCVSrc, extractBarCode, crop, receiptAdaptiveThreshold } from '../utils/imageProcessing';
import { processReceiptImage, extractTextFromFile, getTransactionsFromReceipt } from '../utils/receipts';
import Party, { PartyShape } from '../models/Party';

export default (app: express.Application) => {

/*const upload = multer({
  dest: upload_path,
  limits: {fileSize: 10000000}
}).single('file');*/

const RECEIPT_UPLOAD_PATH = `${__dirname}/../../resources/uploads`;

const uploadReceipt = (name: string, data: Buffer) => {
  const path = `${RECEIPT_UPLOAD_PATH}/${name}`;
  try {
    fs.writeFileSync(path, data as unknown as string);
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

app.post('/api/receipt/recognize/', async (req, res) => {
  if (Array.isArray(req.files.receipt)) {
    console.error('Please upload only one file');
    return res.sendStatus(500);
  }
  const buffer = req.files.receipt.data;
  const id: string = req.body.id;
  const name = `${id}_pre`;
  const path = `${RECEIPT_UPLOAD_PATH}/${name}`;

  const nameNoBarcode = `${id}_nobarcode`;
  let pathNoBarcode = `${RECEIPT_UPLOAD_PATH}/${nameNoBarcode}`;

  //console.log('cv', cv.getBuildInformation());

  try {
    uploadReceipt(name, buffer);
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
      let src = await getCVSrcFromBase64(buffer);
      const rotation = stdout.match(/Rotate: (\d+)/);
      console.log('rotate', rotation);
      if (rotation && parseInt(rotation[1])) {
        const angle = 360-parseInt(rotation[1]);
        src = rotate(src, angle);
        const rotatedBuffer = getBufferFromCVSrc(src);
        uploadReceipt(name, rotatedBuffer);
      }
      
      src = extractBarCode(src);
  
      const extractedBuffer = getBufferFromCVSrc(src);
      console.log('buffer', extractedBuffer);
      uploadReceipt(nameNoBarcode, extractedBuffer);
  
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
  data: ReceiptShape & { categories?: CategoryShape[], products?: ProductShape[], parties?: PartyShape[], transactions?: TransactionShape[] },
  language: string,
  id: string,
  suffix: string,
) => {
  const filePath = `${RECEIPT_UPLOAD_PATH}/${id}${suffix}`;

  try {
    const category = await Category.query();
    data.categories = category;
    const product = await Product.query();
    data.products = product;
    const party = await Party.query();
    data.parties = party;
    const text = await extractTextFromFile(filePath, language);
    if (text) {
      data = await getTransactionsFromReceipt(data, text, language, id);
      //data.transactions[0].receipts = [{}];
      //data.transactions[0].receipts[0].text = text;
      data.transactions[0].receipts[0].file = id;
      delete data.categories;
      delete data.products;
      delete data.parties;
      console.dir(data, { depth: null });
      return await Transaction.query().upsertGraph(data.transactions, { relate: true });
    }
  } catch (error) {
    console.error(error);
  }
}

app.post('/api/receipt/data/original/:id', function(req, res) {
  let data = req.body,
      language = data.language || 'fi-FI',
      id = req.params.id;

  processReceipt(data, language, id, '_original').then((response) => {
    res.send(response);
  })
  .catch(error => {
    console.error(error);
    res.sendStatus(500);
  });
});

app.post('/api/receipt/data/edited/:id', function(req, res) {
  let data = req.body,
      language = data.language || 'fi-FI',
      id = req.params.id;

  processReceipt(data, language, id, '_edited').then((response) => {
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
  if (Array.isArray(req.files.src)) {
    console.error('Please upload only one file');
    return res.sendStatus(500);
  }
  const base64Data = req.files.src.data;
  const name = `${req.body.id}_original`;

  try {
    const path = uploadReceipt(name, base64Data);
    res.send(path);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/api/receipt/edit', async (req, res) => {
  if (Array.isArray(req.files.src)) {
    console.error('Please upload only one file');
    return res.sendStatus(500);
  }
  const buffer = req.files.src.data;
  const name = `${req.body.id}_edited`;

  try {
    let src = await getCVSrcFromBase64(buffer);
    const croppedSrc = crop(src);
    const adaptiveThresholdSrc = receiptAdaptiveThreshold(croppedSrc);
    const editedBuffer = getBufferFromCVSrc(adaptiveThresholdSrc);
    const path = uploadReceipt(name, editedBuffer);
    res.send(path);
  } catch(error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/api/receipt/pre', (req, res) => {
  if (Array.isArray(req.files.src)) {
    console.error('Please upload only one file');
    return res.sendStatus(500);
  }
  const base64Data = req.files.src.data;
  const name = `${req.body.id}_pre`;

  try {
    const path = uploadReceipt(name, base64Data);
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
