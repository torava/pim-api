import Category from '../models/Category';
import { resolveCategories, resolveCategoryPrices } from '../../utils/categories';
import { getCategoriesFromCsv, getClosestCategory } from '../utils/categories';

export default app => {
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

};
