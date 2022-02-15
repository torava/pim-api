const createTableIfNotExists = (knex, table, callback) => (
  knex.schema.hasTable(table).then(exists => !exists && knex.schema.createTable(table, callback))
);

exports.up = (knex) => (
  createTableIfNotExists(knex, 'Party', table => {
    table.increments('id').primary();
    table.string('name');
    table.string('vat');
    table.string('streetName');
    table.string('streetNumber');
    table.string('postalCode');
    table.string('city');
    table.string('phoneNumber');
    table.string('email');
    table.string('countryCode');
    table.unique(['name', 'vat', 'streetName', 'streetNumber', 'city', 'countryCode']);
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
    table.decimal('totalPrice', 8, 2);
    table.decimal('totalPriceRead', 8, 2);
  }))
  .then(() => createTableIfNotExists(knex, 'Manufacturer', table => {
    table.increments('id').primary();
    table.string('name').unique();
    table.json('aliases');
    table.string('factoryLocation');
    table.string('headquartersLocation');
    table.integer('ownerId').unsigned().references('id').inTable('Manufacturer');
  }))
  .then(() => createTableIfNotExists(knex, 'Brand', table => {
    table.increments('id').primary();
    table.string('name').unique();
    table.json('aliases');
    table.string('factoryLocation');
    table.string('headquartersLocation');
    table.integer('ownerId').unsigned().references('id').inTable('Brand');
  }))
  .then(() => createTableIfNotExists(knex, 'Category', table => {
    table.increments('id').primary();
    table.jsonb('name');
    table.json('aliases');
    table.integer('parentId').unsigned().references('id').inTable('Category');
    table.unique(['name', 'parentId']);
  }))
  .then(() => createTableIfNotExists(knex, 'Product', table => {
    table.increments('id').primary();
    table.string('productNumber');
    table.string('name');
    table.json('aliases');
    table.string('contributionList');
    table.integer('quantity');
    table.float('measure');
    table.string('unit');
    table.integer('manufacturerId').unsigned().references('id').inTable('Manufacturer').onDelete('CASCADE');
    table.integer('brandId').unsigned().references('id').inTable('Brand').onDelete('CASCADE');
    table.integer('categoryId').unsigned().references('id').inTable('Category').onDelete('CASCADE');
  }))
  .then(() => createTableIfNotExists(knex, 'Item', table => {
    table.increments('id').primary();
    table.string('itemNumber');
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
    table.string('code');
    table.jsonb('name');
    table
      .integer('parentId')
      .unsigned()
      .references('id')
      .inTable('Attribute');
    table.unique(['code', 'name', 'parentId']);
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
  .then(() => createTableIfNotExists(knex, 'ProductContribution', table => {
    table.increments('id').primary();
    table.float('amount');
    table.string('unit');
    table
      .integer('productId')
      .unsigned()
      .references('id')
      .inTable('Product');
    table
      .integer('contributionId')
      .unsigned()
      .references('id')
      .inTable('Category');
    table.unique(['productId', 'contributionId']);
  }))
  .then(() => createTableIfNotExists(knex, 'ProductAttribute', table => {
    table.increments('id').primary();
    table.float('value');
    table.string('unit');
    table.string('type');
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
    table.unique(['value', 'unit', 'type', 'productId', 'attributeId']);
  }))
  .then(() => createTableIfNotExists(knex, 'CategoryAttribute', table => {
    table.increments('id').primary();
    table.float('value');
    table.string('unit');
    table.string('type');
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
    table.unique(['value', 'unit', 'type', 'categoryId', 'attributeId']);
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
    table.string('countryCode');
    table.string('publicationDate');
    table.string('publicationUrl');
    table.unique(['name', 'authors', 'publicationDate', 'publicationUrl']);
  }))
  .then(() => createTableIfNotExists(knex, 'CategoryAttributeSource', table => {
    table.increments('id').primary();
    table.string('referenceDate');
    table.string('referenceUrl');
    table.string('note');
    table.string('countryCode');
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
  .then(() => createTableIfNotExists(knex, 'ProductAttributeSource', table => {
    table.increments('id').primary();
    table.string('referenceDate');
    table.string('referenceUrl');
    table.string('note');
    table.string('countryCode');
    table
      .integer('attributeId')
      .unsigned()
      .references('id')
      .inTable('ProductAttribute')
      .onDelete('CASCADE');
    table
      .integer('sourceId')
      .unsigned()
      .references('id')
      .inTable('Source');
    table.unique(['attributeId', 'sourceId']);
  }))
  /*.then(() => createTableIfNotExists(knex, 'User', table => {
    table.increments('id').primary();
    table.string('name');
    table.string('password');
    table.unique(['name']);
  }))*/
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
    .dropTableIfExists('Brand')
    .dropTableIfExists('Category')
    .dropTableIfExists('ProductAttribute')
    .dropTableIfExists('CategoryAttribute')
    .dropTableIfExists('Attribute')
    .dropTableIfExists('CategoryContribution')
    .dropTableIfExists('ProductContribution')
    .dropTableIfExists('Conversion')
    .dropTableIfExists('Source')
    .dropTableIfExists('CategoryAttributeSource')
    .dropTableIfExists('ProductAttributeSource')
);
