import { stringSimilarity } from "string-similarity-js";

import { LevenshteinDistance } from "./levenshteinDistance";
import { measureRegExp } from './receipts';

export const getDetails = (manufacturers = []) => {
  const details = {};

  details.manufacturers = {};
  
  manufacturers.forEach(manufacturer => {
    details.manufacturers[manufacturer.name] = [manufacturer.name, ...manufacturer.aliases || []];
  });

  details.weighting = {
    weighed: ['punnittu'],
    stone: ['kivineen'],
    stoneless: ['kivetön'],
    withpeel: ['kuorineen'],
    peeled: ['kuorittu'],
    average: ['average', 'tuotekeskiarvo', 'keskiarvo'],
    kilogram: ['kg']
  };
  details.size = {
    PORTS: ['small', 'pieni', 'pienet'],
    PORTM: ['medium', 'keskikokoinen'],
    PORTL: ['large', 'big', 'iso', 'isot']
  };
  details.cooking = {
    boiled: ['boiled', 'keitetty'],
    battered: ['battered', 'leivitetty'],
    deepFried: ['deep fried', 'uppopaistettu'],
    fried: ['paistettu'],
    grilled: ['grillattu'],
    fresh: ['fresh', 'tuore'],
    dried: ['kuivattu'],
    withegg: ['kananmunaa'],
    thickened: ['suurustettu'],
    nonthickened: ['suurustamaton'],
    withoutsauce: ['ei kastiketta'],
    coldsmoked: ['kylmäsavustettu', 'kylmäsavu'],
    smoked: ['savustettu', 'savu'],
    milk: ['kevytmaito', 'rasvaton maito'],
    overcooked: ['ylikypsä', 'overcooked'],
    cooked: ['cooked']
  };
  details.serving = {
    servedWith: ['served with', 'kanssa'],
    includes: ['includes', 'sisältää']
  };
  details.spicing = {
    salted: ['suolattu', 'suolaa'],
    withoutsalt: ['without salt', 'suolaton'],
    withtomato: ['tomaattinen'],
    withchocolate: ['suklainen'],
    sugared: ['sokeroitu'],
    nonsugared: ['sokeroimaton'],
    flavored: ['maustettu'],
    nonflavored: ['maustamaton', 'naturel']
  };
  details.description = {
    fresh: ['fresh', 'raikas'],
    soft: ['soft', 'pehmeä']
  };
  details.type = {
    natural: ['luomu'],
    bulk: ['irto'],
    pott: ['ruukku'],
    withfat: ['rasvaa'],
    nonfat: ['rasvaton'],
    lowfat: ['vähärasvainen'],
    foam: ['vaahtoutuva'],
    sliced: ['slice', 'sliced', 'paloiteltu', 'palat', 'pala', 'viipale', 'viipaloitu'],
    nonlactose: ['laktoositon'],
    thickened: ['puuroutuva'],
    parboiled: ['kiehautettu', 'parboiled'],
    lowlactose: ['vähälaktoosinen', 'hyla'],
    uht: ['uht'],
    insaltwater: ['suolavedessä', 'suolaved'],
    frozenfood: ['pakasteateria', 'pakastettu', 'pakaste'],
    bag: ['pussi'],
    glutenfree: ['gluteeniton', 'gton'],
    vitamin: ['d-vitaminoitu', 'vitaminoitu'],
    canned: ['säilyke'],
    fairtrade: ['reilun kaupan'],
    vegan: ['vegaaninen', 'vegan'],
    fresh: ['fresh', 'tuore'],
    meal: ['meal', 'ateria'],
    
    sweetorange: ['sweet orange'],

    grannysmith: ['granny smith'],
    golden: ['golden'],
    royalgala: ['royal gala'],

    tarocco: ['tarocco'],
    moro: ['moro'],
    sanguinello: ['sanguinello'],

    nadorcott: ['nadorcott'],
    bruno: ['bruno'],

    yellow: ['keltainen'],
    orange: ['orange'],
    red: ['punainen'],
    green: ['vihreä'],
    white: ['valkoinen'],

    skin: ['kuorellinen'],
    withoutskin: ['kuoreton'],
    package: ['paperipakkaus'],

    filledPasta: ['täytepasta'],
    filling: ['filling', 'täyte']
  };
  details.origin = {
    local: ['kotimainen'],
    imported: ['ulkomainen'],
    finnish: ['suomi', 'suomalainen', 'suomesta'],
    californian: ['kalifornia', 'kalifornialainen'],
    spanish: ['espanja', 'espanjalainen']
  };
  details.extra = {
    trademark: ['™'],
    registered: ["®"],
    with: ['with a', 'with']
  };

  return details;
};

export function getNameLocale(name, locale, strict) {
  if (!name) {
    return name;
  }
  if (typeof name === 'string') {
    return name;
  } 
  else if (name.hasOwnProperty(locale)) {
    return name[locale];
  }
  else if (!strict) {
    return first(name);
  }
  else return '';
}

export function CSVToArray( strData, strDelimiter ){
  // Check to see if the delimiter is defined. If not,
  // then default to comma.
  strDelimiter = (strDelimiter || ",");

  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(
      (
          // Delimiters.
          "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

          // Quoted fields.
          "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

          // Standard fields.
          "([^\"\\" + strDelimiter + "\\r\\n]*))"
      ),
      "gi"
      );


  // Create an array to hold our data. Give the array
  // a default empty first row.
  var arrData = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  var arrMatches = null;


  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while (arrMatches = objPattern.exec( strData )){

      // Get the delimiter that was found.
      var strMatchedDelimiter = arrMatches[ 1 ];

      // Check to see if the given delimiter has a length
      // (is not the start of string) and if it matches
      // field delimiter. If id does not, then we know
      // that this delimiter is a row delimiter.
      if (
          strMatchedDelimiter.length &&
          strMatchedDelimiter !== strDelimiter
          ){

          // Since we have reached a new row of data,
          // add an empty row to our data array.
          arrData.push( [] );

      }

      var strMatchedValue;

      // Now that we have our delimiter out of the way,
      // let's check to see which kind of value we
      // captured (quoted or unquoted).
      if (arrMatches[ 2 ]){

          // We found a quoted value. When we capture
          // this value, unescape any double quotes.
          strMatchedValue = arrMatches[ 2 ].replace(
              new RegExp( "\"\"", "g" ),
              "\""
              );

      } else {

          // We found a non-quoted value.
          strMatchedValue = arrMatches[ 3 ];

      }


      // Now that we have our value string, let's add
      // it to the data array.
      arrData[ arrData.length - 1 ].push( strMatchedValue );
  }

  // Return the parsed data.
  return( arrData );
}

export function escapeRegExp(stringToGoIntoTheRegex) {
  return stringToGoIntoTheRegex.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function stripName(name, manufacturers) {
  const details = getDetails(manufacturers);
  let strippedName = {};
  Object.entries(name).forEach(([locale, translation]) => {
    strippedName[locale] = translation;
    for (const i in details) {
      for (const j in details[i]) {
        details[i][j].forEach(detail => {
          strippedName[locale] = strippedName[locale]
          .replace(new RegExp(escapeRegExp(detail)), '')
        });
      }
    }
    strippedName[locale] = (
      strippedName[locale]
      .replace(/,/g, '')
      .replace(/\s{2,}/, ' ')
      .trim()
    );
  });
  return strippedName;
}

export function stripDetails(name, manufacturers = []) {
  let token,
      accuracy;

  const details = getDetails(manufacturers);

  let strippedName = name.replace(measureRegExp, '').replace(/[0-9.,]/g, '');
  for (let type in details) {
    for (let detailName in details[type]) {
      details[type][detailName].forEach(detail => {
        //token = similarSearch.getBestSubstring(name, detail);
        // Didn't work with compound words like ruukkutilli
        token = LevenshteinDistance(detail.toLowerCase(), strippedName.toLowerCase(), {search: true});
        accuracy = (detail.length-token.distance)/detail.length;
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

export function toTitleCase(str) {
  if (!str) return str;

  return  str.replace(/([^\s:\-])([^\s:\-]*)/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

export function getParentPath(item) {
  let result = "",
      parent = item,
      name;
  if (parent) {
    while (parent = parent.parent) {
      name = getNameLocale(parent.name, 'fi-FI');
      if (!name) continue;
      result = stringToSlug(name, "_")+(result ? "."+result : "");
    }
  }
  return result;
}

export function stringToSlug(str,  sep) {
  let sep_regexp = escapeRegExp(sep);

  str = str.replace(/^\s+|\s+$/g, ""); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  var from = "åàáãäâèéëêìíïîòóöôùúüûñç·/_,:;";
  var to = "aaaaaaeeeeiiiioooouuuunc------";

  for (var i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }

  str = str
    .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
    .replace(/\s+/g, "-") // collapse whitespace and replace by -
    .replace(new RegExp("-+", "g"), sep) // collapse dashes
    .replace(new RegExp(sep_regexp+"+"), "") // trim - from start of text
    .replace(new RegExp(sep_regexp+"+$"), ""); // trim - from end of text

  return str;
}

export const resolveCategories = async (transaction, items = [], products = [], categories = [], manufacturers = []) => {
  try {
    let trimmed_item_name,
        distance;

    console.log('items length', items.length);

    console.log('categories length', categories.length);

    let trimmed_categories = categories.filter(async category => {
      if (category.attributes.length) {
        let name = category.name;
        category.trimmed_name = stripName(name, manufacturers);
      } else {
        category.trimmed_name = {};
      }
      return category.attributes.length ? true : false;
    });
    //fs.writeFileSync('./ner.json', JSON.stringify(manager.save()));

    console.log('trimmed categories', trimmed_categories);
    
    for (let item of transaction.items) {
      if (!item) continue;
      
      const itemCategories = [];
      const itemProducts = [];
      trimmed_item_name = stripDetails(item.product.name, manufacturers);

      console.log('trimmed item name', trimmed_item_name);
  
      items.forEach(comparableItem => {
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
              item_name: item.product.name,
              trimmed_item_name: trimmed_item_name,
              distance: distance,
              product: comparableItem.product
            });
          }
        }
      });

      products.forEach(comparableProduct => {
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
              item_name: item.product.name,
              trimmed_item_name: trimmed_item_name,
              distance: distance,
              product: comparableProduct
            });
          }
        }
      });
  
      trimmed_categories.forEach((category) => {
        Object.entries(category.trimmed_name).forEach(([locale, translation]) => {
          if (category.trimmed_name && translation) {
            distance = stringSimilarity(trimmed_item_name.toLowerCase() || '', translation.toLowerCase() || '');
            distance = Math.max(distance, stringSimilarity(item.product.name.toLowerCase() || '', category.name[locale].toLowerCase() || '')+0.1);
            category.aliases?.forEach(alias => {
              distance = Math.max(distance, stringSimilarity(trimmed_item_name.toLowerCase() || '', alias.toLowerCase() || '')+0.1);
              distance = Math.max(distance, stringSimilarity(item.product.name.toLowerCase() || '', alias.toLowerCase() || '')+0.1);
            });
            if (category.parent) {
              distance = Math.max(distance, stringSimilarity(trimmed_item_name || '', category.parent.name[locale] || ''));
            }
            //accuracy = (trimmed_item_name.length-distance)/trimmed_item_name.length;
    
            if (distance > 0.4) {
              console.log(
                'comparing item to categories',
                'product name', item.product.name,
                'category name', category.name[locale],
                'aliases', category.aliases,
                'parent', category.parent?.name[locale],
                'distance', distance
              );
              itemCategories.push({
                category,
                item_name: item.product.name,
                trimmed_item_name: trimmed_item_name,
                name: translation,
                distance
              });

              const product = items.find(item => item.product?.categoryId === category.id);

              if (product) {
                itemProducts.push({
                  category,
                  item_name: product.name,
                  trimmed_item_name: trimmed_item_name,
                  name: translation,
                  distance,
                  product
                });
              }
            }
          }
        });
      });

      if (item.product.category && item.product.category.name) {
        trimmed_categories.forEach((category, index) => {
          Object.entries(category.name).forEach(([locale, categoryTranslation]) => {
            const productCategoryName = item.product.category.name[locale]?.toLowerCase();
            const categoryName = categoryTranslation.toLowerCase();
            distance = stringSimilarity(productCategoryName, categoryName);
            //accuracy = (trimmed_item_name.length-distance)/trimmed_item_name.length;
    
            if (distance > 0.4) {
              console.log('comparing product category to categories', productCategoryName, categoryName, distance);
              itemCategories.push({
                category,
                item_name: item.product.name,
                trimmed_item_name: trimmed_item_name,
                distance: distance
              });

              const product = items.find(item => item.product?.categoryId === category.id);

              if (product) {
                itemProducts.push({
                  category,
                  item_name: product.name,
                  trimmed_item_name: trimmed_item_name,
                  distance: distance,
                  product: product
                });
              }
            }
          });
        });
      }
      
      itemProducts.sort((a, b) => b.distance-a.distance);
      itemCategories.sort((a, b) => b.distance-a.distance);

      const itemProduct = itemProducts[0];
      const itemCategory = itemCategories[0];

      if (itemProduct?.distance > itemCategory?.distance) {
        
        item.product = itemProduct.product;

        console.log(itemProduct);
        continue;
      } else if (itemCategory) {
        item.product.categoryId = itemCategory.category.id;

        console.log(itemCategory);
      }

      //console.log(item_categories);
    }
  } catch (error) {
    console.error(error);
  }
}
