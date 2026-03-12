import { Model } from 'objection';
import AttributeShape from '@torava/pim-utils/dist/models/Attribute';

interface Attribute extends AttributeShape {}
class Attribute extends Model {
	static get tableName() {
		return 'Attribute';
	}
	static get jsonSchema() {
		return {
			type: 'object',
			
			properties: {
				id: {type: 'integer'},
				code: {type: 'string'},
				name: {type: 'object'}
			}
		}
	}
	static get relationMappings() {
		return {
			children: {
				relation: Model.HasManyRelation,
				modelClass: Attribute,
				join: {
					from: 'Attribute.id',
					to: 'Attribute.parentId'
				}
			},
			parent: {
				relation: Model.BelongsToOneRelation,
				modelClass: Attribute,
				join: {
					from: 'Attribute.parentId',
					to: 'Attribute.id'
				}
			}
		}
	}
}

export default Attribute;
