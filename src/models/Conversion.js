import {Model} from 'objection';

class Conversion extends Model {

	static get tableName() {
		return 'Conversion';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				from: {type: 'string'}, 
				to: {type: 'string'},
				value: {type: 'number'}
			}
		}
	}
}

module.exports = Conversion;