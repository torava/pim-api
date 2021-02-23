const parties = [
  {
    name: 'Lidl Suomi Ky Tampere-Finlayson',
    street_name: 'Finlaysoninkatu',
    street_number: 7,
    vat: '016115779-0'
  },
  {
    name: 'Lidl Suomi Ky Kerava',
    street_name: 'Santaniitynkatu',
    street_number: 7,
    vat: '01615779-0'
  },
  {
    name: 'Lidl Suomi Ky Tampere-Rautatienkatu',
    street_name: 'Rautatienkatu',
    street_number: 21,
    vat: '016115779-0'
  },
  {
    name: 'Alepa Otaniemi',
    vat: '1837957-3'
  },
  {
    name: 'K-Citymarket Kerava',
    street_name: 'Nikonkatu',
    street_number: 1,
    postal_code: '04200',
    city: 'Kerava'
  },
  {
    name: 'Kruunuhaan Apteekki'
  },
  {
    name: 'K-Supermarket Kaisaniemi'
  },
  {
    name: 'Alepa Ruoholahdenkatu'
  },
  {
    name: 'Lidl Suomi Ky Helsinki-Graniittitalo',
    street_name: 'Jaakonkatu',
    street_number: 3,
    vat: '01615779-0'
  }
];

exports.seed = knex => (
  knex('Party').insert(parties)
);
