import express from 'express';

import Manufacturer from '../models/Manufacturer';

export default (app: express.Application) => {

app.get('/api/manufacturer', async (req, res) => {
  try {
    const result = await Manufacturer.query();
    res.send(result);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

}
