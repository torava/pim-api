import moment from "moment";

import Attribute from "../models/Attribute";
import Brand from "../models/Brand";
import Category from "../models/Category";
import Item from "../models/Item";
import Party from "../models/Party";
import Product from "../models/Product";
import Source from "../models/Source";
import Transaction from "../models/Transaction";
import { insertFromRecords } from "./import";

export const getItemsFromCsv = async (itemRecords, productRecords, partyRecords, transactionRecords, sourceRecords = []) => {
  let transactionRecordIdMap = {},
      partyRecordIdMap = {},
      productRecordIdMap = {},
      categories = await Category.query(),
      attributes = await Attribute.query(),
      sources = await Source.query(),
      brands = await Brand.query();

  insertFromRecords(partyRecords, Party, partyRecordIdMap);

  console.log(`${partyRecords.length} parties inserted`, moment().format());

  for (const record of transactionRecords) {
    record.partyId = partyRecordIdMap[record.partyId]?.id;
    const entity = await Transaction.query().insertAndFetch({
      ...record,
      id: undefined
    }).returning('*');
    transactionRecordIdMap[record.id] = entity;
  }

  console.log(`${transactionRecords.length} transactions inserted`, moment().format());

  for (let record of productRecords) {
    let note;
    for (const [columnName, column] of Object.entries(record)) {
      if (columnName !== '') {
        const categoryNameMatch = columnName.match(/^category:name\["([a-z-]+)"\]$/i);
        const locale = categoryNameMatch?.[1];
        const attribute = (
          columnName.match(/^attribute:(.*)(\s\((.*)\))/i) ||
          columnName.match(/^attribute:(.*)/i)
        );
        if (attribute) {
          delete record[columnName];
          if (column) {
            let found = false,
                attributeEntity,
                value;
            for (let m in attributes) {
              if (Object.values(attributes[m].name).includes(attribute[1])) {
                attributeEntity = {
                  id: attributes[m].id
                }
                found = true;
                break;
              }
            }
            if (!found) {
              attributeEntity = {
                name: {
                  'fi-FI': attribute[1],
                  'en-US': attribute[1]
                }
              };
            }
            value = parseFloat(column.replace(',', '.'));
            record.attributes = [
              ...record.attributes || [],
              {
                attribute: attributeEntity,
                value,
                unit: attribute[3]
              }
            ];
          }
        } else if (columnName === 'brand:name') {
          if (column) {
            for (const b of brands) {
              if (b.name.toLowerCase() === column.toLowerCase()) {
                record.brandId = b.id;
                break;
              }
            }
          }
          delete record[columnName];
        } else if (categoryNameMatch) {
          if (column) {
            let found = false;
            let categoryEntity;
            for (const c of categories) {
              if (Object.values(c.name).some(name => name.toLowerCase() === column.toLowerCase())) {
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
          }
          delete record[columnName];
        } else if (columnName.toLowerCase() === 'note') {
          note = column;
          delete record[columnName];
        } else if (columnName.toLowerCase() === 'sourceid') {
          if (column) {
            const sourceRecord = sourceRecords.find(source => source.id === column);
            if (sourceRecord) {
              const source = sources.find(s => !Object.entries(sourceRecord).some(([key, value]) => key !== 'id' && value != s[key]));
              if (source) {
                for (const m in record.attributes) {
                  if (!record.attributes[m].sources) {
                    record.attributes[m].sources = [];
                  }
                  record.attributes[m].sources.push({
                    sourceId: source.id,
                    note
                  });
                }
              }
            } else {
              console.error('Source not found for id', column);
            }
          }
          delete record[columnName];
        }
      }
    }
    record = {
      ...record,
      quantity: Number(record.quantity) || null,
      measure: Number(record.measure) || null,
      aliases: record.aliases ? JSON.parse(record.aliases) : null,
      id: undefined
    };
    const entity = await Product.query().upsertGraphAndFetch(record, {
      noDelete: true,
      relate: true
    }).returning('*');
    
    productRecordIdMap[record.id] = entity;
  }

  console.log(`${productRecords.length} products inserted`, moment().format());

  for (const record of itemRecords) {
    record.productId = productRecordIdMap[record.productId]?.id;
    record.transactionId = transactionRecordIdMap[record.transactionId]?.id;
    await Item.query().insertAndFetch({
      ...record,
      price: Number(record.price) || null,
      id: undefined
    }).returning('*');
  }

  console.log(`${itemRecords.length} items inserted`, moment().format());
};
