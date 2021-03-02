import parse from 'csv-parse/lib/sync';

import Source from '../models/Source';

const getEntitiesFromCsv = (csv) => {
  const records = parse(csv, {
    columns: true,
    skipEmptyLines: true
  }).map(record => ({
    ...record,
    id: undefined
  }));
  return records;
};

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

  app.post('/api/source', async (req, res) => {
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
