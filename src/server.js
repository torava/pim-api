'use strict';

import path from 'path';
import {Server, createServer} from 'http';
import Express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import React from 'react';
import App from './components/app';
import registerApi from './api';
import {renderToString} from 'react-dom/server';
import {StaticRouter, RouterContext} from 'react-router';
import NotFoundPage from './components/NotFoundPage';
import fs from 'fs';
import tesseract from 'node-tesseract';
import Knex from 'knex';
import knexConfig from '../knexfile';
import {Model} from 'objection';

const app = new Express();
const server = new Server(app);

// define the folder that will be used for static assets
app.use(Express.static(path.join(__dirname, 'static')));

// Initialize knex.
const knex = Knex(knexConfig.development);

// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex method.
Model.knex(knex);

/** bodyParser.urlencoded(options)
 * Parses the text as URL encoded data (which is how browsers tend to send form data from regular forms set to POST)
 * and exposes the resulting object (containing the keys and values) on req.body
 */
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '50mb'
}));

/**bodyParser.json(options)
* Parses the text as JSON and exposes the resulting object on req.body.
*/
app.use(bodyParser.json({limit: '50mb'}));

const port = process.env.PORT || 8080;
const env = process.env.NODE_ENV || 'production';

registerApi(app);

app.get('*', (req, res) => {
  const context = {};
  const html = renderToString(
    <StaticRouter location={req.url} context={context}>
      <App/>
    </StaticRouter>
  );
  res.write('<!doctype html><meta charset="utf8"><link rel="stylesheet" href="/css/react-table.css"><link rel="stylesheet" href="/css/cropper.css"><link rel="stylesheet" href="/css/style.css"><div id="app">'+html+'</div>'+"\n"+'<script src="/js/bundle.js"></script>');
  res.end();
});

server.listen(port, (err) => {
  if (err) {
    return console.error(err);
  }
  return console.info(
    `
      Server running on http://localhost:${port} [${env}]
    `);
});

export default server;