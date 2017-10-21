import {Model} from 'objection';

class Product extends Model {
	static get tableName() {
		return 'Product';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			required: ['name'],

			properties: {
				id: {type: 'integer'},
				name: {type: 'string', minLength: 1, maxLength: 255},
				serial_number: {type: 'string', minLength: 1, maxLength: 255}
			}
		}
	}
}

module.exports = Product;