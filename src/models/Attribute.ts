import {Model, ModelObject} from 'objection';
import { NameTranslations } from '../utils/types';

export default class Attribute extends Model {
	id!: number;
	
	code?: string;
	name: NameTranslations;
	
	children?: Attribute[];
	parent?: Attribute;
	parentId?: Attribute['id'];

	static get tableName() {
		return 'Attribute';
	}
	static get jsonSchema() {
		return {
			type: 'object',
			
			properties: {
				id: {type: 'integer'},
				code: {type: 'string'},
				name: {type: 'object'}
			}
		}
	}
	static get relationMappings() {
		return {
			children: {
				relation: Model.HasManyRelation,
				modelClass: Attribute,
				join: {
					from: 'Attribute.id',
					to: 'Attribute.parentId'
				}
			},
			parent: {
				relation: Model.BelongsToOneRelation,
				modelClass: Attribute,
				join: {
					from: 'Attribute.parentId',
					to: 'Attribute.id'
				}
			}
		}
	}
}

export type AttributeShape = ModelObject<Attribute>;
