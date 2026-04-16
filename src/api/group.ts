import express from 'express';

import Group from '../models/Group';

export default (app: express.Application) => {
  app.get('/api/group', async (req, res) => {
    try {
      const result = await Group.query();
      res.send(result);
    } catch(error) {
      console.error(error);
      res.sendStatus(500);
    }
  });
}
