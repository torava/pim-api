import Attribute from '../models/Attribute';

export default app => {

function resolveAttributes(attributes) {
  let resolved_attributes = {};
  attributes.map((attribute) => {
    if (attribute.children) {
      attribute.children = resolveAttributes(attribute.children);
    }
    resolved_attributes[attribute.id] = attribute;
  });
  return resolved_attributes;
}

app.get('/api/attribute', function(req, res) {
  if (req.query.hasOwnProperty('parent')) {
    return Attribute.query()
    .where('parentId', req.query.parent || null)
    .eager('[children.^]')
    .then(attributes => {
      if (req.query.hasOwnProperty('indexed')) {
        attributes = resolveAttributes(attributes);
      }
      res.send(attributes);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
  }
  else {
    return Attribute.query()
    .then(attributes => {
      res.send(attributes);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });    
  }
});

}