import { Model } from 'objection';

import Transaction, { TransactionShape } from './Transaction';
import Product, { ProductShape } from './Product';

export interface ItemShape {
	id?: number;

	itemNumber?: string;
	text?: string;
	price?: number;
	currency?: string;
	quantity?: number;
	measure?: number;
	unit?: string;

	transaction?: TransactionShape;
	transactionId?: TransactionShape['id'];
	product?: ProductShape;
	productId?: ProductShape['id'];
}

interface Item extends ItemShape {
	transaction: Transaction;
	product: Product;
}
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
