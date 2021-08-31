import Manufacturer from '../models/Manufacturer';

export default app => {

app.get('/api/manufacturer', function(req, res) {
  return Manufacturer.query()
  .then(result => {
    res.send(result);
  })
  .catch(error => {
    console.error(error);
    res.sendStatus(500);
  });
});

}
