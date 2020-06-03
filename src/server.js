'use strict';

import {Server} from 'http';
import Express from 'express';
import bodyParser from 'body-parser';
import registerApi from './api';
import Knex from 'knex';
import knexConfig from '../knexfile';
import {Model} from 'objection';
import {JSDOM} from 'jsdom';
import mongo from './utils/mongo';
import { Canvas, createCanvas, Image, ImageData } from 'canvas';

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

// https://github.com/brianc/node-postgres/issues/811
const types = require('pg').types;
types.setTypeParser(1700, function(val) {
    return parseFloat(val);
});

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

// Using jsdom and node-canvas we define some global variables to emulate HTML DOM.
// Although a complete emulation can be archived, here we only define those globals used
// by cv.imread() and cv.imshow().
function installDOM() {
  const dom = new JSDOM();
  global.document = dom.window.document;
  // The rest enables DOM image and canvas and is provided by node-canvas
  global.Image = Image;
  global.HTMLCanvasElement = Canvas;
  global.ImageData = ImageData;
  global.HTMLImageElement = Image;
}

function loadOpenCV() {
  return new Promise(resolve => {
    global.Module = {
      onRuntimeInitialized: resolve
    };
    global.cv = require('./static/lib/opencv.js');
  });
}

installDOM();
loadOpenCV();

global.createCanvas = (width, height) => createCanvas(width, height);

async function initializeMongoDB() {
  await mongo.initialize();
}
initializeMongoDB();

server.listen(port, (err) => {
  if (err) {
    return console.error(err);
  }
  return console.info(
    `
      Server running on http://localhost:${port} [${env}]
    `);
});