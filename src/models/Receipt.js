import {Model} from 'objection';

class Receipt extends Model {
	static get tableName() {
		return 'Receipt';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
				file: {type: 'string', minLength: 1, maxLength: 255},
				text: {type: 'string'}
			}
		}
	}
}

module.exports = Receipt;