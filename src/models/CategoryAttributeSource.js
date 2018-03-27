import {Model} from 'objection';

class CategoryAttributeSource extends Model {
	static get tableName() {
		return 'CategoryAttributeSource';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
        reference_url: {type: ['string', 'null']},
				reference_date: { type: 'datetime', default: new Date().toISOString() }
			}
		}
  }
  
  static get relationMappings() {
		return {
			attribute: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/CategoryAttribute',
				join: {
					from: 'CategoryAttributeSource.attributeId',
					to: 'CategoryAttribute.id'
				}
			},
			source: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Source',
				join: {
					from: 'CategoryAttributeSource.sourceId',
					to: 'Source.id'
				}
			}
    }
  }
}

module.exports = CategoryAttributeSource;