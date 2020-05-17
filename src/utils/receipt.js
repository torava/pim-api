import moment from 'moment';
import { stringSimilarity } from "string-similarity-js";

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

export function getTransactionsFromReceipt(result, text, locale, id) {
  text = text
  .replace(/ﬂ|»|'|´|`|‘|“|"|”|\|/g, '')
  .replace(/(\d) *(\.,|\,|\.|_|\-|;) *(\d)/g, '$1.$3')
  .replace(/\.,|\,|_|\-|;/g, '')
  .replace(/—/g, '-')
  .replace(/ +/g, ' ');

  let line, line_name, line_product_name, line_price, line_prices, item_number, line_text,
    line_total, line_date, line_address, line_vat, line_item_details, quantity, measure,
    line_number_format, total_price_computed = 0, name, date, line_item, line_phone_number,
    line_misc,
    misc_words = [
      'alv',
      'debit/veloitus',
      'maksukortti',
      'käteinen',
      'takaisin',
      'yhteensä',
      'total',
      'summa',
      'yhteensa',
      'kaikki yht',
      'maksu',
      'avoinna',
      'eur',
      'ruokaostokset',
      'käyttötavaraostokset',
      'plussaa kerryttävät ostot',
      'plussa-edut yhteensä',
      'credit/veloitus',
      'debit/veloitus',
      'pankki/veloitus',
      'bonusostoihin kirjattu',
      'mastercard',
      'visa',
      'pankkikortti',
      'kassaversio',
      'veloitus'
    ],
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
        date = line_date && parseYear(line_date[4])+'-'+line_date[3]+'-'+line_date[2]+' '+line_date[7]+':'+line_date[9];//+':'+line_date[10];
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
        line_address = line.match(/^([\u00C0-\u017F-a-z\/\s]+)((\d{1,4})([-]\d{1,4})?)[-]?\s?(\d{5})?[,|.]?\s?([\u00C0-\u017F-a-z\/]+)?$/i);
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
      if (!data.party.id) {
        const party = result.parties.reduce((previous_party, current_party) => {
          if (current_party.name) {
            current_party.similarity = stringSimilarity(line, current_party.name);
            if (current_party.similarity > 0.6 && (!previous_party || !previous_party.similarity || previous_party.similarity < current_party.similarity)) {
              return current_party;
            }
          }
          if (previous_party && previous_party.similarity) {
            return previous_party;
          }
        });

        if (party) {
          data.party = {id: party.id};

          previous_line = 'party_name';
        }
      }

      if (line_number == 1 && line_name && !data.party.name && !data.party.id) {
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
      line_total = line_number_format.match(/^(hinta|total|grand total|summa|yhteensä|yhteensa).*[^0-9]((\d+\.\d{2})(\-)?\s)?((\d+\.\d{2})(\-)?)(\s?eur(oa)?)?$/i);
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

      // misc line
      line_misc = line.match(/^([\u00C0-\u017F-a-z\/]+)\s/i);
      if (line_misc) {
        let found = false;
        misc_words.forEach(word => {
          if (stringSimilarity(line_misc[1], word) > 0.8) {
            console.log('misc', line, word);
            found = true;
            return false;
          }
        });

        if (found) {
          continue;
        }
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

        if (line_item_details && (line_item_details[6] || line_item_details[8])) {
          console.log(line, line_item_details);
          items[items.length-1].item_number = line_item_details[2];
          items[items.length-1].quantity = parseFloat(line_item_details[6]);
          items[items.length-1].measure = parseFloat(line_item_details[8]);
          items[items.length-1].unit = 'kg';
          previous_line = 'details';
          continue;
        }
      }
      
      // item line
      if (!has_discount) {
        line_price = line_number_format.match(/\s((\d{1,4}\.\d{2})(\-)?){1,2}\s*.{0,3}$/i);
        console.log('!!!!', line, line_price);
        if (line_price) {
          line_measure = line.substring(0, line_price.index).match(/(\d{1,4})((kg|k9)|(g|9)|(l|1))/);
          line_item = line.substring(0, line_price.index).match(/^((\d+)\s)?([\u00C0-\u017F-a-z0-9\s\-\.\,\+\&\%\=\/\(\)\{\}\[\]]+)$/i);
          console.log('!!!!2', line_item);
          if (line_item &&
             !line.match(/^(\d|\.|\s|%|A|B|ma|la|su|pe|X|x|-)+$/)) {
            price = parseFloat(line_price[1]);
            measure = line_measure && parseFloat(line_measure[1]);
            name = toTitleCase(line_item[3]);

            console.log('!!!3', name, measure, price);

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
      console.log(line, previous_line, has_discount);
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
