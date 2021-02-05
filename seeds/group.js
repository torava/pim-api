if (process.env.GROUPS) {
  const groups = (
    process.env.GROUPS
    .split(',')
    .map(group => ({name: group}))
  );

  exports.seed = knex => (
    knex('Group').insert(groups)
  );
}
