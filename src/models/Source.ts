import { Model } from 'objection';

export interface SourceShape {
	id?: number;
	
	name?: string;
	authors?: string;
	publicationUrl?: string;
	publicationDate?: string;
	countryCode?: string;
}

interface Source extends SourceShape {
	'#id'?: string
}
class Source extends Model {
	static get tableName() {
		return 'Source';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			
			properties: {
				id: {type: 'integer'},
				name: {type: 'string'},
        authors: {type: ['string', 'null']},
        publicationUrl: {type: ['string', 'null']},
				publicationDate: { type: 'string' },
				countryCode: { type: 'string' }
			}
		}
	}
}

export default Source;
