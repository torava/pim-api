import { Model } from 'objection';
import CategoryAttributeSourceShape from '@torava/product-utils/dist/models/CategoryAttributeSource';

import CategoryAttribute from './CategoryAttribute';
import Source from './Source';

interface CategoryAttributeSource extends CategoryAttributeSourceShape {}
// eslint-disable-next-line no-redeclare
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
