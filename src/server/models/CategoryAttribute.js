/*
Category Attribute DB model

protein
carbohydrate
fiber
fat
magnesium
natrium
a vitamin
b vitamin
c vitamin
d vitamin
e vitamin
width
length
height
mass
co2
methane
*/

import {Model} from 'objection';
import Category from './Category';
import Attribute from './Attribute';
import CategoryAttributeSource from './CategoryAttributeSource';

export default class CategoryAttribute extends Model {
	static get tableName() {
		return 'CategoryAttribute';
	}
	static get modifiers() {
		return {
			filterByAttributeIds(builder, attributeIds) {
        builder.whereIn('attributeId', attributeIds);
      }
		}
	}
	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
				value: {type: 'float'},
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
			},
    }
  }
}