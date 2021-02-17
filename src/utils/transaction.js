import natural from 'natural';
import Manufacturer from '../models/Manufacturer';
import mongo from './mongo';

export const details = {};
(async () => {
  try {
    details.manufacturers = {};
    
    (await Manufacturer.query()).forEach(manufacturer => {
      details.manufacturers[manufacturer.name] = [manufacturer.name, ...manufacturer.aliases || []];
    });
  } catch (error) {
    console.error(error);
  }
})();

details.weighting = {
  weighted: ['punnittu'],
  stone: ['kivineen'],
  stoneless: ['kivetön'],
  withpeel: ['kuorineen'],
  peeled: ['kuorittu'],
  average: ['tuotekeskiarvo', 'keskiarvo']
};
details.cooking = {
  boiled: ['keitetty'],
  breaded: ['leivitetty'],
  fried: ['paistettu'],
  grilled: ['grillattu'],
  fresh: ['tuore'],
  dried: ['kuivattu'],
  withegg: ['kananmunaa'],
  thickened: ['suurustettu'],
  nonthickened: ['suurustamaton'],
  withoutsauce: ['ei kastiketta'],
  coldsmoked: ['kylmäsavustettu', 'kylmäsavu'],
  smoked: ['savustettu', 'savu'],
  milk: ['kevytmaito', 'rasvaton maito']
};
details.spicing = {
  salted: ['suolattu', 'suolaa'],
  withoutsalt: ['suolaton'],
  withtomato: ['tomaattinen'],
  withchocolate: ['suklainen'],
  sugared: ['sokeroitu'],
  nonsugared: ['sokeroimaton'],
  flavored: ['maustettu'],
  nonflavored: ['maustamaton']
};
details.type = {
  natural: ['luomu'],
  bulk: ['irto'],
  pott: ['ruukku'],
  withfat: ['rasvaa'],
  nonfat: ['rasvaton'],
  lowfat: ['vähärasvainen'],
  sliced: ['paloiteltu', 'palat', 'pala'],
  nonlactose: ['laktoositon'],
  thickened: ['puuroutuva'],
  parboiled: ['kiehautettu', 'parboiled'],
  lowlactose: ['vähälaktoosinen'],
  insaltwater: ['suolavedessä', 'suolaved'],
  frozenfood: ['pakasteateria', 'pakastettu', 'pakaste'],
  bag: ['pussi'],
  glutenfree: ['gluteeniton', 'gton'],
  vitamin: ['d-vitaminoitu', 'vitaminoitu'],
  canned: ['säilyke'],
  fairtrade: ['reilun kaupan'],
  vegan: ['vegaaninen', 'vegan'],
  grannysmith: ['granny smith'],
  sweetorange: ['sweet orange'],
  golden: ['golden']
};
details.origin = {
  local: ['kotimainen'],
  finnish: ['suomi', 'suomalainen', 'suomesta'],
  californian: ['kalifornia', 'kalifornialainen']
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
  else if (!strict) {
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
  return stringToGoIntoTheRegex.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function stripName(name) {
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
      .trim()
      .replace(/,|\s{2,}|/g, '')
    );
  });
  return strippedName;
}

export function stripDetails(name) {
  let token,
      accuracy,
      words;

  for (let type in details) {
    for (let detailName in details[type]) {
      details[type][detailName].forEach(detail => {
        //token = similarSearch.getBestSubstring(name, detail);
        // Didn't work with compound words like ruukkutilli
        token = natural.LevenshteinDistance(detail, name.toLowerCase(), {search: true});
        accuracy = (detail.length-token.distance)/detail.length;
        if (accuracy > 0.8) {
          //name = name.substring(0, token.start)+name.substring(token.end+1);
          name = name.replace(new RegExp(token.substring, 'i'), '').trim();
          console.log(detail, name, accuracy, token, type, detailName);
        }
      });
    }
  }
  name = name.trim().replace(/,|\s{2,}/g, '');
  return name;
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

export function getOpenFoodFactsProduct(name) {
  return new Promise((resolve, reject) => {
    const db = mongo.getDB();
    return db.collection('products').find({
      $text: {
        $search: name
      }
    })
    .project({
      score: { 
        $meta: "textScore"
      }
    })
    .sort({
      score: {
        $meta: "textScore"
      }
    }).limit(1)
    .toArray((error, results) => {
      if (error) {
        console.error(error);
        resolve();
      }
      resolve(results[0]);
    });
  });
}