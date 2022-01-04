import {Model, ModelObject} from 'objection';

export default class Manufacturer extends Model {
	id!: number;

	name?: string;
	aliases?: string[];
	factoryLocation?: string[];
	headquartersLocation?: string[];

	parent?: Manufacturer;

	static get tableName() {
		return 'Manufacturer';
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
				modelClass: Manufacturer,
				join: {
					from: 'Manufacturer.ownerId',
					to: 'Manufacturer.id'
				}
			}
		}
	}
}

export type ManufacturerShape = ModelObject<Manufacturer>;
