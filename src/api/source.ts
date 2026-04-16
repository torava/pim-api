import express from 'express';

import Source from '../models/Source';

export default (app: express.Application) => {
  app.get('/api/source', async (req, res) => {
    try {
      const result = await Source.query();
      res.send(result);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
      }
  });
};
