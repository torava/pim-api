import { Model, QueryBuilder } from 'objection';
import CategoryAttributeShape from '@torava/product-utils/dist/models/CategoryAttribute';

import Category from './Category';
import Attribute from './Attribute';
import CategoryAttributeSource from './CategoryAttributeSource';

interface CategoryAttribute extends CategoryAttributeShape {}
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

export default CategoryAttribute;
