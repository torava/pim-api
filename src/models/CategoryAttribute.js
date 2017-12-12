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

class CategoryAttribute extends Model {
	static get tableName() {
		return 'CategoryAttribute';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			required: ['name'],

			properties: {
				name: {type: 'string'},
				value: {type: 'float'},
				unit: {type: 'string'},
				group: {type: 'string'}
			}
		}
  }
  
  static get relationMappings() {
		return {
			product: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Category',
				join: {
					from: 'CategoryAttribute.categoryId',
					to: 'Category.id'
				}
			},
			children: {
				relation: Model.HasManyRelation,
				modelClass: __dirname+'/CategoryAttribute',
				join: {
					from: 'CategoryAttribute.id',
					to: 'CategoryAttribute.parentId'
				}
			},
			parent: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/CategoryAttribute',
				join: {
					from: 'CategoryAttribute.parentId',
					to: 'CategoryAttribute.id'
				}
			}
    }
  }
}

module.exports = CategoryAttribute;