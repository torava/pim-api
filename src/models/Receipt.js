import {Model} from 'objection';

class Receipt extends Model {
	static get tableName() {
		return 'Receipt';
	}

	static get jsonSchema() {
		return {
			type: 'object',

			properties: {
				id: {type: 'integer'},
				file: {type: 'string', minLength: 1, maxLength: 255},
				locale: {type: 'string'},
				text: {type: 'string'}
			}
		}
	}

	static get relationMappings() {
		return {
			transaction: {
				relation: Model.BelongsToOneRelation,
				modelClass: __dirname+'/Transaction',
				join: {
					from: 'Receipt.transactionId',
					to: 'Transaction.id'
				}
			}
		}
	}
}

module.exports = Receipt;