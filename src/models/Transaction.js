import {Model} from 'objection';
import Party from './Party';
import Receipt from './Receipt';
import Item from './Item';

class Transaction extends Model {
	static get tableName() {
		return 'Transaction';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
				total_price: {type: 'number'},
				total_price_read: {type: 'number'},
				date: { type: 'datetime', default: new Date().toISOString() },
			}
		}
	}

	static get relationMappings() {
		return {
			party: {
				relation: Model.BelongsToOneRelation,
				modelClass: Party,
				join: {
					from: 'Transaction.partyId',
					to: 'Party.id'
				}
			},
			receipts: {
				relation: Model.HasManyRelation,
				modelClass: Receipt,
				join: {
					from: 'Transaction.id',
					to: 'Receipt.transactionId'
				}
			}, 
			items: {
				relation: Model.HasManyRelation,
				modelClass: Item,
				join: {
					from: 'Transaction.id',
					to: 'Item.transactionId'
				}
			}
		}
	};
}

module.exports = Transaction;