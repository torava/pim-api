import { Model, QueryBuilder } from 'objection';
import RecommendationShape from '@torava/product-utils/dist/models/Recommendation';

import Attribute from './Attribute';
import RecommendationSource from './RecommendationSource';

interface Recommendation extends RecommendationShape {}
class Recommendation extends Model {
	static get tableName() {
		return 'Recommendation';
	}
	static get modifiers() {
		return {
			filterByAttributeIds(builder: QueryBuilder<Recommendation>, attributeIds: Recommendation['id'][]) {
        builder.whereIn('attributeId', attributeIds);
      }
		}
	}
	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
				minValue: {type: 'number'},
				maxValue: {type: 'number'},
				unit: {type: 'string'},
				perUnit: {type: ['string', 'null']},
				minimumAge: {type: ['number', 'null']},
				maximumAge: {type: ['number', 'null']},
				sex: {type: ['string', 'null']},
				weight: {type: ['number', 'null']},
				pav: {type: ['number', 'null']},
				pal: {type: ['number', 'null']},
				note: {type: ['string', 'null']}
			}
		}
  }
  static get relationMappings() {
		return {
			attribute: {
				relation: Model.BelongsToOneRelation,
				modelClass: Attribute,
				join: {
					from: 'Recommendation.attributeId',
					to: 'Attribute.id'
				}
			},
			sources: {
				relation: Model.HasManyRelation,
				modelClass: RecommendationSource,
				join: {
					from: 'Recommendation.id',
					to: 'RecommendationSource.recommendationId'
				}
			}
    }
  }
}

export default Recommendation;
