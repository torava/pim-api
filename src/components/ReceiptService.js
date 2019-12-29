import axios from "axios";
import moment from 'moment';
import DataStore from './DataStore';
const {createWorker, PSM} = Tesseract;

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

class ReceiptService {
  constructor() {
    this.pipeline = {};

    Promise.all([
      DataStore.getProducts(),
      DataStore.getManufacturers(),
      DataStore.getCategories()
    ])
    .then(([products, manufacturers, categories]) => {
      console.log(products);
      this.products = products;
      this.manufacturers = manufacturers;
      this.categories = categories;
    })
    .catch(error => console.error(error));
  }
  prepareReceiptPipeline() {
    return new Promise((resolve, reject) => {
      axios.post('/api/receipt')
      .then(receipt => {
        this.pipeline.receipt = receipt.data;
        Promise.all([
          this.saveEditedPipeline(),
          this.saveOriginalPipeline()
        ])
        .then(([edited, original]) => {
          resolve([receipt, edited, original]);
        })
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
      let cropped_words = [],
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

      cropped_text = cropped_lines.join("\n");
      
      let data = {
        products: this.products,
        manufacturers: this.manufacturers,
        categories: this.categories
      },
          locale = 'fi-FI';
      this.getTransactionsFromReceipt(data, cropped_text, locale);


      let transaction = data.transactions[0],
          total_price = transaction.total_price,
          total_price_read = transaction.total_price_read;

      console.log('extracted', 'cropped_words', cropped_words, 'total_price', total_price, 'total_price_read', total_price_read);
      console.timeLog('process');
      console.log(data, locale);

      this.pipeline.tesseract_worker.detect(this.pipeline.imagedata)
      .then(result => {
        let rotate = result.data.orientation_degrees;
        this.pipeline.dst = this.rotateImage(this.pipeline.dst, 360-rotate);

        console.log('rotated '+rotate+' degrees');
        console.timeLog('process');

        console.log(result);

        let imagedata = this.getSrc(this.pipeline.dst, true);
  
        return this.pipeline.tesseract_worker.recognize(imagedata)
        //.progress(message => console.log(message))
        .then(result => {
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

    let cropped = dst.roi(rect);

    console.log('cropped', this.getSrc(cropped, true));

    return cropped;
  }
  processPipeline() {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.addEventListener('load', () => {
        let img = new Image();
        img.addEventListener('load', () => {
          console.log('loaded');
          console.timeLog('process');

          const PROCESSING_WIDTH = 3000;

          let src = cv.imread(img);
          let dst = new cv.Mat();
          let bil = new cv.Mat();

          let anchor;

          cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

          /*cv.bilateralFilter(src,bil,5,10,10);

          let ksize = new cv.Size(9,9);
          cv.GaussianBlur(bil, bil, ksize, 0, 0, cv.BORDER_DEFAULT);*/

          cv.adaptiveThreshold(src, dst, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 15, 15);//, 201, 30);

          /*let M = cv.Mat.ones(2, 2, cv.CV_8U);
          let anchor = new cv.Point(-1, -1);
          cv.dilate(dst, dst, M, anchor, 1);
          cv.erode(dst, dst, M, anchor, 1);*/

          let M = new cv.Mat();
          let ksize = new cv.Size(3, 3);
          M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
          cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);

          let dsize = new cv.Size(PROCESSING_WIDTH, src.rows/src.cols*PROCESSING_WIDTH);
          cv.resize(dst, dst, dsize, 0, 0, cv.INTER_AREA);

          let imagedata = this.getSrc(dst, true);

          console.log('processed');
          console.timeLog('process');

          return this.pipeline.tesseract_worker.detect(imagedata)
          .then(result => {
            let rotate = result.data.orientation_degrees;
            dst = this.rotateImage(dst, 360-rotate);

            console.log('processed', this.getSrc(dst, true));

            console.log('rotated '+rotate+' degrees');
            console.timeLog('process');

            console.log(result);

            imagedata = this.getSrc(dst, true);
      
            return this.pipeline.tesseract_worker.recognize(imagedata)
            //.progress(message => console.log(message))
            .then(result => {
              this.pipeline.lines = result.data.lines;

              console.log('recognized for cropping');
              console.timeLog('process');

              console.log(result);

              const CONTOUR_WIDTH = 400;

              let words = result.data.words,
                  word,
                  factor = CONTOUR_WIDTH/PROCESSING_WIDTH,//dst.cols/origwidth,
                  left, top, right, bottom,
                  rec = cv.Mat.zeros(dst.rows/dst.cols*factor*PROCESSING_WIDTH, factor*PROCESSING_WIDTH, cv.CV_8U),
                  factor_rec = rec.cols/dst.cols;

              console.log(dst.cols, dst.rows);

              for (let i in words) {
                word = words[i];

                left = word.bbox.x0;
                top = word.bbox.y0;
                right = word.bbox.x1;
                bottom = word.bbox.y1;

                if (!word.text ||
                    !word.text.trim() ||
                    right-left < 10 ||
                    bottom-top < 10 ||
                    word.confidence < 3 ||
                    word.text.length < 2)
                  continue;

                console.log(word);

                /*left*= factor;
                top*= factor;
                right*= factor;
                bottom*= factor;*/

                let point1 = new cv.Point(left*factor_rec, top*factor_rec);
                let point2 = new cv.Point(right*factor_rec, bottom*factor_rec);
                let rectangleColor = new cv.Scalar(255, 255, 255);
                cv.rectangle(rec, point1, point2, rectangleColor, 1, cv.LINE_AA, 0);
              }

              let rec_bordered = new cv.Mat();
              let close = 1300*factor;
              let s = new cv.Scalar(0, 0, 0, 255);
              cv.copyMakeBorder(rec, rec_bordered, close, close, close, close, cv.BORDER_CONSTANT, s);

              console.log('rec', this.getSrc(rec, true));

              M = new cv.Mat();
              ksize = new cv.Size(close, close);
              M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
              cv.morphologyEx(rec_bordered, rec_bordered, cv.MORPH_CLOSE, M);

              M = cv.Mat.ones(75*factor, 75*factor, cv.CV_8U);
              anchor = new cv.Point(-1, -1);
              cv.erode(rec_bordered, rec_bordered, M, anchor);

              M = cv.Mat.ones(150*factor, 150*factor, cv.CV_8U);
              anchor = new cv.Point(-1, -1);
              cv.dilate(rec_bordered, rec_bordered, M, anchor);

              let rec_cropped = new cv.Mat();
              let rect = new cv.Rect(close, close, PROCESSING_WIDTH*factor, PROCESSING_WIDTH*src.rows/src.cols*factor);
              rec_cropped = rec_bordered.roi(rect);

              let rec_resized = new cv.Mat();
              let dsize = new cv.Size(PROCESSING_WIDTH, src.rows/src.cols*PROCESSING_WIDTH);
              cv.resize(rec_cropped, rec_resized, dsize, 0, 0, cv.INTER_AREA);

              console.log('closed rec', this.getSrc(rec_resized, true));
            
              let contours = new cv.MatVector();
              let hierarchy = new cv.Mat();
              cv.findContours(rec_resized, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

              let cnt, current, area, biggest = 0;
            
              for (let n = 0; n < contours.size(); n++) {
                current = contours.get(n);
                area = cv.contourArea(current, false);
                if (area > biggest) {
                  biggest = area;
                  cnt = current;
                }
              }

              let con = cv.Mat.zeros(rec_resized.rows, rec_resized.cols, cv.CV_8UC3);

              let contoursColor = new cv.Scalar(255, 255, 255);

              cv.drawContours(con, contours, -1, contoursColor, 1, 8, hierarchy, 100);

              this.pipeline.transformed = this.transformImage(dst, rec_resized);
              this.pipeline.cropped = this.cropImage(dst, rec_resized, con, cnt);

              let cropped = this.pipeline.transformed || this.pipeline.cropped;
              
              dsize = new cv.Size(800, cropped.rows/cropped.cols*800);
              cv.resize(cropped, cropped, dsize, 0, 0, cv.INTER_AREA);

              this.pipeline.imagedata = this.getSrc(cropped, true);
              this.pipeline.dst = cropped;

              console.log('cropped');
              console.timeLog('process');

              Promise.all([this.saveEditedPipeline(), this.recognizePipeline()])
              .then(([edited, recognize]) => {
                src.delete();
                dst.delete();
                cropped.delete();
                rec.delete();
                rec_cropped.delete();
                rec_bordered.delete();
                rec_resized.delete();
                con.delete();
                
                console.log(edited, recognize);
                resolve([edited, recognize]);
              });
            })
          })
          .catch(error => {
            console.error(error);
            reject();
          });
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
      let file;

      if(!this.pipeline.tesseract_worker) {
        const worker = createWorker({
          langPath: 'http://localhost:42808/lib/tessdata/fast',
          gzip: false,
          //logger: m => console.log(m)
        });
        await worker.load();
        await worker.loadLanguage('fin');
        await worker.initialize('fin');
        await worker.setParameters({
          //tessedit_pageseg_mode: PSM.AUTO_OSD,
          //tessedit_ocr_engine_mode: OEM.TESSERACT_ONLY,
          tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890.-',
          //textord_max_noise_size: 50,
          //textord_noise_sizelimit: 1
          tessjs_create_osd: '1'
        });
        this.pipeline.tesseract_worker = worker;
      }

      Array.from(files).forEach(async file => {
        this.pipeline.file = file;

        console.time('process');

        /*
          1) image   -> 2) recognize
          1) receipt ->               -> 3) edited
                        2) original
                                                    -> 4) save
        */

        await Promise.all([this.processPipeline(), this.prepareReceiptPipeline()])
        .then(() =>
          this.saveTransactionPipeline()
          .then(() => {
            console.log(this.pipeline);
          })
        )
        .catch(error => {
          reject(error);
        });
      });
      resolve();
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
  getTransactionsFromReceipt(result, text, locale) {
    text = text
    .replace(/ﬂ|»|'|´|`|‘|“|"|”|\|/g, '')
    .replace(/(\d) *(\.,|\,|\.|_|\-|;) *(\d)/g, '$1.$3')
    .replace(/\.,|\,|_|\-|;/g, '')
    .replace(/—/g, '-')
    .replace(/ +/g, ' ');
  
    let line, line_name, line_product_name, line_price, line_prices, item_number, line_text,
      line_total, line_date, line_address, line_vat, line_item_details, quantity, measure,
      line_number_format, total_price_computed = 0, name, date, line_item, line_phone_number,
      line_measure,
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
          line_vat = line.match(/\d{7}[-|.]\d{1}/);
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
          line_date = line.match(/((\d{1,2})[\.|\,](\d{1,2})[\.|\,](\d{2,4}))(\s)?((\d{1,2})[:|,|\.|\s|z]?((\d{1,2})[:|,|\.|\s|z]?)?(\d{1,2})?)?/);
          date = line_date && parseYear(line_date[4])+'-'+line_date[3]+'-'+line_date[2]+' '+line_date[7]+':'+line_date[8]+':'+line_date[10];
          if (date && moment(date).isValid()) {
            console.log(line_date, date);
            data.date = date;
  
            found_attribute = 'date';
          }
  
          if (!date || !line_date[6]) {
            // 1:12 1-1-12
            line_date = line.match(/((\d{1,2}[:|,|\.|1]?)(\d{1,2}[:|,|\.]?)?(\d{1,2})?)?(\s)?((\d{1,2})[\-|\.](\d{1,2})[\-|\.](\d{2,4}))/);
            date = line_date && parseYear(line_date[9])+'-'+line_date[8]+'-'+line_date[7]+' '+line_date[1];
            if (date && moment(date).isValid()) {
              console.log(line_date, date);
              data.date = date;
  
              found_attribute = 'date';
            }
          }
        }
  
        if (!data.party.street_name) {
          // Hämeenkatu 123-123 33100 Tampere
          line_address = line.match(/^([\u00C0-\u017F-a-z\/]+)\s?((\d{1,4})([,|.|-]\d{1,4})?)[,|.|-]?\s?(\d{5})?[,|.]?\s?([\u00C0-\u017F-a-z\/]+)?$/i);
          if (line_address) {
            console.log(line_address);
            data.party.street_name = toTitleCase(line_address[1]);
            data.party.street_number = line_address[2];
            data.party.postal_code = line_address[5];
            data.party.city = toTitleCase(line_address[6]);
  
            found_attribute = 'party.street_name';
            continue;
          }
        }

        // store name
        if (line_number == 1 && line_name) {
          data.party.name = toTitleCase(line_name[0]);
  
          previous_line = 'party.name';
          continue;
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
          line_item_details = line_number_format.replace(/-/g, '').match(/^((\d+)\s)?((((\d+)|((\d+\.\d{2,3})(\s?kg)?))\s?x\s?)?((\d+\.\d{2})\s?)(\s?EUR\/kg)?)$/i);
  
          if (line_item_details) {
            items[items.length-1].item_number = line_item_details[2];
            items[items.length-1].quantity = parseFloat(line_item_details[6]);
            items[items.length-1].measure = parseFloat(line_item_details[8]);
            items[items.length-1].unit = 'kg';
            previous_line = 'details';
            continue;
          }
        }
        
        // item line
        if (!has_discount && !data.total_price_read && !line.match(/käteinen|kateinen|käte1nen|kate1nen|taka1s1n|takaisin/i)) {
          line_price = line_number_format.match(/\s((\d+\.\d{2})(\-)?){1,2}\s*.{0,3}$/i);
          if (line_price) {
            line_measure = line.substring(0, line_price.index).match(/([0-9]+)((kg|k9)|(g|9)|(l|1))/);
            line_item = line.substring(0, line_price.index).match(/^((\d+)\s)?([\u00C0-\u017F-a-z0-9\s\-\.\,\+\&\%\=\/\(\)\{\}\[\]]+)$/i);
            if (line_item) {
              price = parseFloat(line_price[1]);
              measure = line_measure && parseFloat(line_measure[1]);
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

              if (measure && !isNaN(measure)) {
                items[items.length-1].product.measure = measure;
                if (line_measure[3]) {
                  items[items.length-1].product.unit = 'kg';
                }
                else if (line_measure[4]) {
                  items[items.length-1].product.unit = 'g';
                }
                else if (line_measure[5]) {
                  items[items.length-1].product.unit = 'l';
                }
              }
  
              //category = this.getClosestCategory(name, locale, categories);

              //if (quantity) items[items.length-1].quantity = quantity;
              //if (measure) items[items.length-1].measure = measure;
              //if (category) items[items.length-1].product.category = category/*{id: category.id, name: category.locales && category.locales[locale] || category.name}*/;
  
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
    result.transactions[0].receipts = [{
      text,
      id: this.pipeline.receipt.id
    }];
    
    return result;
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
    var ctx = canvas.getContext('2d');

    canvas.width = src.cols;
    canvas.height = src.rows;

    console.log(src);

    let imagedata = ctx.createImageData(src.cols, src.rows);
    imagedata.data.set(src.data);
    ctx.putImageData(imagedata, 0, 0);

    return canvas.toDataURL();
  }
  
  rotateImage(src, rotate) {
    if (rotate < 0) {
      rotate = 360+rotate;
    }
    if (rotate == 270){
      cv.transpose(src, src); 
      cv.flip(src, src, 1);
    }
    else if (rotate == 90) {
      cv.transpose(src, src);  
      cv.flip(src, src, 0);
    }
    else if (rotate == 180){
      cv.flip(src, src, -1);
    }
    else if (!rotate) {}
    else {
      // get rotation matrix for rotating the image around its center in pixel coordinates
      let center = new cv.Point((src.cols-1)/2.0, (src.rows-1)/2.0);
      let rot = cv.getRotationMatrix2D(center, rotate, 1.0);
      // determine bounding rectangle, center not relevant
      let bbox = new cv.RotatedRect(new cv.Point(), src.size(), rotate);
      console.log(bbox);
      // adjust transformation matrix
      rot.data[0+src.rows*2]+= bbox.size.width/2.0 - src.cols/2.0;
      rot.data[1+src.rows*2]+= bbox.size.height/2.0 - src.rows/2.0;
      //rot.at<double>(0,2) += bbox.width/2.0 - src.cols/2.0;
      //rot.at<double>(1,2) += bbox.height/2.0 - src.rows/2.0;

      cv.warpAffine(src, src, rot, new cv.Size(bbox.size.width, bbox.size.height));
    }
    return src;
  }
}

export default ReceiptService;