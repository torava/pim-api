import Item from '../models/Item';

export default app => {

app.get('/api/item', function(req, res) {
  Item.query()
    .eager('[product.[category.[parent.^], manufacturer], transaction.[party]]')
    //.where('product.category.id', '5')
    .then(items => {
      if (req.body.category) {
        items = items.filter(item => {
          if (item.product.category.id !== req.body.category) {
            return false;
          }
          else {
            return true;
          }
        });
      }
      res.send(items);
    });
});

app.post('/api/item', async function(req, res) {
  return Item.query()
    .upsertGraph(req.body, {relate: true, unrelate: true})
    .then(item => {
      res.send(item);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send(error);
    });
});

}