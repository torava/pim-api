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

class Attribute extends Model {
	static get tableName() {
		return 'Attribute';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			
			properties: {
				name: {type: 'object'},
				unit: {type: 'string'}
			}
		}
	}
	
	static get relationMappings() {
		return {
			children: {
				relation: Model.HasManyRelation,
				modelClass: __dirname+'/Attribute',
				join: {
					from: 'Attribute.id',
					to: 'Attribute.parentId'
				}
			},
			parent: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Attribute',
				join: {
					from: 'Attribute.parentId',
					to: 'Attribute.id'
				}
			}
		}
	}
}

module.exports = Attribute;