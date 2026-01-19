import { Model } from 'objection';

import Source, { SourceShape } from './Source';
import Recommendation, { RecommendationShape } from './Recommendation';

export interface RecommendationSourceShape {
	id?: number;

	referenceUrl?: string;
	referenceDate?: string;
	note?: string;
	countryCode?: string;

	recommendation?: RecommendationShape;
	recommendationId?: RecommendationShape['id'];
	source?: SourceShape;
	sourceId?: SourceShape['id'];
}

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
