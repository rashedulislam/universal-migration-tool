import { ISourceConnector, IDestinationConnector } from './types';
export declare class MigrationManager {
    private source;
    private destination;
    constructor(source: ISourceConnector, destination: IDestinationConnector);
    runMigration(options?: {
        products?: boolean;
        customers?: boolean;
        orders?: boolean;
    }): Promise<void>;
    private migrateCustomers;
    private migrateProducts;
    private migrateOrders;
    private logResults;
}
//# sourceMappingURL=migration-manager.d.ts.map