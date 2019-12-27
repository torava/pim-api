module.exports = {

  development: {
    client: 'postgresql',
    useNullAsDefault: true,
    connection: {
      host: 'localhost',
      user: 'postgres',
      password: 'postgres',
      database: 'bookkeepr',
      //filename: './example.db'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      database: 'example'
    },
    pool: {
      min: 2,
      max: 10
    }
  }

};
