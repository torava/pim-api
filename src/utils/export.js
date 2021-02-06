import moment from 'moment';

import { locale } from '../components/locale';
import { convertMeasure, getRootEntity } from './entities';
import { getCategoryWithAttribute } from './categories';
import { getItemAttributeValue, getItemMeasure, getItemUnit } from './items';

export const exportTransactions = (transactions, categories) => {
  const categoryLocale = locale.getLocale();
  const numberLocale = 'fi-FI';//locale.getLocale();

  const formatNumber = (number) => number ? new Intl.NumberFormat(numberLocale).format(number) : undefined;
  const formatDate = (date) => (
    date ? new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
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
      'Main category',
      'Category',
      'GHG category',
      'Quantity',
      'Weight',
      'Volume',
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
      const measure = convertMeasure(getItemMeasure(item), unit, 'kg');
      const quantity = getItemUnit(item);

      let volume, weight;

      if (unit?.includes('g')) {
        weight = measure;
      } else if (unit?.includes('l')) {
        volume = measure;
      }

      const categoryWithGhg = getCategoryWithAttribute(categories, item.product.category?.id, 107);
      const ghgAttribute = Object.values(categoryWithGhg?.attributes || {}).find(attribute => attribute.attributeId === 107);

      let ghg = getItemAttributeValue(item, ghgAttribute);

      const categoryParentId = categories.find(category => category.id === item.product.category?.id)?.parentId;
      const rootCategory = getRootEntity(categories, categoryParentId);

      return [
        formatDate(transaction.date),
        moment(transaction.date).week(),
        ,
        transaction.party.name,
        item.product.name,
        rootCategory?.name,
        item.product.category?.name[categoryLocale],
        categoryWithGhg?.name,
        quantity,
        formatNumber(weight),
        formatNumber(volume),
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