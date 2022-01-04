import { Model } from "objection";

export default class User extends Model {
  name: string;
  password: string;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'password'],

      properties: {
        name: {type: 'string'},
        password: {type: 'string'}
      }
    }
  }
}
