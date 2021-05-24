import Item from '../models/Item';

export default app => {

app.get('/api/item', async (req, res) => {
  const items = await Item.query()
    .withGraphFetched('[product.[category.[parent.^], manufacturer], transaction.[party]]');
  res.send(items);
});

}
