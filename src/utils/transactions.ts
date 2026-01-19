import { get, set } from 'lodash';
import moment from 'moment';

import { TRANSACTION_CSV_COLUMNS } from '../api/transaction';
import Transaction, { TransactionShape } from '../models/Transaction';
import { DeepPartial, Locale, NameTranslations } from './types';
import stringSimilarity from 'string-similarity-js';
import { BrandShape } from '../models/Brand';
import { CategoryShape } from '../models/Category';
import { ItemShape } from '../models/Item';
import { ProductShape } from '../models/Product';
import { first, measureRegExp } from './entities';
import { detailsFi } from './details/detailsFi';
import { LevenshteinDistance } from './levenshteinDistance';

export const getNumber = (value: string) => parseFloat(value.replace('−', '-').replace(',', '.'));

export const getDetails = (brands: BrandShape[] = []) => {
  const details: Record<string, Record<string, string[]>> = { ...detailsFi };

  details.brands = {};

  brands.forEach((brand) => {
    details.brands[brand.name] = [brand.name, ...(brand.aliases || [])];
  });

  return details;
};

export function getNameLocale(name: string | NameTranslations, locale: Locale, strict?: boolean) {
  if (!name) {
    return name;
  }
  if (typeof name === 'string') {
    return name;
  } else if (name[locale]) {
    return name[locale];
  } else if (!strict) {
    return first(name);
  } else return '';
}

export function CSVToArray(strData: string, strDelimiter: string) {
  // Check to see if the delimiter is defined. If not,
  // then default to comma.
  strDelimiter = strDelimiter || ',';

  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(
    // Delimiters.
    '(\\' +
      strDelimiter +
      '|\\r?\\n|\\r|^)' +
      // Quoted fields.
      '(?:"([^"]*(?:""[^"]*)*)"|' +
      // Standard fields.
      '([^"\\' +
      strDelimiter +
      '\\r\\n]*))',
    'gi'
  );

  // Create an array to hold our data. Give the array
  // a default empty first row.
  const arrData: string[][] = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  let arrMatches = null;

  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  // eslint-disable-next-line no-cond-assign
  while ((arrMatches = objPattern.exec(strData))) {
    // Get the delimiter that was found.
    var strMatchedDelimiter = arrMatches[1];

    // Check to see if the given delimiter has a length
    // (is not the start of string) and if it matches
    // field delimiter. If id does not, then we know
    // that this delimiter is a row delimiter.
    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
      // Since we have reached a new row of data,
      // add an empty row to our data array.
      arrData.push([]);
    }

    let strMatchedValue;

    // Now that we have our delimiter out of the way,
    // let's check to see which kind of value we
    // captured (quoted or unquoted).
    if (arrMatches[2]) {
      // We found a quoted value. When we capture
      // this value, unescape any double quotes.
      strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"');
    } else {
      // We found a non-quoted value.
      strMatchedValue = arrMatches[3];
    }

    // Now that we have our value string, let's add
    // it to the data array.
    arrData[arrData.length - 1].push(strMatchedValue);
  }

  // Return the parsed data.
  return arrData;
}

export function escapeRegExp(stringToGoIntoTheRegex: string) {
  return stringToGoIntoTheRegex.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function stripName(name: NameTranslations, brands: BrandShape[]) {
  const details = getDetails(brands);
  let strippedName: NameTranslations = {};
  Object.entries(name).forEach(([locale, translation]: [Locale, string]) => {
    strippedName[locale] = translation;
    for (const i in details) {
      for (const j in details[i]) {
        details[i][j].forEach((detail) => {
          strippedName[locale] = strippedName[locale].replace(new RegExp(escapeRegExp(detail)), '');
        });
      }
    }
    strippedName[locale] = strippedName[locale]
      .replace(/,/g, '')
      .replace(/\s{2,}/, ' ')
      .trim();
  });
  return strippedName;
}

export function stripDetails(name: string, brands: BrandShape[] = []) {
  let token, accuracy;

  const details = getDetails(brands);

  let strippedName = name.replace(measureRegExp, '').replace(/[0-9.,]/g, '');
  for (let type in details) {
    for (let detailName in details[type]) {
      details[type][detailName].forEach((detail) => {
        //token = similarSearch.getBestSubstring(name, detail);
        // Didn't work with compound words like ruukkutilli
        token = LevenshteinDistance(detail.toLowerCase(), strippedName.toLowerCase(), { search: true }) as {
          substring: string;
          distance: number;
        };
        accuracy = (detail.length - token.distance) / detail.length;
        if (accuracy > 0.8) {
          //name = name.substring(0, token.start)+name.substring(token.end+1);
          strippedName = strippedName.replace(new RegExp(token.substring, 'i'), ' ').trim();
          //console.log('detail', detail, 'name', name, 'accuracy', accuracy, 'token', token, 'type', type, 'detailName', detailName);
        }
      });
    }
  }
  strippedName = strippedName.trim().replace(/,|\s{2,}/g, ' ');
  return strippedName;
}

export function toTitleCase(str: string) {
  if (!str) return str;

  return str.replace(/([^\s:-])([^\s:-]*)/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

export function getParentPath(item: any) {
  let result = '',
    parent = item,
    name;
  if (parent) {
    // eslint-disable-next-line no-cond-assign
    while ((parent = parent.parent)) {
      name = getNameLocale(parent.name, Locale['fi-FI']);
      if (!name) continue;
      result = stringToSlug(name, '_') + (result ? '.' + result : '');
    }
  }
  return result;
}

export function stringToSlug(str: string, sep: string) {
  let sep_regexp = escapeRegExp(sep);

  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  var from = 'åàáãäâèéëêìíïîòóöôùúüûñç·/_,:;';
  var to = 'aaaaaaeeeeiiiioooouuuunc------';

  for (var i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(new RegExp('-+', 'g'), sep) // collapse dashes
    .replace(new RegExp(sep_regexp + '+'), '') // trim - from start of text
    .replace(new RegExp(sep_regexp + '+$'), ''); // trim - from end of text

  return str;
}

export const resolveTransactionCategories = async (
  transaction: TransactionShape,
  items: ItemShape[] = [],
  products: ProductShape[] = [],
  categories: CategoryShape[] = [],
  brands: BrandShape[] = []
) => {
  try {
    console.log('items length', items.length);

    console.log('categories length', categories.length);

    const trimmedCategories = categories
      .filter((category) => (category.attributes.length ? true : false))
      .map((category) => {
        const trimmedCategory: CategoryShape & { trimmedName: NameTranslations } = { ...category, trimmedName: {} };
        if (trimmedCategory.attributes.length) {
          let name = trimmedCategory.name;
          trimmedCategory.trimmedName = stripName(name, brands);
        } else {
          trimmedCategory.trimmedName = {};
        }
        return trimmedCategory;
      });
    //fs.writeFileSync('./ner.json', JSON.stringify(manager.save()));

    for (const item of transaction.items) {
      if (!item) continue;

      const itemCategories: any[] = [];
      const itemProducts: any[] = [];
      const trimmedItemName = stripDetails(item.product.name, brands);

      let distance: number;

      console.log('trimmed item name', trimmedItemName);

      items.forEach((comparableItem) => {
        if (comparableItem.product && comparableItem.product.category && comparableItem.text) {
          const productName = item.product.name.toLowerCase() || '';
          const itemName = comparableItem.text.toLowerCase() || '';
          const comparableProductName = comparableItem.product?.name.toLowerCase() || '';
          distance = Math.max(
            stringSimilarity(productName, itemName),
            stringSimilarity(productName, comparableProductName)
          );

          if (distance > 0.4) {
            console.log('comparing product to items', productName, itemName, distance);
            console.log(item.product.name, comparableItem.text, distance);
            itemProducts.push({
              category: comparableItem.product.category,
              itemName: item.product.name,
              trimmedItemName,
              distance: distance,
              product: comparableItem.product,
            });
          }
        }
      });

      products.forEach((comparableProduct) => {
        if (comparableProduct && comparableProduct.categoryId) {
          const productName = item.product.name.toLowerCase() || '';
          const itemName = comparableProduct.name.toLowerCase() || '';
          const comparableProductName = comparableProduct.name.toLowerCase() || '';
          distance = Math.max(
            stringSimilarity(productName, itemName),
            stringSimilarity(productName, comparableProductName)
          );

          if (distance > 0.4) {
            console.log('comparing product to products', productName, itemName, distance);
            console.log(item.product.name, comparableProduct.name, distance);
            itemProducts.push({
              itemName: item.product.name,
              trimmedItemName,
              distance: distance,
              product: comparableProduct,
            });
          }
        }
      });

      trimmedCategories.forEach((category) => {
        Object.entries(category.trimmedName).forEach(([locale, translation]: [Locale, string]) => {
          if (category.trimmedName && translation) {
            distance = stringSimilarity(trimmedItemName.toLowerCase() || '', translation.toLowerCase() || '');
            distance = Math.max(
              distance,
              stringSimilarity(item.product.name.toLowerCase() || '', category.name[locale].toLowerCase() || '') + 0.1
            );
            category.aliases?.forEach((alias) => {
              distance = Math.max(
                distance,
                stringSimilarity(trimmedItemName.toLowerCase() || '', alias.toLowerCase() || '') + 0.1
              );
              distance = Math.max(
                distance,
                stringSimilarity(item.product.name.toLowerCase() || '', alias.toLowerCase() || '') + 0.1
              );
            });
            if (category.parent) {
              distance = Math.max(
                distance,
                stringSimilarity(trimmedItemName || '', category.parent.name[locale] || '')
              );
            }
            //accuracy = (trimmedItemName.length-distance)/trimmedItemName.length;

            if (distance > 0.4) {
              console.log(
                'comparing item to categories',
                'product name',
                item.product.name,
                'category name',
                category.name[locale],
                'aliases',
                category.aliases,
                'parent',
                category.parent?.name[locale],
                'distance',
                distance
              );
              itemCategories.push({
                category,
                itemName: item.product.name,
                trimmedItemName,
                name: translation,
                distance,
              });

              const product = items.find((item) => item.product?.categoryId === category.id);

              if (product) {
                itemProducts.push({
                  category,
                  //itemName: product.name,
                  trimmedItemName,
                  name: translation,
                  distance,
                  product,
                });
              }
            }
          }
        });
      });

      if (item.product.category && item.product.category.name) {
        trimmedCategories.forEach((category) => {
          Object.entries(category.name).forEach(([locale, categoryTranslation]: [Locale, string]) => {
            const productCategoryName = item.product.category.name[locale]?.toLowerCase();
            const categoryName = categoryTranslation.toLowerCase();
            distance = stringSimilarity(productCategoryName || '', categoryName || '');
            //accuracy = (trimmedItemName.length-distance)/trimmedItemName.length;

            if (distance > 0.4) {
              console.log('comparing product category to categories', productCategoryName, categoryName, distance);
              itemCategories.push({
                category,
                itemName: item.product.name,
                trimmedItemName,
                distance: distance,
              });

              const product = items.find((item) => item.product?.categoryId === category.id);

              if (product) {
                itemProducts.push({
                  category,
                  //itemName: product.name,
                  trimmedItemName,
                  distance: distance,
                  product: product,
                });
              }
            }
          });
        });
      }

      itemProducts.sort((a, b) => b.distance - a.distance);
      itemCategories.sort((a, b) => b.distance - a.distance);

      const itemProduct = itemProducts[0];
      const itemCategory = itemCategories[0];

      if (itemProduct?.distance > itemCategory?.distance) {
        item.product = itemProduct.product;

        console.log('itemProduct', itemProduct);
        continue;
      } else if (itemCategory) {
        item.product.categoryId = itemCategory.category.id;
        delete item.product.category;

        console.log('itemCategory', itemCategory);
      }

      //console.log(item_categories);
    }
  } catch (error) {
    console.error(error);
  }
};

export const getTransactionsFromCsv = (rows: any, startingRow: number, indexes: number[], template: string) => {
  const transactions: Record<string, DeepPartial<Transaction>> = {};
  let itemIndex = 0;
  let columns: string[];
  for (let i = startingRow; i < rows.length; i++) {
    let columnKey = '';
    columns = rows[i];
    indexes.forEach((index) => {
      columnKey += columns[index];
    });
    if (!(columnKey in transactions)) {
      itemIndex = 0;
      transactions[columnKey] = { items: [], party: {}, receipts: [], totalPrice: 0 };
    }
    for (const n in columns) {
      let columnName = TRANSACTION_CSV_COLUMNS[template as keyof typeof TRANSACTION_CSV_COLUMNS](itemIndex)[n];

      let value = columns[n];
      let numberValue: number;

      if (!columnName || !value) continue;

      console.log(i, columnName, value);

      if (columnName.split('.').includes('name') || columnName.split('.').includes(`name['fi-FI']`)) {
        value = toTitleCase(value);

        const quantityAndMeasureTokens = value.toLocaleLowerCase().match(/(\d+)x(\d+(,\d+)?)\s?((m|k)?(g|l))(\s|$)/);
        let quantity = quantityAndMeasureTokens && getNumber(quantityAndMeasureTokens[1]);
        const quantityTokens = value.toLocaleLowerCase().match(/(\d+)\s?(p|ps|pss|kpl)(\s|$)/);
        if (quantityTokens) {
          quantity = getNumber(quantityTokens[1]);
        }
        if (quantity) {
          set(transactions[columnKey], `items[${itemIndex}].quantity`, quantity);
        } else {
          const measureTokens = value.toLocaleLowerCase().match(/\s((m|k)?(g|l))(\s|$)/);
          if (measureTokens) {
            set(transactions[columnKey], `items[${itemIndex}].unit`, measureTokens[1]);
          }
          const tokens = value.toLocaleLowerCase().match(/(\d+(,\d+)?)\s?((m|k)?(g|l))(\s|$)/);
          const measure = tokens && getNumber(tokens[1]);
          if (measure) {
            set(transactions[columnKey], `items[${itemIndex}].measure`, measure);
            set(transactions[columnKey], `items[${itemIndex}].unit`, tokens[3]);
          }
        }
      }

      if (columnName.split('.')[1] === 'quantity_or_measure') {
        if (value.match(/^-?\d+(\.|,)\d+$/)) {
          columnName = columnName.replace('quantity_or_measure', 'measure');
          numberValue = getNumber(value);
        } else {
          columnName = columnName.replace('quantity_or_measure', 'quantity');
          numberValue = getNumber(value);
        }
      } else if (columnName === 'date_fi_FI') {
        let date = value.split('.');
        value = moment().format(`${date[2]}-${date[1].padStart(2, '0')}-${date[0].padStart(2, '0')}`);
        columnName = 'date';
      } else if (columnName === 'time') {
        let time = value.split(':');
        value = moment(transactions[columnKey].date).add(time[0], 'hours').add(time[1], 'minutes').format();
        columnName = 'date';
      } else if (columnName.split('.')[1] === 'price') {
        numberValue = getNumber(value);
        transactions[columnKey].totalPrice += numberValue;
      }
      if (columnName !== 'id') {
        if (typeof numberValue === 'number') {
          if (columnName.includes('quantity')) {
            set(transactions[columnKey], columnName, numberValue * (get(transactions[columnKey], columnName) || 1));
          } else {
            set(transactions[columnKey], columnName, numberValue);
          }
        } else {
          set(transactions[columnKey], columnName, value);
        }
      }
    }
    itemIndex++;
  }
  return transactions;
};
