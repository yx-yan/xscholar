#!/usr/bin/env node
/**
 * Xscholar Setup
 * - Creates the papers table in TiDB (if credentials provided)
 * - Prints cron command to register daily fetch
 * - Validates MEM9_API_KEY
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const REQUIRED_FOR_TIDB = ['TIDB_HOST', 'TIDB_USER', 'TIDB_PASSWORD'];
const MEM9_API_KEY = process.env.MEM9_API_KEY;

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS papers (
  id            VARCHAR(512)  PRIMARY KEY,
  title         VARCHAR(2048) NOT NULL,
  authors       VARCHAR(1024),
  abstract      TEXT,
  url           VARCHAR(1024),
  source        VARCHAR(64),
  published_at  DATE,
  relevance     FLOAT         DEFAULT 0.0,
  tags          JSON,
  raw           JSON,
  fetched_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
)`;

async function setupDB() {
  const missing = REQUIRED_FOR_TIDB.filter(k => !process.env[k]);
  if (missing.length) {
    console.log(`⚠️  TiDB skipped — missing env vars: ${missing.join(', ')}`);
    console.log('   Papers will be saved to logs/ only.\n');
    return false;
  }

  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection({
    host: process.env.TIDB_HOST,
    port: parseInt(process.env.TIDB_PORT || '4000'),
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE || 'xscholar',
    ssl: { rejectUnauthorized: true },
  });

  try {
    await conn.query(CREATE_TABLE_SQL);
    console.log('✅ TiDB: papers table ready');
    return true;
  } finally {
    await conn.end();
  }
}

async function main() {
  console.log('\n🔧 Xscholar Setup\n');

  // Check mem9
  if (!MEM9_API_KEY) {
    console.error('❌ MEM9_API_KEY is required. Add it to your .env file.');
    process.exit(1);
  }
  console.log('✅ mem9: API key found');

  // Setup DB
  const dbReady = await setupDB();

  // Cron instructions
  const fetchScript = path.resolve(__dirname, 'fetch-papers.js');
  const indexScript = path.resolve(__dirname, 'index-to-mem9.js');

  console.log('\n📅 To schedule daily updates, run in OpenClaw:\n');
  console.log(`   openclaw cron add --schedule "0 8 * * *" --label "xscholar-fetch" \\`);
  console.log(`     --command "node ${fetchScript} && node ${indexScript}"\n`);

  console.log('✨ Setup complete!\n');
  console.log('Next steps:');
  console.log('  1. Fill in config/research-profile.md with your keywords and topics');
  console.log('  2. Run: node scripts/fetch-papers.js');
  console.log('  3. Run: node scripts/index-to-mem9.js');
  console.log('  4. Ask your agent: "What papers came in today?"\n');
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
