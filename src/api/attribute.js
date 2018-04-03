const Attribute = require('../models/Attribute');
const express = require('express');
const app = express();
module.exports = function (app) {

app.get('/api/attribute', function(req, res) {
  if (req.query.hasOwnProperty('parent')) {
    Attribute.query()
    .where('parentId', req.query.parent || null)
    .eager('[children.^]')
    .then(attributes => {
      res.send(attributes);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
  }
  else {
    Attribute.query()
    .then(attributes => {
      res.send(attributes);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });    
  }
});

}