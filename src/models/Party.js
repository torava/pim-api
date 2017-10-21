import {Model} from 'objection';

class Party extends Model {
	static get tableName() {
		return 'Party';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			required: ['name'],

			properties: {
				id: {type: 'integer'},
				name: {type: 'string', minLength: 1, maxLength: 255},
				vat: {type: 'string', minLength: 1, maxLength: 255},
				street_name: {type: 'string', minLength: 1, maxLength: 255},
				street_number: {type: 'string', minLength: 1, maxLength: 255},
				postal_code: {type: 'string', minLength: 1, maxLength: 255},
				city: {type: 'string', minLength: 1, maxLength: 255},
				phone_number: {type: 'string', minLength: 1, maxLength: 255}
			}
		}
	}
}

module.exports = Party;