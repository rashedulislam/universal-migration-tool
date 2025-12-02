"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const migration_manager_1 = require("./core/migration-manager");
const shopify_source_1 = require("./connectors/shopify/shopify-source");
const woocommerce_destination_1 = require("./connectors/woocommerce/woocommerce-destination");
async function main() {
    // Example: Migrate from Shopify to WooCommerce
    // In a real app, these would be dynamic based on user input
    const shopifyUrl = process.env.SHOPIFY_URL;
    const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const wcUrl = process.env.WC_URL;
    const wcKey = process.env.WC_CONSUMER_KEY;
    const wcSecret = process.env.WC_CONSUMER_SECRET;
    if (!shopifyUrl || !shopifyToken || !wcUrl || !wcKey || !wcSecret) {
        console.error('Missing environment variables. Please check .env file.');
        process.exit(1);
    }
    const source = new shopify_source_1.ShopifySource(shopifyUrl, shopifyToken);
    const destination = new woocommerce_destination_1.WooCommerceDestination(wcUrl, wcKey, wcSecret);
    const manager = new migration_manager_1.MigrationManager(source, destination);
    await manager.runMigration({
        products: true,
        customers: true,
        orders: true
    });
}
main().catch(console.error);
//# sourceMappingURL=index.js.map