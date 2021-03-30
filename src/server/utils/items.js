import Category from "../models/Category";
import Item from "../models/Item";
import Party from "../models/Party";
import Product from "../models/Product";
import Transaction from "../models/Transaction";
import { insertFromRecords } from "./import";

export const getItemsFromCsv = async (itemRecords, productRecords, partyRecords, transactionRecords) => {
  let transactionRecordIdMap = {},
      partyRecordIdMap = {},
      productRecordIdMap = {},
      categories = await Category.query();

  insertFromRecords(partyRecords, Party, partyRecordIdMap);

  console.log(`${partyRecords.length} parties inserted`);

  for (const record of transactionRecords) {
    record.partyId = partyRecordIdMap[record.partyId]?.id;
    const entity = await Transaction.query().insertAndFetch({
      ...record,
      id: undefined
    }).returning('*');
    transactionRecordIdMap[record.id] = entity;
  }

  console.log(`${transactionRecords.length} transactions inserted`)

  for (const record of productRecords) {
    for (const [columnName, column] of Object.entries(record)) {
      const categoryNameMatch = columnName.match(/^category:name\["([a-z-]+)"\]$/i);
      const locale = categoryNameMatch?.[1];
      if (categoryNameMatch) {
        let found = false;
        let categoryEntity;
        for (const c of categories) {
          if (Object.values(c.name).includes(column)) {
            categoryEntity = {
              id: c.id
            }
            found = true;
            break;
          }
        }
        if (!found) {
          categoryEntity = {
            name: {
              [locale]: column
            }
          };
        }
        record.category = categoryEntity;
        delete record[columnName];
      }
    }

    const entity = await Product.query().upsertGraphAndFetch({
      ...record,
      measure: Number(record.measure),
      id: undefined
    }, {
      noDelete: true,
      relate: true
    }).returning('*');
    
    productRecordIdMap[record.id] = entity;
  }

  console.log(`${productRecords.length} products inserted`);

  for (const record of itemRecords) {
    record.productId = productRecordIdMap[record.productId]?.id;
    record.transactionId = transactionRecordIdMap[record.transactionId]?.id;
    await Item.query().insertAndFetch({
      ...record,
      id: undefined
    }).returning('*');
  }

  console.log(`${itemRecords.length} items inserted`);
};
