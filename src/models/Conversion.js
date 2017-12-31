import {Model} from 'objection';

class Conversion extends Model {

	static get tableName() {
		return 'Conversion';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				fromLocale: {type: 'string'}, 
				fromCurrency: {type: 'string'},
				toLocale: {type: 'string'},
				toCurrency: {type: 'string'},
				rate: {type: 'number'}
			}
		}
	}
}

module.exports = Conversion;