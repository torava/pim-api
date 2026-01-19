import moment from 'moment';
import { stringSimilarity } from 'string-similarity-js';

import { LevenshteinDistance } from './levenshteinDistance';
import Category from '../models/Category';

export const measureRegExp = /(\d+([.|,]\d+)?)\s?((kg)|(g)|(l))/;

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

  return  str.replace(/([^\s:-])([^\s:-]*)/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

// https://stackoverflow.com/a/63372663
// Convert resBlob to base64
export const blobToData = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
};

export function getTransactionsFromReceipt(result, text, locale, id) {
  text = text
  .replace(/ﬂ|»|'|´|`|‘|“|"|”|\|/g, '')
  .replace(/(\d) *(\.,|,|\.|_|-|;) *(\d)/g, '$1.$3')
  .replace(/\.,|,|_|-|;/g, '')
  .replace(/—/g, '-')
  .replace(/ +/g, ' ');

  let line, line_name, line_product_name, item_number, line_text,
    line_total, line_date, line_address, line_vat, line_item_details,
    line_number_format, total_price_computed = 0, name, date, line_phone_number,
    line_opening,
    line_misc,
    line_tax,
    total_words = [
      'hinta',
      'total',
      'total in eur',
      'totalt',
      'grand total',
      'summa',
      'kokonaissumma',
      'kokonaissumma eur',
      'yhteensä',
      'yhteensa',
      'tilauksesi yhteensä:',
      'kaikki yht',
      'yht'
    ],
    misc_words = [
      'alv',
      'alviton hinta',
      'debit/veloitus',
      'debit/charge',
      'debit/debitering',
      'maksukortti',
      'käteinen',
      'takaisin',
      'maksu',
      'avoinna',
      'eur',
      'ruokaostokset',
      'käyttötavaraostokset',
      'plussaa kerryttävät ostot',
      'plussa-edut yhteensä',
      'plussaförmaner totalt',
      'inköp som ger plussa',
      'plussaförman',
      'credit/veloitus',
      'debit/veloitus',
      'pankki/veloitus',
      'bonusostoihin kirjattu',
      'gruppkod moms',
      'mastercard',
      'visa',
      'pankkikortti',
      'pankkikort',
      'kassaversio',
      'veloitus',
      'korttimaksu',
      'vero',
      'veroton',
      'moms',
      'yhteensä',
      'alkuomavastuu ennen ostoa',
      'vuosiomavastuu oston jälkeen',
      'ennen arvonlisäveroa'
    ],
    price, has_discount, previous_line, found_attribute,
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
    try {
      for (let i in ines) {
        line_product_name = null;

        found_attribute = null;

        line = ines[i].trim();
        line_number_format = line.replace(/\s*(\.,|,|\.)\s*/g, '.');

        line_name = line.match(/^[\u00C0-\u017F-a-z0-9\s\-.%/]+$/i);
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
          line_date = line.match(/((\d{1,2})[.|,|/](\d{1,2})[.|,|/](\d{2,4}))(\s)?((\d{1,2})[:|,|.|\s|z]?((\d{2})[:|,|.|\s|z]?)?(\d{2})?)/);
          date = line_date && parseYear(line_date[4])+'-'+line_date[3]+'-'+line_date[2]+' '+line_date[7]+':'+line_date[9];//+':'+line_date[10];
          if (date && moment(date).isValid()) {
            console.log(line_date, date);
            data.date = date;

            found_attribute = 'date';
          }

          if (!data.date) {
            // 1.1.12
            line_date = line.match(/((\d{1,2})[.|,|/](\d{1,2})[.|,|/](\d{2,4}))/);
            date = line_date && parseYear(line_date[4])+'-'+line_date[3]+'-'+line_date[2]+' '+line_date[7]+':'+line_date[9];//+':'+line_date[10];
            if (date && moment(date).isValid()) {
              console.log(line_date, date);
              data.date = date;

              found_attribute = 'date';
            }
          }

          if (!data.date) {
            // 1:12 1-1-12
            line_date = line.match(/((\d{1,2}[:|,|.|1]?)(\d{2}[:|,|.]?)?(\d{1,2})?)?(\s)?((\d{1,2})[-|.](\d{1,2})[-|.](\d{2,4}))/);
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
          line_address = line.match(/^([\u00C0-\u017F-a-z/\s]+)((\d{1,4})([-]\d{1,4})?)[-]?\s?(\d{5})?[,|.]?\s?([\u00C0-\u017F-a-z/]+)?$/i);
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
        if (!data.party.id && result.parties.length) {
          const party = result.parties.reduce((previous_party, current_party) => {
            if (current_party.name) {
              current_party.distance = LevenshteinDistance(current_party.name?.toLowerCase(), line?.toLowerCase(), {search: true})?.distance;
              // K-Supermarket Kaisaniemi != K-Supermarket Kamppi
              if (current_party.distance <= 1 && (!previous_party || !previous_party.distance || previous_party.distance < current_party.distance)) {
                return current_party;
              }
            }
            if (previous_party && previous_party.distance) {
              return previous_party;
            }
          });

          if (party) {
            data.party = {id: party.id};

            previous_line = 'party_name';
          }
        }

        if (line_name && !data.party.name && !data.party.id) {
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
        line_total = line_number_format.match(/^([\u00C0-\u017F-a-z0-9/\s]+)[^0-9]((\d+\.\d{2})(-)?\s)?((\d+\.\d{2})(-)?)(\s?eur(oa)?)?$/i);
        if (line_total) {
          if (line_total[2]) continue;
          let found = false;
          total_words.forEach(word => {
            if (stringSimilarity(line_total[1].toLowerCase(), word) > 0.6) {
              found = true;
              return false;
            }
          });
          if (found) {
            price = parseFloat(line_total[6]);
          
            if (price[7] === '-') {
              has_discount = true;
              price = 0-price;
            }

            data.total_price_read = price;
            previous_line = 'total_price';
            continue;
          }
        }

        // misc line
        line_misc = line.replace(/[0-9.,%]/i, '').trim().match(/^([\u00C0-\u017F-a-z/\s]+)/i);
        if (line_misc) {
          let found = false;
          misc_words.forEach(word => {
            if (stringSimilarity(line_misc[1].toLowerCase(), word) > 0.6) {
              console.log('misc', line, word);
              found = true;
              return false;
            }
          });

          if (found) {
            continue;
          }
        }

        // tax line
        line_tax = line_number_format.match(/^[a-z]\s\d+%\s(\d+\.\d+\s?)+/i);
        if (line_tax) {
          console.log('tax', line_tax);
          continue;
        }

        // opening hours
        line_opening = line.match(/^(palvelemme|ark|avoinna|öppet)?(ma|ti|ke|to|pe|la|su|må|fr|lö|sö|ja|klo|[0-9-.:\s]+)+$/i);
        if (line_opening) {
          console.log('opening', line_opening);
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
          /*
              (
                (\d+)\s
              )?
              (
                (
                  (
                    (\d+)|
                    (
                      (\d+\.\d{2,3})
                      (\s?kg)?
                    )
                  )
                  \s?x\s?
                )?
                (
                  (\d+\.\d{2})\s?
                )
                (\s?EUR\/kg)?
              )
          */
          line_item_details = line_number_format.replace(/-/g, '').match(/((\d+)\s)?((((\d+)|((\d+\.\d{2,3})(\s?kg)?))\s?x\s?)?((\d+\.\d{2})\s?)(\s?EUR\/kg)?)/i);

          if (line_item_details && (line_item_details[6] || line_item_details[8])) {
            console.log(line, line_item_details);
            const quantity = parseFloat(line_item_details[6]) || undefined;
            const measure = parseFloat(line_item_details[8]) || undefined;
            items[items.length-1] = {
              ...items[items.length-1],
              item_number: line_item_details[2],
              quantity,
              measure,
              unit: measure ? 'kg' : undefined
            };

            previous_line = 'details';
            continue;
          }
        }
        
        // item line
        if (!has_discount) {
          let line_price = line_number_format.match(/(\s|\.)((\d{1,4}\.\d{2})(-)?){1,2}\s*.{0,3}$/i);
          if (line_price) {
            // 1kg
            const line_measure = line.substring(0, line_price.index).match(measureRegExp);
            const line_quantity = line_number_format.substring(0, line_price.index).match(/(\d{1,4}\.\d{2})\s?x\s?(\d{1,2})/i);
            
            let line_item = line.substring(0, line_price.index).match(/^((\d+)\s)?([\u00C0-\u017F-a-z0-9\s:\-.,+&%=/(){}[\]]+)$/i);

            const measure = line_measure && parseFloat(line_measure[1]);
            const quantity = line_quantity && parseFloat(line_quantity[2]);

            let item = {
              product: {}
            };
            let name;
            if (line_item && !line.match(/^(\d|\.|\s|%|A|B|ma|la|su|pe|X|x|-)+$/)) {
              name = toTitleCase(line_item[3]);
              if (measure && !isNaN(measure)) {
                item.product.measure = measure;
                if (line_measure[4]) {
                  item.product.unit = 'kg';
                }
                else if (line_measure[5]) {
                  item.product.unit = 'g';
                }
                else if (line_measure[6]) {
                  item.product.unit = 'l';
                }
                /*name =
                  name.substring(0, line_measure.index)+
                  name.substring(line_measure.index+line_measure[0].length);*/
              }
              if (quantity & !isNaN(quantity)) {
                item.product.quantity = quantity;
                /*name =
                  name.substring(0, line_quantity.index)+
                  name.substring(line_quantity.index+line_quantity[0].length);*/
              }

              if (name) {
                let price = parseFloat(line_price[2]);

                if (line_price[4] === '-') {
                  has_discount = true;
                  price = 0-price;
                }

                item = {
                  ...item,
                  item_number: line_item[2] || '',
                  text: line_item[0],
                  product: {
                    ...item.product,
                    name: name
                  },
                  price: price
                };

                items.push(item);

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
        console.log(line, previous_line, has_discount);
      }
    } catch (error) {
      console.error(error);
      return;
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

  data.total_price = Math.round((total_price_computed || data.total_price_read)*100)/100;
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
    id
  }];
  
  return result;
}

export function localeToOcrLanguage(locale) {
  let ocr_languages = {
    'fi-FI': 'fin_fast',
    'es-AR': 'spa'
  }

  return ocr_languages[locale];
}

export function processReceiptImage(filepath, data, resize) {
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

export function extractTextFromFile(filepath, locale) {
  let language = localeToOcrLanguage(locale);

  return new Promise((resolve, reject) => {
    child_process.execFile('tesseract', [
      '-l',
      ['fin'].indexOf(language) !== -1 ? `${language}+eng` : 'eng',
      '-c', 'load_number_dawg=0',
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

export function getClosestCategory(toCompare, locale) {
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
