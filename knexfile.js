module.exports = {

  development: {
    client: 'postgresql',
    useNullAsDefault: true,
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      database: process.env.POSTGRES_DB || 'product-api',
      port: Number(process.env.POSTGRES_PORT) || 5432
      //filename: './example.db'
    }
  },

  production: {
    client: 'postgresql',
    useNullAsDefault: true,
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      database: process.env.POSTGRES_DB || 'product-api',
      port: Number(process.env.POSTGRES_PORT) || 5432
    }
  }

};
