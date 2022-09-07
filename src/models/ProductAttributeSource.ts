

import ProductAttributeSourceShape from '@torava/product-utils/dist/models/ProductAttributeSource';
import { Model } from 'objection';

import ProductAttribute from './ProductAttribute';
import Source from './Source';

interface ProductAttributeSource extends ProductAttributeSourceShape {}
class ProductAttributeSource extends Model {
	static get tableName() {
		return 'ProductAttributeSource';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
        referenceUrl: {type: ['string', 'null']},
				referenceDate: { type: 'string', default: new Date().toISOString() },
				note: {type: ['string', 'null']},
				countryCode: { type: ['string', 'null'] }
			}
		}
  }
  
  static get relationMappings() {
		return {
			attribute: {
				relation: Model.BelongsToOneRelation,
				modelClass: ProductAttribute,
				join: {
					from: 'ProductAttributeSource.attributeId',
					to: 'ProductAttribute.id'
				}
			},
			source: {
				relation: Model.BelongsToOneRelation,
				modelClass: Source,
				join: {
					from: 'ProductAttributeSource.sourceId',
					to: 'Source.id'
				}
			}
    }
  }
}

export default ProductAttributeSource;
