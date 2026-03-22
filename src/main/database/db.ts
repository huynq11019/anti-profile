import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

let db: Database.Database

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'database.sqlite')
  const dbDir = path.dirname(dbPath)

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  return db
}

export function initDatabase(): void {
  const database = getDb()

  // 1. Create schema history table if it doesn't exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_history (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      installed_on DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // 2. Define migration directory
  // In development, we use the source directory
  // In production, we'll need to handle this via extraResources in electron-builder
  const migrationsDir = app.isPackaged
    ? path.join(process.resourcesPath, 'migrations')
    : path.join(__dirname, '../../src/main/database/migrations')

  if (!fs.existsSync(migrationsDir)) {
    console.warn('Migrations directory not found:', migrationsDir)
    return
  }

  // 3. Get all migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => {
      const vA = parseInt(a.split('__')[0].substring(1))
      const vB = parseInt(b.split('__')[0].substring(1))
      return vA - vB
    })

  // 4. Run migrations in a transaction
  const runMigration = database.transaction((version: number, name: string, sql: string) => {
    database.exec(sql)
    database.prepare('INSERT INTO schema_history (version, name) VALUES (?, ?)').run(version, name)
  })

  const markMigrationApplied = (version: number, name: string) => {
    database.prepare('INSERT INTO schema_history (version, name) VALUES (?, ?)').run(version, name)
  }

  const isDuplicateColumnError = (error: unknown): boolean => {
    return error instanceof Error && /duplicate column name/i.test(error.message)
  }

  for (const file of files) {
    const versionMatch = file.match(/^V(\d+)__(.+)\.sql$/)
    if (!versionMatch) continue

    const version = parseInt(versionMatch[1])
    const name = versionMatch[2]

    const row = database.prepare('SELECT 1 FROM schema_history WHERE version = ?').get(version)
    if (!row) {
      console.log(`Applying migration: ${file}`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      try {
        runMigration(version, name, sql)
      } catch (err) {
        if (isDuplicateColumnError(err)) {
          console.warn(`Migration ${file} skipped because column already exists. Marking as applied.`)
          markMigrationApplied(version, name)
          continue
        }

        console.error(`Failed to apply migration ${file}:`, err)
        throw err
      }
    }
  }

  console.log('Database initialized and migrated successfully')
}
