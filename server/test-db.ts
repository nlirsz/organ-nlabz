
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
    try {
        console.log("Testing connection to:", process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@'));
        const client = await pool.connect();
        console.log("Successfully connected to database!");
        const res = await client.query('SELECT NOW()');
        console.log("Current time from DB:", res.rows[0]);
        client.release();
        await pool.end();
    } catch (err) {
        console.error("Connection error:", err);
    }
}

testConnection();
