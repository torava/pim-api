import {Model} from 'objection';
import moment from 'moment';

import Party from './Party';
import Receipt from './Receipt';
import Item from './Item';
import Group from './Group';

export default class Transaction extends Model {
	static get tableName() {
		return 'Transaction';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
				totalPrice: {type: ['number', 'null']},
				totalPriceRead: {type: ['number', 'null']},
				date: { type: 'string', default: moment().format('YYYY-MM-DD HH:mm:ss') },
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
			group: {
				relation: Model.BelongsToOneRelation,
				modelClass: Group,
				join: {
					from: 'Transaction.groupId',
					to: 'Group.id'
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
	}
}