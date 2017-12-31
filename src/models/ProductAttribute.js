/*
Product Attribute DB model

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

class ProductAttribute extends Model {
	static get tableName() {
		return 'ProductAttribute';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				value: {type: 'float'}
			}
		}
  }
  
  static get relationMappings() {
		return {
			product: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Product',
				join: {
					from: 'ProductAttribute.productId',
					to: 'Product.id'
				}
			},
			attribute: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Attribute',
				join: {
					from: 'ProductAttribute.attributeId',
					to: 'Attribute.id'
				}
			}
    }
  }
}

module.exports = ProductAttribute;