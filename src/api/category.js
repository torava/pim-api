const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Attribute = require('../models/Attribute');
const Manufacturer = require('../models/Manufacturer');
const Source = require('../models/Source');
const Item = require('../models/Item');
const multer = require('multer');
const express = require('express');
const app = express();
const im = require('imagemagick');
const fs = require('fs');
const request = require('request');
const child_process = require('child_process');
const _ = require('lodash');
const moment = require('moment');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const sizeOf = require('image-size');

module.exports = function (app) {

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
      for (let n in columns) {
        column_name = column_names[n];
        attribute = column_name.match(/^attribute\:(.*)(\s\((.*)\))/i) ||
                    column_name.match(/^attribute\:(.*)/i);
        if (attribute) {
          found = false;
          for (let m in attributes) {
            if (attribute[1] in attributes[m].name) {
              attribute_object = {
                id: attributes[m].id
              }
              found = true;
              break;
            }
          }
          if (!found) {
            ref = 'attribute:'+attribute[1];
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
                  '#ref': ref
                });
              }
              else {
                refs[ref] = true,
                item.attributes[m].sources.push({
                  '#id': ref,
                  source : {
                    name: source,
                    year
                  }
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

function getClosestCategory(toCompare, locale) {
  return new Promise(resolve => {
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

function getAttributes(builder) {
  builder.eager('[products.[items], contributions.[contribution], attributes, children(getAttributes)]', {getAttributes});
}

function resolveCategories(items, locale) {
  if (!locale) return;
  let item_attributes,
      resolved_attributes,
      index;
  for (let i in items) {
    resolved_attributes = {};
    item_attributes = items[i].attributes;
    for (let n in item_attributes) {
      if (!item_attributes[n].attribute) continue;
      item_attributes[n].attribute.name = item_attributes[n].attribute.name[locale];
      resolved_attributes[item_attributes[n].attributeId] = item_attributes[n];

      let parent = item_attributes[n].attribute.parent;
      while (parent) {
        if (parent.name && parent.name.hasOwnProperty(locale)) {
          parent.name = parent.name[locale];
        }
        parent = parent.parent;
      }
    }
    items[i].attributes = resolved_attributes;
    if (items[i].children) {
      resolveCategories(items[i].children, locale);
    }
    items[i].name = items[i].name[locale];

    let parent = items[i].parent;
    while (parent) {
      parent.name = parent.name[locale];
      parent = parent.parent;
    }
  }
}

app.get('/api/category', function(req, res) {
  /*if (req.query.nested) {
    res.send(getCategories(req.query.parent || -1));
  }
  else */
  if (req.query.match) {
    res.send(getClosestCategory(req.query.match).id.toString());
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
  else if (req.query.hasOwnProperty('attributes')) {
    Category.query()
    .limit(200)
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
  res.send(category);
  return;
  Category.query()
    .upsertGraph(category)
    .then(category => {
      res.send(category);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
});

}