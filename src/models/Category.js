import {Model} from 'objection';

class Category extends Model {

	static get tableName() {
		return 'Category';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			required: ['name'],

			properties: {
				id: {type: 'integer'},
				name: {type: 'string', minLength: 1, maxLength: 255},
			}
		}
	}

	static get relationMappings() {
		return {
			products: {
				relation: Model.HasManyRelation,
				modelClass: __dirname+'/Product',
				join: {
					from: 'Category.id',
					to: 'Product.categoryId'
				}
			},
			attributes: {
				relation:	Model.HasManyRelation,
				modelClass: __dirname+'/CategoryAttribute',
				join: {
					from: 'Category.id',
					to: 'CategoryAttribute.categoryId'
				}
			},
			children: {
				relation: Model.HasManyRelation,
				modelClass: __dirname+'/Category',
				join: {
					from: 'Category.id',
					to: 'Category.parentId'
				}
			},
			parent: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Category',
				join: {
					from: 'Category.parentId',
					to: 'Category.id'
				}
			}
		}
	}
}

module.exports = Category;