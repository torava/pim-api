import {Model, ModelObject} from 'objection';
import ProductAttribute from './ProductAttribute';
import Source from './Source';

export default class ProductAttributeSource extends Model {
	id!: number;

	referenceUrl?: string;
	referenceDate?: string;
	note?: string;
	countryCode?: string;

	attribute?: ProductAttribute;
	source?: Source;

	static get tableName() {
		return 'ProductAttributeSource';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
        referenceUrl: {type: ['string', 'null']},
				referenceDate: { type: 'datetime', default: new Date().toISOString() },
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

export type ProductAttributeSourceShape = ModelObject<ProductAttributeSource>;
