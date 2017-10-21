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
			parent: {
				relation: Model.HasOneRelation,
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