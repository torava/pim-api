import { Model } from 'objection';
import ProductAttributeShape from '@torava/product-utils/dist/models/ProductAttribute';

import Product from './Product';
import Attribute from './Attribute';
import ProductAttributeSource from './ProductAttributeSource';
import { DeepPartial } from '../utils/types';

interface ProductAttribute extends ProductAttributeShape {}
class ProductAttribute extends Model {
	static get tableName() {
		return 'ProductAttribute';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
				value: {type: 'number'},
				unit: {type: 'string'},
				type: {type: 'string'}
			}
		}
  }
  
  static get relationMappings() {
		return {
			product: {
				relation: Model.BelongsToOneRelation,
				modelClass: Product,
				join: {
					from: 'ProductAttribute.productId',
					to: 'Product.id'
				}
			},
			attribute: {
				relation: Model.BelongsToOneRelation,
				modelClass: Attribute,
				join: {
					from: 'ProductAttribute.attributeId',
					to: 'Attribute.id'
				}
			},
			sources: {
				relation: Model.HasManyRelation,
				modelClass: ProductAttributeSource,
				join: {
					from: 'ProductAttribute.id',
					to: 'ProductAttributeSource.attributeId'
				}
			},
    }
  }
}

export default ProductAttribute;
