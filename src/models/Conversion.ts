import {Model} from 'objection';

export interface ConversionShape {
	id?: number;

	fromLocale?: string;
	fromCurrency?: string;
	toLocale?: string;
	toCurrency?: string;
	rate?: number;
}

class Conversion extends Model {
	static get tableName() {
		return 'Conversion';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
				fromLocale: {type: 'string'}, 
				fromCurrency: {type: 'string'},
				toLocale: {type: 'string'},
				toCurrency: {type: 'string'},
				rate: {type: 'number'}
			}
		}
	}
}

export default Conversion;
