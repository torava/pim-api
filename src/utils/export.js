import moment from 'moment';

import Item from '../models/Item';

export const exportTransactions = async (transactionIds) => {
  const items = await Item.query()
  .withGraphFetched('[transaction.[party], product.[category.[parent.^, attributes]]]');
  const filteredItems = items.filter(item => transactionIds.includes(item.transaction.id));
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
    ]
  ];
  csv = csv.concat(csv, filteredItems.map(item => {
    const measure = item.measure || item.product.measure;
    const quantity = item.quantity || item.product.quantity;

    const ghgAttribute = item.product.category.attributes.find(attribute => attribute.name === 'GHG');

    let volume, weight;

    if (item.unit.includes('g')) {
      weight = measure;
    } else if (item.unit.includes('l')) {
      volume = measure;
    }
    return [
      item.transaction.date,
      moment(item.transaction.date, 'W'),
      item.transaction.party.name,
      item.product.name,
      item.product.category,
      quantity,
      weight,
      measure,
      item.price,
      ghgAttribute?.value,
      ghgAttribute ? 0 : 1
    ];
  }));
  return csv;
};
