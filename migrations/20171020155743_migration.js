
exports.up = function(knex, Promise) {
  return knex.schema
  .createTable('Transaction', function(table) {
    table.increments('id').primary();
    table.dateTime('date');
    table.integer('partyId').unsigned().references('id').inTable('Party');
    table.decimal('total_price', 2);
    table.decimal('total_price_read', 2);
  })
  .createTable('Party', function(table) {
    table.increments('id').primary();
    table.string('name');
    table.string('vat');
    table.string('street_name');
    table.string('street_number');
    table.string('postal_code');
    table.string('city');
    table.string('phone_number');
  })
  .createTable('Item', function(table) {
    table.increments('id').primary();
    table.string('item_number');
    table.string('text');
    table.decimal('price', 2);
    table.integer('quantity');
    table.float('measure');
    table.string('unit');
    table.integer('transactionId').unsigned().references('id').inTable('Transaction');
    table.integer('productId').unsigned().references('id').inTable('Product');
  })
  .createTable('Receipt', function(table) {
    table.increments('id').primary();
    table.string('file');
    table.text('text');
    table.integer('transactionId').unsigned().references('id').inTable('Transaction');
  })
  .createTable('Product', function(table) {
    table.increments('id').primary();
    table.string('product_number');
    table.string('name');
    table.integer('manufacturerId').unsigned().references('id').inTable('Manufacturer');
    table.integer('categoryId').unsigned().references('id').inTable('Category');
  })
  .createTable('Manufacturer', function(table) {
    table.increments('id').primary();
    table.string('name');
    table.string('factory_location');
    table.string('manufacturer_location');
    table.integer('ownerId').unsigned().references('id').inTable('Manufacturer');
  })
  .createTable('Category', function(table) {
    table.increments('id').primary();
    table.string('name');
    table.integer('parentId').unsigned().references('id').inTable('Category');
  })
  .createTable('ProductAttribute', function(table) {
    table.string('name');
    table.float('value');
    table.integer('productId').unsigned().references('id').inTable('Product');
  })
  .createTable('CategoryAttribute', function(table) {
    table.string('name');
    table.float('value');
    table.integer('categoryId').unsigned().references('id').inTable('Category');
  });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('Transaction')
    .dropTableIfExists('Party')
    .dropTableIfExists('Item')
    .dropTableIfExists('Receipt')
    .dropTableIfExists('Product')
    .dropTableIfExists('Manufacturer')
    .dropTableIfExists('Category')
    .dropTableIfExists('ProductAttribute')
    .dropTableIfExists('CategoryAttribute');
};
