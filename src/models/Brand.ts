import {Model, ModelObject} from 'objection';

export default class Brand extends Model {
	id!: number;

	name?: string;
	aliases?: string[];
	factoryLocation?: string;
	headquartersLocation?: string;

	parent?: Brand;

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

export type BrandShape = ModelObject<Brand>;
