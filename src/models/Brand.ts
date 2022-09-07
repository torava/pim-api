
import BrandShape from '@torava/product-utils/dist/models/Brand';
import { Model } from 'objection';

interface Brand extends BrandShape {}
class Brand extends Model {
	static get tableName() {
		return 'Brand';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			required: ['name'],

			properties: {
				id: {type: 'integer'},
				name: {type: 'string', minLength: 1, maxLength: 255},
				aliases: {type: ['array', 'null']},
        factoryLocation: {type: 'string', minLength: 1, maxLength: 255},
        headquartersLocation: {type: 'string', minLength: 1, maxLength: 255}
			}
		}
	}

	static get relationMappings() {
		return {
			parent: {
				relation: Model.BelongsToOneRelation,
				modelClass: Brand,
				join: {
					from: 'Brand.ownerId',
					to: 'Brand.id'
				}
			}
		}
	}
}

export default Brand;
