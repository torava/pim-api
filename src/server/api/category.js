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

};
