'use strict';

import Category from '../models/Category';
import Attribute from '../models/Attribute';
import request from 'request';
import { getExternalCategoriesFineli } from '../utils/import';

export default app => {

app.get('/api/import/getexternalcategoriesfineli', async function(req, res) {
  try {
    await getExternalCategoriesFineli(req.query.dir);
    res.sendStatus(200);
  } catch (error) {
    console.error('error');
    res.sendStatus(500);
  }
});

app.get('/api/import/getexternalcategoriesfineliresultset', function(req, res) {
  request("https://fineli.fi/fineli/en/elintarvikkeet/resultset.csv", function(error, response, data) {
    request("https://fineli.fi/fineli/fi/elintarvikkeet/resultset.csv", async (error_fi, response_fi, data_fi) => {
      let rows = data.split('\n'),
          rows_fi = data_fi.split('\n'),
          column_titles = rows[0].split(';'),
          column_names = [],
          column_units = [],
          columns,
          columns_fi,
          rows_index_fi = {},
          categories = [],
          id,
          name,
          unit,
          attributes,
          attribute_names = [],
          parts,
          error = false;
  
      for (let r = 1; r < rows_fi.length; r++) {
        columns = rows_fi[r].split(';');
        rows_index_fi[columns[0]] = columns[1];
      }
  
      for (let c = 2; c < column_titles.length; c++) {
        parts = column_titles[c].trim().split('(');
        unit = parts[parts.length-1].substring(0,parts[parts.length-1].length-1);
        name = column_titles[c].substring(0, column_titles[c].length-unit.length-3);
        attribute_names.push({name, unit, group: 'nutrition'});
      }
  
      for (let r = 1; r < rows.length; r++) {
        columns = rows[r].split(';');
        id = columns[0];
        name = columns[1];
        attributes = {};
        error = false;
        if (!name || !rows_index_fi[id]) continue;
        for (let c = 2; c < columns.length; c++) {
          if (!attribute_names[c-2]) {
            error = true;
            break;
          }
          attributes[attribute_names[c-2].name] = parseFloat(columns[c].replace(/\r|</g, '')) || 0;
        }
        if (error) continue;
        categories.push({name, attributes, locales: {'fi-FI': rows_index_fi[id]}});

        if (r % 500 == 0) {
          console.log('ok1', r);
          await Category.query()
          .insertGraph(categories)
          .then(category => {
            console.log('ok2', r);
          });
          categories = [];
        }
      }
      console.log('ok3');
      //console.dir(categories, {depth:null});
      await Category.query()
      .insertGraph(categories)
      .then(category => {
        console.log('ok4');
      });
      await Attribute.query()
      .insertGraph(attribute_names)
      .then(attribute => {
        console.log('ok5');
      });
      console.log('ok6');
      res.send('ok');
      res.end();
    });
  });
});

}