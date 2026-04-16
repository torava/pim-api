import express from 'express';

import Brand from '../models/Brand';

export default (app: express.Application) => {

app.get('/api/brand', async (req, res) => {
  try {
    const result = await Brand.query();
    res.send(result);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

}