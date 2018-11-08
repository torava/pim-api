import Category from '../models/Category';
import Attribute from '../models/Attribute';
import _ from 'lodash';
import {NerManager} from 'node-nlp';
import moment from 'moment';

export default app => {
  const manager = new NerManager({ threshold: 0.5 });

  Category.query()
  .eager('[children, parent.^]')
  .then(async categories => {
    let n = 0;
    console.log(moment().format()+' [NerManager] Adding categories');
    categories.map(category => {
      if (!category.children.length) {
        //category.name['en-US'] && manager.addDocument('en', category.name['en-US'], category.name['en-US']);
        category.name['fi-FI'] && manager.addNamedEntityText(getParentPath(category), stringToSlug(category.name['fi-FI'], "_"), ['fi'], [category.name['fi-FI']]);
        n++;
      }
    });
    console.log(moment().format()+' [NerManager] Added '+n+' categories');
  });

  function first(list) {
    for (let i in list) {
      return list[i];
    }
  }
  function getNameLocale(name, locale, strict) {
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

  const CSV_SEPARATOR = ";";

  async function csvToObject(csv) {
    let columns,
        item_index = 0,
        rows = csv.replace(/\r/g, '').trim().split('\n'),
        sep = rows[0].trim().match(/^SEP=(.{1})$/),
        separator,
        items = [],
        item,
        column_name,
        elements,
        found,
        year,
        source,
        sources,
        attribute,
        note,
        attributes = await Attribute.query(),
        categories = await Category.query(),
        attribute_object,
        value,
        ref,
        refs = {};
    if (sep) {
      separator = sep[1];
      rows.shift();
    }
    else {
      separator = CSV_SEPARATOR;
    }
  
    let column_names = rows[0].split(separator);

    for (let i = 1; i < rows.length; i++) {
      columns = rows[i].split(separator);
      item = {};
      note = '';
      for (let n in columns) {
        column_name = column_names[n];
        attribute = column_name.match(/^attribute\:(.*)(\s\((.*)\))/i) ||
                    column_name.match(/^attribute\:(.*)/i);
        if (attribute) {
          if (columns[n] !== "") {
            found = false;
            for (let m in attributes) {
              if (attribute[1] == attributes[m].name && attribute[3] == attributes[m].unit) {
                attribute_object = {
                  id: attributes[m].id
                }
                found = true;
                break;
              }
            }
            if (!found) {
              ref = 'attribute:'+attribute[1]+','+attribute[3];
              if (ref in refs) {
                attribute_object = {
                  '#ref': ref
                }
              }
              else {
                refs[ref] = true;
                attribute_object = {
                  '#id': ref,
                  name: {
                    'fi-FI': attribute[1]
                  },
                  unit: attribute[3]
                }
              }
            }
            value = parseFloat(columns[n].replace(',', '.'));
            Object.assign(item, {
              attributes: [
                {
                  attribute: attribute_object,
                  value
                }
              ]
            });
          }
        }
        else if (column_name.toLowerCase() == 'note') {
          note = columns[n];
        }
        else if (['source', 'lähde'].indexOf(column_name.toLowerCase()) !== -1) {
          if (!columns[n]) continue;
          sources = columns[n].split(',');
          for (let m in item.attributes) {
            for (let j in sources) {
              elements = sources[j].match(/^(.*)\s([0-9]{4})/);
              if (elements) {
                source = elements[1].trim();
                year = parseInt(elements[2].trim());
              }
              else {
                source = sources[j].trim();
                year = null;
              }
              ref = 'source:'+source+','+year;
              if (!item.attributes[m].sources) item.attributes[m].sources = [];
              if (ref in refs) {
                item.attributes[m].sources.push({
                  source: {
                    '#ref': ref
                  }
                });
              }
              else {
                refs[ref] = true,
                item.attributes[m].sources.push({
                  source: {
                    '#id': ref,
                    name: source,
                    publication_date: String(year)
                  },
                  note
                });
              }
            }
          }
        }
        else if (['nimi', 'name'].indexOf(column_name.toLowerCase()) !== -1) {
          for (let i in categories) {
            if (categories[i].name['fi-FI'] == columns[n]) {
              item.id = categories[i].id;
              break;
            }
          }
          if (!item.id) {
            ref = 'category:'+columns[n];
            if (ref in refs) {
              item['#ref'] = ref;
            }
            else {
              refs[ref] = true;
              item['#id'] = ref;
              if (!item.name) item.name = {};
              item.name['fi-FI'] = columns[n];
            }
          }
        }
        else if (['isä', 'parent'].indexOf(column_name.toLowerCase()) !== -1) {
          if (!columns[n]) continue;
          for (let i in categories) {
            if (categories[i].name['fi-FI'] == columns[n]) {
              item.parent = {
                id: categories[i].id
              }
              break;
            }
          }
          if (!item.parent) {
            item.parent = {};
            ref = 'category:'+columns[n];
            if (ref in refs) {
              item.parent['#ref'] = ref;
            }
            else {
              refs[ref] = true;
              item.parent['#id'] = ref;
              item.parent.name = {
                'fi-FI': columns[n]
              }
            }
          }      
        }
        else {
          _.set(item, column_name.replace('[i]', '['+(i-1)+']'), columns[n]);
        }
      }
      items.push(item);
    }
    return items;
  }

  function getParentPath(item) {
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

  function escapeRegExp(stringToGoIntoTheRegex) {
    return stringToGoIntoTheRegex.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  function stringToSlug(str,  sep) {
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

function getCategories(parent) {
  return new Promise((resolve, reject) => {
    Category.query()
    .where('parent', parent)
    .eager('products.[items]')
    .then(category => {
      getCategories(category.id)
      .then((categories) => {
        category.children = categories;
        resolve(category);
      })
      .catch(reject);
    });
  });
}

async function getClosestCategory(toCompare, locale) {
  manager.findEntities(
    toCompare,
    'fi',
  ).then(entities => {
    console.log(entities);
  });

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
      console.log(response, response.id, response.id.toString());
      resolve(response);
    })
    .catch(reject);
  });
}

function getAttributes(builder) {
  builder.eager('[products.[items], contributions.[contribution], attributes, children(getAttributes)]', {getAttributes});
}

function getTransactions(builder) {
  builder.eager('[products.items.transaction, attributes, children(getTransactions)]', {getTransactions});
}

function resolveCategories(items, locale) {
  if (!locale) return;
  let item_attributes,
      resolved_attributes,
      item,
      index;
  for (let i in items) {
    item = items[i];
    resolved_attributes = {};
    item_attributes = item.attributes;
    for (let n in item_attributes) {
      if (item_attributes[n].attribute) {
        item_attributes[n].attribute.name = getNameLocale(item_attributes[n].attribute.name, locale);

        let parent = item_attributes[n].attribute.parent;
        while (parent) {
          parent.name = getNameLocale(parent.name, locale);
          parent = parent.parent;
        }
      }
      resolved_attributes[item_attributes[n].attributeId] = item_attributes[n];
    }
    item.attributes = resolved_attributes;
    if (item.children) {
      resolveCategories(item.children, locale);
    }
    item.name = getNameLocale(item.name, locale);

    let parent = item.parent;
    while (parent) {
      parent.name = getNameLocale(parent.name, locale);
      parent = parent.parent;
    }
  }
}

function resolveCategoryPrices(categories) {
  categories && categories.reduce(function resolver(sum, category) {
    if (category.hasOwnProperty('products') && category.products.length) {
      let item_prices = 0;
      category.products.map(product => {
        product.items.map(item => {
          item_prices+= item.price;
        });
      });
      category.price_sum = (category.price_sum || 0)+item_prices; 
    }
    if (category.hasOwnProperty('children') && category.children.length) {
      category.price_sum = (category.price_sum || 0)+category.children.reduce(resolver, 0);
    }
    return sum+(category.price_sum || 0);
  }, 0);
}

app.get('/api/category', function(req, res) {
  /*if (req.query.nested) {
    res.send(getCategories(req.query.parent || -1));
  }
  else */
  if (req.query.match) {
    getClosestCategory(req.query.match, req.query.locale).then(category => {
      res.send(category.id.toString());
    });
    /*
    Category.query()
    //.eager('[products.[items], attributes, children.^]')
    .then(categories => {
      /*for (let i in categories) {
        category = categories[i];
        name = req.query.locale && category.locales ? category.locales[req.query.locale] : category.name;
        distance = levenshtein(name.toLowerCase(), req.query.match.toLowerCase());
        /*if (distance > max_distance) {
          max_distance = distance;
          response = name;
        }
        response.push({distance, name});
      }
      response = response.sort(function(a,b) {
        return a.distance < b.distance
      });
      res.send(response);
    });*/
  }
  else if ('parent' in req.query) {
    Category.query()
    .where('parentId', req.query.parent || null)
    .eager('[products.[items], contributions.[contribution], attributes, children(getAttributes)]', {getAttributes})
    .then(categories => {
      resolveCategories(categories, req.query.locale);
      res.send(categories);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
  }
  else if (req.query.hasOwnProperty('transactions')) {
    Category.query()
    .where('parentId', null)
    .eager('[attributes, children(getTransactions)]', {getTransactions})
    .then(categories => {
      resolveCategoryPrices(categories);
      resolveCategories(categories, req.query.locale);
      res.send(categories);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
  }
  else if (req.query.hasOwnProperty('attributes')) {
    Category.query()
    //.limit(200)
    .eager('[attributes]')
    .then(categories => {
      resolveCategories(categories, req.query.locale);
      res.send(categories);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
  }
  else if ('id' in req.query) {
    Category.query()
    .where('id', req.query.id)
    .eager('[products.[items], contributions.[contribution], attributes.[attribute.[parent.^], sources.[source]], parent.^, children(getAttributes)]', {getAttributes})
    .then(categories => {
      resolveCategories(categories, req.query.locale);
      res.send(categories);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
  }
  else {
    Category.query()
    .then(categories => {
      resolveCategories(categories, req.query.locale);
      res.send(categories);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
  }
});

app.post('/api/category', async function(req, res) {
  let category;
  if (req.body.csv) {
    category = await csvToObject(req.body.csv).catch(error => { console.log(error) });
  }
  else {
    category = req.body;
  }
  console.dir(category, {depth:null});
  Category.query()
    .upsertGraph(category, {
      noDelete: true,
      relate: true
    })
    .then(category => {
      res.send(category);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
});

}