import Express from 'express';
import compression from 'compression';
import Knex from 'knex';
import {Model} from 'objection';
import {JSDOM} from 'jsdom';
import { Canvas, createCanvas, Image, ImageData } from 'canvas';
import path from 'path';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';

import knexConfig from '../knexfile';
import registerApi from './api';
import swaggerDocument from '../swagger.json';

export const app = new Express();

app.use(compression());

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

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

const env = process.env.NODE_ENV || 'production';

let port;
if (env === 'production') {
  port = process.env.PORT || 42808;
  // define the folder that will be used for static assets
  app.use(Express.static('src/static', {
    index: false
  }));

  app.get('/', (req, res) => {
    return res.sendStatus(404);
  });

  app.get('/*', (req, res, next) => {
    const {
      USER,
      PASSWORD
    } = process.env;

    // parse login and password from headers
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const strauth = Buffer.from(b64auth, 'base64').toString();
    const [, user, password] = strauth.match(/(.*?):(.*)/) || [];

    // Verify login and password are set and correct
    if (user !== USER || password !== PASSWORD) {
      // Access denied...
      res.set('WWW-Authenticate', 'Basic realm="401"') // change this
      res.status(401).send('Authentication required.') // custom message
    } else if (req.originalUrl.match(/^\/api\//)) {
      next();
    } else {
      res.sendFile(path.resolve(__dirname, 'static', 'index.html'), error => {
        console.error(error);
        if (error) {
          res.status(500);
        }
      });
    }
  });
} else {
  port = process.env.PORT || 42809;
}

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

app.listen(port, (err) => {
  if (err) {
    return console.error(err);
  }
  return console.info(
    `
      v${process.env.npm_package_version}

      Server running on http://localhost:${port} [${env}]
    `);
});
