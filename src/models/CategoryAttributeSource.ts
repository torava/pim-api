import {Model, ModelObject} from 'objection';

import CategoryAttribute from './CategoryAttribute';
import Source from './Source';

export default class CategoryAttributeSource extends Model {
	id!: number;

	referenceUrl?: string;
	referenceDate?: string;
	note?: string;
	countryCode?: string;

	attribute?: CategoryAttribute;
	source?: Source;
	
	static get tableName() {
		return 'CategoryAttributeSource';
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
				modelClass: CategoryAttribute,
				join: {
					from: 'CategoryAttributeSource.attributeId',
					to: 'CategoryAttribute.id'
				}
			},
			source: {
				relation: Model.BelongsToOneRelation,
				modelClass: Source,
				join: {
					from: 'CategoryAttributeSource.sourceId',
					to: 'Source.id'
				}
			}
    }
  }
}

export type CategoryAttributeSourceShape = ModelObject<CategoryAttributeSource>;
