import {Model} from 'objection';
import Item from './Item';
import ProductAttribute from './ProductAttribute';
import Category from './Category';
import Manufacturer from './Manufacturer';

export default class Product extends Model {
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
				modelClass: Item,
				join: {
					from: 'Product.id',
					to: 'Item.productId'
				}
			},
			attributes: {
				relation:	Model.HasManyRelation,
				modelClass: ProductAttribute,
				join: {
					from: 'Product.id',
					to: 'ProductAttribute.productId'
				}
			},
			category: {
				relation: Model.BelongsToOneRelation,
				modelClass: Category,
				join: {
					from: 'Product.categoryId',
					to: 'Category.id'
				}
			},
			manufacturer: {
				relation: Model.BelongsToOneRelation,
				modelClass: Manufacturer,
				join: {
					from: 'Product.manufacturerId',
					to: 'Manufacturer.id'
				}
			}
		}
	}
}