import Excel from 'exceljs';
import CategoryShape from '@torava/product-utils/dist/models/Category';
import { Locale } from '@torava/product-utils/dist/utils/types';
import { getCategoryMinMaxAttributes, getCategoryMinMaxAttributesWithMeasure, getCategoryWithAttributes, resolveCategoryAttributes } from '@torava/product-utils/dist/utils/categories';
import Knex from 'knex';
import { Model } from 'objection';

import knexConfig from '../../knexfile';
import Category from '../models/Category';
import Attribute from '../models/Attribute';
import AttributeShape from '@torava/product-utils/dist/models/Attribute';

export const getDiaryExcelFineli = async (filename: string, categories: CategoryShape[] = [], attributes: AttributeShape[] = [], locale: Locale = Locale['fi-FI']) => {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filename);
  const worksheet = workbook.worksheets[0];
  worksheet.eachRow(row => {
    const food = row.getCell(4).value;
    const unit = row.getCell(8).value;
    const mass = row.getCell(9).value;
    const category = categories.find(category => category.name?.[locale] === food);
    if (category) {
      const portionAttribute = attributes.find(attribute => attribute.code === unit);
      const { categoryAttributes } = resolveCategoryAttributes(category, [1], portionAttribute, categories, attributes);
      console.log(
        food,
        categoryAttributes[0]?.value, categoryAttributes[0]?.unit, categoryAttributes[0]?.type,
        categoryAttributes[1]?.value, categoryAttributes[1]?.unit, categoryAttributes[1]?.type);
    } else {
      console.log(food, 'not found');
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
