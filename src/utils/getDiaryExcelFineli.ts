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
import { min } from 'lodash';

export const getDiaryExcelFineli = async (
  filename: string,
  categories: CategoryShape[] = [],
  attributes: AttributeShape[] = [],
  locale: Locale = Locale['fi-FI']
) => {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filename);
  const worksheet = workbook.worksheets[0];
  let totalMealMin = 0,
      totalMealMax = 0,
      totalDayMin = 0,
      totalDayMax = 0,
      totalMealMeasure = 0,
      totalDayMeasure = 0;
  const headerRow = worksheet.getRow(1);
  headerRow.getCell(65).value = 'Min. GHG (kgCO₂e)';
  headerRow.getCell(66).value = 'Max. GHG (kgCO₂e)';
  headerRow.getCell(67).value = 'Min. GHG/weight (kgCO₂e/kg)';
  headerRow.getCell(68).value = 'Max. GHG/weight (kgCO₂e/kg)';
  worksheet.eachRow((row) => {
    //const row = worksheet.getRows(40, 1)[0];
    const food = row.getCell(4).value;
    const unit = row.getCell(8).value;
    const minGhgCell = row.getCell(65);
    const maxGhgCell = row.getCell(66);
    const minGhgPerMeasureCell = row.getCell(67);
    const maxGhgPerMeasureCell = row.getCell(68);
    if (!food) {
      if (!totalMealMin) {
        console.log('total day', totalDayMin, totalDayMax, totalDayMeasure);
        minGhgCell.value = totalDayMin;
        maxGhgCell.value = totalDayMax || totalDayMin;
        minGhgPerMeasureCell.value = totalDayMin/totalDayMeasure;
        maxGhgPerMeasureCell.value = (totalDayMax || totalDayMin)/totalDayMeasure;
        totalDayMin = 0;
        totalDayMax = 0;
        totalDayMeasure = 0;
      }
      console.log('total meal', totalMealMin, totalMealMax, totalMealMeasure);
      minGhgCell.value = totalMealMin;
      maxGhgCell.value = totalMealMax || totalMealMin;
      minGhgPerMeasureCell.value = totalMealMin/totalMealMeasure;
      maxGhgPerMeasureCell.value = (totalMealMax || totalMealMin)/totalMealMeasure;
      totalDayMin+= totalMealMin;
      totalDayMax+= totalMealMax;
      totalDayMeasure+= totalMealMeasure;
      totalMealMin = 0;
      totalMealMax = 0;
      totalMealMeasure = 0;
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
        minGhgCell.value = categoryAttributes[0]?.value;
        maxGhgCell.value = categoryAttributes[1]?.value || categoryAttributes[0]?.value;
        minGhgPerMeasureCell.value = categoryAttributes[0]?.value/measure;
        maxGhgPerMeasureCell.value = (categoryAttributes[1]?.value || categoryAttributes[0]?.value)/measure;
        totalMealMin+= categoryAttributes[0]?.value || 0;
        totalMealMax+= categoryAttributes[1]?.value || categoryAttributes[0]?.value || 0;
        totalMealMeasure+= measure;
      } else {
        console.log(food, "not found");
      }
    }
  });
  await workbook.xlsx.writeFile(`${filename}_ghg.xlsx`);
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
