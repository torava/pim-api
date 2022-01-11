import { Model } from 'objection';
import { NameTranslations } from '../utils/types';

export interface AttributeShape {
	id: number;
	
	code?: string;
	name: NameTranslations;
	
	children?: AttributeShape[];
	parent?: AttributeShape;
	parentId?: Attribute['id'];
}

interface Attribute extends Pick<AttributeShape, 'id' | 'code' | 'name' | 'parentId'> {
	children?: Attribute[];
	parent?: Attribute;
}
// eslint-disable-next-line no-redeclare
class Attribute extends Model {
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

export default Attribute;
