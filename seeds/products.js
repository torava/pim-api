import fs from 'fs';
import { Model } from 'objection';

import { getEntitiesFromCsv } from '../src/utils/import';
import { getProductsFromOpenFoodFactsRecords } from '../src/server/utils/products';

exports.seed = async knex => {
  Model.knex(knex);

  const offCsv = fs.readFileSync(`${__dirname}/openfoodfacts_search.csv`, 'utf8');
  const offRecords = getEntitiesFromCsv(offCsv, {
    delimiter: '\t'
  });

  try {
    await getProductsFromOpenFoodFactsRecords(offRecords);
  } catch (error) {
    console.error('error while adding Open Food Facts items', error);
  }
};
