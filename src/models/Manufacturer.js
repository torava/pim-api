import {Model} from 'objection';

export default class Manufacturer extends Model {

	static get tableName() {
		return 'Manufacturer';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			required: ['name'],

			properties: {
				id: {type: 'integer'},
				name: {type: 'string', minLength: 1, maxLength: 255},
				aliases: {type: ['object', null]},
        factory_location: {type: 'string', minLength: 1, maxLength: 255},
        headquarters_location: {type: 'string', minLength: 1, maxLength: 255}
			}
		}
	}

	static get relationMappings() {
		return {
			parent: {
				relation: Model.BelongsToOneRelation,
				modelClass: Manufacturer,
				join: {
					from: 'Manufacturer.ownerId',
					to: 'Manufacturer.id'
				}
			}
		}
	}
}