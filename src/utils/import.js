import parse from 'csv-parse/lib/sync';

export const getEntitiesFromCsv = (csv) => {
  const records = parse(csv, {
    columns: true,
    skipEmptyLines: true
  }).map(record => ({
    ...record,
    id: undefined
  }));
  return records;
};
