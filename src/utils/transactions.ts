import { get, set } from 'lodash';
import moment from 'moment';

import { getNumber, toTitleCase } from '@torava/product-utils/dist/utils/transactions';

import { TRANSACTION_CSV_COLUMNS } from '../api/transaction';
import Transaction from '../models/Transaction';
import { DeepPartial } from './types';

export const getTransactionsFromCsv = (
  rows: any,
  startingRow: number,
  indexes: number[],
  template: string,
) => {
  const transactions: Record<string, DeepPartial<Transaction>> = {};
  let itemIndex = 0;
  let columns: string[];
  for (let i = startingRow; i < rows.length; i++) {
    let columnKey = '';
    columns = rows[i];
    indexes.forEach((index) => {
      columnKey += columns[index];
    });
    if (!(columnKey in transactions)) {
      itemIndex = 0;
      transactions[columnKey] = { items: [], party: {}, receipts: [], totalPrice: 0 };
    }
    for (const n in columns) {
      let columnName = TRANSACTION_CSV_COLUMNS[template as keyof typeof TRANSACTION_CSV_COLUMNS](itemIndex)[n];

      let value = columns[n];
      let numberValue: number;

      if (!columnName || !value) continue;

      console.log(i, columnName, value);

      if (columnName.split('.').includes('name') || columnName.split('.').includes(`name['fi-FI']`)) {
        value = toTitleCase(value);

        const quantityAndMeasureTokens = value.toLocaleLowerCase().match(/(\d+)x(\d+(,\d+)?)\s?((m|k)?(g|l))(\s|$)/);
        let quantity = quantityAndMeasureTokens && getNumber(quantityAndMeasureTokens[1]);
        const quantityTokens = value.toLocaleLowerCase().match(/(\d+)\s?(p|ps|pss|kpl)(\s|$)/);
        if (quantityTokens) {
          quantity = getNumber(quantityTokens[1]);
        }
        if (quantity) {
          set(transactions[columnKey], `items[${itemIndex}].quantity`, quantity);
        } else {
          const measureTokens = value.toLocaleLowerCase().match(/\s((m|k)?(g|l))(\s|$)/);
          if (measureTokens) {
            set(transactions[columnKey], `items[${itemIndex}].unit`, measureTokens[1]);
          }
          const tokens = value.toLocaleLowerCase().match(/(\d+(,\d+)?)\s?((m|k)?(g|l))(\s|$)/);
          const measure = tokens && getNumber(tokens[1]);
          if (measure) {
            set(transactions[columnKey], `items[${itemIndex}].measure`, measure);
            set(transactions[columnKey], `items[${itemIndex}].unit`, tokens[3]);
          }
        }
      }

      if (columnName.split('.')[1] === 'quantity_or_measure') {
        if (value.match(/^-?\d+(\.|,)\d+$/)) {
          columnName = columnName.replace('quantity_or_measure', 'measure');
          numberValue = getNumber(value);
        } else {
          columnName = columnName.replace('quantity_or_measure', 'quantity');
          numberValue = getNumber(value);
        }
      } else if (columnName === 'date_fi_FI') {
        let date = value.split('.');
        value = moment().format(`${date[2]}-${date[1].padStart(2, '0')}-${date[0].padStart(2, '0')}`);
        columnName = 'date';
      } else if (columnName === 'time') {
        let time = value.split(':');
        value = moment(transactions[columnKey].date).add(time[0], 'hours').add(time[1], 'minutes').format();
        columnName = 'date';
      } else if (columnName.split('.')[1] === 'price') {
        numberValue = getNumber(value);
        transactions[columnKey].totalPrice += numberValue;
      }
      if (columnName !== 'id') {
        if (typeof numberValue === 'number') {
          if (columnName.includes('quantity')) {
            set(transactions[columnKey], columnName, numberValue * (get(transactions[columnKey], columnName) || 1));
          } else {
            set(transactions[columnKey], columnName, numberValue);
          }
        } else {
          set(transactions[columnKey], columnName, value);
        }
      }
    }
    itemIndex++;
  }
  return transactions;
};
