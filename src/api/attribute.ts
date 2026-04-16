import express from 'express';

import Attribute from '../models/Attribute';

export default (app: express.Application) => {
  app.get('/api/attribute', async (req, res) => {
      try {
      const attributes = await Attribute.query();
      res.send(attributes);
    } catch (error) {
      console.error(error);
      throw new Error();
    }    
  });
}
