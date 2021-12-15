import {Model, ModelObject} from 'objection';

import Product from './Product';
import Attribute from './Attribute';
import ProductAttributeSource from './ProductAttributeSource';
import { DeepPartial } from '../utils/types';

export default class ProductAttribute extends Model {
	id!: number;
	
	value?: number;
	unit?: string;
	type?: string;

	product?: Product;
	productId?: Product['id'];
	attribute?: Attribute;
	attributeId?: Attribute['id'];
	sources?: ProductAttributeSource[];

	static get tableName() {
		return 'ProductAttribute';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
				value: {type: 'float'},
				unit: {type: 'string'},
				type: {type: 'string'}
			}
		}
  }
  
  static get relationMappings() {
		return {
			product: {
				relation: Model.BelongsToOneRelation,
				modelClass: Product,
				join: {
					from: 'ProductAttribute.productId',
					to: 'Product.id'
				}
			},
			attribute: {
				relation: Model.BelongsToOneRelation,
				modelClass: Attribute,
				join: {
					from: 'ProductAttribute.attributeId',
					to: 'Attribute.id'
				}
			},
			sources: {
				relation: Model.HasManyRelation,
				modelClass: ProductAttributeSource,
				join: {
					from: 'ProductAttribute.id',
					to: 'ProductAttributeSource.attributeId'
				}
			},
    }
  }
}

export type ProductAttributeShape = ModelObject<ProductAttribute>;
export type ProductAttributePartialShape = DeepPartial<ProductAttributeShape>;
