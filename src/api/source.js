const Source = require('../models/Source');
const express = require('express');
const app = express();
const _ = require('lodash');

module.exports = function (app) {

app.get('/api/source', function(req, res) {
  Source.query()
    .then(result => {
      res.send(result);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
});

}