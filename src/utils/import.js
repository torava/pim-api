import parse from 'csv-parse/lib/sync';
import fs from 'fs';
import moment from 'moment';

import Attribute from '../models/Attribute';
import Category from '../models/Category';
import CategoryAttribute from '../models/CategoryAttribute';
import CategoryAttributeSource from '../models/CategoryAttributeSource';
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
    const encoding = 'utf8';

    console.log('dir', directory);
    console.log('files', moment().format());

    const fullPath = __dirname+'/../../'+directory;

    /* food: 0 = FOODID food id, number
            1 = FOODNAME food name, text
            2 = FOODTYPE food type code, text;
            3 = PROCESS process type code, text
            4 = EDPORT edible portion, percentage
            5 = IGCLASS ingredient class, text
            6 = IGCLASSP ingredient class parent, text
            7 = FUCLASS food use class, text
            8 = FUCLASSP food use class parent, text*/
    const foodRows = fs.readFileSync(fullPath+'/food.csv', encoding).split('\n');
    /* food use class in Finnish */
    const fuclassRows = fs.readFileSync(fullPath+'/fuclass_FI.csv', encoding).split('\n');
    /* ingredient class */
    const igclassRows = fs.readFileSync(fullPath+'/igclass_FI.csv', encoding).split('\n');
    /* in English */
    const fuclassEnRows = fs.readFileSync(fullPath+'/fuclass_EN.csv', encoding).split('\n');
    const igclassEnRows = fs.readFileSync(fullPath+'/igclass_EN.csv', encoding).split('\n');
    /* och samma på svenska */
    const fuclassSvRows = fs.readFileSync(fullPath+'/fuclass_SV.csv', encoding).split('\n');
    const igclassSvRows = fs.readFileSync(fullPath+'/igclass_SV.csv', encoding).split('\n');
    /* component value: 0 = FOODID food id, number
                        1 = EUFDNAME component id, number
                        2 = BESTLOC component value, number
                        3 = ACQTYPE acquisition type code, text
                        4 = METHTYPE method type code, text*/
    const componentValueRows = fs.readFileSync(fullPath+'/component_value.csv', encoding).split('\n');
    /* component: 0 = EUFDNAME component id, text
                  1 = COMPUNIT unit code, text
                  2 = CMPCLASS component group code, text
                  3 = CMPCLASSP component group parent code, text*/
    const componentRows = fs.readFileSync(fullPath+'/component.csv', encoding).split('\n');
    /* component group: THSCODE;DESCRIPT;LANG */
    const cmpclassRows = fs.readFileSync(fullPath+'/cmpclass_FI.csv', encoding).split('\n');
    /* component names */
    const eufdnameRows = fs.readFileSync(fullPath+'/eufdname_FI.csv', encoding).split('\n');
    const cmpclassEnRows = fs.readFileSync(fullPath+'/cmpclass_EN.csv', encoding).split('\n');
    const eufdnameEnRows = fs.readFileSync(fullPath+'/eufdname_EN.csv', encoding).split('\n');
    const cmpclassSvRows = fs.readFileSync(fullPath+'/cmpclass_SV.csv', encoding).split('\n');
    const eufdnameSvRows = fs.readFileSync(fullPath+'/eufdname_SV.csv', encoding).split('\n');
    /* food names */
    const foodnameFiRows = fs.readFileSync(fullPath+'/foodname_FI.csv', encoding).split('\n');
    const foodnameEnRows = fs.readFileSync(fullPath+'/foodname_EN.csv', encoding).split('\n');
    const foodnameSvRows = fs.readFileSync(fullPath+'/foodname_SV.csv', encoding).split('\n');
    /* food units: FOODID;FOODUNIT;MASS */
    const foodaddunitCsv = fs.readFileSync(`${fullPath}/foodaddunit.csv`, encoding);
    const foodaddunitRecords = getEntitiesFromCsv(foodaddunitCsv, {delimiter: ';'});
    /* THSCODE;DESCRIPT;LANG */
    const foodunitEnCsv = fs.readFileSync(`${fullPath}/foodunit_EN.csv`, encoding);
    const foodunitEnRecords = getEntitiesFromCsv(foodunitEnCsv, {delimiter: ';'});
    const foodunitFiCsv = fs.readFileSync(`${fullPath}/foodunit_FI.csv`, encoding);
    const foodunitFiRecords = getEntitiesFromCsv(foodunitFiCsv, {delimiter: ';'});
    const foodunitSvCsv = fs.readFileSync(`${fullPath}/foodunit_SV.csv`, encoding);
    const foodunitSvRecords = getEntitiesFromCsv(foodunitSvCsv, {delimiter: ';'});
    /* recipe foods
        0 = FOODID food id, number
        1 = CONFDID recipe row food id, number
        2 = AMOUNT amount, number
        3 = FOODUNIT unit code, text
        4 = MASS mass, number
        5 = EVREMAIN remained after evaporation, percentage
        6 = RECYEAR recipe year, text*/
    const contribfoodRows = fs.readFileSync(fullPath+'/contribfood.csv', encoding).split('\n');
    let parentRef, parentName, secondParentName, secondParentRef, thirdParentRef,
        attrRef,
        attrRefs = {},
        parentAttrRefs = {},
        secondParentAttrRefs = {},
        fuclass = {},
        igclass = {},
        component = {},
        cmpclass = {},
        eufdname = {},
        foodname = {},
        attributeCount = 0,
        value,
        attribute,
        row,
        id, refId,
        parent,
        attributeIndex = 1,
        refs = {
          '#food': true,
          '#ingredients': true,
          '#recipes': true
        },
        categories = {},
        baseSources = [
          {
            '#id': 'sfineli',
            name: 'Fineli',
            publication_url: 'https://fineli.fi/fineli/en/index',
            publication_date: '2018'
          }
        ],
        baseCategories = [
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
      
    const baseAttributes = [
      {
        code: 'FOODUNITS',
        name: {
          'fi-FI': 'Elintarvikkeiden yksiköt',
          'en-US': 'Food units',
          'sv-SV': 'Livsmedelsenheter'
        }
      }
    ];

    console.log('meta '+moment().format());

    baseSources = await Source.query()
    .insertGraph(baseSources, {allowRefs: true});

    baseCategories = await Category.query()
    .insertGraph(baseCategories, {allowRefs: true});

    const baseAttributesWithId = await Attribute.query().insertGraph(baseAttributes);

    for (const i in foodnameFiRows) {
      value = {};
      row = foodnameFiRows[i].trim().split(';');
      value['fi-FI'] = convertFirstLetterCapital(row[1]);
      row = foodnameEnRows[i].trim().split(';');
      value['en-US'] = convertFirstLetterCapital(row[1]);
      row = foodnameSvRows[i].trim().split(';');
      value['sv-SV'] = convertFirstLetterCapital(row[1]);
      foodname[row[0]] = value;
    }

    for (const i in fuclassRows) {
      value = {};
      row = fuclassRows[i].trim().split(';');
      value['fi-FI'] = convertFirstLetterCapital(row[1]);
      row = fuclassEnRows[i].trim().split(';');
      value['en-US'] = convertFirstLetterCapital(row[1]);
      row = fuclassSvRows[i].trim().split(';');
      value['sv-SV'] = convertFirstLetterCapital(row[1]);
      fuclass[`fuclass-${row[0]}`] = value;
    }

    for (const i in igclassRows) {
      value = {};
      row = igclassRows[i].trim().split(';');
      value['fi-FI'] = convertFirstLetterCapital(row[1]);
      row = igclassEnRows[i].trim().split(';');
      value['en-US'] = convertFirstLetterCapital(row[1]);
      row = igclassSvRows[i].trim().split(';');
      value['sv-SV'] = convertFirstLetterCapital(row[1]);
      igclass[`igclass-${row[0]}`] = value;
    }

    for (const i in componentRows) {
      row = componentRows[i].trim().split(';');
      component[row[0]] = row;
    }

    for (const i in cmpclassRows) {
      value = {};
      row = cmpclassRows[i].trim().split(';');
      value['fi-FI'] = convertFirstLetterCapital(row[1]);
      row = cmpclassEnRows[i].trim().split(';');
      value['en-US'] = convertFirstLetterCapital(row[1]);
      row = cmpclassSvRows[i].trim().split(';');
      value['sv-SV'] = convertFirstLetterCapital(row[1]);
      cmpclass[row[0]] = value;
    }

    for (const i in eufdnameRows) {
      value = {};
      row = eufdnameRows[i].trim().split(';');
      value['fi-FI'] = convertFirstLetterCapital(row[1]);
      row = eufdnameEnRows[i].trim().split(';');
      value['en-US'] = convertFirstLetterCapital(row[1]);
      row = eufdnameSvRows[i].trim().split(';');
      value['sv-SV'] = convertFirstLetterCapital(row[1]);
      eufdname[row[0]] = value;
    }

    console.log('food '+moment().format());

    // go through food
    for await (const foodRow of foodRows) {
      const columns = foodRow.trim().split(';');

      if (!columns[0] || columns[0] == 'FOODID') {
        continue;
      }

      // is a dish
      if (columns[6] == 'NONINGR') {
        parentRef = `fuclass-${columns[7]}`;
        parentName = fuclass[parentRef];
        secondParentRef = `fuclass-${columns[8]}`;
        secondParentName = fuclass[secondParentRef];
        thirdParentRef = baseCategories[2].id; // dish
      }
      // is an ingredient
      else {
        parentRef = `igclass-${columns[5]}`;
        parentName = igclass[parentRef];
        secondParentRef = `igclass-${columns[6]}`;
        secondParentName = igclass[secondParentRef];
        thirdParentRef = baseCategories[1].id; // ingredient
      }

      // if parent exists refer to that
      if (parentRef in refs) {
        parent = {
          '#ref': 'c1'+parentRef
        };
      }
      // else create a new reference
      else {
        refs[parentRef] = true;
        parent = {
          '#id': 'c1'+parentRef,
          name: parentName
        };
        // if grandparent exists refer to that
        if (secondParentRef in refs) {
          parent.parent = {
            '#ref': 'c2'+secondParentRef
          }
        }
        // else create a new reference
        else {
          refs[secondParentRef] = true;
          parent.parent = {
            '#id': 'c2'+secondParentRef,
            name: secondParentName,
            parent: {
              'id': thirdParentRef,
            }
          }
        }
      }
    
      // add to categories
      categories[columns[0]] = {
        name: foodname[columns[0]],
        //type: food_row[2],
        //process: food_row[3],
        //portion: food_row[4],
        parent
      };
    }

    //console.dir(category_values, {depth: null, maxArrayLength: null});

    // add to database
    const category = await Category.query()
    .insertGraph(Object.values(categories), {relate: true, allowRefs: true});
        
    console.log('written '+moment().format());

    // get values from database to object with Fineli id
    for (let i in categories) {
      categories[i] = category.shift();
    }

    // go through contributions
    for await (const contribFoodRow of contribfoodRows) {
      const columns = contribFoodRow.split(';');

      if (!columns[0] || columns[0] == 'FOODID' || !columns[2]) {
        continue;
      }

      id = categories[columns[0]].id;
      refId = categories[columns[1]].id;

      try {
        await CategoryContribution.query()
        .insertGraph({
          category: {id},
          contribution: {id: refId},
          amount: parseFloat(columns[2].replace(',', '.')) || 0,
          unit: columns[3].toLowerCase()
        }, {
          relate: true
        });
      } catch (error) {
        console.error(error);
        throw new Error('CategoryContribution error');
      }
    }

    console.log("contributions "+moment().format());

    // go through attributes
    const splicedComponentValueRows = componentValueRows.splice(attributeIndex);
    for await (const componentValueRow of splicedComponentValueRows) {
      try {
        row = componentValueRow.split(';');

        if (!row[0] || row[0] == 'FOODID')
          continue;

        const categoryId = categories[row[0]].id;

        let attributeId;

        /*  if (row[0] != food_row[0]) {
          attribute_index = n;
          break;
        }*/

        attrRef = row[1];

        // check references
        if (attrRef in attrRefs) {
          attribute = {
            id: attrRefs[attrRef]
          }
        }
        else {
          attribute = {
            code: attrRef,
            name: eufdname[attrRef]
          }

          parentRef = component[row[1]][2];

          // check parent references
          if (parentRef in parentAttrRefs) {
            attribute.parent = {
              id: parentAttrRefs[parentRef]
            }
          }
          else {
            attribute.parent = {
              code: parentRef,
              name: cmpclass[parentRef]
            }

            secondParentRef = component[row[1]][3];

            if (secondParentRef in secondParentAttrRefs) {
              attribute.parent.parent = {
                id: secondParentAttrRefs[secondParentRef]
              }
            }
            else {
              attribute.parent.parent = {
                code: secondParentRef,
                name: cmpclass[secondParentRef]
              }
            }
          }

          // add attribute to database
          const insertedAttribute = await Attribute.query().insertGraph(attribute, {relate: true});
          // set database id as reference
          if (!(attrRef in attrRefs))
            attrRefs[attrRef] = insertedAttribute.id;
          if (!(parentRef in parentAttrRefs))
            parentAttrRefs[parentRef] = insertedAttribute.parent.id;
          if (!(secondParentRef in secondParentAttrRefs))
            secondParentAttrRefs[secondParentRef] = insertedAttribute.parent.parent.id;

          attributeId = insertedAttribute.id;
        }

        // set attribute value and source
        if (row[2] != "") {
          const value = parseFloat(row[2].replace(',', '.'));
          const unit = `${component[attrRef][1].toLowerCase()}/hg`;
          const categoryAttribute = await CategoryAttribute.query().insert({
            categoryId,
            attributeId,
            value,
            unit
          });

          await CategoryAttributeSource.query().insert({
            attributeId: categoryAttribute.id,
            sourceId: baseSources[0].id,
            reference_url: `https://fineli.fi/fineli/en/elintarvikkeet/${row[0]}`
          });
        }

        attributeCount++;
      } catch (error) {
        console.error(error);
        throw new Error('attribute error');
      }
    }

    console.log('attributes', `${attributeCount}/${attributeCount}`, moment().format());
    
    const foodUnits = {};
    for (const index in foodunitEnRecords) {
      const enName = foodunitEnRecords[index];
      const fiName = foodunitFiRecords[index];
      const svName = foodunitSvRecords[index];
      const foodUnit = {
        code: enName.THSCODE,
        name: {
          'en-US': enName.DESCRIPT,
          'fi-FI': fiName.DESCRIPT,
          'sv-SV': svName.DESCRIPT
        },
        parentId: baseAttributesWithId[0].id
      };
      try {
        const foodUnitWithId = await Attribute.query().insertAndFetch(foodUnit);
        foodUnits[enName.THSCODE] = foodUnitWithId;
      } catch (error) {
        console.error(error);
        throw new Error('food unit attribute error');
      }
    }

    for await (const unit of foodaddunitRecords) {
      const sources = [
        {
          reference_url: `https://fineli.fi/fineli/en/elintarvikkeet/${row[0]}`,
          source: {
            id: baseSources[0].id
          }
        }
      ];
      const value = parseFloat(unit.MASS.replace(',', '.'));
      const categoryFoodUnit = {
        categoryId: categories[unit.FOODID].id,
        attributeId: foodUnits[unit.FOODUNIT].id,
        value,
        unit: 'g',
        sources
      };
      try {
        await CategoryAttribute.query().insertGraph(categoryFoodUnit, {relate: true});
      } catch (error) {
        console.error(error);
        throw new Error('food unit category attribute error');
      }
    }

    console.log('food units', moment().format());

    console.log('all food done');

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