import { ISourceConnector, IDestinationConnector, UniversalProduct, UniversalCustomer, UniversalOrder, ImportResult } from './types';

export class MigrationManager {
    private source: ISourceConnector;
    private destination: IDestinationConnector;

    constructor(source: ISourceConnector, destination: IDestinationConnector) {
        this.source = source;
        this.destination = destination;
    }

    async runMigration(options: { 
        products?: boolean | { enabled: boolean; fields: Record<string, string> }; 
        customers?: boolean | { enabled: boolean; fields: Record<string, string> }; 
        orders?: boolean | { enabled: boolean; fields: Record<string, string> }; 
        posts?: boolean | { enabled: boolean; fields: Record<string, string> }; 
        pages?: boolean | { enabled: boolean; fields: Record<string, string> }; 
        categories?: boolean | { enabled: boolean; fields: Record<string, string> };
    }) {
        console.log(`Starting migration from ${this.source.name} to ${this.destination.name}...`);

        const getMapping = (opt: any) => typeof opt === 'object' ? opt.fields : {};
        const isEnabled = (opt: any) => typeof opt === 'object' ? opt.enabled : !!opt;

        try {
            await this.source.connect();
            await this.destination.connect();

            if (isEnabled(options.customers)) {
                await this.migrateCustomers(getMapping(options.customers));
            }

            if (isEnabled(options.products)) {
                await this.migrateProducts(getMapping(options.products));
            }

            if (isEnabled(options.orders)) {
                await this.migrateOrders(getMapping(options.orders));
            }

            if (isEnabled(options.posts)) {
                await this.migratePosts(getMapping(options.posts));
            }

            if (isEnabled(options.pages)) {
                await this.migratePages(getMapping(options.pages));
            }

            if (isEnabled(options.categories)) {
                await this.migrateCategories(getMapping(options.categories));
            }

            console.log('Migration completed successfully.');
        } catch (error) {
            console.error('Migration failed:', error);
        } finally {
            await this.source.disconnect();
            await this.destination.disconnect();
        }
    }

    private async migrateCustomers(mapping: Record<string, string> = {}) {
        console.log('Fetching customers from source...');
        const customers = await this.source.getCustomers();
        console.log(`Fetched ${customers.length} customers.`);

        // Apply Mapping
        customers.forEach(c => {
            c.mappedFields = {};
            for (const [destField, srcField] of Object.entries(mapping)) {
                if (c.originalData && c.originalData[srcField] !== undefined) {
                    c.mappedFields[destField] = c.originalData[srcField];
                }
            }
        });

        console.log('Importing customers to destination...');
        const results = await this.destination.importCustomers(customers);
        this.logResults('Customers', results);
    }

    private async migrateProducts(mapping: Record<string, string> = {}) {
        console.log('Fetching products from source...');
        const products = await this.source.getProducts();
        console.log(`Fetched ${products.length} products.`);

        // Apply Mapping
        products.forEach(p => {
            p.mappedFields = {};
            for (const [destField, srcField] of Object.entries(mapping)) {
                if (p.originalData && p.originalData[srcField] !== undefined) {
                    p.mappedFields[destField] = p.originalData[srcField];
                }
            }
        });

        console.log('Importing products to destination...');
        const results = await this.destination.importProducts(products);
        this.logResults('Products', results);
    }

    private async migrateOrders(mapping: Record<string, string> = {}) {
        console.log('Fetching orders from source...');
        const orders = await this.source.getOrders();
        console.log(`Fetched ${orders.length} orders.`);

        // Apply Mapping
        orders.forEach(o => {
            o.mappedFields = {};
            for (const [destField, srcField] of Object.entries(mapping)) {
                if (o.originalData && o.originalData[srcField] !== undefined) {
                    o.mappedFields[destField] = o.originalData[srcField];
                }
            }
        });

        console.log('Importing orders to destination...');
        const results = await this.destination.importOrders(orders);
        this.logResults('Orders', results);
    }

    private async migratePosts(mapping: Record<string, string> = {}) {
        console.log('Fetching posts from source...');
        const posts = await this.source.getPosts();
        console.log(`Fetched ${posts.length} posts.`);

        // Apply Mapping
        posts.forEach(p => {
            p.mappedFields = {};
            for (const [destField, srcField] of Object.entries(mapping)) {
                if (p.originalData && p.originalData[srcField] !== undefined) {
                    p.mappedFields[destField] = p.originalData[srcField];
                }
            }
        });

        console.log('Importing posts to destination...');
        const results = await this.destination.importPosts(posts);
        this.logResults('Posts', results);
    }

    private async migratePages(mapping: Record<string, string> = {}) {
        console.log('Fetching pages from source...');
        const pages = await this.source.getPages();
        console.log(`Fetched ${pages.length} pages.`);

        // Apply Mapping
        pages.forEach(p => {
            p.mappedFields = {};
            for (const [destField, srcField] of Object.entries(mapping)) {
                if (p.originalData && p.originalData[srcField] !== undefined) {
                    p.mappedFields[destField] = p.originalData[srcField];
                }
            }
        });

        console.log('Importing pages to destination...');
        const results = await this.destination.importPages(pages);
        this.logResults('Pages', results);
    }

    private async migrateCategories(mapping: Record<string, string> = {}) {
        console.log('Fetching categories from source...');
        const categories = await this.source.getCategories();
        console.log(`Fetched ${categories.length} categories.`);

        // Apply Mapping
        categories.forEach(c => {
            c.mappedFields = {};
            for (const [destField, srcField] of Object.entries(mapping)) {
                if (c.originalData && c.originalData[srcField] !== undefined) {
                    c.mappedFields[destField] = c.originalData[srcField];
                }
            }
        });

        console.log('Importing categories to destination...');
        const results = await this.destination.importCategories(categories);
        this.logResults('Categories', results);
    }

    private logResults(entity: string, results: ImportResult[]) {
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        console.log(`${entity} migration finished: ${successCount} succeeded, ${failCount} failed.`);
        
        if (failCount > 0) {
            console.log('Errors:', results.filter(r => !r.success).map(r => r.error));
        }
    }
}
