import ExcelJS from 'exceljs';

import { locale } from '../components/locale';
import { convertMeasure, getRootEntity } from '../../utils/entities';
import { getCategoriesWithAttributes } from '../../utils/categories';
import { getItemUnit, getItemAttributeValue } from '../../utils/items';

export const exportTransactions = (transactions, categories, attributes, attributeAggregates) => {
  console.log('transactions', JSON.stringify(transactions));
  console.log('categories', JSON.stringify(categories));
  console.log('attributes', JSON.stringify(attributes))

  const categoryLocale = locale.getLocale();
  const formattingLocale = 'fi-FI';//locale.getLocale();

  console.log('category locale', categoryLocale, 'formatting locale', formattingLocale);

  const formatNumber = (number) => !isNaN(number) ? new Intl.NumberFormat(formattingLocale).format(number) : undefined;
  const formatDate = (date) => (
    date ? new Intl.DateTimeFormat(formattingLocale, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(new Date(date))+' '+
    new Intl.DateTimeFormat(formattingLocale, {
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).format(new Date(date)) : undefined
  );

  const attributeHeaders = Object.keys(attributeAggregates).map(attributeId => (
    attributes.find(a => a.id === Number(attributeId))?.name[categoryLocale]
  ));

  console.log('attribute aggregates', attributeAggregates, 'attribute headers', attributeHeaders);

  let rows = [
    [
      'Date',
      'Vendor',
      'Item name',
      'Product name',
      'Main category',
      'Category',
      'Product quantity',
      'Item quantity',
      'Product weight',
      'Item weight',
      'Product volume',
      'Item volume',
      'Price',
      ...attributeHeaders
    ]
  ];

  let items = [];
  Object.values(transactions).forEach(transaction => {
    items = items.concat(transaction.items.map(item => {
      const unit = getItemUnit(item);
      const itemMeasure = convertMeasure(item.measure, unit, 'kg');
      const productMeasure = convertMeasure(item.product.measure, unit, 'kg');
      const itemQuantity = item.quantity;
      const productQuantity = item.product.quantity;

      let itemVolume, itemWeight, productVolume, productWeight;

      if (unit?.includes('g')) {
        itemWeight = itemMeasure;
        productWeight = productMeasure;
      } else if (unit?.includes('l')) {
        itemVolume = itemMeasure;
        productVolume = productMeasure;
      }

      const productCategory = categories.find(category => category.id === item.product.categoryId);


      const categoryParentId = productCategory?.parentId;
      const rootCategory = getRootEntity(categories, categoryParentId);

      let attributeColumns = [];

      Object.keys(attributeAggregates).forEach(attributeId => {
        const result = getCategoriesWithAttributes(categories, productCategory, Number(attributeId));
        const [, itemAttributes] = result?.[0] || [undefined, undefined];
        const [attributeValue] = getItemAttributeValue(item, itemAttributes) || [undefined, undefined];

        attributeColumns.push(formatNumber(attributeValue));
      });

      return [
        formatDate(transaction.date),
        transaction.party.name,
        item.text,
        item.product.name,
        rootCategory?.name?.[categoryLocale],
        productCategory?.name?.[categoryLocale],
        formatNumber(productQuantity),
        formatNumber(itemQuantity),
        formatNumber(productWeight),
        formatNumber(itemWeight),
        formatNumber(productVolume),
        formatNumber(itemVolume),
        formatNumber(item.price),
        ...attributeColumns
      ];
    }));
  });
  rows = rows.concat(items);

  return rows;
};

// https://gist.github.com/danallison/3ec9d5314788b337b682
// downloadString("a,b,c\n1,2,3", "text/csv", "myCSV.csv")
export const downloadString = (text, fileType, fileName) => {
  const blob = new Blob([text], { type: fileType });

  const a = document.createElement('a');
  a.download = fileName;
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 1500);
};

export const getXlsxFromObject = async (rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet();
  sheet.addRows(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

export const getCsvFromObject = async (rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet();
  sheet.addRows(rows);
  const buffer = await workbook.csv.writeBuffer();
  return buffer;
};
