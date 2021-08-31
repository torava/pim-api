import {Model} from 'objection';

import Transaction from './Transaction';

export default class Group extends Model {
	static get tableName() {
		return 'Group';
	}

	static get jsonSchema() {
		return {
			type: 'object',
			
			properties: {
				name: {type: 'string'}
			}
		}
  }
  
  static get relationMappings() {
		return {
			transactions: {
				relation: Model.HasManyRelation,
				modelClass: Transaction,
				join: {
					from: 'Party.transactionId',
					to: 'Transaction.id'
				}
			}
		}
	}
}
