import { Model } from 'objection';

import Item, { ItemShape } from './Item';
import ProductAttribute, { ProductAttributeShape } from './ProductAttribute';
import Category, { CategoryShape } from './Category';
import Manufacturer, { ManufacturerShape } from './Manufacturer';
import ProductContribution, { ProductContributionShape } from './ProductContribution';
import Brand, { BrandShape } from './Brand';

export interface ProductShape {
	id?: number;
	
	name?: string;

	contributionList?: string;
	aliases?: string[];
	productNumber?: string;
	quantity?: number;
	measure?: number;
	unit?: string;

	items?: ItemShape[];
	attributes?: ProductAttributeShape[];
	category?: CategoryShape;
	categoryId?: CategoryShape['id'];
	manufacturer?: ManufacturerShape;
	manufacturerId?: ManufacturerShape['id'];
	brand?: BrandShape;
	brandId?: BrandShape['id'];
	contributions?: ProductContributionShape[];
}

interface Product extends ProductShape {
	items: Item[];
	attributes: ProductAttribute[];
	category: Category;
	manufacturer: Manufacturer;
	brand: Brand;
	contributions: ProductContribution[];
}
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
				contributionList: {type: 'string'},
				aliases: {type: ['array', 'null']},
				productNumber: {type: ['string', 'null']},
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

export default Product;
