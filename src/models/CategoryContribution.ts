import {Model, ModelObject} from 'objection';
import { DeepPartial } from '../utils/types';

import Category from './Category';

export default class CategoryContribution extends Model {
	id!: number;

	amount?: number;
	unit?: string;

	category?: Category;
	categoryId?: Category['id'];
	contribution?: Category;
	contributionId?: Category['id'];

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

export type CategoryContributionShape = ModelObject<CategoryContribution>;
export type CategoryContributionPartialShape = DeepPartial<CategoryContributionShape>;
