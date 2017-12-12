module.exports = {

  development: {
    client: 'mysql',
    useNullAsDefault: true,
    connection: {
      host: 'localhost',
      user: 'user',
      password: 'password',
      database: 'db',
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
