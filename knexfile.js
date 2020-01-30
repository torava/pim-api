module.exports = {

  development: {
    client: 'postgresql',
    useNullAsDefault: true,
    connection: {
      host: 'localhost',
      user: 'postgres',
      password: 'password',
      database: 'bookkeepr',
      //filename: './example.db'
    },
    pool: {
      min: 0,
      max: 1
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
