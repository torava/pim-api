'use strict';

import path from 'path';
import {Server, createServer} from 'http';
import Express from 'express';
import React from 'react';
import App from './components/app';
import {renderToString} from 'react-dom/server';
import {StaticRouter, RouterContext} from 'react-router';
import NotFoundPage from './components/NotFoundPage';

const app = new Express();
const server = new Server(app);

// define the folder that will be used for static assets
app.use(Express.static(path.join(__dirname, 'static')));

const port = process.env.PORT || 8080;
const env = process.env.NODE_ENV || 'production';

app.get('*', (req, res) => {
  const context = {};
  const html = renderToString(
    <StaticRouter location={req.url} context={context}>
      <App/>
    </StaticRouter>
  );
  res.write('<!doctype html><div id="app">'+html+'</div>'+"\n"+'<script src="/js/bundle.js"></script>');
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