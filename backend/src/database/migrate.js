require('module-alias/register');

const fs = require('fs');
const path = require('path');
const pool = require('./config');
const logger = require('@utils/logger').child({ module: 'migrate' });

async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  try {
    await pool.query(query);
    logger.info('Migrations table created or already exists');
  } catch (error) {
    logger.error({ err: error }, 'Failed to create migrations table');
    throw error;
  }
}

async function getExecutedMigrations() {
  try {
    const result = await pool.query('SELECT filename FROM migrations ORDER BY id');
    return result.rows.map(row => row.filename);
  } catch (error) {
    logger.error({ err: error }, 'Failed to get executed migrations');
    throw error;
  }
}

async function executeMigration(filename, sql) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(sql);
    await client.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);

    await client.query('COMMIT');
    logger.info({ filename }, 'Migration executed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error, filename }, 'Migration failed');
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Ensure migrations table exists
    await createMigrationsTable();

    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations();

    // Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Execute pending migrations
    for (const filename of migrationFiles) {
      if (!executedMigrations.includes(filename)) {
        const filePath = path.join(migrationsDir, filename);
        const sql = fs.readFileSync(filePath, 'utf8');

        logger.info({ filename }, 'Executing migration');
        await executeMigration(filename, sql);
      } else {
        logger.debug({ filename }, 'Migration already executed, skipping');
      }
    }

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error({ err: error }, 'Database migrations failed');
    throw error;
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ err: error }, 'Migrations failed');
      process.exit(1);
    });
}

module.exports = { runMigrations };