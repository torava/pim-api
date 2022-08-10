import Excel from 'exceljs';
import CategoryShape from '@torava/product-utils/dist/models/Category';
import { Locale } from '@torava/product-utils/dist/utils/types';
import { resolveCategoryAttributes } from '@torava/product-utils/dist/utils/categories';
import AttributeShape from '@torava/product-utils/dist/models/Attribute';
import Knex from 'knex';
import { Model } from 'objection';

import knexConfig from '../../knexfile';
import Category from '../models/Category';
import Attribute from '../models/Attribute';

export const getDiaryExcelFineli = async (
  filename: string,
  categories: CategoryShape[] = [],
  attributes: AttributeShape[] = [],
  locale: Locale = Locale['fi-FI']
) => {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filename);
  const worksheet = workbook.worksheets[0];
  let totalMin = 0,
      totalMax = 0,
      totalMeasure = 0;
  worksheet.eachRow((row) => {
    //const row = worksheet.getRows(40, 1)[0];
    const food = row.getCell(4).value;
    const unit = row.getCell(8).value;
    if (!food) {
      console.log('total', totalMin, totalMax, totalMeasure);
      totalMin = 0;
      totalMax = 0;
      totalMeasure = 0;
    } else {
      const category = categories.find(
        (category) => category.name?.[locale] === food
      );
      if (category) {
        const portionAttribute = attributes.find(
          (attribute) => attribute.code === unit
        );
        const { categoryAttributes, measure } = resolveCategoryAttributes(
          category,
          [1],
          portionAttribute,
          categories,
          attributes,
          0.9
        );
        console.log(
          food,
          categoryAttributes[0]?.value,
          categoryAttributes[0]?.unit,
          categoryAttributes[0]?.type,
          categoryAttributes[1]?.value,
          categoryAttributes[1]?.unit,
          categoryAttributes[1]?.type,
          measure
        );
        totalMin+= categoryAttributes[0]?.value || 0;
        totalMax+= categoryAttributes[1]?.value || categoryAttributes[0]?.value || 0;
        totalMeasure+= measure;
      } else {
        console.log(food, "not found");
      }
    }
  });
};

// Initialize knex.
const knex = Knex(knexConfig.development);

// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex method.
Model.knex(knex);

(async () => {
  const categories = await Category.query()
  .withGraphFetched('[contributions, attributes]')
  const attributes = await Attribute.query();
  getDiaryExcelFineli(process.env.FILENAME, categories, attributes);
})();
