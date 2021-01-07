import {Model} from 'objection';
import Transaction from './Transaction';

export default class Party extends Model {
	static get tableName() {
		return 'Party';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			//required: ['name'],

			properties: {
				id: {type: 'integer'},
				name: {type: ['string', 'null']},
				vat: {type: ['string', 'null']},
				street_name: {type: ['string', 'null']},
				street_number: {type: ['string', 'null']},
				postal_code: {type: ['string', 'null']},
				city: {type: ['string', 'null']},
				phone_number: {type: ['string', 'null']},
				email: {type: ['string', 'null']}
			}
		}
	}

	static get relationMappings() {
		return {
			transaction: {
				relation: Model.HasManyRelation,
				modelClass: Transaction,
				join: {
					from: 'Party.transactionId',
					to: 'Transaction.id'
				}
			}
		}
	}
}