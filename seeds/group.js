if (1) {
  const groups = (
    'Clean Nature,The Reducetarian,Bernie,Fab4,Master Cook,Daddy Greens,Betula Pendula,Green Bean,Green Ghost,Evil Carbon,Peanut Butter Falcon'
    .split(',')
    .map(group => ({name: group}))
  );

  exports.seed = knex => (
    knex('Group').insert(groups)
  );
}
