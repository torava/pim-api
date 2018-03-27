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

			properties: {
				id: {type: 'integer'},
				value: {type: 'float'}
			}
		}
  }
  
  static get relationMappings() {
		return {
			category: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Category',
				join: {
					from: 'CategoryAttribute.categoryId',
					to: 'Category.id'
				}
			},
			attribute: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Attribute',
				join: {
					from: 'CategoryAttribute.attributeId',
					to: 'Attribute.id'
				}
			},
			sources: {
				relation: Model.HasManyRelation,
				modelClass: __dirname+'/CategoryAttributeSource',
				join: {
					from: 'CategoryAttribute.id',
					to: 'CategoryAttributeSource.attributeId'
				}
			},
    }
  }
}

module.exports = CategoryAttribute;