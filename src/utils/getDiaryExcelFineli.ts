import Excel from 'exceljs';
import Knex from 'knex';
import { Model } from 'objection';

import knexConfig from '../../knexfile';
import Category, { CategoryShape } from '../models/Category';
import Attribute, { AttributeShape } from '../models/Attribute';
import Product, { ProductShape } from '../models/Product';
import Item, { ItemShape } from '../models/Item';
import Recommendation, { RecommendationShape } from '../models/Recommendation';
import { convertMeasure } from './entities';
import { Locale } from './types';
import { resolveCategoryContributionPrices, getCategoryMeasure, resolveCategoryAttributes } from './categories';

/**
 * Food component energy density, MJ/g
 */
const componentEnergyMap = {
  fat: 0.037,
  protein: 0.017,
  carbohydrate: 0.017,
  sugar: 0.017,
  fibre: 0.008,
};

const FOOD_UNITS_ID = 6;

const PRICE_INDEX = 9;

const PRICE_RECOMMENDATION = 10.1;

export const getDiaryExcelFineliBuffer = async (buffer: ArrayBuffer, locale: Locale = Locale['fi-FI']) => {
  const categories = await Category.query().withGraphFetched('[contributions.[contribution.[products, contributions]], attributes]');
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
  headerRow.getCell(10).style = {
    alignment: { vertical: 'top', wrapText: true },
    font: { bold: true },
    border: { bottom: { color: { argb: 'FF000000' }, style: 'medium' } },
  };
  attributeCells.forEach((attributeCell, index) => {
    const attribute = attributes.find((attribute) => attribute.code === attributeCell.attribute.code);
    headerRow.getCell(11 + index * 2).value = `Min. ${attribute.name[locale]}`;
    headerRow.getCell(11 + index * 2 + 1).value = `Max. ${attribute.name[locale]}`;
    headerRow.getCell(11 + index * 2).style = {
      alignment: { vertical: 'top', wrapText: true },
      font: { bold: true },
      border: { bottom: { color: { argb: 'FF000000' }, style: 'medium' } },
    };
    headerRow.getCell(11 + index * 2 + 1).style = {
      alignment: { vertical: 'top', wrapText: true },
      font: { bold: true },
      border: { bottom: { color: { argb: 'FF000000' }, style: 'medium' } },
    };
  });

  worksheet.columns.forEach((col, index) => {
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
    const food = row.getCell(4).value;
    const unit = row.getCell(8).value;
    const mass = Number(row.getCell(9).value);
    const energy = Number(row.getCell(9 + 10).value);
    const priceCell = row.getCell(10);
    priceCell.alignment = { vertical: 'top' };
    attributeCells.forEach((attributeCell, index) => {
      row.getCell(11 + index * 2).alignment = { vertical: 'top' };
      row.getCell(11 + index * 2 + 1).alignment = { vertical: 'top' };
    });
    if (!food) {
      if (!totalMealMeasure) {
        // total day
        priceCell.value = totalDayPrice;
        priceCell.numFmt = totalDayPrice ? '0.00' : '0';
        attributeCells.forEach((attributeCell, index) => {
          row.getCell(11 + index * 2).value = attributeCell.totalDayMin;
          row.getCell(11 + index * 2 + 1).value = attributeCell.totalDayMax;
          row.getCell(11 + index * 2).numFmt = attributeCell.totalDayMin ? '0.00' : '0';
          row.getCell(11 + index * 2 + 1).numFmt = attributeCell.totalDayMax ? '0.00' : '0';
          attributeCell.totalDayMin = 0;
          attributeCell.totalDayMax = 0;
        });

        worksheet.columns.forEach((col, index) => {
          if (index === PRICE_INDEX) {
            // price;66;;10.1;euro;;;;;;;;male or female under 45 years living alone average
            const cellValue = Number(row.getCell(index + 1).value);
            const isGood = cellValue < PRICE_RECOMMENDATION;
            row.getCell(index + 1).style = {
              fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {
                  argb: `FF${isGood ? '00' : 'FF'}${isGood ? 'FF' : '00'}00`,
                },
              },
              numFmt: cellValue ? '0.00' : '0',
              alignment: { vertical: 'top' },
              font: { bold: true },
              border: { bottom: { color: { argb: 'FF000000' }, style: 'medium' } },
            };
            return true;
          }
          const attribute = attributes.filter((attribute) => attribute.parentId !== FOOD_UNITS_ID).find((attribute) =>
            Object.entries(attribute.name).find(([, value]) =>
              headerRow.getCell(index + 1).value?.toString().toLocaleLowerCase().includes(value.toLocaleLowerCase())) &&
              recommendations.find((recommendation) => recommendation.attributeId === attribute.id)
          );
          if (attribute) {
            const recommendation = recommendations.find((recommendation) => recommendation.attributeId === attribute.id);
            if (recommendation) {
              const cellValue = Number(row.getCell(index + 1).value);
              const value = getDailyAttributeValue(
                cellValue,
                energy,
                mass,
                recommendation,
                attribute
              );
              const isGood = compareAttributeToRecommendation(value, recommendation);
              console.log('isGood', isGood);
              const argb = `FF${isGood ? '00' : 'FF'}${isGood ? 'FF' : '00'}00`;
              console.log('argb', argb);
              row.getCell(index + 1).style = {
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: {
                    argb,
                  },
                },
                numFmt: cellValue ? '0.00' : '0',
                alignment: { vertical: 'top' },
                font: { bold: true },
                border: { bottom: { color: { argb: 'FF000000' }, style: 'medium' } },
              };
            }
          }
        });

        totalDayMeasure = 0;
        totalDayPrice = 0;
      } else {
        // total meal
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
          if (index === PRICE_INDEX) {
            // price;66;;10.1;euro;;;;;;;;male or female under 45 years living alone average
            const cellValue = Number(row.getCell(index + 1).value);
            const isGood = cellValue < PRICE_RECOMMENDATION * energy / convertMeasure(energyRecommendation.minValue, energyRecommendation.unit, 'kJ');
            row.getCell(index + 1).style = {
              fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {
                  argb: `FF${isGood ? '00' : 'FF'}${isGood ? 'FF' : '00'}00`,
                },
              },
              numFmt: cellValue ? '0.00' : '0',
              alignment: { vertical: 'top' },
              font: { bold: true },
              border: { bottom: { color: { argb: 'FF000000' }, style: 'thin' } },
            };
            return true;
          }
          const attribute = attributes.filter((attribute) => attribute.parentId !== 6).find((attribute) =>
            Object.entries(attribute.name).find(([, value]) =>
              headerRow.getCell(index + 1).value?.toString().toLocaleLowerCase().includes(value.toLocaleLowerCase())) &&
              recommendations.find((recommendation) => recommendation.attributeId === attribute.id)
          );
          if (attribute) {
            const recommendation = recommendations.find((recommendation) => recommendation.attributeId === attribute.id);
            if (recommendation) {
              const cellValue = Number(row.getCell(index + 1).value);
              const value = getMealAttributeValue(
                cellValue,
                energy,
                energyRecommendation,
                mass,
                recommendation,
                attribute
              );
              const isGood = compareAttributeToRecommendation(value, recommendation);
              const argb = `FF${isGood ? '00' : 'FF'}${isGood ? 'FF' : '00'}00`;
              row.getCell(index + 1).style = {
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: {
                    argb,
                  },
                },
                numFmt: cellValue ? '0.00' : '0',
                alignment: { vertical: 'top' },
                font: { bold: true },
                border: { bottom: { color: { argb: 'FF000000' }, style: 'thin' } },
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
      const foodUnitAttribute = attributes.find((attribute) => attribute.code === unit);
      if (category && foodUnitAttribute) {
        const categoryProduct = products.find((product) =>
          product.categoryId === category.id && product.items.length &&
          product.items.some((item) => item.price && (item.measure && item.unit || item.quantity > 1))
        );
        const categoryProductItem = categoryProduct?.items.find((item) => item.price && (item.measure && item.unit || item.quantity > 1));
        const price =
          resolveCategoryContributionPrices(category, products, items, foodUnitAttribute, 0.8) ||
          categoryProductItem?.price /
          (convertMeasure(categoryProductItem?.measure, categoryProductItem?.unit, 'kg') || 1) /
          (categoryProductItem?.quantity || 1) ||
          0;
        const measure = getCategoryMeasure(category, foodUnitAttribute, categories);
        const priceValue = !categoryProductItem?.measure ? price : price * measure;
        priceCell.value = priceValue;
        priceCell.numFmt = priceValue ? '0.00' : '0';
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
          row.getCell(11 + index * 2).numFmt = categoryAttributes[0]?.value ? '0.00' : '0';
          row.getCell(11 + index * 2 + 1).numFmt = categoryAttributes[1]?.value || categoryAttributes[0]?.value ? '0.00' : '0';
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

export const getDailyAttributeValue = (
  cellValue: number,
  energy: number,
  mass: number,
  recommendation: RecommendationShape,
  attribute: AttributeShape) => {
  let value = cellValue;
  if (recommendation.unit === 'percent' && recommendation.perUnit === 'energy') {
    const componentEnergy = Object.entries(componentEnergyMap).find(([component]) =>
      attribute.name['en-US'].toLocaleLowerCase().includes(component)
    )?.[1];
    value = ((cellValue * componentEnergy) / (energy / 1000)) * 100;
  } else if (recommendation.unit === 'g' && recommendation.perUnit === 'MJ') {
    value = cellValue / (energy * 1000);
  } else if (recommendation.perUnit === 'kg') {
    value = cellValue / (mass * 1000);
  }
  console.log('value', value, cellValue, energy, mass, recommendation, attribute);
  return value;
};


const getMealAttributeValue = (
  cellValue: number,
  energy: number,
  energyRecommendation: RecommendationShape,
  mass: number,
  recommendation: RecommendationShape,
  attribute: AttributeShape) => {
  let value = cellValue * energy / convertMeasure(energyRecommendation.minValue, energyRecommendation.unit, 'kJ');
  if (recommendation.unit === 'percent' && recommendation.perUnit === 'energy') {
    const componentEnergy = Object.entries(componentEnergyMap).find(([component]) =>
      attribute.name['en-US'].toLocaleLowerCase().includes(component)
    )?.[1];
    value = ((cellValue * componentEnergy) / (energy / 1000)) * 100;
  } else if (recommendation.unit === 'g' && recommendation.perUnit === 'MJ') {
    value = cellValue / (energy * 1000);
  } else if (recommendation.perUnit === 'kg') {
    value = cellValue / (mass * 1000);
  }
  return value;
};

export const compareAttributeToRecommendation = (
  value: number,
  recommendation: RecommendationShape) => {
  const isGood =
    (!recommendation.minValue || value > recommendation.minValue) &&
    (!recommendation.maxValue || value < recommendation.maxValue);
  return isGood;
};
