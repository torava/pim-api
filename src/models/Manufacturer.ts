import { Model } from 'objection';

export interface ManufacturerShape {
	id?: number;

	name?: string;
	aliases?: string[];
	factoryLocation?: string[];
	headquartersLocation?: string[];

	parent?: ManufacturerShape;
	parentId?: ManufacturerShape['id'];
}

interface Manufacturer extends ManufacturerShape {}
class Manufacturer extends Model {
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

export default Manufacturer;
