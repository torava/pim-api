import {Model} from 'objection';

import Transaction, { TransactionShape } from './Transaction';

export interface PartyShape {
	id?: number;

	name?: string;
	vat?: string;
	streetName?: string;
	streetNumber?: string;
	postalCode?: string;
	city?: string;
	phoneNumber?: string;
	email?: string;

	transaction?: TransactionShape;
	transactionId?: TransactionShape['id'];
}

interface Party extends PartyShape {}
class Party extends Model {
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

export default Party;
