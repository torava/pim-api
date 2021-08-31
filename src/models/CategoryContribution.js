import {Model} from 'objection';

import Category from './Category';

export default class CategoryContribution extends Model {
	static get tableName() {
		return 'CategoryContribution';
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
				modelClass: Category,
				join: {
					from: 'CategoryContribution.categoryId',
					to: 'Category.id'
				}
			},
			contribution: {
				relation: Model.BelongsToOneRelation,
				modelClass: Category,
				join: {
					from: 'CategoryContribution.contributionId',
					to: 'Category.id'
				}
			}
    }
  }
}
