const parties = [
  {
    name: 'Lidl Suomi Ky Tampere-Finlayson',
    street_name: 'Finlaysoninkatu',
    street_number: 7,
    vat: '016115779-0'
  },
  {
    name: 'Lidl Suomi Ky Tampere-Rautatienkatu',
    street_name: 'Rautatienkatu',
    street_number: 21,
    vat: '016115779-0'
  }
];

exports.seed = knex => (
  knex('Party').insert(parties)
);
