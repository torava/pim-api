import {Model} from 'objection';

class Source extends Model {
	static get tableName() {
		return 'Source';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			
			properties: {
				name: {type: 'string'},
        authors: {type: ['string', 'null']},
        publication_url: {type: ['string', 'null']},
				publication_date: { type: 'string' }
			}
		}
	}
}

module.exports = Source;