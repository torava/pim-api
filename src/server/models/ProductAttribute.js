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
import Product from './Product';
import Attribute from './Attribute';

export default class ProductAttribute extends Model {
	static get tableName() {
		return 'ProductAttribute';
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
			product: {
				relation: Model.BelongsToOneRelation,
				modelClass: Product,
				join: {
					from: 'ProductAttribute.productId',
					to: 'Product.id'
				}
			},
			attribute: {
				relation: Model.BelongsToOneRelation,
				modelClass: Attribute,
				join: {
					from: 'ProductAttribute.attributeId',
					to: 'Attribute.id'
				}
			}
    }
  }
}