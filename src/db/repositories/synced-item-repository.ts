import { db, statements } from '../database';

export interface SyncedItem {
    id: number;
    projectId: string;
    entityType: 'products' | 'customers' | 'orders' | 'posts' | 'pages';
    originalId: string;
    data: any;
    syncedAt: Date;
}

export class SyncedItemRepository {
    /**
     * Upsert multiple items in a transaction
     */
    upsertItems(projectId: string, entityType: string, items: any[]): void {
        const transaction = db.transaction(() => {
            // Optional: Clear existing items for this entity type if we want a full refresh
            // statements.clearSyncedItems.run(projectId, entityType);

            for (const item of items) {
                statements.insertSyncedItem.run(
                    projectId,
                    entityType,
                    item.originalId,
                    JSON.stringify(item)
                );
            }
        });

        transaction();
    }

    /**
     * Get items for a project and entity type
     */
    getItems(projectId: string, entityType: string): SyncedItem[] {
        const rows = statements.getSyncedItems.all(projectId, entityType) as any[];
        
        return rows.map(row => ({
            id: row.id,
            projectId: row.project_id,
            entityType: row.entity_type,
            originalId: row.original_id,
            data: JSON.parse(row.data),
            syncedAt: new Date(row.synced_at)
        }));
    }
}

export const syncedItemRepository = new SyncedItemRepository();
