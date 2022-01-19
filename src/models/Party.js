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
				streetName: {type: ['string', 'null']},
				streetNumber: {type: ['string', 'null']},
				postalCode: {type: ['string', 'null']},
				city: {type: ['string', 'null']},
				phoneNumber: {type: ['string', 'null']},
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