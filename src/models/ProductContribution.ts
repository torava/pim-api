import ProductContributionShape from '@torava/product-utils/dist/models/ProductContribution';
import { Model } from 'objection';

import { DeepPartial } from '../utils/types';
import Category from './Category';
import Product from './Product';

interface ProductContribution extends ProductContributionShape {}
class ProductContribution extends Model {
	static get tableName() {
		return 'ProductContribution';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
        amount: {type: 'number'},
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

export default ProductContribution;
