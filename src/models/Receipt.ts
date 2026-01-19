import {Model} from 'objection';

import Transaction, { TransactionShape } from './Transaction';

export interface ReceiptShape {
	id?: number;

	file?: string;
	locale?: string;
	text?: string;

	transaction?: TransactionShape;
	transactionId?: TransactionShape['id'];
}

interface Receipt extends ReceiptShape {}
class Receipt extends Model {
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

export default Receipt;
