import express from 'express';

import Party from '../models/Party';

export default (app: express.Application) => {
  app.get('/api/party', async (req, res) => {
    try {
      const result = await Party.query();
      res.send(result);
    } catch (error) {
      console.error(error);
      res.sendStatus(500);
    }
  });
}
