import GroupShape from '@torava/product-utils/dist/models/Group';
import {Model} from 'objection';

import Transaction from './Transaction';

interface Group extends GroupShape {}
class Group extends Model {
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

export default Group;
