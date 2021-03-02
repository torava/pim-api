exports.seed = knex => {
  if (process.env.GROUPS) {
    const groups = (
      process.env.GROUPS
      .split(',')
      .map(group => ({name: group}))
    );
    knex('Group').insert(groups);
  }
};
