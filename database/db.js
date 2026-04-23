const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('DB connection error:', err);
    } else {
        console.log('DB connected:', res.rows);
    }
});

module.exports = pool;