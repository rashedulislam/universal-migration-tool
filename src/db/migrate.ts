import fs from 'fs/promises';
import path from 'path';
import { initializeDatabase } from './database';
import { projectRepository, Project } from './repositories/project-repository';

const PROJECTS_FILE = path.join(process.cwd(), 'projects.json');
const BACKUP_FILE = path.join(process.cwd(), 'projects.json.backup');

interface LegacyProject {
    id: string;
    name: string;
    sourceType: 'shopify' | 'woocommerce';
    destType: 'shopify' | 'woocommerce';
    config: {
        source: { url: string; auth: any };
        destination: { url: string; auth: any };
    };
    mapping?: {
        products: { enabled: boolean; fields: Record<string, string> };
        customers: { enabled: boolean; fields: Record<string, string> };
        orders: { enabled: boolean; fields: Record<string, string> };
    };
}

/**
 * Migrate projects from JSON file to database
 */
export async function migrateFromJson() {
    console.log('🔄 Starting migration from projects.json to database...');

    // Initialize database schema
    initializeDatabase();

    // Check if projects.json exists
    try {
        await fs.access(PROJECTS_FILE);
    } catch {
        console.log('ℹ️  No projects.json found. Starting with empty database.');
        return;
    }

    try {
        // Read existing projects
        const fileContent = await fs.readFile(PROJECTS_FILE, 'utf-8');
        const legacyProjects: LegacyProject[] = JSON.parse(fileContent);

        if (!Array.isArray(legacyProjects) || legacyProjects.length === 0) {
            console.log('ℹ️  No projects to migrate.');
            return;
        }

        console.log(`📦 Found ${legacyProjects.length} project(s) to migrate...`);

        // Migrate each project
        let successCount = 0;
        let failCount = 0;

        for (const legacy of legacyProjects) {
            try {
                // Ensure mapping has proper structure
                const mapping = legacy.mapping || {
                    products: { enabled: true, fields: {} },
                    customers: { enabled: true, fields: {} },
                    orders: { enabled: true, fields: {} }
                };

                // Convert legacy to new format if needed
                if (typeof mapping.products === 'boolean') {
                    (mapping as any).products = { 
                        enabled: mapping.products, 
                        fields: {} 
                    };
                }
                if (typeof mapping.customers === 'boolean') {
                    (mapping as any).customers = { 
                        enabled: mapping.customers, 
                        fields: {} 
                    };
                }
                if (typeof mapping.orders === 'boolean') {
                    (mapping as any).orders = { 
                        enabled: mapping.orders, 
                        fields: {} 
                    };
                }

                const project: Omit<Project, 'createdAt' | 'updatedAt'> = {
                    id: legacy.id,
                    name: legacy.name,
                    sourceType: legacy.sourceType,
                    destType: legacy.destType,
                    config: legacy.config,
                    mapping: mapping as any
                };

                projectRepository.createProject(project);
                console.log(`✅ Migrated: "${legacy.name}"`);
                successCount++;
            } catch (error: any) {
                console.error(`❌ Failed to migrate project "${legacy.name}":`, error.message);
                failCount++;
            }
        }

        console.log(`\n📊 Migration Summary:`);
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Failed: ${failCount}`);

        // Backup the original file
        await fs.copyFile(PROJECTS_FILE, BACKUP_FILE);
        console.log(`\n💾 Backup created: ${BACKUP_FILE}`);
        console.log('✨ Migration complete!');

    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

/**
 * Export database to JSON (for rollback)
 */
export async function exportToJson(outputPath: string = PROJECTS_FILE) {
    const projects = projectRepository.getAllProjects();
    await fs.writeFile(outputPath, JSON.stringify(projects, null, 2));
    console.log(`✅ Exported ${projects.length} projects to ${outputPath}`);
}
