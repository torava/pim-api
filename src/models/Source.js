import {Model, snakeCaseMappers} from 'objection';

export default class Source extends Model {
	static columnNameMappers = snakeCaseMappers();
	
	static get tableName() {
		return 'Source';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			
			properties: {
				name: {type: 'string'},
        authors: {type: ['string', 'null']},
        publicationUrl: {type: ['string', 'null']},
				publicationDate: { type: 'string' },
				countryCode: { type: 'string' }
			}
		}
	}
}
