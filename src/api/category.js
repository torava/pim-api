import _ from 'lodash';
import parse from 'csv-parse/lib/sync';

import Category from '../models/Category';
import Attribute from '../models/Attribute';
import { getTranslation } from '../utils/entities';

const getCategoriesFromCsv = async (csv, sourceIdOffset = 0) => {
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
          if (1 || column === '') return true;
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
    //console.dir(items, {depth: null, maxArrayLength: null});
    return items;
  } catch (error) {
    console.error(error);
  }
};

export default app => {
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
        item_attributes[n].attribute.name = getTranslation(item_attributes[n].attribute.name, locale);

        let parent = item_attributes[n].attribute.parent;
        while (parent) {
          parent.name = getTranslation(parent.name, locale);
          parent = parent.parent;
        }
      }
      resolved_attributes[item_attributes[n].attributeId] = item_attributes[n];
    }
    item.attributes = resolved_attributes;
    if (item.children) {
      resolveCategories(item.children, locale);
    }
    item.name = getTranslation(item.name, locale);

    let parent = item.parent;
    while (parent) {
      parent.name = getTranslation(parent.name, locale);
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
      return res.send(category ? category.id.toString() : "");
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
    return Category.query()
    .where('parentId', req.query.parent || null)
    .modify('getAttributes')
    .withGraphFetched('[products.[items], contributions.[contribution], attributes, children(getAttributes)]')
    .then(categories => {
      resolveCategories(categories, req.query.locale);
      return res.send(categories);
    })
    .catch(error => {
      console.error(error);
      return res.sendStatus(500);
    });
  }
  else if (req.query.hasOwnProperty('transactions')) {
    return Category.query()
    .where('parentId', null)
    .modify('getTransactions')
    .withGraphFetched('[attributes, children(getTransactions)]')
    .then(categories => {
      resolveCategoryPrices(categories);
      resolveCategories(categories, req.query.locale);
      return res.send(categories);
    })
    .catch(error => {
      console.error(error);
      return res.sendStatus(500);
    });
  }
  else if (req.query.hasOwnProperty('attributes')) {
    return Category.query()
    //.limit(200)
    .withGraphFetched('[attributes]')
    .then(categories => {
      resolveCategories(categories, req.query.locale);
      return res.send(categories);
    })
    .catch(error => {
      console.error(error);
      return res.sendStatus(500);
    });
  }
  else if ('id' in req.query) {
    return Category.query()
    .where('id', req.query.id)
    .modify('getAttributes')
    .withGraphFetched('[products.[items], contributions.[contribution], attributes.[attribute.[parent.^], sources.[source]], parent.^, children(getAttributes)]')
    .then(categories => {
      resolveCategories(categories, req.query.locale);
      return res.send(categories);
    })
    .catch(error => {
      console.error(error);
      return res.sendStatus(500);
    });
  }
  else {
    return Category.query()
    .then(categories => {
      resolveCategories(categories, req.query.locale);
      return res.send(categories);
    })
    .catch(error => {
      console.error(error);
      return res.sendStatus(500);
    });
  }
});

app.post('/api/category', async (req, res) => {
  try {
    let category;
    if (req.body.csv) {
      category = await getCategoriesFromCsv(req.body.csv, parseInt(req.query.sourceIdOffset));
    }
    else {
      category = req.body;
    }
    const upsertedCategories = await Category.query()
    .upsertGraph(category, {
      noDelete: true,
      relate: true,
      allowRefs: true
    });
    return res.send(upsertedCategories);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

app.post('/api/category/attribute/copy', (req, res) => {
  let selected_categories = req.body.categories,
      selected_attributes = req.body.attributes,
      copyable_attributes = {},
      updateable_categories = {};
  return Category.query()
  .findByIds(selected_categories)
  .eager('[attributes.sources]')
  .then(categories => {
    categories.forEach(c => {
      c.attributes.forEach(a => {
        if (selected_attributes.indexOf(String(a.attributeId)) !== -1 && (!copyable_attributes.hasOwnProperty(a.attributeId) || copyable_attributes[a.attributeId].sources.reference_date < a.sources.reference_date)) {
          copyable_attributes[a.attributeId] = {
            value: a.value,
            unit: a.unit,
            attributeId: a.attributeId,
            sources: a.sources
          };
          categories.forEach(uc => {
            if (uc.id != c.id) {
              if (updateable_categories.hasOwnProperty(uc.id)) {
                updateable_categories[uc.id].attributes = updateable_categories[uc.id].attributes.filter(ua => ua.attributeId !== a.attributeId);
              }
              else {
                updateable_categories[uc.id] = {
                  id: uc.id,
                  attributes: []
                };
              }
              updateable_categories[uc.id].attributes.push(copyable_attributes[a.attributeId]);
            }
          });
        }
      });
    });
    console.log('body', req.body);
    console.log('categories');
    console.dir(categories, {depth:null});
    console.log('copyable attributes');
    console.dir(copyable_attributes, {depth:null});
    console.log('updateable categories');
    console.dir(updateable_categories, {depth:null});
    return Category.query()
    .upsertGraph(Object.values(updateable_categories), {
      relate: true,
      noDelete: true
    })
    .then(result => {
      console.log(result);
      return res.send();
    })
  })
  .catch(error => {
    console.error(error);
    return res.sendStatus(500);
  });
});

app.delete('/api/category/:id', async (req, res) => {
  try {
    await Category.query().deleteById(req.params.id);
    return res.send();
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

}