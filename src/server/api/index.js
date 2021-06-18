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

export default api => {
  product(api);
  transaction(api);
  item(api);
  category(api);
  attribute(api);
  source(api);
  brand(api);
  manufacturer(api);
  party(api);
  group(api);
}
