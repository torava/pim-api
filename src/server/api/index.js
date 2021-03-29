"use strict";

import importApi from './import';
import product from './product';
import transaction from './transaction';
import item from './item';
import category from './category';
import attribute from './attribute';
import source from './source';
import manufacturer from './manufacturer';
import party from './party';
import group from './group';

export default api => {
  importApi(api);
  product(api);
  transaction(api);
  item(api);
  category(api);
  attribute(api);
  source(api);
  manufacturer(api);
  party(api);
  group(api);
}
