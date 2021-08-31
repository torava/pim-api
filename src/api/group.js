import Group from '../models/Group';

export default app => {
  app.get('/api/group', async (req, res) => {
    try {
      const result = await Group.query();
      res.send(result);
    } catch(error) {
      console.error(error);
      res.sendStatus(500);
    }
  });
}
