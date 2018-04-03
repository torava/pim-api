const Category = require('../models/Category');
const Attribute = require('../models/Attribute');
const Source = require('../models/Source');
const express = require('express');
const app = express();
const fs = require('fs');
const request = require('request');
const moment = require('moment');

module.exports = function (app) {

app.get('/api/export/getexternalcategoriesfineli', async function(req, res) {
  console.log('files '+moment().format());

  let food_rows = fs.readFileSync(__dirname+'/../fineli/food.csv', 'utf8').split('\n'),
      fuclass_rows = fs.readFileSync(__dirname+'/../fineli/fuclass_FI.csv', 'utf8').split('\n'),
      igclass_rows = fs.readFileSync(__dirname+'/../fineli/igclass_FI.csv', 'utf8').split('\n'),
      fuclass_en_rows = fs.readFileSync(__dirname+'/../fineli/fuclass_EN.csv', 'utf8').split('\n'),
      igclass_en_rows = fs.readFileSync(__dirname+'/../fineli/igclass_EN.csv', 'utf8').split('\n'),
      fuclass_sv_rows = fs.readFileSync(__dirname+'/../fineli/fuclass_SV.csv', 'utf8').split('\n'),
      igclass_sv_rows = fs.readFileSync(__dirname+'/../fineli/igclass_SV.csv', 'utf8').split('\n'),
      component_value_rows = fs.readFileSync(__dirname+'/../fineli/component_value.csv', 'utf8').split('\n'),
      component_rows = fs.readFileSync(__dirname+'/../fineli/component.csv', 'utf8').split('\n'),
      cmpclass_rows = fs.readFileSync(__dirname+'/../fineli/cmpclass_FI.csv', 'utf8').split('\n'),
      eufdname_rows = fs.readFileSync(__dirname+'/../fineli/eufdname_FI.csv', 'utf8').split('\n'),
      cmpclass_en_rows = fs.readFileSync(__dirname+'/../fineli/cmpclass_EN.csv', 'utf8').split('\n'),
      eufdname_en_rows = fs.readFileSync(__dirname+'/../fineli/eufdname_EN.csv', 'utf8').split('\n'),
      cmpclass_sv_rows = fs.readFileSync(__dirname+'/../fineli/cmpclass_SV.csv', 'utf8').split('\n'),
      eufdname_sv_rows = fs.readFileSync(__dirname+'/../fineli/eufdname_SV.csv', 'utf8').split('\n'),
      foodname_fi_rows = fs.readFileSync(__dirname+'/../fineli/foodname_FI.csv', 'utf8').split('\n'),
      foodname_en_rows = fs.readFileSync(__dirname+'/../fineli/foodname_EN.csv', 'utf8').split('\n'),
      foodname_sv_rows = fs.readFileSync(__dirname+'/../fineli/foodname_SV.csv', 'utf8').split('\n'),
      parent_ref, parent_name, second_parent_name, second_parent_ref, third_parent_ref,
      attr_ref,
      attr_refs = {},
      parent_attr_refs = {},
      second_parent_attr_refs = {},
      fuclass = {},
      igclass = {},
      component = {},
      cmpclass = {},
      eufdname = {},
      foodname = {},
      attribute_count = 0,
      value,
      attribute,
      food_row,
      row,
      id,
      parent,
      attribute_index = 1,
      refs = {
        '#food': true,
        '#ingredients': true,
        '#recipes': true
      },
      categories = {},
      category_values = [],
      attributes = {},
      attribute_values = [],
      sources,
      source_ref,
      source_refs = {},
      source,
      base_sources = [
        {
          '#id': 'sfineli',
          name: 'Fineli',
          publication_url: 'https://fineli.fi/fineli/en/index',
          publication_date: '2018'
        }
      ],
      base_categories = [
        {
          '#id': 'c4food',
          name: {
            'fi-FI': 'Ruoka',
            'en-US': 'Food',
            'sv-SV': 'Mat'
          }
        },
        {
          '#id': 'c3ingredient',
          name: {
            'fi-FI': 'Raaka-aine',
            'en-US': 'Ingredient',
            'sv-SV': 'Råvara'
          },
          parent: {
            '#ref': 'c4food',
          }
        },
        {
          '#id': 'c3dish',
          name: {
            'fi-FI': 'Ruokalaji',
            'en-US': 'Dish',
            'sv-SV': 'Maträtt'
          },
          parent: {
            '#ref': 'c4food'
          }
        }
      ];

  console.log('meta '+moment().format());

  await Source.query()
    .insertGraph(base_sources)
    .then(result => {
      base_sources = result;
    });

  Category.query()
    .insertGraph(base_categories)
    .then(async base_categories => {
      for (let i in foodname_fi_rows) {
        value = {};
        row = foodname_fi_rows[i].trim().split(';');
        value['fi-FI'] = row[1];
        row = foodname_en_rows[i].trim().split(';');
        value['en-US'] = row[1];
        row = foodname_sv_rows[i].trim().split(';');
        value['sv-SV'] = row[1];
        foodname[row[0]] = value;
      }

      for (let i in fuclass_rows) {
        value = {};
        row = fuclass_rows[i].trim().split(';');
        value['fi-FI'] = row[1];
        row = fuclass_en_rows[i].trim().split(';');
        value['en-US'] = row[1];
        row = fuclass_sv_rows[i].trim().split(';');
        value['sv-SV'] = row[1];
        fuclass[row[0]] = value;
      }

      for (let i in igclass_rows) {
        value = {};
        row = igclass_rows[i].trim().split(';');
        value['fi-FI'] = row[1];
        row = igclass_en_rows[i].trim().split(';');
        value['en-US'] = row[1];
        row = igclass_sv_rows[i].trim().split(';');
        value['sv-SV'] = row[1];
        igclass[row[0]] = value;
      }

      for (let i in component_rows) {
        row = component_rows[i].trim().split(';');
        component[row[0]] = row;
      }

      for (let i in cmpclass_rows) {
        value = {};
        row = cmpclass_rows[i].trim().split(';');
        value['fi-FI'] = row[1];
        row = cmpclass_en_rows[i].trim().split(';');
        value['en-US'] = row[1];
        row = cmpclass_sv_rows[i].trim().split(';');
        value['sv-SV'] = row[1];
        cmpclass[row[0]] = value;
      }

      for (let i in eufdname_rows) {
        value = {};
        row = eufdname_rows[i].trim().split(';');
        value['fi-FI'] = row[1];
        row = eufdname_en_rows[i].trim().split(';');
        value['en-US'] = row[1];
        row = eufdname_sv_rows[i].trim().split(';');
        value['sv-SV'] = row[1];
        eufdname[row[0]] = value;
      }

      console.log('food');

      for (let i = 1; i < food_rows.length; i++) {
        food_row = food_rows[i].trim().split(';');

        if (!food_row[0] || food_row[0] == 'FOODID') {
          continue;
        }

        if (food_row[6] == 'NONINGR') {
          parent_ref = food_row[7];
          parent_name = fuclass[parent_ref];
          second_parent_ref = food_row[8];
          second_parent_name = fuclass[second_parent_ref];
          third_parent_ref = base_categories[2].id; // dish
        }
        else {
          parent_ref = food_row[5];
          parent_name = igclass[parent_ref];
          second_parent_ref = food_row[6];
          second_parent_name = igclass[second_parent_ref];
          third_parent_ref = base_categories[1].id; // ingredient
        }

        if (parent_ref in refs) {
          parent = {
            '#ref': 'c1'+parent_ref
          };
        }
        else {
          refs[parent_ref] = true;
          parent = {
            '#id': 'c1'+parent_ref,
            name: parent_name
          };
          if (second_parent_ref in refs) {
            parent.parent = {
              '#ref': 'c2'+second_parent_ref
            }
          }
          else {
            refs[second_parent_ref] = true;
            parent.parent = {
              '#id': 'c2'+second_parent_ref,
              name: second_parent_name,
              parent: {
                'id': third_parent_ref,
              }
            }
          }
        }
      

        categories[food_row[0]] = {
          name: foodname[food_row[0]],
          //type: food_row[2],
          //process: food_row[3],
          //portion: food_row[4],
          parent
        };
      }

      for (let i in categories) {
        category_values.push(categories[i]);
      }

      await Category.query()
        .upsertGraph(category_values, {relate: true})
        .then(async category => {
          console.log('written '+moment().format());

          let n = 0;
          for (let i in categories) {
            categories[i] = category[n];
            n++;
          }

          for (let n = attribute_index; n < component_value_rows.length; n++) {
            row = component_value_rows[n].split(';');

            if (!row[0] || row[0] == 'FOODID')
              continue;

            id = categories[row[0]].id;

            /*  if (row[0] != food_row[0]) {
              attribute_index = n;
              break;
            }*/

            if (!(row[0] in attributes))
              attributes[row[0]] = {
                id,
                attributes: []
              };

            attr_ref = row[1];

            if (attr_ref in attr_refs) {
              attribute = {
                id: attr_refs[attr_ref]
              }
            }
            else {
              attribute = {
                name: eufdname[attr_ref],
                unit: component[attr_ref][1].toLowerCase()
              }

              parent_ref = component[row[1]][2];

              if (parent_ref in parent_attr_refs) {
                attribute.parent = {
                  id: parent_attr_refs[parent_ref]
                }
              }
              else {
                attribute.parent = {
                  name: cmpclass[parent_ref]
                }

                second_parent_ref = component[row[1]][3];

                if (second_parent_ref in second_parent_attr_refs) {
                  attribute.parent.parent = {
                    id: second_parent_attr_refs[second_parent_ref]
                  }
                }
                else {
                  attribute.parent.parent = {
                    name: cmpclass[second_parent_ref]
                  }
                }
              }

              await Attribute.query()
                .upsertGraph(attribute, {relate: true})
                .then(result => {
                  if (!(attr_ref in attr_refs))
                    attr_refs[attr_ref] = result.id;
                  if (!(parent_ref in parent_attr_refs))
                    parent_attr_refs[parent_ref] = result.parent.id;
                  if (!(second_parent_ref in second_parent_attr_refs))
                    second_parent_attr_refs[second_parent_ref] = result.parent.parent.id;

                  attribute = {id: result.id};
                })
                .catch(error => {
                  console.error(error);
                  throw new Error('Attribute error');
                });
            }

            if (row[2] != "")
            attributes[row[0]].attributes.push({
              attribute,
              value: parseFloat(row[2].replace(',', '.')),
              sources: [
                {
                  reference_url: 'https://fineli.fi/fineli/en/elintarvikkeet/'+id,
                  source: {
                    id: base_sources[0].id
                  }
                }
              ]
            });

            attribute_count++;
          }
      })
      .catch(error => {
        console.error(error);
        throw new Error('Category values error');
      });

      let n = 0;
      for (let i in attributes) {
        attribute_values.push(attributes[i]);

        if (i % 20 == 0 || n == attribute_count-1) {
          await Category.query()
            .upsertGraph(attribute_values, {relate: true})
            .then(category => {
              console.log('done '+i+'/'+attribute_count+' '+moment().format());
            })
            .catch(error => {
              console.dir(attribute_values, {depth: null});
              console.log('error '+i+'/'+attribute_count+' '+moment().format());
              console.error(error);
              throw new Error('CategoryAttribute error');
            });
          attribute_values = [];
        }
        n++;
      }

      res.send(category);
      //attribute_values = attribute_values.slice(0,1);
      //console.dir(attribute_values, {depth:null});
    })
    .catch(error => {
      console.error(error);
      throw new Error('Base category error');
    });
});

app.get('/api/export/getexternalcategoriesfineliresultset', function(req, res) {
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