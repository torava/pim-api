import { Model } from 'objection';

import { DeepPartial } from '../utils/types';

export interface SourceShape {
	id?: number;

	'#id'?: string;
	
	name?: string;
	authors?: string;
	publicationUrl?: string;
	publicationDate?: string;
	countryCode?: string;
}

interface Source extends SourceShape {}
// eslint-disable-next-line no-redeclare
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

export type SourcePartialShape = DeepPartial<SourceShape>;

export default Source;
