import Brand from '../models/Brand';

export default app => {

app.get('/api/brand', function(req, res) {
  return Brand.query()
  .then(result => {
    res.send(result);
  })
  .catch(error => {
    console.error(error);
    res.sendStatus(500);
  });
});

}