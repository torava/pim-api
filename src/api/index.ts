import express from 'express';

import product from './product';
import transaction from './transaction';
import item from './item';
import category from './category';
import attribute from './attribute';
import source from './source';
import brand from './brand';
import manufacturer from './manufacturer';
import party from './party';
import group from './group';
import receipt from './receipt';
import recommendation from './recommendation';

export default (app: express.Application) => {
  recommendation(app);
  product(app);
  transaction(app);
  item(app);
  category(app);
  attribute(app);
  source(app);
  brand(app);
  manufacturer(app);
  party(app);
  group(app);
  receipt(app);
}
