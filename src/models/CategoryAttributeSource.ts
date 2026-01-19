import { Model } from 'objection';

import CategoryAttribute, { CategoryAttributeShape } from './CategoryAttribute';
import Source, { SourceShape } from './Source';
import { AttributeShape } from './Attribute';

export interface CategoryAttributeSourceShape {
	id?: number;

	referenceUrl?: string;
	referenceDate?: string;
	note?: string;
	countryCode?: string;

	attribute?: CategoryAttributeShape;
	attributeId?: AttributeShape['id'];
	source?: SourceShape;
	sourceId?: SourceShape['id'];
}

interface CategoryAttributeSource extends CategoryAttributeSourceShape {}
class CategoryAttributeSource extends Model {
	static get tableName() {
		return 'CategoryAttributeSource';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
        referenceUrl: {type: ['string', 'null']},
				referenceDate: { type: 'string', default: new Date().toISOString() },
				note: {type: ['string', 'null']},
				countryCode: { type: ['string', 'null'] }
			}
		}
  }
  
  static get relationMappings() {
		return {
			attribute: {
				relation: Model.BelongsToOneRelation,
				modelClass: CategoryAttribute,
				join: {
					from: 'CategoryAttributeSource.attributeId',
					to: 'CategoryAttribute.id'
				}
			},
			source: {
				relation: Model.BelongsToOneRelation,
				modelClass: Source,
				join: {
					from: 'CategoryAttributeSource.sourceId',
					to: 'Source.id'
				}
			}
    }
  }
}

export default CategoryAttributeSource;
