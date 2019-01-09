import axios from "axios";
import moment from 'moment';
import DataStore from './DataStore';

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

export default {
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
  },
  getClosestCategory(toCompare, locale) {
    return new Promise((resolve, reject) => {
      DataStore.getCategories()
      .then(categories => {
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
  },
  async getTransactionsFromReceipt(result, text, locale) {
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
  
              category = await this.getClosestCategory(name, locale);
  
              if (quantity) items[items.length-1].quantity = quantity;
              if (measure) items[items.length-1].measure = measure;
              if (category) items[items.length-1].product.category = {id: category.id, name: category.locales && category.locales[locale] || category.name};
  
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
  },
  cropImage(orig) {
    let M, anchor, dsize, ksize;
  
    let src = new cv.Mat(); // src from orig
    dsize = new cv.Size(500, orig.rows/orig.cols*500);
    cv.resize(orig, src, dsize, 0, 0, cv.INTER_AREA);
  
    ksize = new cv.Size(1,1);
    cv.GaussianBlur(src, src, ksize, 0, 0, cv.BORDER_DEFAULT);
  
    cv.adaptiveThreshold(src, src, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 19, 21);
  
    M = cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.dilate(src, src, M, anchor, 1);
    cv.erode(src, src, M, anchor);
  
    cv.Canny(src, src, 1, 0, 5, false);

    cv.imshow('preview', src);
  
    M = new cv.Mat();
    ksize = new cv.Size(100, 100);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(src, src, cv.MORPH_CLOSE, M);
  
    M = cv.Mat.ones(5, 5, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(src, src, M, anchor);
  
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(src, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    let cnt, current, area, biggest = 0;
  
    for (let n = 0; n < contours.size(); n++) {
      current = contours.get(n);
      area = cv.contourArea(current, false);
      if (area > biggest) {
        biggest = area;
        cnt = current;
      }
    }

    let rect = cv.boundingRect(cnt);
    let contoursColor = new cv.Scalar(255, 255, 255);
    let rectangleColor = new cv.Scalar(255, 0, 0);
  
    let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
  
    cv.drawContours(dst, contours, -1, contoursColor, 1, 8, hierarchy, 100);
    let point1 = new cv.Point(rect.x, rect.y);
    let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(dst, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

    let preview = new cv.Mat();
    dsize = new cv.Size(800, dst.rows/dst.cols*800);
    cv.resize(dst, preview, dsize, 0, 0, cv.INTER_AREA);
    cv.imshow('preview', preview);
   
    dst.delete(); contours.delete(); hierarchy.delete(); cnt.delete();

    let scale = orig.cols/src.cols;
    rect = new cv.Rect(Math.max(rect.x-10, 0)*scale, Math.max(rect.y-10, 0)*scale, Math.min(rect.width+10, src.cols)*scale, Math.min(rect.height+10, src.rows)*scale);
  
    orig = orig.roi(rect);

    if (src.cols > src.rows) {
      this.rotateImage(orig, 90);
    }
  
    return orig;
  },
  rotateImage(src, rotate) {
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
    return src;
  },
  processImage(img, rotate) {
    let src = cv.imread(img);
    let dst = new cv.Mat();

    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    src.convertTo(src, cv.CV_8U);

    this.rotateImage(src, rotate);
  
    src = this.cropImage(src);
  
    let dsize = new cv.Size(800, src.rows/src.cols*800);
    cv.resize(src, src, dsize, 0, 0, cv.INTER_AREA);
  
    // threshold
  
    cv.adaptiveThreshold(src, src, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 71, 15);

    // dilate and erode

    let M = cv.Mat.ones(1, 1, cv.CV_8U);
    let anchor = new cv.Point(-1, -1);
    cv.dilate(src, src, M, anchor, 10);
    cv.erode(src, src, M, anchor, 5);
  
    cv.cvtColor(src, src, cv.COLOR_GRAY2RGBA, 0);

    return src;
  }
}