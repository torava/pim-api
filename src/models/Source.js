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
        authors: {type: 'string'},
        year: {type: 'number'},
        url: {type: 'string'}
			}
		}
	}
}

module.exports = Source;