const parties = [
  {
    name: 'Alepa',
  },
  {
    name: 'K-Citymarket',
  },
  {
    name: 'K-Supermarket'
  },
  {
    name: 'Lidl',
    vat: '01615779-0'
  }
];

exports.seed = knex => {
  try {
    knex('Party').insert(parties)
  } catch (error) {
    console.error(error);
  }
};
