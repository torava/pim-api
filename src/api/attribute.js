import apicache from 'apicache';

import Attribute from '../models/Attribute';

const cache = apicache.middleware;

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

app.get('/api/attribute', cache(), (req, res) => {
  if (req.query.parent) {
    return Attribute.query()
    .where('parentId', req.query.parent || null)
    .eager('[children.^]')
    .then(attributes => {
      if ('indexed' in req.query) {
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
