import { Model } from 'objection';
import { DeepPartial } from '../utils/types';

import Category, { CategoryShape } from './Category';
import Product, { ProductShape } from './Product';

export interface ProductContributionShape {
	id: number;

	amount?: number;
	unit?: string;

	product?: ProductShape;
	productId?: ProductShape['id'];
	contribution?: CategoryShape;
	contributionId?: CategoryShape['id'];
}

interface ProductContribution extends Pick<ProductContributionShape, 'id' | 'amount' | 'unit' | 'productId' | 'contributionId'> {
	product?: Product;
	contribution?: Category;
}
// eslint-disable-next-line no-redeclare
class ProductContribution extends Model {
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

export type ProductContributionPartialShape = DeepPartial<ProductContributionShape>;

export default ProductContribution;
