const Item = require('../models/Item');

module.exports = function (app) {

app.get('/api/item', function(req, res) {
  Item.query()
    .eager('[product.[category, manufacturer], transaction.[party]]')
    //.where('product.category.id', '5')
    .then(items => {
      items = items.filter(item => {
        if (req.body.category && item.product.category.id !== req.body.category) {
          return false;
        }
        else {
          return true;
        }
      });
      res.send(items);
    });
});

}