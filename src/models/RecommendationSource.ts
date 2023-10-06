import { Model } from 'objection';
import RecommendationSourceShape from '@torava/product-utils/dist/models/RecommendationSource';

import Source from './Source';
import Recommendation from './Recommendation';

interface RecommendationSource extends RecommendationSourceShape {}
class RecommendationSource extends Model {
	static get tableName() {
		return 'RecommendationSource';
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
			recommendation: {
				relation: Model.BelongsToOneRelation,
				modelClass: Recommendation,
				join: {
					from: 'RecommendationSource.recommendationId',
					to: 'Recommendation.id'
				}
			},
			source: {
				relation: Model.BelongsToOneRelation,
				modelClass: Source,
				join: {
					from: 'RecommendationSource.sourceId',
					to: 'Source.id'
				}
			}
    }
  }
}

export default RecommendationSource;
