import { Model } from 'objection';

import ProductAttribute, { ProductAttributeShape } from './ProductAttribute';
import Source, { SourceShape } from './Source';

export interface ProductAttributeSourceShape {
	id?: number;

	referenceUrl?: string;
	referenceDate?: string;
	note?: string;
	countryCode?: string;

	attribute?: ProductAttributeShape;
	attributeId?: ProductAttributeShape['id'];
	source?: SourceShape;
	sourceId?: SourceShape['id'];
}

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
