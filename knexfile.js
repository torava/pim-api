module.exports = {

  development: {
    client: 'postgresql',
    useNullAsDefault: true,
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      database: process.env.POSTGRES_DB || 'bookkeepr',
      port: process.env.POSTGRES_PORT || 5432
      //filename: './example.db'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      database: process.env.POSTGRES_DB || 'bookkeepr',
      port: process.env.POSTGRES_PORT || 5432
    },
    pool: {
      min: 2,
      max: 10
    }
  }

};
