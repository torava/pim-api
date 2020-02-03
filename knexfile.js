module.exports = {

  development: {
    client: 'mysql',
    useNullAsDefault: true,
    connection: {
      host: 'localhost',
      user: 'root',
      password: 'password',
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
