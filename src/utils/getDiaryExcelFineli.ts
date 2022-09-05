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
import Product, { ProductShape } from '../models/Product';

export const getDiaryExcelFineliBuffer = async (
  buffer: Buffer,
  locale: Locale = Locale['fi-FI']
) => {
  const categories = await Category.query()
  .withGraphFetched('[contributions, attributes]');
  const products = await Product.query()
  .withGraphFetched('[items]');
  const attributes = await Attribute.query();
  const workbook = new Excel.Workbook();
  await workbook.xlsx.load(buffer);
  getDiaryExcelFineliWorkbook(workbook, categories, attributes, products, locale);
  return await workbook.xlsx.writeBuffer();
};
export const writeDiaryExcelFineliFile = async (
  filename: string,
  locale: Locale = Locale['fi-FI']
) => {
  const categories = await Category.query()
  .withGraphFetched('[contributions, attributes]');
  const products = await Product.query()
  .withGraphFetched('[items]');
  const attributes = await Attribute.query();
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filename);
  getDiaryExcelFineliWorkbook(workbook, categories, attributes, products, locale);
  await workbook.xlsx.writeFile(`${filename}_price_ghg.xlsx`);
}
export const getDiaryExcelFineliWorkbook = (
  workbook: Excel.Workbook,
  categories: CategoryShape[] = [],
  attributes: AttributeShape[] = [],
  products: ProductShape[] = [],
  locale: Locale = Locale['fi-FI']
) => {
  let totalMealMin = 0,
      totalMealMax = 0,
      totalDayMin = 0,
      totalDayMax = 0,
      totalMealMeasure = 0,
      totalMealPrice = 0,
      totalDayMeasure = 0,
      totalDayPrice = 0;
  const worksheet = workbook.worksheets[0];
  const headerRow = worksheet.getRow(1);
  worksheet.spliceColumns(10, 0, [], [], []);
  headerRow.getCell(10).value = 'Price (EUR)';
  headerRow.getCell(11).value = 'Min. GHG (kgCO₂e)';
  headerRow.getCell(12).value = 'Max. GHG (kgCO₂e)';
  headerRow.getCell(10).alignment = {vertical: 'top'};
  headerRow.getCell(11).alignment = {vertical: 'top'};
  headerRow.getCell(12).alignment = {vertical: 'top'};
  // headerRow.getCell(12).value = 'Min. GHG/weight (kgCO₂e/kg)';
  // headerRow.getCell(13).value = 'Max. GHG/weight (kgCO₂e/kg)';
  worksheet.eachRow((row) => {
    //const row = worksheet.getRows(40, 1)[0];
    const food = row.getCell(4).value;
    const unit = row.getCell(8).value;
    const priceCell = row.getCell(10);
    const minGhgCell = row.getCell(11);
    const maxGhgCell = row.getCell(12);
    const minGhgPerMeasureCell = row.getCell(13);
    const maxGhgPerMeasureCell = row.getCell(14);
    priceCell.alignment = {vertical: 'top'};
    minGhgCell.alignment = {vertical: 'top'};
    maxGhgCell.alignment = {vertical: 'top'};
    if (!food) {
      if (!totalMealMin) {
        console.log('total day', totalDayMin, totalDayMax, totalDayMeasure);
        priceCell.value = totalDayPrice;
        minGhgCell.value = totalDayMin;
        maxGhgCell.value = totalDayMax || totalDayMin;
        //minGhgPerMeasureCell.value = totalDayMin/totalDayMeasure;
        //maxGhgPerMeasureCell.value = (totalDayMax || totalDayMin)/totalDayMeasure;
        totalDayMin = 0;
        totalDayMax = 0;
        totalDayMeasure = 0;
        totalDayPrice = 0;
      } else {
        console.log('total meal', totalMealMin, totalMealMax, totalMealMeasure);
        priceCell.value = totalMealPrice;
        minGhgCell.value = totalMealMin;
        maxGhgCell.value = totalMealMax || totalMealMin;
        //minGhgPerMeasureCell.value = totalMealMin/totalMealMeasure;
        //maxGhgPerMeasureCell.value = (totalMealMax || totalMealMin)/totalMealMeasure;
        totalDayMin+= totalMealMin;
        totalDayMax+= totalMealMax;
        totalDayMeasure+= totalMealMeasure;
        totalDayPrice+= totalMealPrice;
        totalMealMin = 0;
        totalMealMax = 0;
        totalMealMeasure = 0;
        totalMealPrice = 0;
      }
    } else {
      const category = categories.find(
        (category) => category.name?.[locale] === food
      );
      if (category) {
        const categoryProduct = products.find(product => product.categoryId === category.id);
        const price = categoryProduct?.items[0]?.price;
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
          price,
          measure
        );
        priceCell.value = price*measure;
        minGhgCell.value = categoryAttributes[0]?.value;
        maxGhgCell.value = categoryAttributes[1]?.value || categoryAttributes[0]?.value;
        minGhgPerMeasureCell.value = categoryAttributes[0]?.value/measure;
        maxGhgPerMeasureCell.value = (categoryAttributes[1]?.value || categoryAttributes[0]?.value)/measure;
        totalMealMin+= categoryAttributes[0]?.value || 0;
        totalMealMax+= categoryAttributes[1]?.value || categoryAttributes[0]?.value || 0;
        totalMealMeasure+= measure;
        totalMealPrice+= price*measure;
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
  const filename = process.env.DIARY_FILENAME;
  if (filename) {
    writeDiaryExcelFineliFile(filename);
  }
})();
