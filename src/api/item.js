const Item = require('../models/Item');

module.exports = function (app) {

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

}