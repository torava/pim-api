import {Model} from 'objection';

class Item extends Model {

	static get tableName() {
		return 'Item';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
				item_number: {type: 'string'}, 
				text: {type: 'string'},
				price: {type: 'number'},
				currency: {type: 'string'},
				quantity: {type: 'number'},
				measure: {type: 'number'},
				unit: {type: 'string'}
			}
		}
	}

	static get relationMappings() {
		return {
			transaction: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Transaction',
				join: {
					from: 'Item.transactionId',
					to: 'Transaction.id'
				}
			},
			product: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Product',
				join: {
					from: 'Item.productId',
					to: 'Product.id'
				}
			}
		}
	}
}

module.exports = Item;