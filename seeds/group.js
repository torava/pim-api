exports.seed = knex => {
  try {
    if (process.env.GROUPS) {
      const groups = (
        process.env.GROUPS
        .split(',')
        .map(group => ({name: group}))
      );
      knex('Group').insert(groups);
    }
  } catch (error) {
    console.error(error);
  }
};
