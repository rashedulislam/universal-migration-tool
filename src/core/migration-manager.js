"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationManager = void 0;
const types_1 = require("./types");
class MigrationManager {
    source;
    destination;
    constructor(source, destination) {
        this.source = source;
        this.destination = destination;
    }
    async runMigration(options = { products: true, customers: true, orders: true }) {
        console.log(`Starting migration from ${this.source.name} to ${this.destination.name}...`);
        try {
            await this.source.connect();
            await this.destination.connect();
            if (options.customers) {
                await this.migrateCustomers();
            }
            if (options.products) {
                await this.migrateProducts();
            }
            if (options.orders) {
                await this.migrateOrders();
            }
            console.log('Migration completed successfully.');
        }
        catch (error) {
            console.error('Migration failed:', error);
        }
        finally {
            await this.source.disconnect();
            await this.destination.disconnect();
        }
    }
    async migrateCustomers() {
        console.log('Fetching customers from source...');
        const customers = await this.source.getCustomers();
        console.log(`Fetched ${customers.length} customers.`);
        console.log('Importing customers to destination...');
        const results = await this.destination.importCustomers(customers);
        this.logResults('Customers', results);
    }
    async migrateProducts() {
        console.log('Fetching products from source...');
        const products = await this.source.getProducts();
        console.log(`Fetched ${products.length} products.`);
        console.log('Importing products to destination...');
        const results = await this.destination.importProducts(products);
        this.logResults('Products', results);
    }
    async migrateOrders() {
        console.log('Fetching orders from source...');
        const orders = await this.source.getOrders();
        console.log(`Fetched ${orders.length} orders.`);
        console.log('Importing orders to destination...');
        const results = await this.destination.importOrders(orders);
        this.logResults('Orders', results);
    }
    logResults(entity, results) {
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        console.log(`${entity} migration finished: ${successCount} succeeded, ${failCount} failed.`);
        if (failCount > 0) {
            console.log('Errors:', results.filter(r => !r.success).map(r => r.error));
        }
    }
}
exports.MigrationManager = MigrationManager;
//# sourceMappingURL=migration-manager.js.map