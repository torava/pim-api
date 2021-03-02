import moment from 'moment';

import { locale } from '../components/locale';
import { convertMeasure, getRootEntity } from '../../utils/entities';
import { getCategoryAttribute, getCategoryWithAttribute } from '../../utils/categories';
import { getItemUnit, findItemCategoryAttributeValue, getItemAttributeValue } from '../../utils/items';

export const exportTransactions = (transactions, categories, groups = []) => {
  const categoryLocale = locale.getLocale();
  const formattingLocale = 'fi-FI';//locale.getLocale();

  const formatNumber = (number) => number ? new Intl.NumberFormat(formattingLocale).format(number) : undefined;
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

  let csv = [
    [
      'Date',
      'Week',
      'Participant',
      'Vendor',
      'Item name',
      'Product name',
      'Main category',
      'Category',
      'GHG category',
      'Product quantity',
      'Item quantity',
      'Product weight',
      'Item weight',
      'Product volume',
      'Item volume',
      'Price',
      'Category GHG',
      'Category GHG unit',
      'GHG',
      'Missing emissions',
    ].join('\t')
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

      const result = getCategoryWithAttribute(categories, item.product.category?.id, 105);
      const [categoryWithGhg, ghgAttribute] = result || [undefined, undefined];
      const ghg = getItemAttributeValue(item, ghgAttribute);

      const productCategory = categories.find(category => category.id === item.product.category?.id);

      const categoryParentId = productCategory?.parentId;
      const rootCategory = getRootEntity(categories, categoryParentId);

      const group = groups.find(group => group.id === transaction.groupId)?.name;

      return [
        formatDate(transaction.date),
        moment(transaction.date).isoWeek(),
        group,
        transaction.party.name,
        item.text,
        item.product.name,
        rootCategory?.name?.[categoryLocale],
        productCategory?.name?.[categoryLocale],
        categoryWithGhg?.name?.[categoryLocale],
        formatNumber(productQuantity),
        formatNumber(itemQuantity),
        formatNumber(productWeight),
        formatNumber(itemWeight),
        formatNumber(productVolume),
        formatNumber(itemVolume),
        formatNumber(item.price),
        formatNumber(ghgAttribute?.value),
        ghgAttribute?.unit,
        formatNumber(ghg),
        ghgAttribute ? 0 : 1
      ].join('\t');
    }));
  });
  csv = csv.concat(items);

  csv = csv.join('\n');
  return csv;
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
}