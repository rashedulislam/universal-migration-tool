import { db, statements } from '../database';
import { encryptObject, decryptObject } from '../encryption';

export interface Project {
    id: string;
    name: string;
    sourceType: 'shopify' | 'woocommerce';
    destType: 'shopify' | 'woocommerce';
    config: {
        source: {
            url: string;
            auth: any;
        };
        destination: {
            url: string;
            auth: any;
        };
    };
    mapping: {
        products: { enabled: boolean; fields: Record<string, string> };
        customers: { enabled: boolean; fields: Record<string, string> };
        orders: { enabled: boolean; fields: Record<string, string> };
        posts: { enabled: boolean; fields: Record<string, string> };
        pages: { enabled: boolean; fields: Record<string, string> };
    };
    createdAt?: Date;
    updatedAt?: Date;
}

export class ProjectRepository {
    /**
     * Get all projects
     */
    getAllProjects(): Project[] {
        const rows = statements.getAllProjects.all() as any[];
        return rows.map(row => this.assembleProject(row));
    }

    /**
     * Get project by ID
     */
    getProjectById(id: string): Project | null {
        const row = statements.getProjectById.get(id) as any;
        if (!row) return null;
        return this.assembleProject(row);
    }

    /**
     * Create new project
     */
    createProject(project: Omit<Project, 'createdAt' | 'updatedAt'>): Project {
        const transaction = db.transaction(() => {
            // Insert main project record
            statements.insertProject.run(
                project.id,
                project.name,
                project.sourceType,
                project.destType
            );

            // Insert source config
            const encryptedSourceAuth = encryptObject(project.config.source.auth);
            statements.insertConfig.run(
                project.id,
                'source',
                project.config.source.url,
                encryptedSourceAuth
            );

            // Insert destination config
            const encryptedDestAuth = encryptObject(project.config.destination.auth);
            statements.insertConfig.run(
                project.id,
                'destination',
                project.config.destination.url,
                encryptedDestAuth
            );

            // Insert mappings
            for (const [entity, config] of Object.entries(project.mapping)) {
                statements.insertMapping.run(
                    project.id,
                    entity,
                    config.enabled ? 1 : 0,
                    JSON.stringify(config.fields)
                );
            }
        });

        transaction();
        return this.getProjectById(project.id)!;
    }

    /**
     * Update project
     */
    updateProject(id: string, updates: Partial<Project>): Project | null {
        const existing = this.getProjectById(id);
        if (!existing) return null;

        const transaction = db.transaction(() => {
            // Update configs if provided
            if (updates.config) {
                if (updates.config.source) {
                    const encryptedAuth = encryptObject(updates.config.source.auth);
                    statements.insertConfig.run(
                        id,
                        'source',
                        updates.config.source.url,
                        encryptedAuth
                    );
                }
                if (updates.config.destination) {
                    const encryptedAuth = encryptObject(updates.config.destination.auth);
                    statements.insertConfig.run(
                        id,
                        'destination',
                        updates.config.destination.url,
                        encryptedAuth
                    );
                }
            }

            // Update mappings if provided
            if (updates.mapping) {
                for (const [entity, config] of Object.entries(updates.mapping)) {
                    statements.insertMapping.run(
                        id,
                        entity,
                        config.enabled ? 1 : 0,
                        JSON.stringify(config.fields)
                    );
                }
            }

            // Update timestamp
            statements.updateProjectTimestamp.run(id);
        });

        transaction();
        return this.getProjectById(id);
    }

    /**
     * Delete project
     */
    deleteProject(id: string): boolean {
        const result = statements.deleteProject.run(id);
        return result.changes > 0;
    }

    /**
     * Assemble full project from database rows
     */
    private assembleProject(projectRow: any): Project {
        const configs = statements.getConfigsByProjectId.all(projectRow.id) as any[];
        const mappings = statements.getMappingsByProjectId.all(projectRow.id) as any[];

        // Decrypt configurations
        const sourceConfig = configs.find(c => c.config_type === 'source');
        const destConfig = configs.find(c => c.config_type === 'destination');

        const config = {
            source: {
                url: sourceConfig?.url || '',
                auth: sourceConfig ? decryptObject(sourceConfig.encrypted_credentials) : {}
            },
            destination: {
                url: destConfig?.url || '',
                auth: destConfig ? decryptObject(destConfig.encrypted_credentials) : {}
            }
        };

        // Parse mappings
        const mapping: any = {
            products: { enabled: true, fields: {} },
            customers: { enabled: true, fields: {} },
            orders: { enabled: true, fields: {} },
            posts: { enabled: true, fields: {} },
            pages: { enabled: true, fields: {} }
        };

        for (const m of mappings) {
            mapping[m.entity_type] = {
                enabled: Boolean(m.enabled),
                fields: m.field_mappings ? JSON.parse(m.field_mappings) : {}
            };
        }

        return {
            id: projectRow.id,
            name: projectRow.name,
            sourceType: projectRow.source_type,
            destType: projectRow.dest_type,
            config,
            mapping,
            createdAt: new Date(projectRow.created_at),
            updatedAt: new Date(projectRow.updated_at)
        };
    }
}

// Export singleton instance
export const projectRepository = new ProjectRepository();
