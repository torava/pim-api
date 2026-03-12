import { Model } from 'objection';
import SourceShape from '@torava/pim-utils/dist/models/Source';

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
