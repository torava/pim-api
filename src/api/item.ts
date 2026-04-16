import express from 'express';

import Item from '../models/Item';

export default (app: express.Application) => {

app.get('/api/item', async (req, res) => {
  const items = await Item.query()
    .withGraphFetched('[product.[category.[parent.^], manufacturer], transaction.[party]]');
  res.send(items);
});

}
