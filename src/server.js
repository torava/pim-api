'use strict';

import {Server} from 'http';
import Express from 'express';
import bodyParser from 'body-parser';
import registerApi from './api';
import Knex from 'knex';
import knexConfig from '../knexfile';
import {Model} from 'objection';

const app = new Express();
const server = new Server(app);

// define the folder that will be used for static assets
app.use(Express.static('src/static'));

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

const port = process.env.PORT || 42809;
const env = process.env.NODE_ENV || 'production';

registerApi(app);

server.listen(port, (err) => {
  if (err) {
    return console.error(err);
  }
  return console.info(
    `
      Server running on http://localhost:${port} [${env}]
    `);
});