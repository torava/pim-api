import {Model} from 'objection';
import moment from 'moment';

import Party, { PartyShape } from './Party';
import Receipt, { ReceiptShape } from './Receipt';
import Item, { ItemShape } from './Item';
import Group, { GroupShape } from './Group';

export interface TransactionShape {
	id?: number;

	totalPrice?: number;
	totalPriceRead?: number;
	date?: string;

	party?: PartyShape;
	partyId?: PartyShape['id'];
	group?: GroupShape;
	receipts?: ReceiptShape[];
	items?: ItemShape[];
}

interface Transaction extends TransactionShape {
	party: Party;
	group: Group;
	receipts: Receipt[];
	items: Item[];
}
class Transaction extends Model {
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

export default Transaction;