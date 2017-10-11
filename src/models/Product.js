var Model = require('objection').Model;

/**
 * @extends Model
 * @constructor
 */
 function Product() {
	Model.apply(this, arguments);
 }

 Model.extend(Product);
 module.exports = Product;

 Product.tableName = 'Product';

 Product.jsonSchema = {
 	type: 'object',
 	required: ['name'],

 	properties: {
 		id: {type: 'integer'},
 		name: {type: 'string', minLength: 1, maxLength: 255}
 	}
 };

 Product.relationMappings = {
 	items: {
 		relation: Model.OneToManyRelation,
 		modelClass: __dirname+'/Item',
 		join: {
 			from: 'Product.id',
 			to: 'Item.productId'
 		}
 	}
 };