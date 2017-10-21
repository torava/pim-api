
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
    table.string('name');
    table.string('text');
    table.decimal('price', 2);
    table.integer('quantity');
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
    table.string('serial_number');
    table.string('name');
  });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('Transaction')
    .dropTableIfExists('Party')
    .dropTableIfExists('Item')
    .dropTableIfExists('Receipt')
    .dropTableIfExists('Product');
};
