process.env.NODE_ENV = 'test';

const server = require('../src/server').default;
const chai = require('chai');
const chaiHttp = require('chai-http');
const should = chai.should();
const expect = chai.expect
const fs = require('fs');
const moment = require('moment');

chai.use(chaiHttp);

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
      .send({width: 1395, height: 3805, x: 5, y: 0})
      .end((error, res) => {
        if (error) console.error(error);
        res.should.have.status(200);
        /*expect(res.body.transactions[0].total_price).to.be.equal(11.50);
        expect(res.body.transactions[0].total_price_read).to.be.equal(11.50);
        expect(res.body.transactions[0].store).to.equal('K-Supermarket Herkkuduo');
        //expect(res.body.transactions[0].date).to.be.equal(1452697800000);
        expect(res.body.transactions[0].street_name).to.equal('Pietilänkatu');
        expect(res.body.transactions[0].street_number).to.equal(2);
        expect(res.body.transactions[0].postal_code).to.equal(33720);
        expect(res.body.transactions[0].city).to.equal('Tampere');
        expect(res.body.transactions[0].items.length).to.equal(9);
        //expect(res.body.transactions[0].items[0].name).to.equal('Vaasan ruispalat 300g jälkiuun');
        expect(res.body.transactions[0].items[0].price).to.equal(1.65);*/
        transaction = res.body.transactions[0];
        done();
      });
    }).timeout(30000);
  });
  describe('/POST transaction', () => {
    it('should POST transaction', (done) => {
      chai.request(server)
      .post('/api/transaction')
      .send(transaction)
      .end((error, res) => {
        if (error) console.error(error);
        console.log(res);
        done();
      });
    }).timeout(2000);
  });
});