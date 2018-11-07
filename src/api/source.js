import Source from '../models/Source';

export default app => {

app.get('/api/source', function(req, res) {
  Source.query()
    .then(result => {
      res.send(result);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
});

}