import {Model} from 'objection';

class AttributeSource extends Model {
	static get tableName() {
		return 'AttributeSource';
	}

	static get jsonSchema() {
		return {
			type: 'object'
		}
  }
  
  static get relationMappings() {
		return {
			attribute: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Attribute',
				join: {
					from: 'AttributeSource.attributeId',
					to: 'Attribute.id'
				}
			},
			source: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Source',
				join: {
					from: 'AttributeSource.sourceId',
					to: 'Source.id'
				}
			}
    }
  }
}

module.exports = AttributeSource;