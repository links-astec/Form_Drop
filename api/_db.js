// Shared Postgres pool for all api/*.js functions.
// File is prefixed with "_" so Vercel doesn't treat it as its own route.
//
// Why this exists: each endpoint used to keep its own module-level Pool. On Vercel,
// warm serverless containers reuse that pool across requests, but free-tier Postgres
// (e.g. Render) closes connections that sit idle between requests. The next query on
// that now-dead connection fails with "Connection terminated unexpectedly". This
// module adds an idle timeout, an error listener so a dropped connection doesn't
// linger as a broken pool, and a retry so a single dropped connection doesn't surface
// as a user-facing error.
const { Pool } = require("pg");

let _pool = null;

function createPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
  // Without a listener, an idle pooled client that the DB server drops emits an
  // unhandled 'error' event. Log it and drop the pool so the next call builds a
  // fresh one instead of reusing connections that are already dead.
  pool.on("error", (err) => {
    console.error("Postgres pool error:", err.message);
    if (_pool === pool) _pool = null;
  });
  return pool;
}

function getPool() {
  if (!_pool) _pool = createPool();
  return _pool;
}

const RETRYABLE = /Connection terminated|terminating connection|ECONNRESET|Connection ended unexpectedly/i;

// Drop-in replacement for pool.query() — retries once with a fresh pool if the
// connection was dropped out from under it.
async function query(text, params) {
  try {
    return await getPool().query(text, params);
  } catch (err) {
    if (!RETRYABLE.test(err.message || "")) throw err;
    console.warn("Retrying query after dropped connection:", err.message);
    _pool = null;
    return await getPool().query(text, params);
  }
}

module.exports = { getPool, query };
