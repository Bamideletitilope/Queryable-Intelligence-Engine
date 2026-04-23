const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// optional test (safe for production)
pool.query('SELECT NOW()')
    .then(res => {
        console.log('DB connected:', res.rows[0]);
    })
    .catch(err => {
        console.error('DB connection error:', err);
    });

module.exports = pool;