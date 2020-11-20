process.env.NODE_ENV = 'test';

const {server} = require('../src/server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const should = chai.should();
const expect = chai.expect
const fs = require('fs');
const moment = require('moment');

chai.use(chaiHttp);

const mockTransaction = {
  total_price: 11.50,
  total_price_read: 11.50,
  party: {
    name: 'K-Supermarket Herkkuduo',
    street_name: 'Pietilänkatu',
    street_number: '2',
    postal_code: '33720',
    city: 'Tampere'
  },
  date: 1452697800000,
  items: [
    {
      name: 'Vaasan ruispalat 300g jälkiuun',
      price: 1.65
    },
    {
      name: 'Pirkka kevytmaito 1 l',
      price: 0.7
    },
    {
      name: 'Pirkka kevytmaito 1 l',
      price: 0.7
    },
    {
      name: 'HK naudan jauheliha 10% 600g',
      price: 6.99
    },
    {
      name: 'Fazer pantteri tuutti 91g',
      price: 1.79
    },
    {
      name: 'Bonduelle Kidneypavut 310/250g',
      price: 1.59
    },
    {
      name: 'Pirkka Tomaattimurska 390 g ch',
      price: 0.89
    },
    {
      name: 'Muovikassi 40L',
      price: 0.19
    },
    {
      name: 'K-Plussa-Etu',
      price: -2
    }
  ]
};

describe('Receipt', () => {
  var file,
      transaction;

  describe('/POST receipt picture', () => {
    it('should POST receipt picture', (done) => {
      chai.request(server)
      .post('/api/receipt/picture')
      .attach('file', fs.readFileSync(__dirname+'/test2.jpg'), 'test2.jpg')
      .end((error, res) => {
        if (error) console.error(error);
        file = res.body.file;
        res.should.have.status(200);
        done();
      });
    });
  });
  /*describe('/POST receipt data empty', () => {
    it('should POST receipt data', (done) => {
      chai.request(server)
      .post('/api/receipt/data/'+file)
      .end((error, res) => {
        if (error) console.error(error);
        console.log(res.body);
        res.should.have.status(200);
        done();
      });
    }).timeout(15000);
  });*/
  describe('/POST receipt data', () => {
    it('should POST receipt data', (done) => {
      chai.request(server)
      .post('/api/receipt/data/'+file)
      .send({width: 1330, height: 3755, x: 25, y: 50})
      .end((error, res) => {
        if (error) console.error(error);
        res.should.have.status(200);
        console.log(JSON.stringify(res.body, null, '  '));
        expect(res.body.transactions[0]).to.be.equal(mockTransaction);
        transaction = res.body.transactions[0];
        done();
      });
    }).timeout(30000);
  });
  describe('/POST transaction', () => {
    it('should POST transaction', (done) => {
      transaction.items[0].product.attributes = [{name: 'protein', value: '10'}];
      chai.request(server)
      .post('/api/transaction')
      .send(transaction)
      .end((error, res) => {
        if (error) console.error(error);
        done();
      });
    }).timeout(2000);
  });
});