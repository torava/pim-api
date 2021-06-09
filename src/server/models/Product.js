import {Model} from 'objection';
import Item from './Item';
import ProductAttribute from './ProductAttribute';
import Category from './Category';
import Manufacturer from './Manufacturer';
import ProductContribution from './ProductContribution';
import Brand from './Brand';

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
				contributionList: {type: 'string'},
				aliases: {type: ['array', 'null']},
				product_number: {type: ['string', 'null']},
				quantity: {type: ['number', 'null']},
				measure: {type: ['number', 'null']},
				unit: {type: ['string', 'null']}
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
			},
			brand: {
				relation: Model.BelongsToOneRelation,
				modelClass: Brand,
				join: {
					from: 'Product.brandId',
					to: 'Brand.id'
				}
			},
			contributions: {
				relation: Model.HasManyRelation,
				modelClass: ProductContribution,
				join: {
					from: 'Product.id',
					to: 'ProductContribution.productId'
				}
			}
		}
	}
}