import fs from 'fs';

import { getEntitiesFromCsv } from '../src/server/utils/import';

exports.seed = async knex => {
  const attributesCsv = fs.readFileSync(`${__dirname}/attributes.csv`, 'utf8');
  const attributes = getEntitiesFromCsv(attributesCsv);
  return knex('Attribute').insert(attributes);
};
