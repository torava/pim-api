var Model = require('objection').Model;

/**
 * @extends Model
 * @constructor
 */
 function Party() {
	Model.apply(this, arguments);
 }

 Model.extend(Party);
 module.exports = Party;

 Party.tableName = 'Party';

 Party.jsonSchema = {
 	type: 'object',
 	required: ['name'],

 	properties: {
 		id: {type: 'integer'},
 		name: {type: 'string', minLength: 1, maxLength: 255}
 	}
 };

 Party.relationMappings = {
 	transactions: {
 		relation: Model.OneToManyRelation,
 		modelClass: __dirname+'/Transaction',
 		join: {
 			from: 'Party.id',
 			to: 'Transaction.partyId'
 		}
 	}
 };