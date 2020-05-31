import { RECEIPT_UPLOAD_PATH } from './receipt';

export function uploadReceipt(name, base64Data) {
  return new Promise((resolve, reject) => {
    try {
      const buffer = decodeBase64Image(base64Data).data;
      uploadReceiptFromBuffer(name, buffer);
      resolve(name);
    }
    catch(error) {
      console.error(error);
      reject(error);
    }
  });
}

export function uploadReceiptFromBuffer(name, buffer) {
  // Save decoded binary image to disk
  const path = RECEIPT_UPLOAD_PATH+'/'+name;
  require('fs').writeFileSync(path, buffer);
  console.log('Uploaded '+path);
  return name;
}

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