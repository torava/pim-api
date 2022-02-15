
import { Model } from 'objection';
import { DeepPartial } from '../utils/types';

import Category, { CategoryShape } from './Category';

export interface CategoryContributionShape {
	id: number;

	amount?: number;
	unit?: string;

	category?: CategoryShape;
	categoryId?: CategoryShape['id'];
	contribution?: CategoryShape;
	contributionId?: CategoryShape['id'];
}

interface CategoryContribution extends Omit<CategoryContributionShape, 'category' | 'contribution'> {
	category?: Category;
	contribution?: Category;
}

// eslint-disable-next-line no-redeclare
class CategoryContribution extends Model {
	static get tableName() {
		return 'CategoryContribution';
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

export type CategoryContributionPartialShape = DeepPartial<CategoryContributionShape>;

export default CategoryContribution;
