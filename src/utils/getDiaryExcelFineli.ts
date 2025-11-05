import Excel from 'exceljs';
import CategoryShape from '@torava/product-utils/dist/models/Category';
import { Locale } from '@torava/product-utils/dist/utils/types';
import {
  getCategoryMeasure,
  resolveCategoryAttributes,
  resolveCategoryContributionPrices,
} from '@torava/product-utils/dist/utils/categories';
import AttributeShape from '@torava/product-utils/dist/models/Attribute';
import ProductShape from '@torava/product-utils/dist/models/Product';
import Knex from 'knex';
import { Model } from 'objection';
import ItemShape from '@torava/product-utils/dist/models/Item';
import RecommendationShape from '@torava/product-utils/dist/models/Recommendation';

import knexConfig from '../../knexfile';
import Category from '../models/Category';
import Attribute from '../models/Attribute';
import Product from '../models/Product';
import Item from '../models/Item';
import Recommendation from '../models/Recommendation';
import { convertMeasure } from './entities';

/**
 * Food component energy density, MJ/g
 */
const componentEnergyMap = {
  fat: 0.037,
  protein: 0.017,
  carbohydrate: 0.017,
  fibre: 0.008,
};

const FOOD_UNITS_ID = 6;

export const getDiaryExcelFineliBuffer = async (buffer: ArrayBuffer, locale: Locale = Locale['fi-FI']) => {
  const categories = await Category.query().withGraphFetched('[contributions.[contribution.[products]], attributes]');
  const products = await Product.query().withGraphFetched('[items]');
  const attributes = await Attribute.query();
  const items = await Item.query();
  const recommendations = await Recommendation.query();
  const workbook = new Excel.Workbook();
  await workbook.xlsx.load(buffer);
  getDiaryExcelFineliWorkbook(workbook, categories, attributes, products, items, recommendations, locale);
  return await workbook.xlsx.writeBuffer();
};
export const writeDiaryExcelFineliFile = async (filename: string, locale: Locale = Locale['fi-FI']) => {
  const categories = await Category.query().withGraphFetched('[contributions, attributes]');
  const products = await Product.query().withGraphFetched('[items]');
  const items = await Item.query();
  const attributes = await Attribute.query();
  const recommendations = await Recommendation.query();
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filename);
  getDiaryExcelFineliWorkbook(workbook, categories, attributes, products, items, recommendations, locale);
  await workbook.xlsx.writeFile(`${filename}_price_ghg.xlsx`);
};
export const getDiaryExcelFineliWorkbook = (
  workbook: Excel.Workbook,
  categories: CategoryShape[] = [],
  attributes: AttributeShape[] = [],
  products: ProductShape[] = [],
  items: ItemShape[] = [],
  recommendations: RecommendationShape[] = [],
  locale: Locale = Locale['fi-FI']
) => {
  let totalMealMeasure = 0,
    totalMealPrice = 0,
    totalDayMeasure = 0,
    totalDayPrice = 0;
  const attributeCells = ['GHG', 'LAND', 'EUTRO', 'FRESHW'].map((code) => {
    const attribute = attributes.find((attribute) => attribute.code === code);
    return {
      attribute,
      totalMealMin: 0,
      totalMealMax: 0,
      totalDayMin: 0,
      totalDayMax: 0,
    };
  });
  const worksheet = workbook.worksheets[0];
  const headerRow = worksheet.getRow(1);
  // @ts-ignore
  worksheet.spliceColumns.apply(worksheet, [10, 0, [], ...attributeCells.map(() => [[], []]).flat()]);
  headerRow.getCell(10).value = 'Price (EUR)';
  headerRow.getCell(10).alignment = { vertical: 'top' };
  attributeCells.forEach((attributeCell, index) => {
    const attribute = attributes.find((attribute) => attribute.code === attributeCell.attribute.code);
    headerRow.getCell(11 + index * 2).value = `Min. ${attribute.name[locale]}`;
    headerRow.getCell(11 + index * 2 + 1).value = `Max. ${attribute.name[locale]}`;
    headerRow.getCell(11 + index * 2).alignment = { vertical: 'top' };
    headerRow.getCell(11 + index * 2 + 1).alignment = { vertical: 'top' };
  });

  worksheet.columns.forEach((col, index) => {
    console.log('headerCell', headerRow.getCell(index + 1).value);
    if (index === 9) {
      headerRow.getCell(index + 1).value = `${headerRow.getCell(index + 1).value} [-10,1 EUR]`;
      return true;
    }
    const attribute = attributes.filter((attribute) => attribute.parentId !== FOOD_UNITS_ID).find((attribute) =>
      Object.entries(attribute.name).find(([, value]) =>
        headerRow.getCell(index + 1).value?.toString().toLocaleLowerCase().includes(value.toLocaleLowerCase())) &&
        recommendations.find((recommendation) => recommendation.attributeId === attribute.id)
    );
    if (attribute) {
      console.log('attribute', attribute);
      const recommendation = recommendations.find((recommendation) => recommendation.attributeId === attribute.id);
      if (recommendation) {
        headerRow.getCell(index + 1).value =
          `${headerRow.getCell(index + 1).value} [${
            recommendation.minValue || ''}-${recommendation.maxValue || ''} ${
              recommendation.unit}${recommendation.perUnit ? `/${recommendation.perUnit}` : ''}]`;
      }
    }
  });

  const energyAttribute = attributes.find((attribute) => attribute.code === 'ENERC');
  const energyRecommendation = recommendations.find(
    (recommendation) => recommendation.attributeId === energyAttribute.id && recommendation.sex === 'male'
  );

  worksheet.eachRow((row) => {
    //const row = worksheet.getRows(40, 1)[0];
    const food = row.getCell(4).value;
    const unit = row.getCell(8).value;
    const perUnit = row.getCell(9).value;
    const mass = Number(row.getCell(9).value);
    const energy = Number(row.getCell(11 + 16).value);
    const priceCell = row.getCell(10);
    priceCell.alignment = { vertical: 'top' };
    attributeCells.forEach((attributeCell, index) => {
      row.getCell(11 + index * 2).alignment = { vertical: 'top' };
      row.getCell(11 + index * 2 + 1).alignment = { vertical: 'top' };
    });
    if (!food) {
      if (!totalMealMeasure) {
        console.log('total day', totalDayMeasure, totalDayPrice);

        priceCell.value = totalDayPrice;
        attributeCells.forEach((attributeCell, index) => {
          row.getCell(11 + index * 2).value = attributeCell.totalDayMin;
          row.getCell(11 + index * 2 + 1).value = attributeCell.totalDayMax;
          attributeCell.totalDayMin = 0;
          attributeCell.totalDayMax = 0;
        });

        worksheet.columns.forEach((col, index) => {
          console.log('headerCell', headerRow.getCell(index + 1).value);
          if (index === 9) {
            // price;66;;10.1;euro;;;;;;;;male or female under 45 years living alone average
            const cellValue = Number(row.getCell(index + 1).value);
            const isGood = cellValue < 10.1;
            row.getCell(10).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: {
                argb: `FF${isGood ? '00' : 'FF'}${isGood ? 'FF' : '00'}00`,
              },
            };
            return true;
          }
          const attribute = attributes.filter((attribute) => attribute.parentId !== FOOD_UNITS_ID).find((attribute) =>
            Object.entries(attribute.name).find(([, value]) =>
              headerRow.getCell(index + 1).value?.toString().toLocaleLowerCase().includes(value.toLocaleLowerCase())) &&
              recommendations.find((recommendation) => recommendation.attributeId === attribute.id)
          );
          if (attribute) {
            console.log('attribute', attribute);
            const recommendation = recommendations.find((recommendation) => recommendation.attributeId === attribute.id);
            console.log('recommendation', recommendation);
            const cellValue = Number(row.getCell(index + 1).value);
            console.log('cellValue', row.getCell(index + 1).value, energy, energyRecommendation.minValue, energyRecommendation.unit, convertMeasure(energyRecommendation.minValue, energyRecommendation.unit, 'kJ'));
            let value = cellValue * energy / convertMeasure(energyRecommendation.minValue, energyRecommendation.unit, 'kJ');
            if (unit === 'percent' && perUnit === 'energy') {
              const componentEnergy = Object.entries(componentEnergyMap).find(([component]) =>
                attribute.name['en-US'].includes(component)
              )?.[1];
              value = ((cellValue * componentEnergy) / energy) * 100;
            } else if (unit === 'g' && perUnit === 'MJ') {
              value = cellValue / (energy * 1000);
            } else if (perUnit === 'kg') {
              value = cellValue / (mass * 1000);
            }
            if (recommendation) {
              console.log('value', value, recommendation.minValue, recommendation.maxValue);
              const isGood =
                (!recommendation.minValue || value > recommendation.minValue) &&
                (!recommendation.maxValue || value < recommendation.maxValue);
              row.getCell(index + 1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {
                  argb: `FF${isGood ? '00' : 'FF'}${isGood ? 'FF' : '00'}00`,
                },
              };
            }
          }
        });

        totalDayMeasure = 0;
        totalDayPrice = 0;
      } else {
        console.log('total meal', totalMealMeasure, totalMealPrice);
        priceCell.value = totalMealPrice;
        attributeCells.forEach((attributeCell, index) => {
          row.getCell(11 + index * 2).value = attributeCell.totalMealMin;
          row.getCell(11 + index * 2 + 1).value = attributeCell.totalMealMax || attributeCell.totalMealMin;
          attributeCell.totalDayMin += attributeCell.totalMealMin;
          attributeCell.totalDayMax += attributeCell.totalMealMax;
          attributeCell.totalMealMin = 0;
          attributeCell.totalMealMax = 0;
        });

        worksheet.columns.forEach((col, index) => {
          console.log('headerCell', headerRow.getCell(index + 1).value);
          if (index === 9) {
            // price;66;;10.1;euro;;;;;;;;male or female under 45 years living alone average
            const cellValue = Number(row.getCell(index + 1).value);
            const isGood = cellValue < 10.1 * energy / convertMeasure(energyRecommendation.minValue, energyRecommendation.unit, 'kJ');
            row.getCell(10).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: {
                argb: `FF${isGood ? '00' : 'FF'}${isGood ? 'FF' : '00'}00`,
              },
            };
            return true;
          }
          const attribute = attributes.filter((attribute) => attribute.parentId !== 6).find((attribute) =>
            Object.entries(attribute.name).find(([, value]) =>
              headerRow.getCell(index + 1).value?.toString().toLocaleLowerCase().includes(value.toLocaleLowerCase())) &&
              recommendations.find((recommendation) => recommendation.attributeId === attribute.id)
          );
          if (attribute) {
            console.log('attribute', attribute);
            const recommendation = recommendations.find((recommendation) => recommendation.attributeId === attribute.id);
            console.log('recommendation', recommendation);
            const cellValue = Number(row.getCell(index + 1).value);
            console.log('cellValue', row.getCell(index + 1).value, energy, convertMeasure(energyRecommendation.minValue, energyRecommendation.unit, 'kJ'));
            let value = cellValue * energy / convertMeasure(energyRecommendation.minValue, energyRecommendation.unit, 'kJ');
            if (unit === 'percent' && perUnit === 'energy') {
              const componentEnergy = Object.entries(componentEnergyMap).find(([component]) =>
                attribute.name['en-US'].includes(component)
              )?.[1];
              value = ((cellValue * componentEnergy) / energy) * 100;
            } else if (unit === 'g' && perUnit === 'MJ') {
              value = cellValue / (energy * 1000);
            } else if (perUnit === 'kg') {
              value = cellValue / (mass * 1000);
            }
            if (recommendation) {
              console.log('value', value, recommendation.minValue, recommendation.maxValue);
              const isGood =
                (!recommendation.minValue || value > recommendation.minValue) &&
                (!recommendation.maxValue || value < recommendation.maxValue);
              row.getCell(index + 1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {
                  argb: `FF${isGood ? '00' : 'FF'}${isGood ? 'FF' : '00'}00`,
                },
              };
            }
          }
        });

        totalDayMeasure += totalMealMeasure;
        totalDayPrice += totalMealPrice;
        totalMealMeasure = 0;
        totalMealPrice = 0;
      }
    } else {
      const category = categories.find(
        (category) => category.name?.[locale] === food && !categories.some((child) => child.parentId === category.id)
      );
      console.log('food, unit, category ID', food, unit, category?.id);
      const foodUnitAttribute = attributes.find((attribute) => attribute.code === unit);
      if (category && foodUnitAttribute) {
        const categoryProduct = products.find((product) => product.categoryId === category.id);
        const price =
          resolveCategoryContributionPrices(category, products, items, foodUnitAttribute, 0.9) ||
          categoryProduct?.items[0]?.price ||
          0;
        const measure = getCategoryMeasure(category, foodUnitAttribute, categories);
        priceCell.value = price * measure;
        totalMealMeasure += measure;
        totalMealPrice += price * measure;
        console.log('price, measure', price, measure);
        attributeCells.forEach((attributeCell, index) => {
          const { categoryAttributes, measure } = resolveCategoryAttributes(
            category,
            [attributeCell.attribute.id],
            foodUnitAttribute,
            categories,
            attributes,
            0.9
          );
          console.log(
            categoryAttributes[0]?.value,
            categoryAttributes[0]?.unit,
            categoryAttributes[0]?.type,
            categoryAttributes[1]?.value,
            categoryAttributes[1]?.unit,
            categoryAttributes[1]?.type,
            measure
          );
          row.getCell(11 + index * 2).value = categoryAttributes[0]?.value;
          row.getCell(11 + index * 2 + 1).value = categoryAttributes[1]?.value || categoryAttributes[0]?.value;
          attributeCell.totalMealMin += categoryAttributes[0]?.value || 0;
          attributeCell.totalMealMax += categoryAttributes[1]?.value || categoryAttributes[0]?.value || 0;
        });
      } else {
        console.log(food, 'not found');
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
