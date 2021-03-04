import fs from 'fs';
import Source from '../src/server/models/Source';
const { Model } = require("objection");
const { default: Category } = require("../src/server/models/Category");
const { getCategoriesFromCsv, getCategoryParentsFromCsv } = require("../src/server/utils/categories");
const { getExternalCategoriesFineli, getEntitiesFromCsv } = require("../src/server/utils/import");

exports.seed = async knex => {
  Model.knex(knex);
  try {
    await getExternalCategoriesFineli('seeds/Fineli_Rel20__74_ravintotekij__');
  } catch (error) {
    console.error('error while adding Fineli categories', error);
  }

  try {
    const sourcesCsv = fs.readFileSync(`${__dirname}/sources.csv`, 'utf8');
    const sources = getEntitiesFromCsv(sourcesCsv);
    await Source.query().insert(sources);
  } catch (error) {
    console.error('error while adding sources', error);
  }

  let categoryCsv;
  try {
    categoryCsv = fs.readFileSync(`${__dirname}/categories_en.csv`, 'utf8');
    const category = await getCategoriesFromCsv(categoryCsv, 1);
    await Category.query()
    .upsertGraph(category, {
      noDelete: true,
      relate: true,
      allowRefs: true
    });
  } catch (error) {
    console.error('error while adding CSV categories', error);
  }
  try {
    const categoryParents = await getCategoryParentsFromCsv(categoryCsv, 1);
    await Category.query()
    .upsertGraph(categoryParents, {
      noDelete: true,
      relate: true,
      allowRefs: true
    });
  } catch (error) {
    console.error('error while adding CSV category parents', error);
  }
};
