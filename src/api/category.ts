import { PassThrough } from 'stream';
import express from 'express';
import bodyParser from 'body-parser';
import fileUpload from 'express-fileupload';

import Category from '../models/Category';
import { getDiaryExcelFineliBuffer } from '../utils/getDiaryExcelFineli';
import { resolveCategories, resolveCategoryPrices } from '../utils/categories';
import { Locale } from '../utils/types';

export default (app: express.Application) => {

app.get('/api/category/all', async (req, res) => {
  try {
    let categories = await Category.query()
    .withGraphFetched('[contributions, attributes]');
    resolveCategories(categories, req.query.locale as Locale);
    return res.send(categories);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post(
  "/api/category/diary",
  bodyParser.raw({
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    limit: '50mb'
  }),
  async (req, res) => {
    // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/40915#issuecomment-563917863
    if (Array.isArray(req.files.upload)) {
      throw new Error('Please upload only one file');
    }
    
    const updatedBuffer = await getDiaryExcelFineliBuffer(req.files.upload.data as unknown as ArrayBuffer, req.query.locale as Locale);

    // from https://stackoverflow.com/a/45922316/3136897
    const readStream = new PassThrough();
    readStream.end(updatedBuffer);

    res.set(
      "Content-disposition",
      `attachment; filename="${req.files.upload.name}_price_ghg.xlsx"`
    );
    res.set(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    readStream.pipe(res);
  }
);

app.get('/api/category/:id', async (req, res) => {
  console.log(req.query, req.params);
  try {
    const categories = (
      await Category.query()
      .where('id', req.params.id)
      .withGraphFetched('[contributions, attributes]')
    );
    resolveCategories(categories, req.query.locale as Locale);
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
    .where('parentId', Number(parent) || null)
    .modify('getAttributes')
    .withGraphFetched('[products.[items], contributions.[contribution], attributes, children(getAttributes)]')
    .then(categories => {
      resolveCategories(categories, req.query.locale as Locale);
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
      resolveCategories(categories, req.query.locale as Locale);
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
          Object.values(category.name).find(n => n.toLowerCase().match(String(name).toLowerCase()))
        ));
      }
      resolveCategories(categories, req.query.locale as Locale);
      const results = categories.slice(
        Number(pageNumber) * Number(categoriesPerPage),
        Number(pageNumber) * Number(categoriesPerPage) + Number(categoriesPerPage)
      );
      return res.send({
        results,
        total: results.length
      });
    }
    catch (error) {
      console.error(error);
      return res.sendStatus(500);
    }
  }
});

};
