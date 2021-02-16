import Category from '../models/Category';
import Attribute from '../models/Attribute';
import _ from 'lodash';
import { getCategoriesFromCsv } from '../utils/categories';

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

app.post('/api/category', async function(req, res) {
  let category;
  if (req.body.csv) {
    category = await getCategoriesFromCsv(req.body.csv).catch(error => { console.log(error) });
  }
  else {
    category = req.body;
  }
  //console.log(JSON.stringify(category, null, 2));
  return Category.query()
    .upsertGraph(category, {
      noDelete: true,
      relate: true,
      allowRefs: true
    })
    .then(category => {
      return res.send(category);
    })
    .catch(error => {
      console.error(error);
      return res.sendStatus(500);
    });
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

}