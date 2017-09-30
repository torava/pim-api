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
  var file;
  describe('/POST receipt picture', () => {
    it('should POST receipt picture', (done) => {
      chai.request(server)
      .post('/api/receipt/picture')
      .attach('file', fs.readFileSync(__dirname+'/test.jpg'), 'test.jpg')
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
      .send({width: 525, height: 955, x: 30, y: 0})
      .end((error, res) => {
        if (error) console.error(error);
        console.log(file);
        console.log(res.body);
        console.log(moment(res.body.date).format('LLLL'));
        res.should.have.status(200);
        expect(res.body.metadata.total_price).to.be.equal(4.3);
        expect(res.body.metadata.store).to.equal('KANNUKSEN APTEEKKI');
        expect(res.body.metadata.address).to.equal('Siltakatu 6');
        expect(res.body.items.length).to.equal(1);
        expect(res.body.items[0].price).to.equal(4.3);
        done();
      });
    }).timeout(30000);
  });
});