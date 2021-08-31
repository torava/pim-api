import {Model} from 'objection';
import Transaction from './Transaction';

export default class Receipt extends Model {
	static get tableName() {
		return 'Receipt';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
				file: {type: ['string', 'null']},
				locale: {type: 'string'},
				text: {type: 'string'}
			}
		}
	}

	static get relationMappings() {
		return {
			transaction: {
				relation: Model.BelongsToOneRelation,
				modelClass: Transaction,
				join: {
					from: 'Receipt.transactionId',
					to: 'Transaction.id'
				}
			}
		}
	}
}