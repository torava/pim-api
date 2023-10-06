import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import apicache from 'apicache';
import Knex from 'knex';
import {Model} from 'objection';
import {JSDOM} from 'jsdom';
import { Canvas, createCanvas, Image, ImageData } from '@napi-rs/canvas';
import path from 'path';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import pg from 'pg';
import fileUpload from 'express-fileupload';

import knexConfig from '../knexfile';
import registerApi from './api';
import swaggerDocument from '../swagger.json';

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace NodeJS {
    // eslint-disable-next-line no-unused-vars
    interface Global {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Image: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any,
      HTMLCanvasElement: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ImageData: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      HTMLImageElement: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Module: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cv: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createCanvas: any
    }
  }
}

export const app = express();

app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(fileUpload());

// Initialize knex.
const knex = Knex(knexConfig.development);

// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex method.
Model.knex(knex);

// https://github.com/brianc/node-postgres/issues/811
const types = pg.types;
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
app.use(bodyParser.json({ limit: '50mb' }));

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

const env = process.env.NODE_ENV || 'production';

let port: number;
if (env === 'production') {
  port = Number(process.env.PORT) || 42808;

  app.get('/favicon.ico', (req, res) => res.sendStatus(204));

  const cache = apicache.options({
    statusCodes: {
      include: [200]
    }
  }).middleware;
  
  app.use(cache());

  // define the folder that will be used for static assets
  app.use(express.static('src/static', {
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

    if (process.env.ACCESS_CONTROL_ALLOW_ORIGIN) {
      res.set('Access-Control-Allow-Origin', process.env.ACCESS_CONTROL_ALLOW_ORIGIN);
    }
    // Verify login and password are set and correct
    if ((USER && user != USER) || (PASSWORD && password != PASSWORD)) {
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
  port = Number(process.env.PORT) || 42809;
}

registerApi(app);

// Using jsdom and node-canvas we define some global variables to emulate HTML DOM.
// Although a complete emulation can be archived, here we only define those globals used
// by cv.imread() and cv.imshow().
function installDOM() {
  const dom = new JSDOM();
  global.document = dom.window.document;
  // The rest enables DOM image and canvas and is provided by node-canvas
  // @ts-ignore
  global.Image = Image; // @ts-ignore
  global.HTMLCanvasElement = Canvas; // @ts-ignore
  global.ImageData = ImageData; // @ts-ignore
  global.HTMLImageElement = Image;
}

function loadOpenCV() {
  return new Promise(resolve => {
    // @ts-ignore
    global.Module = {
      onRuntimeInitialized: resolve
    };
    // @ts-ignore
    global.cv = require('./static/lib/opencv.js');
  });
}

installDOM();
//loadOpenCV();

// @ts-ignore
global.createCanvas = (width: number, height: number) => createCanvas(width, height);

app.listen(port, () => {
  return console.info(
    `
      v${process.env.npm_package_version}

      Server running on http://localhost:${port} [${env}]
    `);
});
