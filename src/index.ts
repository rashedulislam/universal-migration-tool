/**
 * DEPRECATED: This CLI script is verified outdated. Please use the server-based migration flow.
 */
/*
import 'dotenv/config';
import { MigrationManager } from './core/migration-manager';
import { ShopifySource } from './connectors/shopify/shopify-source';
import { WooCommerceDestination } from './connectors/woocommerce/woocommerce-destination';

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

    const source = new ShopifySource(shopifyUrl, shopifyToken);
    const destination = new WooCommerceDestination(wcUrl, wcKey, wcSecret);

    const manager = new MigrationManager(source, destination);

    await manager.runMigration({
        products: true,
        customers: true,
        orders: true
    });
}

main().catch(console.error);
*/
