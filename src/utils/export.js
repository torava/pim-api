import moment from 'moment';

import { locale } from '../components/locale';
import { convertMeasure, getRootEntity } from './entities';
import { getCategoryWithAttribute } from './categories';

export const exportTransactions = (transactions, categories) => {
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
      const unit = item.unit || item.product.unit;
      const measure = convertMeasure(item.measure || item.product.measure, unit, 'kg');
      const quantity = item.quantity || item.product.quantity;

      let volume, weight;

      if (unit?.includes('g')) {
        weight = measure;
      } else if (unit?.includes('l')) {
        volume = measure;
      }

      const categoryWithGhg = getCategoryWithAttribute(categories, item.product.category?.id, 107);
      const ghgAttribute = Object.values(categoryWithGhg?.attributes || {}).find(attribute => attribute.attributeId === 107);

      let ghg;
      if (ghgAttribute?.unit === 'kgCO₂e') {
        ghg = ghgAttribute?.value*(quantity || 1) || undefined;  
      } else {
        ghg = ghgAttribute?.value*measure*(quantity || 1) || undefined;
      }

      const categoryParentId = categories.find(category => category.id === item.product.category?.id)?.parentId;
      const rootCategory = getRootEntity(categories, categoryParentId);

      return [
        transaction.date,
        moment(transaction.date).week(),
        ,
        transaction.party.name,
        item.product.name,
        rootCategory?.name,
        item.product.category?.name[locale.getLocale()],
        categoryWithGhg?.name,
        quantity,
        weight,
        volume,
        item.price,
        ghgAttribute?.value,
        ghgAttribute?.unit,
        ghg,
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