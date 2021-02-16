const CSV_SEPARATOR = ";";

export const getEntitiesFromCsv = (csv) => {
  const separator = CSV_SEPARATOR;
  const rows = csv.replace(/\r/g, '').trim().split('\n');
  const columnNames = rows[0].split(separator);
  const items = [];
  rows.forEach(row => {
    let item = {};
    const columns = row.split(separator);
    columns.forEach((column, index) => {
      item[columnNames[index]] = column;
    });
    items.push(item);
  });
  return items;
};
