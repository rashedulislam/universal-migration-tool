import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'migration.db');
const DATA_DIR = path.dirname(DB_PATH);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize SQLite database
export const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema FIRST
function createSchema() {
    // Create projects table
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            source_type TEXT NOT NULL CHECK(source_type IN ('shopify', 'woocommerce')),
            dest_type TEXT NOT NULL CHECK(dest_type IN ('shopify', 'woocommerce')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Create project_configs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS project_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT NOT NULL,
            config_type TEXT NOT NULL CHECK(config_type IN ('source', 'destination')),
            url TEXT NOT NULL,
            encrypted_credentials TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE(project_id, config_type)
        );
    `);

    // Create project_mappings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS project_mappings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT NOT NULL,
            entity_type TEXT NOT NULL CHECK(entity_type IN ('products', 'customers', 'orders', 'posts', 'pages', 'categories')),
            enabled INTEGER DEFAULT 1,
            field_mappings TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE(project_id, entity_type)
        );
    `);

    // Create synced_items table
    db.exec(`
        CREATE TABLE IF NOT EXISTS synced_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT NOT NULL,
            entity_type TEXT NOT NULL CHECK(entity_type IN ('products', 'customers', 'orders', 'posts', 'pages', 'categories')),
            original_id TEXT NOT NULL,
            data TEXT NOT NULL, -- JSON string
            synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE(project_id, entity_type, original_id)
        );
    `);

    // Create indexes for better query performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_project_configs_project_id 
        ON project_configs(project_id);
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_project_mappings_project_id 
        ON project_mappings(project_id);
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_synced_items_project_entity 
        ON synced_items(project_id, entity_type);
    `);
}

// Create schema immediately
createSchema();

// Initialize schema
export function initializeDatabase() {
    // Schema already created above, this function exists for compatibility
    console.log('Database initialized successfully');
}

// Export prepared statements for better performance
// These are created AFTER the schema exists
export const statements = {
    // Projects
    getAllProjects: db.prepare('SELECT * FROM projects ORDER BY created_at DESC'),
    getProjectById: db.prepare('SELECT * FROM projects WHERE id = ?'),
    insertProject: db.prepare(`
        INSERT INTO projects (id, name, source_type, dest_type) 
        VALUES (?, ?, ?, ?)
    `),
    deleteProject: db.prepare('DELETE FROM projects WHERE id = ?'),
    updateProjectTimestamp: db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'),

    // Configs
    getConfigsByProjectId: db.prepare('SELECT * FROM project_configs WHERE project_id = ?'),
    getConfigByType: db.prepare('SELECT * FROM project_configs WHERE project_id = ? AND config_type = ?'),
    insertConfig: db.prepare(`
        INSERT INTO project_configs (project_id, config_type, url, encrypted_credentials) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(project_id, config_type) DO UPDATE SET 
            url = excluded.url,
            encrypted_credentials = excluded.encrypted_credentials
    `),

    // Mappings
    getMappingsByProjectId: db.prepare('SELECT * FROM project_mappings WHERE project_id = ?'),
    insertMapping: db.prepare(`
        INSERT INTO project_mappings (project_id, entity_type, enabled, field_mappings) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(project_id, entity_type) DO UPDATE SET 
            enabled = excluded.enabled,
            field_mappings = excluded.field_mappings
    `),

    // Synced Items
    getSyncedItems: db.prepare('SELECT * FROM synced_items WHERE project_id = ? AND entity_type = ? ORDER BY synced_at DESC LIMIT ? OFFSET ?'),
    countSyncedItems: db.prepare('SELECT COUNT(*) as total FROM synced_items WHERE project_id = ? AND entity_type = ?'),
    insertSyncedItem: db.prepare(`
        INSERT INTO synced_items (project_id, entity_type, original_id, data, synced_at) 
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(project_id, entity_type, original_id) DO UPDATE SET 
            data = excluded.data,
            synced_at = CURRENT_TIMESTAMP
    `),
    clearSyncedItems: db.prepare('DELETE FROM synced_items WHERE project_id = ? AND entity_type = ?'),
};
