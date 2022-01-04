import {Model, ModelObject, snakeCaseMappers} from 'objection';
import { DeepPartial } from '../utils/types';

export default class Source extends Model {
	id!: number;
	
	name?: string;
	authors?: string;
	publicationUrl?: string;
	publicationDate?: string;
	countryCode?: string;

	static columnNameMappers = snakeCaseMappers();
	
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

export type SourceShape = ModelObject<Source>;
export type SourcePartialShape = DeepPartial<SourceShape>;
