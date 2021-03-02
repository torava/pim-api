const { Model } = require("objection");
const { default: Category } = require("../src/server/models/Category");
const { getCategoriesFromCsv } = require("../src/server/utils/categories");
const { getExternalCategoriesFineli } = require("../src/server/utils/import");

exports.seed = async knex => {
  Model.knex(knex);
  try {
    await getExternalCategoriesFineli('seeds/Fineli_Rel20__74_ravintotekij__');

    const category = await getCategoriesFromCsv('categories_en.csv', 1);
    await Category.query()
    .upsertGraph(category, {
      noDelete: true,
      relate: true,
      allowRefs: true
    });
  } catch (error) {
    console.error(error);
  }
};
