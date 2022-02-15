import {Model, QueryBuilder} from 'objection';

import Product, { ProductShape } from './Product';
import CategoryAttribute, { CategoryAttributeShape } from './CategoryAttribute';
import CategoryContribution, { CategoryContributionShape } from './CategoryContribution';
import { DeepPartial, Ids, NameTranslations, Reference } from '../utils/types';

// https://dev.to/tylerlwsmith/using-a-typescript-interface-to-define-model-properties-in-objection-js-1231
export interface CategoryShape extends Ids {	
	name?: NameTranslations;
	aliases?: string[];

	products?: ProductShape[];
	attributes?: CategoryAttributeShape[];
	contributions?: CategoryContributionShape[];
	children?: CategoryShape[];
	parent?: CategoryShape & Reference;
	parentId?: number;
}

interface Category extends Pick<CategoryShape, 'id' | 'name' | 'aliases' | 'parentId'> {
	products?: Product[];
	attributes?: CategoryAttribute[];
	contributions?: CategoryContribution[];
	children?: Category[];
	parent?: Category;
}
// eslint-disable-next-line no-redeclare
class Category extends Model {
	static get tableName() {
		return 'Category';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			
			properties: {
				id: {type: 'integer'},
				name: {type: 'object'},
				aliases: {type: ['array', 'null']}
			}
		}
	}

	static get modifiers() {
		return {
			getAttributes(builder: QueryBuilder<Category>) {
				builder.withGraphFetched('[products.[items], contributions.[contribution], attributes, children(getAttributes)]');
			},
			getTransactions(builder: QueryBuilder<Category>) {
				builder.withGraphFetched('[products.items.transaction, attributes, children(getTransactions)]');
			}
		};
	}

	static get relationMappings() {
		return {
			products: {
				relation: Model.HasManyRelation,
				modelClass: Product,
				join: {
					from: 'Category.id',
					to: 'Product.categoryId'
				}
			},
			attributes: {
				relation: Model.HasManyRelation,
				modelClass: CategoryAttribute,
				join: {
					from: 'Category.id',
					to: 'CategoryAttribute.categoryId'
				}
			},
			contributions: {
				relation: Model.HasManyRelation,
				modelClass: CategoryContribution,
				join: {
					from: 'Category.id',
					to: 'CategoryContribution.categoryId'
				}
			},
			children: {
				relation: Model.HasManyRelation,
				modelClass: Category,
				join: {
					from: 'Category.id',
					to: 'Category.parentId'
				}
			},
			parent: {
				relation: Model.BelongsToOneRelation,
				modelClass: Category,
				join: {
					from: 'Category.parentId',
					to: 'Category.id'
				}
			}
		}
	}
}

export type CategoryPartialShape = DeepPartial<CategoryShape>;

export default Category;
