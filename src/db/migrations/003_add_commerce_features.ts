import { db } from '../database';

console.log('Starting migration to add shipping zones, taxes, and coupons...');

try {
    const migration = db.transaction(() => {
        // --- 1. Migrate project_mappings ---
        console.log('Migrating project_mappings...');
        
        db.exec('ALTER TABLE project_mappings RENAME TO project_mappings_old_v3');

        db.exec(`
            CREATE TABLE project_mappings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT NOT NULL,
                entity_type TEXT NOT NULL CHECK(entity_type IN ('products', 'customers', 'orders', 'posts', 'pages', 'categories', 'shipping_zones', 'taxes', 'coupons')),
                enabled INTEGER DEFAULT 1,
                field_mappings TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                UNIQUE(project_id, entity_type)
            )
        `);

        db.exec(`
            INSERT INTO project_mappings (id, project_id, entity_type, enabled, field_mappings)
            SELECT id, project_id, entity_type, enabled, field_mappings FROM project_mappings_old_v3
        `);

        db.exec('DROP TABLE project_mappings_old_v3');

        db.exec(`
            CREATE INDEX idx_project_mappings_project_id_v3 
            ON project_mappings(project_id);
        `);


        // --- 2. Migrate synced_items ---
        console.log('Migrating synced_items...');

        db.exec('ALTER TABLE synced_items RENAME TO synced_items_old_v3');

        db.exec(`
            CREATE TABLE synced_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT NOT NULL,
                entity_type TEXT NOT NULL CHECK(entity_type IN ('products', 'customers', 'orders', 'posts', 'pages', 'categories', 'shipping_zones', 'taxes', 'coupons')),
                original_id TEXT NOT NULL,
                data TEXT NOT NULL, -- JSON string
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                UNIQUE(project_id, entity_type, original_id)
            )
        `);

        db.exec(`
            INSERT INTO synced_items (id, project_id, entity_type, original_id, data, synced_at)
            SELECT id, project_id, entity_type, original_id, data, synced_at FROM synced_items_old_v3
        `);

        db.exec('DROP TABLE synced_items_old_v3');

        db.exec(`
            CREATE INDEX idx_synced_items_project_entity_v3 
            ON synced_items(project_id, entity_type);
        `);
    });

    migration();
    console.log('Migration completed successfully.');

} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}
