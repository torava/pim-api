import _ from 'lodash';
import CategoryShape from '@torava/product-utils/dist/models/Category';
import SourceShape from '@torava/product-utils/dist/models/Source';
import { Locale } from '@torava/product-utils/dist/utils/types';
import { getStrippedCategories } from '@torava/product-utils/dist/utils/categories';

import Attribute from '../models/Attribute';
import Category from '../models/Category';
import Manufacturer from '../models/Manufacturer';
import Source from '../models/Source';
import { ObjectEntries } from './types';

export const getCategoriesFromCsv = async (records: {[key: string]: string}[], sourceRecords: {[key: string]: string}[], sourceRecordIdMap: {[key: string]: SourceShape} = {}) => {
  try {
    let item: CategoryShape,
        found,
        attribute,
        note,
        attributes = await Attribute.query(),
        categories = await Category.query(),
        attributeObject,
        value;

    for await (const sourceRecord of sourceRecords) {
      let source = sourceRecordIdMap[sourceRecord.id];
      if (!source) {
        const sourceRecordWithoutId: SourceShape = {...sourceRecord};
        delete sourceRecordWithoutId.id;
        try {
          source = await Source.query().insertAndFetch(sourceRecordWithoutId).returning('*');
          sourceRecordIdMap[sourceRecord.id] = {id: source.id};
        } catch (error) {
          console.error('Error while adding source', sourceRecord);
        }
      }
    }

    for (const columns of records) {
      item = {};
      note = '';
      const ids = [];
      for (const [columnName, column] of ObjectEntries(columns)) {
        if (columnName !== '' && column !== '') {
          attribute = columnName.match(/^attribute:(.*)(\s\((.*)\))/i) ||
                      columnName.match(/^attribute:(.*)/i);
          let nameMatch = columnName.match(/^(name|nimi)\["([a-z-]+)"\]$/i),
              name,
              locale;
          if (nameMatch) {
            name = nameMatch[1];
            locale = nameMatch[2] as Locale;
          }
          if (attribute) {
            found = false;
            for (let m in attributes) {
              if (Object.values(attributes[m].name).includes(attribute[1])) {
                attributeObject = {
                  id: attributes[m].id
                }
                found = true;
                break;
              }
            }
            if (!found) {
              attributeObject = {
                name: {
                  'fi-FI': attribute[1],
                  'en-US': attribute[1]
                }
              };
            }
            value = parseFloat(column.replace(',', '.'));
            item = {
              ...item || {},
              attributes: [
                ...item.attributes || [],
                {
                  attribute: attributeObject,
                  value,
                  unit: attribute[3]
                }
              ]
            };
          } else if (columnName.toLowerCase() === 'note') {
            note = column;
          } else if (columnName.toLowerCase() === 'sourceid') {
            const sourceRecord = sourceRecords.find(source => source.id === column);
            let source = sourceRecordIdMap[sourceRecord.id];
            if (sourceRecord) {
              for (const m in item.attributes) {
                if (!item.attributes[m].sources) {
                  item.attributes[m].sources = [];
                }
                item.attributes[m].sources.push({
                  sourceId: source.id,
                  note
                });
              }
            } else {
              console.error('Source not found for id', column);
            }
          } else if (name && locale) {
            if (!item.id) {
              for (const category of categories) {
                if (category.name?.[locale] && category.name[locale].toLowerCase().trim() === column?.toLowerCase().trim()) {
                  item.id = category.id;
                  ids.push(category.id);
                  delete item.name;
                }
              }
              if (!item.id) {
                if (!item.name) item.name = {};
                item.name[locale] = column;
              }
            }
          } else if (columnName.toLowerCase() === 'aliases') {
            try {
              const aliases = JSON.parse(column);
              if (aliases) {
                _.set(item, columnName, aliases);
              }
            } catch (error) {
              console.error('Aliases parse error', column, error);
            }
          } else if (['parent'].indexOf(columnName.toLowerCase()) === -1) {
            _.set(item, columnName, column);
          }
        }
      }
      if (ids.length > 1) {
        for await (const id of ids) {
          await Category.query().upsertGraph({...item, id} as Category, {
            noDelete: true,
            relate: true
          });
        }
      } else {
        await Category.query().upsertGraph(item as Category, {
          noDelete: true,
          relate: true
        });
      }
      categories = await Category.query();
      attributes = await Attribute.query();
    }
    console.log(`read ${records.length} records`);
    //console.dir(items, {depth: null, maxArrayLength: null});
  } catch (error) {
    console.error(error);
  }
};

export const getCategoryParentsFromCsv = async (records: {[key: string]: string}[]) => {
  try {
    let items: CategoryShape[] = [],
        item: CategoryShape,
        categories = await Category.query();

    records.forEach(columns => {
      item = {};
      Object.entries(columns).forEach(([columnName, column]) => {
        let nameMatch = columnName.match(/^(name|nimi)\["([a-z-]+)"\]$/i),
            name,
            locale;
        if (nameMatch) {
          name = nameMatch[1];
          locale = nameMatch[2] as Locale;
        }
        if (name && locale) {
          if (column === '') return true;
          if (!item.id) {
            for (let i in categories) {
              if (categories[i].name?.[locale] && categories[i].name[locale].toLowerCase().trim() === column?.toLowerCase().trim()) {
                item.id = categories[i].id;
                break;
              }
            }
          }
        }
        else if (['parent'].indexOf(columnName.toLowerCase()) !== -1) {
          if (column === '') return true;
          for (let i in categories) {
            if (categories[i].name && Object.values(categories[i].name).some(category => category.toLowerCase().trim() === column.toLowerCase().trim())) {
              item.parent = {
                id: categories[i].id
              }
              break;
            }
          }
        }
      });
      if (item.parent) {
        items.push(item);
      }
    });
    console.log(`read ${records.length} records and found ${items.length} category parents`);
    //console.dir(items, {depth: null, maxArrayLength: null});
    return items;
  } catch (error) {
    console.error(error);
  }
};

export const getStrippedChildCategories = async () => {
  const categories = (await Category.query()
  .withGraphFetched('[contributions, children, attributes]'));

  const childCategories = categories.filter(category => !category.children?.length);
  const manufacturers = await Manufacturer.query();
  const strippedCategories = getStrippedCategories(childCategories, manufacturers);

  return strippedCategories;
};
