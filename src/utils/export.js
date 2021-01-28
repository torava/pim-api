import moment from 'moment';
import { locale } from '../components/locale';

export const exportTransactions = (transactions) => {
  let csv = [
    [
      'Date',
      'Week',
      'Participant',
      'Vendor',
      'Item name',
      'Category',
      'Subcategory',
      'Quantity',
      'Weight',
      'Volume',
      'Price',
      'GHG',
      'Missing emissions',
    ].join('\t')
  ];
  let items = [];
  Object.values(transactions).forEach(transaction => {
    items = items.concat(transaction.items.map(item => {
      const measure = item.measure || item.product.measure;
      const quantity = item.quantity || item.product.quantity;

      const ghgAttribute = item.product.category?.attributes.find(attribute => attribute.attributeId === 107);

      let volume, weight;

      if (item.unit?.includes('g')) {
        weight = measure;
      } else if (item.unit?.includes('l')) {
        volume = measure;
      }
      return [
        transaction.date,
        moment(transaction.date).week(),
        ,
        transaction.party.name,
        item.product.name,
        ,
        item.product.category?.name[locale.getLocale()],
        quantity,
        weight,
        measure,
        item.price,
        ghgAttribute?.value,
        ghgAttribute ? 0 : 1
      ].join('\t');
    }));
  });
  csv = csv.concat(items);
  console.log(csv);
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