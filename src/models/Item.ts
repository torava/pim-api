import { Model } from 'objection';

import Transaction from './Transaction';
import Product from './Product';

export interface ItemShape {
	id: number;

	itemNumber?: string;
	text?: string;
	price?: number;
	currency?: string;
	quantity?: number;
	measure?: number;
	unit?: string;
}

interface Item extends ItemShape {}
// eslint-disable-next-line no-redeclare
class Item extends Model {
	static get tableName() {
		return 'Item';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
				itemNumber: {type: ['string', 'null']}, 
				text: {type: ['string', 'null']},
				price: {type: ['number', 'null']},
				currency: {type: ['string', 'null']},
				quantity: {type: ['number', 'null']},
				measure: {type: ['number', 'null']},
				unit: {type: ['string', 'null']}
			}
		}
	}

	static get relationMappings() {
		return {
			transaction: {
				relation: Model.BelongsToOneRelation,
				modelClass: Transaction,
				join: {
					from: 'Item.transactionId',
					to: 'Transaction.id'
				}
			},
			product: {
				relation: Model.BelongsToOneRelation,
				modelClass: Product,
				join: {
					from: 'Item.productId',
					to: 'Product.id'
				}
			}
		}
	}
}

export default Item;
