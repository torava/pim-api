import {MongoClient} from 'mongodb';

class MongoDB {
  constructor() {
    const url = 'mongodb://localhost:27017/off';

    this.client = new MongoClient(url, { useUnifiedTopology: true });
  }
  async initialize() {
    await this.client.connect();
    console.log('Connected to MongoDB');

    this.db = this.client.db('off');
  }
  createIndex() {
    return this.db.products.createIndex({
      product_name: 'text',
      brands: 'text'
    });
  }
  getDB() {
    return this.db;
  }
}

export default new MongoDB();