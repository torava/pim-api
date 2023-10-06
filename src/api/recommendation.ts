import express from 'express';

import Recommendation from '../models/Recommendation';

export default (app: express.Application) => {

app.get('/api/recommendation', function(req, res) {
  return Recommendation.query()
  .withGraphFetched('[attribute, sources]')
  .then(result => {
    res.send(result);
  })
  .catch(error => {
    console.error(error);
    res.sendStatus(500);
  });
});

}
