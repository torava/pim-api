import {Model, ModelObject} from 'objection';
import { DeepPartial } from '../utils/types';

import Category from './Category';
import Product from './Product';

export default class ProductContribution extends Model {
	id!: number;

	amount?: number;
	unit?: string;

	product?: Product;
	productId?: Product['id'];
	contribution?: Category;
	contributionId?: Category['id'];

	static get tableName() {
		return 'ProductContribution';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
        amount: {type: 'float'},
        unit: {type: 'string'}
			}
		}
  }
  
  static get relationMappings() {
		return {
			product: {
				relation: Model.BelongsToOneRelation,
				modelClass: Product,
				join: {
					from: 'ProductContribution.productId',
					to: 'Product.id'
				}
			},
			contribution: {
				relation: Model.BelongsToOneRelation,
				modelClass: Category,
				join: {
					from: 'ProductContribution.contributionId',
					to: 'Category.id'
				}
			}
    }
  }
}

export type ProductContributionShape = ModelObject<ProductContribution>;
export type ProductContributionPartialShape = DeepPartial<ProductContributionShape>;
