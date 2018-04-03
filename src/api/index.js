"use strict";

module.exports = function(api) {
  require('./export.js')(api);
  require('./receipt.js')(api);
  require('./product.js')(api);
  require('./transaction.js')(api);
  require('./item.js')(api);
  require('./category.js')(api);
  require('./attribute.js')(api);
}