const Product = require('../models/Product');
const express = require('express');
const app = express();
const _ = require('lodash');

module.exports = function (app) {

app.get('/api/product', function(req, res) {
  Product.query()
  .eager('[category.[parent.^], items.[transaction]]')
    .then(product => {
      res.send(product);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
});

}