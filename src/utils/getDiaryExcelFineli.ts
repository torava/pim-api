import Excel from 'exceljs';
import {
  compareAttributeToRecommendation,
  compareMealPriceToRecommendation,
  getAttribute,
  getDailyAttributeValue,
  getMealAttributeValue,
  getRecommendation,
  Locale,
  PRICE_RECOMMENDATION,
} from '@torava/pim-utils';
import AttributeShape from '@torava/pim-utils/dist/models/Attribute';
import CategoryShape from '@torava/pim-utils/dist/models/Category';
import ItemShape from '@torava/pim-utils/dist/models/Item';
import ProductShape from '@torava/pim-utils/dist/models/Product';
import RecommendationShape from '@torava/pim-utils/dist/models/Recommendation';

import Category from '../models/Category';
import Attribute from '../models/Attribute';
import Product from '../models/Product';
import Item from '../models/Item';
import Recommendation from '../models/Recommendation';
import { getCategoryMeasure, resolveCategoryAttributes, getCategoryPrice } from './categories';

const PRICE_INDEX = 9;

const CURRENCY = 'EUR';

export const getDiaryExcelFineliBuffer = async (buffer: ArrayBuffer, locale: Locale = Locale['fi-FI'], sex: string) => {
  const categories = await Category.query().withGraphFetched(
    '[contributions.[contribution.[products, contributions]], attributes]'
  );
  const products = await Product.query().withGraphFetched('[items]');
  const attributes = await Attribute.query();
  const items = await Item.query();
  const recommendations = await Recommendation.query();
  const workbook = new Excel.Workbook();
  await workbook.xlsx.load(buffer);
  getDiaryExcelFineliWorkbook(workbook, categories, attributes, products, items, recommendations, locale, sex);
  return await workbook.xlsx.writeBuffer();
};
export const writeDiaryExcelFineliFile = async (filename: string, locale: Locale = Locale['fi-FI'], sex: string) => {
  const categories = await Category.query().withGraphFetched('[contributions, attributes]');
  const products = await Product.query().withGraphFetched('[items]');
  const items = await Item.query();
  const attributes = await Attribute.query();
  const recommendations = await Recommendation.query();
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filename);
  getDiaryExcelFineliWorkbook(workbook, categories, attributes, products, items, recommendations, locale, sex);
  await workbook.xlsx.writeFile(`${filename}_pi.xlsx`);
};
export const getDiaryExcelFineliWorkbook = (
  workbook: Excel.Workbook,
  categories: CategoryShape[] = [],
  attributes: AttributeShape[] = [],
  products: ProductShape[] = [],
  items: ItemShape[] = [],
  recommendations: RecommendationShape[] = [],
  locale: Locale = Locale['fi-FI'],
  sex: string
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
  headerRow.getCell(10).value = `price (${CURRENCY})`;
  headerRow.getCell(10).style = {
    alignment: { vertical: 'top', wrapText: true },
    font: { bold: true },
    border: { bottom: { color: { argb: 'FF000000' }, style: 'medium' } },
  };
  attributeCells.forEach((attributeCell, index) => {
    const attribute = attributes.find((attribute) => attribute.code === attributeCell.attribute.code);
    const recommendation = getRecommendation(attribute, recommendations, sex);
    headerRow.getCell(11 + index * 2).value =
      `min. ${attribute.name[locale]}${recommendation.unit ? ` (${recommendation.unit})` : ''}`;
    headerRow.getCell(11 + index * 2 + 1).value =
      `max. ${attribute.name[locale]}${recommendation.unit ? ` (${recommendation.unit})` : ''}`;
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
    const attribute = getAttribute(
      headerRow.getCell(index + 1).value?.toString(),
      attributes,
      recommendations,
      sex
    );
    if (attribute) {
      const recommendation = getRecommendation(attribute, recommendations, sex);
      if (recommendation) {
        headerRow.getCell(index + 1).value = `${headerRow.getCell(index + 1).value} [${
          recommendation.minValue ? formatNumber(recommendation.minValue, locale) : ''
        }-${recommendation.maxValue ? formatNumber(recommendation.maxValue, locale) : ''} ${
          recommendation.unit
        }${recommendation.perUnit ? `/${recommendation.perUnit}` : ''}]`;
      }
    }
  });

  const energyAttribute = attributes.find((attribute) => attribute.code === 'ENERC');
  const energyRecommendation = getRecommendation(energyAttribute, recommendations, sex);

  worksheet.eachRow((row) => {
    const food = row.getCell(4).value;
    const amount = Number(row.getCell(7).value);
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
          const attribute = getAttribute(
            headerRow.getCell(index + 1).value?.toString(),
            attributes,
            recommendations,
            sex
          );
          if (attribute) {
            const recommendation = getRecommendation(attribute, recommendations, sex);
            if (recommendation) {
              const cellValue = Number(row.getCell(index + 1).value);
              const value = getDailyAttributeValue(cellValue, energy, mass, recommendation, attribute);
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
            const cellValue = Number(row.getCell(index + 1).value);
            const isGood = compareMealPriceToRecommendation(cellValue, energy, energyRecommendation);
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
          const attribute = getAttribute(
            headerRow.getCell(index + 1).value?.toString(),
            attributes,
            recommendations,
            sex
          );
          if (attribute) {
            const recommendation = getRecommendation(attribute, recommendations, sex);
            if (recommendation) {
              const cellValue = Number(row.getCell(index + 1).value);
              const value = getMealAttributeValue(
                cellValue,
                energy,
                mass,
                energyRecommendation,
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
        const measure = getCategoryMeasure(category, foodUnitAttribute, categories);
        const price = getCategoryPrice(category, measure, amount, foodUnitAttribute, products, items);
        priceCell.value = price;
        priceCell.numFmt = price ? '0.00' : '0';
        totalMealMeasure += measure;
        totalMealPrice += price;
        console.log('price, measure, amount', price, measure, amount);
        attributeCells.forEach((attributeCell, index) => {
          const { categoryAttributes, measure } = resolveCategoryAttributes(
            category,
            [attributeCell.attribute.id],
            foodUnitAttribute,
            amount,
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
          row.getCell(11 + index * 2).value = categoryAttributes[0]?.value || 0;
          row.getCell(11 + index * 2 + 1).value = categoryAttributes[1]?.value || categoryAttributes[0]?.value || 0;
          row.getCell(11 + index * 2).numFmt = categoryAttributes[0]?.value ? '0.00' : '0';
          row.getCell(11 + index * 2 + 1).numFmt =
            categoryAttributes[1]?.value || categoryAttributes[0]?.value ? '0.00' : '0';
          attributeCell.totalMealMin += categoryAttributes[0]?.value || 0;
          attributeCell.totalMealMax += categoryAttributes[1]?.value || categoryAttributes[0]?.value || 0;
        });
      } else {
        console.log(food, 'not found');
      }
    }
  });
};

export const formatNumber = (value: number, locale?: Locale) =>
  new Intl.NumberFormat(locale).format(value);
