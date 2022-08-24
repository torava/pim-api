import AttributeShape from "@torava/product-utils/dist/models/Attribute";
import ItemShape from "@torava/product-utils/dist/models/Item";
import PartyShape from "@torava/product-utils/dist/models/Party";
import ProductShape from "@torava/product-utils/dist/models/Product";
import SourceShape from "@torava/product-utils/dist/models/Source";
import TransactionShape from "@torava/product-utils/dist/models/Transaction";
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

export const getItemNameByDepth = (item: ItemShape, depth: number) => {
  let name,
      id = undefined;
  if (!item || !item.product) {
    id = 0;
    name = 'Uncategorized';
    return {id, name};
  }
  if (depth > 2) {
    let current_depth, child = undefined;
    if (item.product.category) {
      //child = item.product.category;
      if (item.product.category.parent) {
        current_depth = depth-2;
        child = item.product.category.parent;
        while (current_depth > 0) {
          if (child && child.parent) {
            child = child.parent;
            current_depth-= 1;
          }
          else {
            //child = false;
            break;
          }
        }
      }
    }
    if (child) {
      id = `c${child.id}`;
      name = child.name;
    }
  }
  if ((!id || depth == 2) && item.product.category && item.product.category.parent) {
    id = `c${item.product.category.parent.id}`;
    name = item.product.category.parent.name;
  }
  if ((!id || depth == 1) && item.product.category) {
    id = `c${item.product.category.id}`;
    name = item.product.category.name;
  }
  if (depth == 0) {
    id = `p${item.product.id}`;
    name = item.product.name;
  }
  if (typeof id == 'undefined') {
    id = 0;
    name = 'Uncategorized';
  }
  return {id, name};
};

export const getItemQuantity = (item: ItemShape) => item.quantity || item.product.quantity;
export const getItemMeasure = (item: ItemShape) => item.measure || item.product.measure;
export const getItemUnit = (item: ItemShape) => item.unit || item.product.unit;

export const getItemsFromCsv = async (
  itemRecords: ItemShape[],
  productRecords: {[key: string]: any}[],
  partyRecords: PartyShape[],
  transactionRecords: TransactionShape[],
  sourceRecords: SourceShape[] = []
) => {
  let transactionRecordIdMap: {[key: number]: Transaction} = {},
      partyRecordIdMap: {[key: string]: Party} = {},
      productRecordIdMap: {[key: string]: Product} = {},
      categories = await Category.query(),
      attributes = await Attribute.query(),
      sources = await Source.query(),
      brands = await Brand.query();

  insertFromRecords(partyRecords, Party, partyRecordIdMap);

  console.log(`${partyRecords.length} parties inserted`, moment().format());

  for (const record of transactionRecords) {
    record.partyId = partyRecordIdMap[record.partyId]?.id;
    const entity = await Transaction.query()
      .insertAndFetch({
        ...record,
        id: undefined,
      })
      .returning("*");
    transactionRecordIdMap[record.id] = entity;
  }

  console.log(
    `${transactionRecords.length} transactions inserted`,
    moment().format()
  );

  for (let record of productRecords) {
    let note;
    const recordId = record.id;
    for (const [columnName, column] of Object.entries(record)) {
      if (columnName !== "") {
        const categoryNameMatch = columnName.match(
          /^category:name\["([a-z-]+)"\]$/i
        );
        const locale = categoryNameMatch?.[1];
        const attribute =
          columnName.match(/^attribute:(.*)(\s\((.*)\))/i) ||
          columnName.match(/^attribute:(.*)/i);
        if (attribute) {
          delete record[columnName as keyof ProductShape];
          if (column) {
            let found = false,
                attributeEntity: AttributeShape,
                value;
            for (let m in attributes) {
              if (Object.values(attributes[m].name).includes(attribute[1])) {
                attributeEntity = {
                  id: attributes[m].id,
                };
                found = true;
                break;
              }
            }
            if (!found) {
              attributeEntity = {
                name: {
                  "fi-FI": attribute[1],
                  "en-US": attribute[1],
                },
              };
            }
            value = parseFloat(column.replace(",", "."));
            record.attributes = [
              ...(record.attributes || []),
              {
                attribute: attributeEntity,
                value,
                unit: attribute[3],
              },
            ];
          }
        } else if (columnName === "brand:name") {
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
              if (
                c.name &&
                Object.values(c.name).some(
                  (name) => name.toLowerCase() === column.toLowerCase()
                )
              ) {
                categoryEntity = {
                  id: c.id,
                };
                found = true;
                break;
              }
            }
            if (!found) {
              categoryEntity = {
                name: {
                  [locale]: column,
                },
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
            const sourceRecord = sourceRecords.find(
              (source) => source.id === column
            );
            if (sourceRecord) {
              const source = sources.find(
                (s) =>
                  !Object.entries(sourceRecord).some(
                    ([key, value]) => key !== "id" && value != s[key as keyof Source]
                  )
              );
              if (source) {
                for (const m in record.attributes) {
                  if (!record.attributes[m].sources) {
                    record.attributes[m].sources = [];
                  }
                  record.attributes[m].sources.push({
                    sourceId: source.id,
                    note,
                  });
                }
              }
            } else {
              console.error("Source not found for id", column);
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
      id: undefined,
    };
    const entity = await Product.query()
      .upsertGraphAndFetch(record, {
        noDelete: true,
        relate: true,
      })
      .returning("*");

    productRecordIdMap[recordId] = entity;
  }

  console.log(`${productRecords.length} products inserted`, moment().format());

  for (const record of itemRecords) {
    record.productId = productRecordIdMap[record.productId]?.id;
    record.transactionId = transactionRecordIdMap[record.transactionId]?.id;
    await Item.query()
      .insertAndFetch({
        ...record,
        price: Number(record.price) || null,
        id: undefined,
      })
      .returning("*");
  }

  console.log(`${itemRecords.length} items inserted`, moment().format());
};
