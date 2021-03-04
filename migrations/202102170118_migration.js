const createTableIfNotExists = (knex, table, callback) => (
  knex.schema.hasTable(table).then(exists => !exists && knex.schema.createTable(table, callback))
);

exports.up = (knex) => (
  createTableIfNotExists(knex, 'Party', table => {
    table.increments('id').primary();
    table.string('name');
    table.string('vat');
    table.string('street_name');
    table.string('street_number');
    table.string('postal_code');
    table.string('city');
    table.string('phone_number');
    table.string('email');
    table.string('country_code');
    table.unique(['name', 'vat', 'street_name', 'street_number', 'city', 'country_code']);
  })
  .then(() => createTableIfNotExists(knex, 'Group', table => {
    table.increments('id').primary();
    table.string('name').unique();
  }))
  .then(() => createTableIfNotExists(knex, 'Transaction', table => {
    table.increments('id').primary();
    table.dateTime('date');
    table.integer('partyId').unsigned().references('id').inTable('Party');
    table.integer('groupId').unsigned().references('id').inTable('Group');
    table.decimal('total_price', 8, 2);
    table.decimal('total_price_read', 8, 2);
  }))
  .then(() => createTableIfNotExists(knex, 'Manufacturer', table => {
    table.increments('id').primary();
    table.string('name').unique();
    table.json('aliases');
    table.string('factory_location');
    table.string('manufacturer_location');
    table.integer('ownerId').unsigned().references('id').inTable('Manufacturer');
  }))
  .then(() => createTableIfNotExists(knex, 'Category', table => {
    table.increments('id').primary();
    table.jsonb('name');
    table.specificType('aliases', 'text ARRAY');
    table.integer('parentId').unsigned().references('id').inTable('Category');
    table.unique(['name', 'parentId']);
  }))
  .then(() => createTableIfNotExists(knex, 'Product', table => {
    table.increments('id').primary();
    table.string('product_number');
    table.string('name');
    table.integer('quantity');
    table.float('measure');
    table.string('unit');
    table.integer('manufacturerId').unsigned().references('id').inTable('Manufacturer').onDelete('CASCADE');
    table.integer('categoryId').unsigned().references('id').inTable('Category').onDelete('CASCADE');
  }))
  .then(() => createTableIfNotExists(knex, 'Item', table => {
    table.increments('id').primary();
    table.string('item_number');
    table.string('text');
    table.decimal('price', 8, 2);
    table.integer('quantity');
    table.float('measure');
    table.string('unit');
    table.integer('transactionId').unsigned().references('id').inTable('Transaction').onDelete('CASCADE');
    table.integer('productId').unsigned().references('id').inTable('Product').onDelete('CASCADE');
  }))
  .then(() => createTableIfNotExists(knex, 'Receipt', table => {
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
  }))
  .then(() => createTableIfNotExists(knex, 'Attribute', table => {
    table.increments('id').primary();
    table.jsonb('name');
    table
      .integer('parentId')
      .unsigned()
      .references('id')
      .inTable('Attribute');
    table.unique(['name', 'parentId']);
  }))
  .then(() => createTableIfNotExists(knex, 'CategoryContribution', table => {
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
    table.unique(['categoryId', 'contributionId']);
  }))
  .then(() => createTableIfNotExists(knex, 'ProductAttribute', table => {
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
      .inTable('Attribute')
      .onDelete('CASCADE');
    table.unique(['value', 'unit', 'productId', 'attributeId']);
  }))
  .then(() => createTableIfNotExists(knex, 'CategoryAttribute', table => {
    table.increments('id').primary();
    table.float('value');
    table.string('unit');
    table
      .integer('categoryId')
      .unsigned()
      .references('id')
      .inTable('Category')
      .onDelete('CASCADE');
    table
      .integer('attributeId')
      .unsigned()
      .references('id')
      .inTable('Attribute')
      .onDelete('CASCADE');
    table.unique(['value', 'unit', 'categoryId', 'attributeId']);
  }))
  .then(() => createTableIfNotExists(knex, 'Conversion', table => {
    table.increments('id').primary();
    table.string('fromLocale').unique();
    table.string('fromCurrency').unique();
    table.string('toLocale').unique();
    table.string('toCurrency').unique();
    table.float('rate');
  }))
  .then(() => createTableIfNotExists(knex, 'Source', table => {
    table.increments('id').primary();
    table.string('name');
    table.string('authors');
    table.string('country_code');
    table.string('publication_date');
    table.string('publication_url');
    table.unique(['name', 'authors', 'publication_url']);
  }))
  .then(() => createTableIfNotExists(knex, 'CategoryAttributeSource', table => {
    table.increments('id').primary();
    table.string('reference_date');
    table.string('reference_url');
    table.string('note');
    table
      .integer('attributeId')
      .unsigned()
      .references('id')
      .inTable('CategoryAttribute')
      .onDelete('CASCADE');
    table
      .integer('sourceId')
      .unsigned()
      .references('id')
      .inTable('Source');
    table.unique(['attributeId', 'sourceId']);
  }))
);

exports.down = knex => (
  knex.schema
    .dropTableIfExists('Transaction')
    .dropTableIfExists('Group')
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
);
