import {Model} from 'objection';

class Product extends Model {
	static get tableName() {
		return 'Product';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			required: ['name'],

			properties: {
				id: {type: 'integer'},
				name: {type: 'string', minLength: 1, maxLength: 255},
				product_number: {type: ['string', 'null']}
			}
		}
	}

	static get relationMappings() {
		return {
			items: {
				relation: Model.HasManyRelation,
				modelClass: __dirname+'/Item',
				join: {
					from: 'Product.id',
					to: 'Item.productId'
				}
			},
			attributes: {
				relation:	Model.HasManyRelation,
				modelClass: __dirname+'/ProductAttribute',
				join: {
					from: 'Product.id',
					to: 'ProductAttribute.productId'
				}
			},
			category: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Category',
				join: {
					from: 'Product.categoryId',
					to: 'Category.id'
				}
			},
			manufacturer: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Manufacturer',
				join: {
					from: 'Product.manufacturerId',
					to: 'Manufacturer.id'
				}
			}
		}
	}
}

module.exports = Product;