"use strict";

import importApi from './import';
import receipt from './receipt';
import product from './product';
import transaction from './transaction';
import item from './item';
import category from './category';
import attribute from './attribute';
import source from './source';

export default api => {
  importApi(api);
  receipt(api);
  product(api);
  transaction(api);
  item(api);
  category(api);
  attribute(api);
  source(api);
}