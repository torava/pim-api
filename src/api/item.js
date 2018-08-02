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
      if (req.query.hasOwnProperty('depth')) {
        let index, found, id, name,
            indexed_items = [0],
            resolved_items = [];
        items.map(item => {
          id = false;
          if (req.query.depth > 2) {
            let current_depth, child = item.product;
            if (item.product.category) {
              child = item.product.category;
              if (item.product.category.parent) {
                current_depth = req.query.depth-2;
                child = item.product.category.parent;
                while (current_depth > 0) {
                  if (child && child.parent) {
                    child = child.parent;
                    current_depth-= 1;
                  }
                  else {
                    //child = false;
                    break;
                  }
                }
              }
            }
            if (child) {
              id = 'c'+child.id;
              name = child.name;
            }
          }
          if ((!id || req.query.depth == 2) && item.product.category && item.product.category.parent) {
            id = 'c'+item.product.category.parent.id;
            name = item.product.category.parent.name;
          }
          if ((!id || req.query.depth == 1) && item.product.category) {
            id = 'c'+item.product.category.id;
            name = item.product.category.name;
          }
          if (!id || req.query.depth == 0) {
            id = 'p'+item.product.id;
            name = item.product.name;
          }
          if (id === false) {
            resolved_items[0] = {
              id: 0,
              name: 'Uncategorized',
              prices: Object.assign(resolved_items[0] && resolved_items[0].prices || [], item.price)
            }
            return;
          }
          // if item is already in resolved items then sum to price
          found = false;
          resolved_items.map(resolved_item => {
            if (resolved_item.id === id) {
              resolved_item.dates.push(item.transaction.date);
              resolved_item.prices.push(item.price);
              resolved_item.item_names.push(item.product.name);
              found = true;
              return;
            }
          });
          // otherwise check indexed items
          if (!found) {
            index = indexed_items.indexOf(id);
            if (index === -1) {
              indexed_items.push(id);
              index = indexed_items.length-1;
            }
            resolved_items[index] = {
              id: id,
              name: name.hasOwnProperty('fi-FI') ? name['fi-FI'] : name,
              dates: [item.transaction.date],
              prices: [item.price],
              item_names: [item.product.name]
            }
          }
        });
        items = resolved_items;
      }
      res.send(items);
    });
});

}