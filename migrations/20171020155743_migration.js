exports.up = function(knex, Promise) {
  return knex.schema
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
  .createTable('Transaction', function(table) {
    table.increments('id').primary();
    table.dateTime('date');
    table.integer('partyId').unsigned().references('id').inTable('Party');
    table.decimal('total_price', 8, 2);
    table.decimal('total_price_read', 8, 2);
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
    table.json('name');
    table.json('aliases');
    table.integer('parentId').unsigned().references('id').inTable('Category');
  })
  .createTable('Product', function(table) {
    table.increments('id').primary();
    table.string('product_number');
    table.string('name');
    table.integer('manufacturerId').unsigned().references('id').inTable('Manufacturer').onDelete('CASCADE');
    table.integer('categoryId').unsigned().references('id').inTable('Category').onDelete('CASCADE');
  })
  .createTable('Item', function(table) {
    table.increments('id').primary();
    table.string('item_number');
    table.string('text');
    table.decimal('price', 8, 2);
    table.integer('quantity');
    table.float('measure');
    table.string('unit');
    table.integer('transactionId').unsigned().references('id').inTable('Transaction').onDelete('CASCADE');
    table.integer('productId').unsigned().references('id').inTable('Product').onDelete('CASCADE');
  })
  .createTable('Receipt', function(table) {
    table.increments('id').primary();
    table.string('file');
    table.text('text');
    table.string('locale');
    table
      .integer('transactionId')
      .unsigned()
      .references('id')
      .inTable('Transaction')
      .onDelete('CASCADE');
  })
  .createTable('Attribute', function(table) {
    table.increments('id').primary();
    table.json('name');
    table.string('unit');
    table
      .integer('parentId')
      .unsigned()
      .references('id')
      .inTable('Attribute');
  })
  .createTable('CategoryContribution', function(table) {
    table.increments('id').primary();
    table.float('amount');
    table.string('unit');
    table
      .integer('categoryId')
      .unsigned()
      .references('id')
      .inTable('Category');
    table
      .integer('contributionId')
      .unsigned()
      .references('id')
      .inTable('Category');
  })
  .createTable('ProductAttribute', function(table) {
    table.increments('id').primary();
    table.float('value');
    table.string('unit');
    table
      .integer('productId')
      .unsigned()
      .references('id')
      .inTable('Product');
    table
      .integer('attributeId')
      .unsigned()
      .references('id')
      .inTable('Attribute');
  })
  .createTable('CategoryAttribute', function(table) {
    table.increments('id').primary();
    table.float('value');
    table.string('unit');
    table
      .integer('categoryId')
      .unsigned()
      .references('id')
      .inTable('Category');
    table
      .integer('attributeId')
      .unsigned()
      .references('id')
      .inTable('Attribute');
  })
  .createTable('Conversion', function(table) {
    table.increments('id').primary();
    table.string('fromLocale').unique();
    table.string('fromCurrency').unique();
    table.string('toLocale').unique();
    table.string('toCurrency').unique();
    table.float('rate');
  })
  .createTable('Source', function(table) {
    table.increments('id').primary();
    table.string('name');
    table.string('authors');
    table.string('publication_date');
    table.string('publication_url');
  })
  .createTable('CategoryAttributeSource', function(table) {
    table.increments('id').primary();
    table.string('reference_date');
    table.string('reference_url');
    table.string('note');
    table
      .integer('attributeId')
      .unsigned()
      .references('id')
      .inTable('CategoryAttribute');
    table
      .integer('sourceId')
      .unsigned()
      .references('id')
      .inTable('Source');
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
    .dropTableIfExists('CategoryAttribute')
    .dropTableIfExists('Attribute')
    .dropTableIfExists('Conversion')
    .dropTableIfExists('Source')
    .dropTableIfExists('CategoryAttributeSource')
};
