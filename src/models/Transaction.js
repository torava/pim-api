var Model = require('objection').Model;

/**
 * @extends Model
 * @constructor
 */
 function Transaction() {
	Model.apply(this, arguments);
 }

 Model.extend(Transaction);
 module.exports = Transaction;

 Transaction.tableName = 'Transaction';

 Transaction.jsonSchema = {
 	type: 'object',
 	required: ['name'],

 	properties: {
 		id: {type: 'integer'},
 		partyId: {type: 'integer'},
 		timestamp: { type: 'string', format: 'datetime', default: new Date().toISOString() }
 	}
 };

 Transaction.relationMappings = {
 	parties: {
 		relation: Model.HasOneRelation,
 		modelClass: __dirname+'/Party',
 		join: {
 			from: 'Transaction.partyId',
 			to: 'Party.id'
 		}
 	},
 	items: {
 		relation: Model.HasManyRelation,
 		modelClass: __dirname+'/Item',
 		join: {
 			from: 'Transaction.id',
 			to: 'Item.id'
 		}
 	}
 };