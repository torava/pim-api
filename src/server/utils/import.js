import parse from 'csv-parse/lib/sync';
import fs from 'fs';
import moment from 'moment';

import Attribute from '../models/Attribute';
import Category from '../models/Category';
import CategoryAttribute from '../models/CategoryAttribute';
import CategoryContribution from '../models/CategoryContribution';
import Source from '../models/Source';

function convertFirstLetterCapital(text) {
  return text ? text.substring(0,1).toUpperCase()+text.substring(1).toLowerCase() : text;
}

export const getEntitiesFromCsv = (csv, options = {}) => {
  const records = parse(csv, {
    columns: true,
    skipEmptyLines: true,
    ...options
  });
  return records;
};

export const insertFromRecords = async (records, model, recordIdMap = {}) => {
  for (const record of records) {
    const entity = await model.query().insertAndFetch({
      ...record,
      id: undefined
    }).returning('*');
    recordIdMap[record.id] = entity;
  }
  return recordIdMap;
};

export const getExternalCategoriesFineli = async (directory = 'fineli') => {
  try {
    let encoding = 'latin1';

    console.log('dir', directory);
    console.log('files '+moment().format());

    const fullPath = __dirname+'/../../../'+directory;

    /* food: 0 = FOODID food id, number
            1 = FOODNAME food name, text
            2 = FOODTYPE food type code, text;
            3 = PROCESS process type code, text
            4 = EDPORT edible portion, percentage
            5 = IGCLASS ingredient class, text
            6 = IGCLASSP ingredient class parent, text
            7 = FUCLASS food use class, text
            8 = FUCLASSP food use class parent, text*/
    let food_rows = fs.readFileSync(fullPath+'/food.csv', encoding).split('\n'),
    /* food use class in Finnish */
        fuclass_rows = fs.readFileSync(fullPath+'/fuclass_FI.csv', encoding).split('\n'),
    /* ingredient class */
        igclass_rows = fs.readFileSync(fullPath+'/igclass_FI.csv', encoding).split('\n'),
    /* in English */
        fuclass_en_rows = fs.readFileSync(fullPath+'/fuclass_EN.csv', encoding).split('\n'),
        igclass_en_rows = fs.readFileSync(fullPath+'/igclass_EN.csv', encoding).split('\n'),
    /* och samma på svenska */
        fuclass_sv_rows = fs.readFileSync(fullPath+'/fuclass_SV.csv', encoding).split('\n'),
        igclass_sv_rows = fs.readFileSync(fullPath+'/igclass_SV.csv', encoding).split('\n'),
    /* component value: 0 = FOODID food id, number
                        1 = EUFDNAME component id, number
                        2 = BESTLOC component value, number
                        3 = ACQTYPE acquisition type code, text
                        4 = METHTYPE method type code, text*/
        component_value_rows = fs.readFileSync(fullPath+'/component_value.csv', encoding).split('\n'),
    /* component: 0 = EUFDNAME component id, text
                  1 = COMPUNIT unit code, text
                  2 = CMPCLASS component group code, text
                  3 = CMPCLASSP component group parent code, text*/
        component_rows = fs.readFileSync(fullPath+'/component.csv', encoding).split('\n'),
    /* component group */
        cmpclass_rows = fs.readFileSync(fullPath+'/cmpclass_FI.csv', encoding).split('\n'),
    /* component names */
        eufdname_rows = fs.readFileSync(fullPath+'/eufdname_FI.csv', encoding).split('\n'),
        cmpclass_en_rows = fs.readFileSync(fullPath+'/cmpclass_EN.csv', encoding).split('\n'),
        eufdname_en_rows = fs.readFileSync(fullPath+'/eufdname_EN.csv', encoding).split('\n'),
        cmpclass_sv_rows = fs.readFileSync(fullPath+'/cmpclass_SV.csv', encoding).split('\n'),
        eufdname_sv_rows = fs.readFileSync(fullPath+'/eufdname_SV.csv', encoding).split('\n'),
    /* food names */
        foodname_fi_rows = fs.readFileSync(fullPath+'/foodname_FI.csv', encoding).split('\n'),
        foodname_en_rows = fs.readFileSync(fullPath+'/foodname_EN.csv', encoding).split('\n'),
        foodname_sv_rows = fs.readFileSync(fullPath+'/foodname_SV.csv', encoding).split('\n'),
    /* food units: FOODID;FOODUNIT;MASS */
        foodaddunitCsv = fs.readFileSync(`${fullPath}/foodaddunit.csv`, encoding),
        foodaddunitRecords = getEntitiesFromCsv(foodaddunitCsv),
    /* THSCODE;DESCRIPT;LANG */
        foodunitEnCsv = fs.readFileSync(`${fullPath}/foodunit_EN.csv`, encoding),
        foodunitEnRecords = getEntitiesFromCsv(foodunitEnCsv),
        foodunitFiCsv = fs.readFileSync(`${fullPath}/foodunit_FI.csv`, encoding),
        foodunitFiRecords = getEntitiesFromCsv(foodunitFiCsv),
        foodunitSvCsv = fs.readFileSync(`${fullPath}/foodunit_SV.csv`, encoding).split('\n'),
        foodunitSvRecords = getEntitiesFromCsv(foodunitSvCsv),
    /* recipe foods
        0 = FOODID food id, number
        1 = CONFDID recipe row food id, number
        2 = AMOUNT amount, number
        3 = FOODUNIT unit code, text
        4 = MASS mass, number
        5 = EVREMAIN remained after evaporation, percentage
        6 = RECYEAR recipe year, text*/
        contribfood_rows = fs.readFileSync(fullPath+'/contribfood.csv', encoding).split('\n'),
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
        row, n,
        id, ref_id,
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
        contribution_values = [],
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

    base_sources = await Source.query()
    .insertGraph(base_sources, {allowRefs: true});

    base_categories = await Category.query()
    .insertGraph(base_categories, {allowRefs: true});

    for (let i in foodname_fi_rows) {
      value = {};
      row = foodname_fi_rows[i].trim().split(';');
      value['fi-FI'] = convertFirstLetterCapital(row[1]);
      row = foodname_en_rows[i].trim().split(';');
      value['en-US'] = convertFirstLetterCapital(row[1]);
      row = foodname_sv_rows[i].trim().split(';');
      value['sv-SV'] = convertFirstLetterCapital(row[1]);
      foodname[row[0]] = value;
    }

    for (let i in fuclass_rows) {
      value = {};
      row = fuclass_rows[i].trim().split(';');
      value['fi-FI'] = convertFirstLetterCapital(row[1]);
      row = fuclass_en_rows[i].trim().split(';');
      value['en-US'] = convertFirstLetterCapital(row[1]);
      row = fuclass_sv_rows[i].trim().split(';');
      value['sv-SV'] = convertFirstLetterCapital(row[1]);
      fuclass[`fuclass-${row[0]}`] = value;
    }

    for (let i in igclass_rows) {
      value = {};
      row = igclass_rows[i].trim().split(';');
      value['fi-FI'] = convertFirstLetterCapital(row[1]);
      row = igclass_en_rows[i].trim().split(';');
      value['en-US'] = convertFirstLetterCapital(row[1]);
      row = igclass_sv_rows[i].trim().split(';');
      value['sv-SV'] = convertFirstLetterCapital(row[1]);
      igclass[`igclass-${row[0]}`] = value;
    }

    for (let i in component_rows) {
      row = component_rows[i].trim().split(';');
      component[row[0]] = row;
    }

    for (let i in cmpclass_rows) {
      value = {};
      row = cmpclass_rows[i].trim().split(';');
      value['fi-FI'] = convertFirstLetterCapital(row[1]);
      row = cmpclass_en_rows[i].trim().split(';');
      value['en-US'] = convertFirstLetterCapital(row[1]);
      row = cmpclass_sv_rows[i].trim().split(';');
      value['sv-SV'] = convertFirstLetterCapital(row[1]);
      cmpclass[row[0]] = value;
    }

    for (let i in eufdname_rows) {
      value = {};
      row = eufdname_rows[i].trim().split(';');
      value['fi-FI'] = convertFirstLetterCapital(row[1]);
      row = eufdname_en_rows[i].trim().split(';');
      value['en-US'] = convertFirstLetterCapital(row[1]);
      row = eufdname_sv_rows[i].trim().split(';');
      value['sv-SV'] = convertFirstLetterCapital(row[1]);
      eufdname[row[0]] = value;
    }

    console.log('food '+moment().format());

    // go through food
    for (let i = 1; i < food_rows.length; i++) {
      food_row = food_rows[i].trim().split(';');

      if (!food_row[0] || food_row[0] == 'FOODID') {
        continue;
      }

      // is a dish
      if (food_row[6] == 'NONINGR') {
        parent_ref = `fuclass-${food_row[7]}`;
        parent_name = fuclass[parent_ref];
        second_parent_ref = `fuclass-${food_row[8]}`;
        second_parent_name = fuclass[second_parent_ref];
        third_parent_ref = base_categories[2].id; // dish
      }
      // is an ingredient
      else {
        parent_ref = `igclass-${food_row[5]}`;
        parent_name = igclass[parent_ref];
        second_parent_ref = `igclass-${food_row[6]}`;
        second_parent_name = igclass[second_parent_ref];
        third_parent_ref = base_categories[1].id; // ingredient
      }

      // if parent exists refer to that
      if (parent_ref in refs) {
        parent = {
          '#ref': 'c1'+parent_ref
        };
      }
      // else create a new reference
      else {
        refs[parent_ref] = true;
        parent = {
          '#id': 'c1'+parent_ref,
          name: parent_name
        };
        // if grandparent exists refer to that
        if (second_parent_ref in refs) {
          parent.parent = {
            '#ref': 'c2'+second_parent_ref
          }
        }
        // else create a new reference
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
    
      // add to categories
      categories[food_row[0]] = {
        name: foodname[food_row[0]],
        //type: food_row[2],
        //process: food_row[3],
        //portion: food_row[4],
        parent
      };
    }

    // create an array from categories
    for (let i in categories) {
      category_values.push(categories[i]);
    }

    //console.dir(category_values, {depth: null, maxArrayLength: null});

    // add to database
    const category = await Category.query()
    .upsertGraph(category_values, {relate: true, allowRefs: true});
        
    console.log('written '+moment().format());

    // get values from database to object with Fineli id
    for (let i in categories) {
      categories[i] = category.shift();
    }

    // go through contributions
    for (let i in contribfood_rows) {
      row = contribfood_rows[i].split(';');

      if (!row[0] || row[0] == 'FOODID' || !row[2]) {
        continue;
      }

      id = categories[row[0]].id;
      ref_id = categories[row[1]].id;

      await CategoryContribution.query()
        .insert({
          categoryId: id,
          contributionId: ref_id,
          amount: parseFloat(row[2].replace(',', '.')),
          unit: row[3].toLowerCase()
        })
        .catch(error => {
          console.error(error);
          throw new Error('CategoryAttribute error');
        });
    }

    console.log("contributions "+moment().format());

    // go through attributes
    for (let n = attribute_index; n < component_value_rows.length; n++) {
      row = component_value_rows[n].split(';');

      if (!row[0] || row[0] == 'FOODID')
        continue;

      id = categories[row[0]].id;

      /*  if (row[0] != food_row[0]) {
        attribute_index = n;
        break;
      }*/

      // add new attribute
      if (!(row[0] in attributes))
        attributes[row[0]] = {
          id,
          attributes: []
        };

      attr_ref = row[1];

      // check references
      if (attr_ref in attr_refs) {
        attribute = {
          id: attr_refs[attr_ref]
        }
      }
      else {
        attribute = {
          name: eufdname[attr_ref]
        }

        parent_ref = component[row[1]][2];

        // check parent references
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

        // add attribute to database
        await Attribute.query()
          .upsertGraph(attribute, {relate: true})
          .then(result => {
            // set database id as reference
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

      // set attribute value and source
      if (row[2] != "") {
        const value = parseFloat(row[2].replace(',', '.'));
        const unit = `${component[attr_ref][1].toLowerCase()}/hg`;
        const sources = [
          {
            reference_url: `https://fineli.fi/fineli/en/elintarvikkeet/${row[0]}`,
            source: {
              id: base_sources[0].id
            }
          }
        ];
        attributes[row[0]].attributes.push({
          attribute,
          value,
          unit,
          sources
        });
      }

      attribute_count++;
    }

    // put attributes to array
    for (let i in attributes) {
      attribute_values.push(attributes[i]);

      await Category.query()
      .upsertGraph(attributes[i], {relate: true});

      attribute_values = [];
    }
    
    console.log('attributes '+attribute_count+'/'+attribute_count+' '+moment().format());

    const foodUnits = {};
    for (const [enName, index] of foodunitEnRecords) {
      const fiName = foodunitFiRecords[index];
      const svName = foodunitSvRecords[index];
      const foodUnit = {
        name: {
          'en-US': enName.DESCRIPT,
          'fi-FI': fiName.DESCRIPT,
          'sv-SV': svName.DESCRIPT
        }
      };
      const foodUnitWithId = await Attribute.query().insertAndFetch(Object.values(foodUnit));
      foodUnits[enName.THSCODE] = foodUnitWithId;
    }

    for (const unit of foodaddunitRecords) {
      const sources = [
        {
          reference_url: `https://fineli.fi/fineli/en/elintarvikkeet/${row[0]}`,
          source: {
            id: base_sources[0].id
          }
        }
      ];
      const categoryFoodUnit = {
        categoryId: categories[unit.FOODID].id,
        attributeId: foodUnits[unit.FOODUNIT].id,
        value: unit.MASS,
        unit: 'g',
        sources
      };
      await CategoryAttribute.query().insertGraph(categoryFoodUnit);
    }

    console.log('food units', moment().format());

    console.log('all done');

    /* macbook benchmark in 20 chunks

    files 2018-06-12T02:19:05+03:00
    meta 2018-06-12T02:19:05+03:00
    food 2018-06-12T02:19:05+03:00
    written 2018-06-12T02:19:10+03:00
    contributions 2018-06-12T02:19:21+03:00
    done 20/295043 2018-06-12T02:19:24+03:00
    done 40/295043 2018-06-12T02:19:26+03:00
    done 100/295043 2018-06-12T02:19:28+03:00
    done 120/295043 2018-06-12T02:19:29+03:00
    done 160/295043 2018-06-12T02:19:31+03:00
    ...
    done 34680/295043 2018-06-12T02:28:03+03:00
    done 34700/295043 2018-06-12T02:28:05+03:00
    done 34960/295043 2018-06-12T02:28:18+03:00
    done 34980/295043 2018-06-12T02:28:21+03:00
    done 35000/295043 2018-06-12T02:28:23+03:00

    1 chunk

    files 2018-06-28T02:59:14+03:00
    meta 2018-06-28T02:59:14+03:00
    food 2018-06-28T02:59:14+03:00
    written 2018-06-28T02:59:19+03:00
    contributions 2018-06-28T02:59:30+03:00
    all done 295043/295043 2018-06-28T03:05:28+03:00

    */
    
    //attribute_values = attribute_values.slice(0,1);
    //console.dir(attribute_values, {depth:null});
  } catch (error) {
    console.error(error);
  }
}