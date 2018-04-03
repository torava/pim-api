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
    });
  });
}

function getAttributes(builder) {
  builder.eager('[products.[items], attributes, children(getAttributes)]', {getAttributes});
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
      resolved_attributes[item_attributes[n].attributeId] = item_attributes[n];
    }
    items[i].attributes = resolved_attributes;
    if (items[i].children) {
      resolveCategories(items[i].children, locale);
    }
    items[i].name = items[i].name[locale];
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
    .eager('[products.[items], attributes, children(getAttributes)]', {getAttributes})
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
      if (req.query.locale) {
        for (let i in categories) {
          categories[i].name = categories[i].name[req.query.locale];
        }
      }
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
    .eager('[products.[items], attributes.[attribute.[parent.^], sources.[source]], parent.^, children(getAttributes)]', {getAttributes})
    .then(categories => {
      if (req.query.locale) {
        for (let i in categories) {
          categories[i].name = categories[i].name[req.query.locale];
        }
      }
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
      if (req.query.locale) {
        for (let i in categories) {
          categories[i].name = categories[i].name[req.query.locale];
        }
      }
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