import fs from 'fs';
import { Model } from 'objection';

import { getEntitiesFromCsv } from '../src/utils/import';
import { getItemsFromCsv } from '../src/server/utils/items';

exports.seed = async knex => {
  Model.knex(knex);

  const productsCsv = fs.readFileSync(`${__dirname}/products.csv`, 'utf8');
  const products = getEntitiesFromCsv(productsCsv);
  
  const transactionsCsv = fs.readFileSync(`${__dirname}/transactions.csv`, 'utf8');
  const transactions = getEntitiesFromCsv(transactionsCsv);

  const partiesCsv = fs.readFileSync(`${__dirname}/parties.csv`, 'utf8');
  const parties = getEntitiesFromCsv(partiesCsv);

  const itemsCsv = fs.readFileSync(`${__dirname}/items.csv`, 'utf8');
  const items = getEntitiesFromCsv(itemsCsv);

  const sourcesCsv = fs.readFileSync(`${__dirname}/sources.csv`, 'utf8');
  const sources = getEntitiesFromCsv(sourcesCsv);

  try {
    await getItemsFromCsv(items, products, parties, transactions, sources);
  } catch (error) {
    console.error('error while adding CSV items', error);
  }
};
