import { Model, QueryBuilder } from 'objection';

import Attribute, { AttributeShape } from './Attribute';
import RecommendationSource, { RecommendationSourceShape } from './RecommendationSource';

enum Sex {
	Male = 'male',
	Female = 'female',
}

export interface RecommendationShape {
	id: number;
	minValue: number;
	maxValue: number;
  unit: string;
	perUnit: string;
	minimumAge: number;
	maximumAge: number;
	sex: Sex;
	weight: number;
	pav: boolean;
	pal: number;
	note: string;

	attributeId: AttributeShape['id'];
  sources?: RecommendationSourceShape[];
}

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
