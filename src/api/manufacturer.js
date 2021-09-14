import apicache from 'apicache';

import Manufacturer from '../models/Manufacturer';

const cache = apicache.middleware;

export default app => {

app.get('/api/manufacturer', cache(), (req, res) => {
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
