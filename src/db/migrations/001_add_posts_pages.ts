import { db } from '../database';

console.log('Starting migration to add posts and pages...');

try {
    // 1. Rename old table
    console.log('Renaming old table...');
    db.exec('ALTER TABLE project_mappings RENAME TO project_mappings_old');

    // 2. Create new table
    console.log('Creating new table...');
    db.exec(`
        CREATE TABLE project_mappings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT NOT NULL,
            entity_type TEXT NOT NULL CHECK(entity_type IN ('products', 'customers', 'orders', 'posts', 'pages')),
            enabled INTEGER DEFAULT 1,
            field_mappings TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE(project_id, entity_type)
        )
    `);

    // 3. Copy data
    console.log('Copying data...');
    db.exec(`
        INSERT INTO project_mappings (id, project_id, entity_type, enabled, field_mappings)
        SELECT id, project_id, entity_type, enabled, field_mappings FROM project_mappings_old
    `);

    // 4. Drop old table
    console.log('Dropping old table...');
    db.exec('DROP TABLE project_mappings_old');

    // 5. Recreate index
    console.log('Recreating index...');
    db.exec(`
        CREATE INDEX idx_project_mappings_project_id 
        ON project_mappings(project_id);
    `);

    console.log('Migration completed successfully.');
} catch (error) {
    console.error('Migration failed:', error);
    // Attempt rollback if possible, or manual intervention needed
}
