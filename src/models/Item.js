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
				quantity: {type: 'number'}
			}
		}
	}

	static get relationMappings() {
		return {
			product: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Product',
				join: {
					from: 'Item.productId',
					to: 'Product.id'
				}
			},
			category: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Category',
				join: {
					from: 'Item.categoryId',
					to: 'Category.id'
				}
			}
		}
	}
}

module.exports = Item;