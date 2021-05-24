import {Model} from 'objection';

import Category from './Category';
import Product from './Product';

export default class ProductContribution extends Model {
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
			category: {
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
