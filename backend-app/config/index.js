'use strict';

/**
 * Backend configuration.
 *
 * Loads environment variables from the nearest .env file (walks up from this
 * file's directory). dotenv is a no-op if the variables are already set, so
 * CI can still inject them via the environment without being overridden.
 *
 * Database strategy (in priority order):
 *   1. Postgres  — only when DATABASE_URL is explicitly set
 *   2. SQLite    — default for all local / dev / test runs (zero setup)
 */

const path = require('path');
const fs   = require('fs');

// ── Load .env ────────────────────────────────────────────────────────────────
// Look for .env in: config/ → backend-app/ → conduit-project/ (project root)
(function loadEnv() {
  const candidates = [
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '..', '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      // Manual parse so we have no hard dependency on the dotenv package at
      // import time (dotenv is listed as an optional dep; this works without it).
      try {
        require('dotenv').config({ path: p, override: false });
      } catch (_) {
        // dotenv not installed — fall back to manual key=value parse
        const lines = fs.readFileSync(p, 'utf8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const [key, ...rest] = trimmed.split('=');
          const val = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
          if (key.trim() && !(key.trim() in process.env)) {
            process.env[key.trim()] = val;
          }
        }
      }
      break; // stop at the first .env found
    }
  }
})();

// ── Config object ─────────────────────────────────────────────────────────────
// Database: use Postgres ONLY when DATABASE_URL is explicitly provided.
// Everything else (local dev, tests, CI without a Postgres service) uses SQLite.
const usePostgres = Boolean(process.env.DATABASE_URL);

module.exports = {
  apiPath:     '/api',
  databaseUrl: process.env.DATABASE_URL || '',
  usePostgres,                                     // true only when DATABASE_URL is set
  isProduction: process.env.NODE_ENV === 'production',
  secret:      process.env.SECRET || 'secret',
  port:        Number(process.env.PORT) || 3000,
  pgSSL:       process.env.PGSSL !== 'false',      // default true for Postgres safety
  verbose:     Boolean(process.env.VERBOSE),
};
