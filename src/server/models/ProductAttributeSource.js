import {Model} from 'objection';
import ProductAttribute from './ProductAttribute';
import Source from './Source';

export default class CategoryAttributeSource extends Model {
	static get tableName() {
		return 'ProductAttributeSource';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
        reference_url: {type: ['string', 'null']},
				reference_date: { type: 'datetime', default: new Date().toISOString() },
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
