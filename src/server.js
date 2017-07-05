'use strict';

import path from 'path';
import {Server} from 'http';
import Express from 'express';
import React from 'react';
import App from './components/app';
import {renderToString} from 'react-dom/server';
import {StaticRouter, RouterContext} from 'react-router';
import NotFoundPage from './components/NotFoundPage';

const app = new Express();
const server = new Server(app);
//app.set('view engine', 'ejs');
//app.set('views', path.join(__dirname, 'views'));

app.use(Express.static(path.join(__dirname, 'static')));

app.get('*', (req, res) => {
  /*routes.some(route=> {
    const match = matchPath(req.url, route);
    match(
      {routes, location: req.url},
      (err, redirectLocation, renderProps) => {
        if (err) {
          return res.status(500).send(err.message);
        }

        if (redirectLocation) {
          return res.redirect(302, redirectLocation.pathname+redirectLocation.search);
        }

        let markup;
        if (renderProps) {
          markup = renderToString(<RouterContext {...renderProps}/>);
        }
        else {
          markup = renderToString(<NotFoundPage/>);
          res.status(404);
        }

        return res.render('index', {markup});
      }
    );
  });*/
  const context = {};
  const html = renderToString(
    <StaticRouter location={req.url} context={context}>
      <App/>
    </StaticRouter>
  );
  return res.write('<!doctype html><div id="app">'+html+'</div>');
});

const port = process.env.PORT || 8080;
const env = process.env.NODE_ENV || 'production';
server.listen(port, err => {
  if (err) {
    return console.error(err);
  }
  console.info('Server running on http://localhost:'+port+' ['+env+']');
});