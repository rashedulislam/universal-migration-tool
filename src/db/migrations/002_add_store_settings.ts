
import { db } from '../database';

export function up() {
    console.log('Running migration: 002_add_store_settings');

    const runTransaction = db.transaction(() => {
        // 1. Recreate project_mappings table
        db.exec(`
            CREATE TABLE IF NOT EXISTS project_mappings_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT NOT NULL,
                entity_type TEXT NOT NULL CHECK(entity_type IN ('products', 'customers', 'orders', 'posts', 'pages', 'categories', 'shipping_zones', 'taxes', 'coupons', 'store_settings')),
                enabled INTEGER DEFAULT 1,
                field_mappings TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                UNIQUE(project_id, entity_type)
            );
        `);

        // Copy data
        db.exec(`
            INSERT INTO project_mappings_new (id, project_id, entity_type, enabled, field_mappings)
            SELECT id, project_id, entity_type, enabled, field_mappings FROM project_mappings;
        `);

        // Drop old table and rename new one
        db.exec('DROP TABLE project_mappings;');
        db.exec('ALTER TABLE project_mappings_new RENAME TO project_mappings;');
        db.exec('CREATE INDEX IF NOT EXISTS idx_project_mappings_project_id ON project_mappings(project_id);');

        // 2. Recreate synced_items table
        db.exec(`
            CREATE TABLE IF NOT EXISTS synced_items_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT NOT NULL,
                entity_type TEXT NOT NULL CHECK(entity_type IN ('products', 'customers', 'orders', 'posts', 'pages', 'categories', 'shipping_zones', 'taxes', 'coupons', 'store_settings')),
                original_id TEXT NOT NULL,
                data TEXT NOT NULL,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                UNIQUE(project_id, entity_type, original_id)
            );
        `);

        // Copy data
        db.exec(`
            INSERT INTO synced_items_new (id, project_id, entity_type, original_id, data, synced_at)
            SELECT id, project_id, entity_type, original_id, data, synced_at FROM synced_items;
        `);

        // Drop old table and rename new one
        db.exec('DROP TABLE synced_items;');
        db.exec('ALTER TABLE synced_items_new RENAME TO synced_items;');
        db.exec('CREATE INDEX IF NOT EXISTS idx_synced_items_project_entity ON synced_items(project_id, entity_type);');
    });

    runTransaction();
    console.log('Migration 002_add_store_settings completed');
}
