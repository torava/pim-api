import {Model, QueryBuilder} from 'objection';

import Category from './Category';
import Attribute from './Attribute';
import CategoryAttributeSource from './CategoryAttributeSource';
import { DeepPartial } from '../utils/types';

export interface CategoryAttributeShape {
	id: number;

	value?: number;
	unit?: string;
	type?: string;

	category?: Category;
	categoryId?: Category['id'];
	attribute?: Attribute;
	attributeId?: Attribute['id'];
	sources?: CategoryAttributeSource[];
}

interface CategoryAttribute extends CategoryAttributeShape {}
// eslint-disable-next-line no-redeclare
class CategoryAttribute extends Model {
	static get tableName() {
		return 'CategoryAttribute';
	}
	static get modifiers() {
		return {
			filterByAttributeIds(builder: QueryBuilder<CategoryAttribute>, attributeIds: CategoryAttribute['id'][]) {
        builder.whereIn('attributeId', attributeIds);
      }
		}
	}
	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
				value: {type: 'number'},
				unit: {type: 'string'},
				type: {type: 'string'}
			}
		}
  }
  static get relationMappings() {
		return {
			category: {
				relation: Model.BelongsToOneRelation,
				modelClass: Category,
				join: {
					from: 'CategoryAttribute.categoryId',
					to: 'Category.id'
				}
			},
			attribute: {
				relation: Model.BelongsToOneRelation,
				modelClass: Attribute,
				join: {
					from: 'CategoryAttribute.attributeId',
					to: 'Attribute.id'
				}
			},
			sources: {
				relation: Model.HasManyRelation,
				modelClass: CategoryAttributeSource,
				join: {
					from: 'CategoryAttribute.id',
					to: 'CategoryAttributeSource.attributeId'
				}
			}
    }
  }
}

export type CategoryAttributePartialShape = DeepPartial<CategoryAttributeShape>;

export default CategoryAttribute;
