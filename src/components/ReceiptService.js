import axios from "axios";
import DataStore from './DataStore';
import {getTransactionsFromReceipt} from '../utils/receipt';

const WAITING = -1;

const exif_rotation = {
  1: 0,
  3: 180,
  6: 270,
  8: 90
};

// thx https://gist.github.com/runeb/c11f864cd7ead969a5f0
function _arrayBufferToBase64( buffer ) {
  var binary = ''
  var bytes = new Uint8Array( buffer )
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode( bytes[ i ] )
  }
  return window.btoa( binary );
}

function localeToLanguage(locale) {
  let ocr_languages = {
    'fi-FI': 'fin',
    'es-AR': 'spa'
  }

  return ocr_languages[locale];
}

class ReceiptService {
  constructor() {
    this.pipeline = {};

    Promise.all([
      DataStore.getProducts(),
      DataStore.getManufacturers(),
      DataStore.getCategories(),
      DataStore.getParties()
    ])
    .then(([products, manufacturers, categories, parties]) => {
      console.log(products);
      this.products = products;
      this.manufacturers = manufacturers;
      this.categories = categories;
      this.parties = parties;
    })
    .catch(error => console.error(error));
  }
  prepareReceiptPipeline() {
    return new Promise((resolve, reject) => {
      return Promise.all([
        this.saveEditedPipeline(),
        this.saveOriginalPipeline()
      ])
      .then(([edited, original]) => {
        resolve([edited, original]);
      })
      .catch(error => reject(error));
    });
  }
  saveOriginalPipeline() {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();

      reader.addEventListener('load', () => {
        axios.post('/api/receipt/original', {
          src: reader.result,
          id: this.pipeline.receipt.id
        })
        .then(original => resolve(original))
        .catch(error => reject(error));
      });

      reader.readAsDataURL(this.pipeline.file);
    });
  }
  saveEditedPipeline() {
    return new Promise((resolve, reject) => {
      if (this.pipeline.receipt && this.pipeline.imagedata) {
        axios.post('/api/receipt/picture', {
          src: this.pipeline.imagedata,
          id: this.pipeline.receipt.id
        })
        .then(edited => resolve(edited))
        .catch(error => reject(error));
      }
      else resolve(WAITING);
    });
  }
  recognizePipeline() {
    return new Promise((resolve, reject) => {
      /*let cropped_words = [],
          cropped_lines = [],
          cropped_text,
          x = this.pipeline.rect.x,
          y = this.pipeline.rect.y,
          w = this.pipeline.rect.w,
          h = this.pipeline.rect.h;

      this.pipeline.lines.forEach(line => {
        cropped_words = [];
        line.words.forEach(word => {
          if (word.bbox.x0 > x && word.bbox.y0 > y && word.bbox.x1 < x+w && word.bbox.y1 < y+h) {
            cropped_words.push(word.text);
          }
        });
        if (cropped_words.length) {
          cropped_lines.push(cropped_words.join(' '));
        }
      });

      cropped_text = cropped_lines.join("\n");*/
      
      let data = {
        products: this.products,
        manufacturers: this.manufacturers,
        categories: this.categories,
        parties: this.parties
      },
          locale = 'fi-FI';
      /*this.getTransactionsFromReceipt(data, cropped_text, locale);


      let transaction = data.transactions[0],
          total_price = transaction.total_price,
          total_price_read = transaction.total_price_read;

      console.log('extracted', 'cropped_words', cropped_words, 'total_price', total_price, 'total_price_read', total_price_read);
      console.timeLog('process');
      console.log(data, locale);*/

      return this.pipeline.tesseract_worker.detect(this.pipeline.imagedata)
      .then(result => {
        const rotate = result.data.orientation_degrees;
        this.pipeline.dst = this.rotateImage(this.pipeline.dst, 360-rotate);

        console.log('rotated '+rotate+' degrees');
        console.timeLog('process');

        let resized = this.pipeline.dst;
              
        const dsize = new cv.Size(800, resized.rows/resized.cols*800);
        cv.resize(resized, resized, dsize, 0, 0, cv.INTER_AREA);

        this.pipeline.imagedata = this.getSrc(resized, true);

        console.log('resized', this.pipeline.imagedata);
        console.timeLog('process');

        console.log(result);

        return Promise.all([this.saveEditedPipeline(), this.pipeline.tesseract_worker.recognize(this.pipeline.imagedata)])
        //.progress(message => console.log(message))
        .then(results => {
          const result = results[1];

          console.log('recognized transformed', result);
          console.timeLog('process');

          this.getTransactionsFromReceipt(data, result.data.text, locale);

          console.log('extracted transformed');
          console.timeLog('process');
          console.log(data, locale);

          this.pipeline.transactions = data.transactions;
          resolve(data.transactions);
        })
      })
      .catch(error => {
        reject(error);
      });
    });
  }
  transformImage(src, rec) {
    // https://stackoverflow.com/questions/51528462/opencv-js-perspective-transform

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    cv.findContours(rec, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    //Get area for all contours so we can find the biggest
    let sortableContours = [];
    for (let i = 0; i < contours.size(); i++) {
      let cnt = contours.get(i);
      let area = cv.contourArea(cnt, false);
      let perim = cv.arcLength(cnt, false);

      sortableContours.push({ areaSize: area, perimiterSize: perim, contour: cnt });
    }

    //Sort 'em
    sortableContours = sortableContours.sort((item1, item2) => { return (item1.areaSize > item2.areaSize) ? -1 : (item1.areaSize < item2.areaSize) ? 1 : 0; }).slice(0, 5);

    //Ensure the top area contour has 4 corners (NOTE: This is not a perfect science and likely needs more attention)
    let approx = new cv.Mat();
    cv.approxPolyDP(sortableContours[0].contour, approx, .05 * sortableContours[0].perimiterSize, true);

    console.log('approx', approx);
    if (approx.rows == 4) {
      console.log('Found a 4-corner approx');
      let foundContour = approx;

      //Find the corners
      //foundCountour has 2 channels (seemingly x/y), has a depth of 4, and a type of 12.  Seems to show it's a CV_32S "type", so the valid data is in data32S??
      let corner1 = new cv.Point(foundContour.data32S[0], foundContour.data32S[1]);
      let corner2 = new cv.Point(foundContour.data32S[2], foundContour.data32S[3]);
      let corner3 = new cv.Point(foundContour.data32S[4], foundContour.data32S[5]);
      let corner4 = new cv.Point(foundContour.data32S[6], foundContour.data32S[7]);

      //Order the corners
      let cornerArray = [{ corner: corner1 }, { corner: corner2 }, { corner: corner3 }, { corner: corner4 }];
      //Sort by Y position (to get top-down)
      cornerArray.sort((item1, item2) => item1.corner.y < item2.corner.y ? -1 : (item1.corner.y > item2.corner.y ? 1 : 0)).slice(0, 5);

      //Determine left/right based on x position of top and bottom 2
      let tl = cornerArray[0].corner.x < cornerArray[1].corner.x ? cornerArray[0] : cornerArray[1];
      let tr = cornerArray[0].corner.x > cornerArray[1].corner.x ? cornerArray[0] : cornerArray[1];
      let bl = cornerArray[2].corner.x < cornerArray[3].corner.x ? cornerArray[2] : cornerArray[3];
      let br = cornerArray[2].corner.x > cornerArray[3].corner.x ? cornerArray[2] : cornerArray[3];

      //Calculate the max width/height
      let widthBottom = Math.hypot(br.corner.x - bl.corner.x, br.corner.y - bl.corner.y);
      let widthTop = Math.hypot(tr.corner.x - tl.corner.x, tr.corner.y - tl.corner.y);
      let theWidth = (widthBottom > widthTop) ? widthBottom : widthTop;
      let heightRight = Math.hypot(tr.corner.x - br.corner.x, tr.corner.y - br.corner.y);
      let heightLeft = Math.hypot(tl.corner.x - bl.corner.x, tr.corner.y - bl.corner.y);
      let theHeight = (heightRight > heightLeft) ? heightRight : heightLeft;
      console.log(cornerArray);
      //Transform!
      let finalDestCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, theWidth - 1, 0, theWidth - 1, theHeight - 1, 0, theHeight - 1]); //
      let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.corner.x, tl.corner.y, tr.corner.x, tr.corner.y, br.corner.x, br.corner.y, bl.corner.x, bl.corner.y]);
      let dsize = new cv.Size(theWidth, theHeight);
      let M = cv.getPerspectiveTransform(srcCoords, finalDestCoords);
      let finalDest = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
      cv.warpPerspective(src, finalDest, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

      console.log('transformed', this.getSrc(finalDest, true));

      return finalDest;
    }
    else return false;
  }

  cropMinAreaRect(src, rotatedRect, scale, offsetX, offsetY) {
    // inspired by https://jdhao.github.io/2019/02/23/crop_rotated_rectangle_opencv/

    const vertices = cv.RotatedRect.points(rotatedRect);

    /*const bl = vertices[0];
    const tl = vertices[1];
    const tr = vertices[2];
    const br = vertices[3];*/

    //Sort by Y position (to get top-down)
    vertices.sort((a, b) => a.y < b.y ? -1 : (a.y > b.y ? 1 : 0)).slice(0, 5);

    //Determine left/right based on x position of top and bottom 2
    let tl = vertices[0].x < vertices[1].x ? vertices[0] : vertices[1];
    let tr = vertices[0].x > vertices[1].x ? vertices[0] : vertices[1];
    let bl = vertices[2].x < vertices[3].x ? vertices[2] : vertices[3];
    let br = vertices[2].x > vertices[3].x ? vertices[2] : vertices[3];

    tl.x = (tl.x+offsetX)*scale;
    tl.y = (tl.y+offsetY)*scale;
    tr.x = (tr.x+offsetX)*scale;
    tr.y = (tr.y+offsetY)*scale;
    bl.x = (bl.x+offsetX)*scale;
    bl.y = (bl.y+offsetY)*scale;
    br.x = (br.x+offsetX)*scale;
    br.y = (br.y+offsetY)*scale;

    const height = Math.hypot(bl.x-tl.x, bl.y-tl.y);
    const width = Math.hypot(tl.x-tr.x, tl.y-tr.y);
    const dst_coords = cv.matFromArray(4, 1,cv.CV_32FC2, [0, 0, width-1, 0, width-1, height-1, 0, height-1]);
    const src_coords = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);

    console.log(tl, tr, bl, br, 'width', width, 'height', height, 'rotatedRect', rotatedRect, 'vertices', vertices);

    const M = cv.getPerspectiveTransform(src_coords, dst_coords);

    const dsize = new cv.Size(width, height);
    let warped = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    cv.warpPerspective(src, warped, M, dsize);

    M.delete();
    dst_coords.delete();
    src_coords.delete();

    return warped;
  }
  /**
   * Crop mat to bounding rectangle of given contour
   * 
   * @param {cv.Mat} dst
   * @param {cv.Mat} rec 
   * @param {cv.Mat} con 
   * @param {cv.Mat} cnt 
   */
  cropImage(dst, rec, con, cnt) {
    let rotatedRect = cv.minAreaRect(cnt);
    let vertices = cv.RotatedRect.points(rotatedRect);
    let rectangleColor = new cv.Scalar(0, 255, 0);
    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(con, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }

    let rect = cv.boundingRect(cnt);
    rectangleColor = new cv.Scalar(255, 0, 0);

    console.log(rotatedRect, vertices);
  
    let point1 = new cv.Point(rect.x, rect.y);
    let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(con, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

    let scale = dst.cols/rec.cols;
    let margin = 10,
    x = parseInt(Math.max((rect.x-margin)*scale, 0)),
    y = parseInt(Math.max((rect.y-margin)*scale, 0)),
    w = parseInt(Math.min((rect.width+margin*2)*scale, dst.cols-x)),
    h = parseInt(Math.min((rect.height+margin*2)*scale, dst.rows-y));

    console.log('con', this.getSrc(con));

    console.log(rect);

    rect = new cv.Rect(x, y, w, h);

    this.pipeline.rect = {x,y,w,h};

    console.log(rect, scale);
  
    let rotated = this.rotateImage(dst, rotatedRect.angle+90);

    console.log('rotated', this.getSrc(rotated, true));

    let cropped = rotated.roi(rect);

    console.log('cropped', this.getSrc(cropped, true));

    return cropped;
  }
  crop(src) {
    let M, dsize, anchor, ksize;
    let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    dsize = new cv.Size(800, src.rows/src.cols*800);
                  cv.resize(src, dst, dsize, 0, 0, cv.INTER_AREA);
    cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY, 0);
    //src.convertTo(src, 0, 6, -500);
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 3, -15);

    M = cv.Mat.ones(2,2, cv.CV_8U);
                anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor);
                cv.dilate(dst, dst, M, anchor);

    M = new cv.Mat();
                ksize = new cv.Size(150,150);
                M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
                cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);

    M = cv.Mat.ones(5,5, cv.CV_8U);
                anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor,30);
                cv.dilate(dst, dst, M, anchor,30);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
    let maxArea = 0;
    let cnt;
    for (let i = 0; i < contours.size(); ++i) {
      let area = cv.contourArea(contours.get(i), false);
      console.log(area);
      if (area > maxArea) {
        cnt = contours.get(i);
        maxArea = area;
      }
    }
    let rotatedRect = cv.minAreaRect(cnt);
    let vertices = cv.RotatedRect.points(rotatedRect);
    let contoursColor = new cv.Scalar(255, 255, 255);
    let rectangleColor = new cv.Scalar(255, 0, 0);
    cv.drawContours(dst, contours, 0, contoursColor, 1, 8, hierarchy, 100);
    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(dst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }
    let cropped = this.cropMinAreaRect(src, rotatedRect, src.cols/dst.cols, 0, 0);
    M.delete(); dst.delete(); contours.delete(); hierarchy.delete(); cnt.delete();
    return cropped;

  }
  processPipeline() {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.addEventListener('load', () => {
        let img = new Image();
        img.addEventListener('load', async () => {
          console.log('loaded');
          console.timeLog('process');

          const PROCESSING_WIDTH = 3200;

          try {
            let orig = cv.imread(img);
            let dst = new cv.Mat();
            //let bil = new cv.Mat();

            let src = this.crop(orig);

            let anchor, M, ksize;

            cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);

            //cv.bilateralFilter(src,dst,9,10,10);

            /*ksize = new cv.Size(7,7);
            cv.GaussianBlur(dst, dst, ksize, 0, 0, cv.BORDER_DEFAULT);*/

            if (src.cols > PROCESSING_WIDTH) {
              let dsize = new cv.Size(PROCESSING_WIDTH, src.rows/src.cols*PROCESSING_WIDTH);
              cv.resize(dst, dst, dsize, 0, 0, cv.INTER_AREA);
            }

            //dst.convertTo(dst, 0, 6, -500);

            cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 61, 25);//61, 17);

            /*M = cv.Mat.ones(2, 2, cv.CV_8U);
            anchor = new cv.Point(-1, -1);
            cv.dilate(dst, dst, M, anchor, 1);
            cv.erode(dst, dst, M, anchor, 1);

            M = new cv.Mat();
            ksize = new cv.Size(3, 3);
            M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
            cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);*/

            let imagedata = this.getSrc(dst, true);

            const id = this.pipeline.receipt.id;

            console.log('processed');
            console.timeLog('process');
      
            const text = await fetch('/api/receipt/recognize', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                id,
                src: imagedata
              })
            })
            .then(response => response.json())
            .then(response => response.result);

            console.log('recognized', text);
            console.timeLog('process');

            const locale = 'fi-FI';

            let data = {
              products: this.products,
              manufacturers: this.manufacturers,
              categories: this.categories,
              parties: this.parties
            };

            getTransactionsFromReceipt(data, text, locale, id);

            console.log('extracted transformed');
            console.timeLog('process');
            console.log(data, locale);

            orig.delete();
            src.delete();
            dst.delete();

            this.pipeline.transactions = data.transactions;
            resolve(data.transactions);
          } catch(error) {
            console.error(error);
            reject();
          }
        });
        img.src = reader.result;
      });
      reader.readAsDataURL(this.pipeline.file);
    });
  }
  saveTransactionPipeline() {
    return new Promise((resolve, reject) => {
      console.log(this.pipeline.transactions);
      this.saveReceipt(this.pipeline.transactions).then((transactions) => {
        console.log('saved');
        console.timeEnd('process');
        DataStore.getTransactions(true);
        resolve(transactions);
      })
      .catch(error => reject(error));
    });
  }
  upload(files) {
    return new Promise(async (resolve, reject) => {
      console.log(files);

      let result = [];

      for (const file of Array.from(files)) {
        console.log('file', file);

        this.pipeline.file = file;

        console.time('process');

        /*
          1) image   -> 2) recognize
          1) receipt ->               -> 3) edited
                        2) original
                                                    -> 4) save
        */

        const transactions = await axios.post('/api/receipt')
        .then(receipt => {
          this.pipeline.receipt = receipt.data;
          return Promise.all([this.processPipeline(), this.prepareReceiptPipeline()])
          .then(() => (
            this.saveTransactionPipeline()
            .then(transactions => {
              console.log(transactions);
              console.log(this.pipeline);
              return transactions;
            })
          ))
        })
        .catch(error => {
          reject(error);
        });

        result.push(transactions);
      }
      resolve(result);
    });
  }
  saveReceipt(transactions) {
    return new Promise((resolve, reject) => {
      return axios.post('/api/transaction/', transactions)
      .then(function(response) {
        console.log(response);
        return DataStore.getTransactions(true).then((transactions) => {
          resolve(transactions);
        });
      })
      .catch(function(error) {
        console.error(error);
        reject();
      });
    });
  }
  getImageOrientation(file, callback) {
    var fileReader = new FileReader();
    fileReader.onloadend = function () {
        var base64img = "data:" + file.type + ";base64," + _arrayBufferToBase64(fileReader.result);
        var scanner = new DataView(fileReader.result);
        var idx = 0;
        var value = 1; // Non-rotated is the default
        if (fileReader.result.length < 2 || scanner.getUint16(idx) != 0xFFD8) {
            // Not a JPEG
            if (callback) {
                callback(base64img, value);
            }
            return;
        }
        idx += 2;
        var maxBytes = scanner.byteLength;
        var littleEndian = false;
        while (idx < maxBytes - 2) {
            var uint16 = scanner.getUint16(idx, littleEndian);
            idx += 2;
            switch (uint16) {
                case 0xFFE1: // Start of EXIF
                    var endianNess = scanner.getUint16(idx + 8);
                    // II (0x4949) Indicates Intel format - Little Endian
                    // MM (0x4D4D) Indicates Motorola format - Big Endian
                    if (endianNess === 0x4949) {
                        littleEndian = true;
                    }
                    var exifLength = scanner.getUint16(idx, littleEndian);
                    maxBytes = exifLength - idx;
                    idx += 2;
                    break;
                case 0x0112: // Orientation tag
                    // Read the value, its 6 bytes further out
                    // See page 102 at the following URL
                    // http://www.kodak.com/global/plugins/acrobat/en/service/digCam/exifStandard2.pdf
                    value = scanner.getUint16(idx + 6, littleEndian);
                    maxBytes = 0; // Stop scanning
                    break;
            }
        }
        if (callback) {
            callback(base64img, exif_rotation[value]);
        }
    }
    fileReader.readAsArrayBuffer(file);
  }
  getClosestCategory(toCompare, locale, categories) {
    let name,
        category,
        response = null,
        max_distance = 0,
        distance,
        match;
    toCompare = toCompare.toLowerCase();
    for (let i in categories) {
      category = categories[i];
      name = category.name[locale];
      if (!name) continue;
      distance = jarowinkler(toCompare, name);
      if (distance > max_distance) {
        max_distance = distance;
        response = category;
        response.distance = distance;
      }
    }
    return response;
  }
  getSrc(orig, from_grayscale) {
    let src;
    if (from_grayscale) {
      src = new cv.Mat(); 
      cv.cvtColor(orig, src, cv.COLOR_GRAY2RGBA, 0);
    }
    else {
      src = orig;
    }

    // https://stackoverflow.com/questions/13626465/how-to-create-a-new-imagedata-object-independently
    var canvas = document.createElement('canvas');
    //var ctx = canvas.getContext('2d');

    canvas.width = src.cols;
    canvas.height = src.rows;

    console.log(src);

    /*let imagedata = ctx.createImageData(src.cols, src.rows);
    imagedata.data.set(src.data);
    ctx.putImageData(imagedata, 0, 0);*/

    cv.imshow(canvas, src);

    const data_url = canvas.toDataURL();

    if (from_grayscale) {
      src.delete();
    }

    return data_url;
  }
}

export default ReceiptService;