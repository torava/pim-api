import {Model} from 'objection';
import CategoryAttribute from './CategoryAttribute';
import Source from './Source';

export default class CategoryAttributeSource extends Model {
	static get tableName() {
		return 'CategoryAttributeSource';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
        reference_url: {type: ['string', 'null']},
				reference_date: { type: 'datetime', default: new Date().toISOString() },
				note: {type: ['string', 'null']}
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