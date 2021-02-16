import Source from '../models/Source';
import { getEntitiesFromCsv } from '../utils/import';

export default app => {
  app.get('/api/source', function(req, res) {
    Source.query()
      .then(result => {
        res.send(result);
      })
      .catch(error => {
        console.error(error);
        res.sendStatus(500);
      });
  });

  app.post('/api/category', async (req, res) => {
    try {
      let sources;
      if (req.body.csv) {
        sources = getEntitiesFromCsv(req.body.csv);
      }
      else {
        sources = req.body;
      }
      const insertedSources = await Source.query().insert(sources);
      return res.send(insertedSources);
    } catch (error) {
      console.error(error);
      return res.sendStatus(500);
    }
  });
};
