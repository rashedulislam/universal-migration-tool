import { db, statements } from '../database';

export interface SyncedItem {
    id: number;
    projectId: string;
    entityType: 'products' | 'customers' | 'orders' | 'posts' | 'pages' | 'categories' | 'shipping_zones' | 'taxes' | 'coupons' | 'store_settings';
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
     * Get items for a project and entity type with pagination
     */
    getItems(projectId: string, entityType: string, page: number = 1, limit: number = 50): { items: SyncedItem[], total: number } {
        const offset = (page - 1) * limit;
        
        const rows = statements.getSyncedItems.all(projectId, entityType, limit, offset) as any[];
        const count = statements.countSyncedItems.get(projectId, entityType) as any;

        const items = rows.map(row => ({
            id: row.id,
            projectId: row.project_id,
            entityType: row.entity_type,
            originalId: row.original_id,
            data: JSON.parse(row.data),
            syncedAt: new Date(row.synced_at)
        }));

        return {
            items,
            total: count.total
        };
    }
}

export const syncedItemRepository = new SyncedItemRepository();
