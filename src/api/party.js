import Party from '../models/Party';

export default app => {

app.get('/api/party', function(req, res) {
  return Party.query()
  .then(result => {
    res.send(result);
  })
  .catch(error => {
    console.error(error);
    res.sendStatus(500);
  });
});

}