import { PassThrough } from 'stream';

import Category from '../models/Category';
import { resolveCategories, resolveCategoryPrices } from '../utils/categories';
import { getDiaryExcelFineliBuffer } from '../utils/getDiaryExcelFineli';

export default app => {

app.get('/api/category/all', async (req, res) => {
  try {
    let categories = await Category.query()
    .withGraphFetched('[contributions, attributes]');
    resolveCategories(categories, req.query.locale);
    return res.send(categories);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get('/api/category/:id', async (req, res) => {
  console.log(req.query, req.params);
  try {
    const categories = (
      await Category.query()
      .where('id', req.params.id)
      .withGraphFetched('[contributions, attributes]')
    );
    resolveCategories(categories, req.query.locale);
    return res.send(categories[0]);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

app.get('/api/category', async (req, res) => {
  const {
    pageNumber = 0,
    categoriesPerPage = 20,
    name,
    parent,
    transactions
  } = req.query;
  if ('parent' in req.query) {
    return Category.query()
    .where('parentId', parent || null)
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
  else if (transactions) {
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
  else {
    try {
      let categories = await Category.query();
      if (name?.length) {
        categories = categories.filter(category => (
          Object.values(category.name).find(n => n.toLowerCase().match(name.toLowerCase()))
        ));
      }
      const results = categories.slice(pageNumber*categoriesPerPage, pageNumber*categoriesPerPage+categoriesPerPage);
      categories = {
        results,
        total: results.length
      };
      resolveCategories(categories, req.query.locale);
      return res.send(categories);
    }
    catch (error) {
      console.error(error);
      return res.sendStatus(500);
    }
  }
});

app.post('/api/category/diary', async (req, res) => {
  console.log(req.body, req.files);
  // from https://stackoverflow.com/a/46520271/3136897
  const buffer = req.files.upload.data;
  const updatedBuffer = await getDiaryExcelFineliBuffer(buffer);

  // from https://stackoverflow.com/a/45922316/3136897
  const readStream = new PassThrough();
  readStream.end(updatedBuffer);

  res.set('Content-disposition', `attachment; filename="${req.files.upload.name}_price_ghg.xlsx"`);
  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  readStream.pipe(res);
});

};
