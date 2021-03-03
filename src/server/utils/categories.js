import parse from 'csv-parse/lib/sync';
import _ from 'lodash';

import Attribute from '../models/Attribute';
import Category from '../models/Category';

export const getCategoriesFromCsv = async (csv, sourceIdOffset = 0) => {
  try {
    let items = [],
        item,
        found,
        attribute,
        note,
        attributes = await Attribute.query(),
        categories = await Category.query(),
        attributeObject,
        value,
        ref,
        refs = {};

    const records = parse(csv, {
      columns: true,
      skipEmptyLines: true
    });

    records.forEach(columns => {
      item = {};
      note = '';
      Object.entries(columns).forEach(([columnName, column]) => {
        attribute = columnName.match(/^attribute:(.*)(\s\((.*)\))/i) ||
                    columnName.match(/^attribute:(.*)/i);
        let nameMatch = columnName.match(/^(name|nimi)\["([a-z-]+)"\]$/i),
            name,
            locale;
        if (nameMatch) {
          name = nameMatch[1];
          locale = nameMatch[2];
        }
        if (attribute) {
          if (column !== "") {
            found = false;
            for (let m in attributes) {
              if (Object.values(attributes[m].name).includes(attribute[1])) {
                attributeObject = {
                  id: attributes[m].id
                }
                found = true;
                break;
              }
            }
            if (!found) {
              ref = 'attribute:'+attribute[1];
              if (ref in refs) {
                attributeObject = {
                  '#ref': ref
                }
              }
              else {
                refs[ref] = true;
                attributeObject = {
                  '#id': ref,
                  name: {
                    'fi-FI': attribute[1],
                    'en-US': attribute[1]
                  }
                }
              }
            }
            value = parseFloat(column.replace(',', '.'));
            Object.assign(item, {
              attributes: [
                {
                  attribute: attributeObject,
                  value,
                  unit: attribute[3]
                }
              ]
            });
          }
        }
        else if (columnName.toLowerCase() === 'note') {
          if (column !== '') {
            note = column;
          }
        }
        else if (columnName.toLowerCase() === 'sourceid') {
          if (column === '') return true;
          for (let m in item.attributes) {
            if (!item.attributes[m].sources) {
              item.attributes[m].sources = [];
            }
            item.attributes[m].sources.push({
              source: {
                id: parseInt(column)+sourceIdOffset,
              },
              note
            });
          }
        }
        else if (name && locale) {
          if (column === '') return true;
          if (!item.id) {
            for (let i in categories) {
              if (categories[i].name?.[locale] && categories[i].name[locale].toLowerCase().trim() === column?.toLowerCase().trim()) {
                item.id = categories[i].id;
                delete item['#ref'];
                delete item['#id'];
                delete item.name;
                break;
              }
            }
            if (!item.id) {
              ref = `category:${column}`;
              if (ref in refs && !item['#id'] && !item['#ref']) {
                item['#ref'] = ref;
              }
              else {
                if (!item['#id'] && !item['#ref']) {
                  refs[ref] = true;
                  item['#id'] = ref;
                }
                if (!item.name) item.name = {};
                item.name[locale] = column;
              }
            }
          }
        }
        else if (['isä', 'parent'].indexOf(columnName.toLowerCase()) !== -1) {
          if (column === '') return true;
          for (let i in categories) {
            if (categories[i].name && Object.values(categories[i].name).some(category => category.toLowerCase().trim() === column.toLowerCase().trim())) {
              item.parent = {
                id: categories[i].id
              }
              break;
            }
          }
          if (!item.parent) {
            item.parent = {};
            ref = `category:${column}`;
            item.parent['#ref'] = ref;
          }      
        }
        else if (columnName.toLowerCase() === 'aliases' && column !== '') {
          if (column === '') return true;
          try {
            const aliases = JSON.parse(column);
            if (aliases) {
              _.set(item, columnName, aliases);
            }
          } catch (error) {
            console.log('Aliases parse error', column, error);
          }
        }
        else if (columnName !== '' && column !== '') {
          _.set(item, columnName, column);
        }
      });
      items.push(item);
    });
    console.log(`read ${records.length} records and found ${items.length} items from ${csv}`);
    //console.dir(items, {depth: null, maxArrayLength: null});
    return items;
  } catch (error) {
    console.error(error);
  }
};

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

export async function getClosestCategory(toCompare, locale) {
  let entity_name = toCompare;
  meta_manager.findEntities(
    toCompare,
    'fi'
  )
  .then(meta_entities => {
    meta_entities.map(meta_entity => {
      entity_name = entity_name.replace(new RegExp(escapeRegExp(meta_entity.sourceText)+",?\s?"), "")
                               .replace(/^,?\s*/, "")
                               .replace(/,?(\sja)?\s*$/, "");
    });
    manager.findEntities(
      entity_name,
      'fi',
    ).then(entities => {
      console.log(meta_entities);
      console.log(entities);
    });
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
      resolve(response);
    })
    .catch(reject);
  });
}
