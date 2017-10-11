var Model = require('objection').Model;

/**
 * @extends Model
 * @constructor
 */
 function Item() {
	Model.apply(this, arguments);
 }

 Model.extend(Item);
 module.exports = Item;

 Item.tableName = 'Item';

 Item.jsonSchema = {
 	type: 'object',
 	required: ['name'],

 	properties: {
 		id: {type: 'integer'},
 		transactionId: {type: 'integer'},
 		productId: {type: 'integer'},
 		name: {type: 'string', minLength: 1, maxLength: 255},
 		text: {type: 'string'},
 		price: {type: 'number'}
 	}
 };

 Item.relationMappings = {
 	transactions: {
 		relation: Model.OneToOneRelation,
 		modelClass: __dirname+'/Transaction',
 		join: {
 			from: 'Item.transactionId',
 			to: 'Transaction.id'
 		}
 	},
 	products: {
 		relation: Model.OneToOneRelation,
 		modelClass: __dirname+'/Product',
 		join: {
 			from: 'Item.productId',
 			to: 'Product.id'
 		}
 	}
 };