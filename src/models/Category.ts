import {Model, ModelObject, QueryBuilder} from 'objection';

import Product from './Product';
import CategoryAttribute from './CategoryAttribute';
import CategoryContribution from './CategoryContribution';
import { DeepPartial, NameTranslations } from '../utils/types';

export default class Category extends Model {
	id!: number;
	
	name?: NameTranslations;
	aliases?: string[];

	products?: Product[];
	attributes?: CategoryAttribute[];
	contributions?: CategoryContribution[];
	children?: Category[];
	parent?: Category;
	parentId?: number;

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

export type CategoryShape = ModelObject<Category>;
export type CategoryPartialShape = DeepPartial<CategoryShape>;
