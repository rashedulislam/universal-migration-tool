import axios, { AxiosInstance } from 'axios';
import { IDestinationConnector, UniversalProduct, UniversalCustomer, UniversalOrder, ImportResult } from '../../core/types';

export class WooCommerceDestination implements IDestinationConnector {
    name = 'WooCommerce Destination';
    private client: AxiosInstance | null = null;

    constructor(private url: string, private consumerKey: string, private consumerSecret: string) {
    }

    async connect(): Promise<void> {
        // Remove protocol if present to avoid double https:// or missing protocol
        const cleanUrl = this.url.replace(/^https?:\/\//, '');
        this.client = axios.create({
            baseURL: `https://${cleanUrl}/wp-json/wc/v3`,
            params: {
                consumer_key: this.consumerKey,
                consumer_secret: this.consumerSecret
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        try {
            await this.client.get('/system_status');
            console.log('Connected to WooCommerce Destination.');
        } catch (error) {
            console.error('Failed to connect to WooCommerce Destination:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        this.client = null;
    }

    async importProducts(products: UniversalProduct[]): Promise<ImportResult[]> {
        if (!this.client) throw new Error('Not connected');
        const results: ImportResult[] = [];

        for (const product of products) {
            try {
                const wcProduct = {
                    name: product.title,
                    description: product.description,
                    type: 'simple', // Simplified
                    regular_price: product.price.toString(),
                    sku: product.sku,
                    images: product.images.map(src => ({ src })),
                    ...product.mappedFields // Apply custom mappings
                };

                const response = await this.client.post('/products', wcProduct);
                results.push({
                    originalId: product.originalId,
                    newId: response.data.id.toString(),
                    success: true
                });
            } catch (error: any) {
                results.push({
                    originalId: product.originalId,
                    success: false,
                    error: error.message
                });
            }
        }
        return results;
    }

    async importCustomers(customers: UniversalCustomer[]): Promise<ImportResult[]> {
        if (!this.client) throw new Error('Not connected');
        const results: ImportResult[] = [];

        for (const customer of customers) {
            try {
                const wcCustomer = {
                    email: customer.email,
                    first_name: customer.firstName,
                    last_name: customer.lastName,
                    billing: {
                        first_name: customer.firstName,
                        last_name: customer.lastName,
                        email: customer.email,
                        phone: customer.phone,
                        address_1: customer.addresses?.[0]?.address1,
                        city: customer.addresses?.[0]?.city,
                        country: customer.addresses?.[0]?.country,
                        postcode: customer.addresses?.[0]?.zip
                    },
                    ...customer.mappedFields
                };

                const response = await this.client.post('/customers', wcCustomer);
                results.push({
                    originalId: customer.originalId,
                    newId: response.data.id.toString(),
                    success: true
                });
            } catch (error: any) {
                results.push({
                    originalId: customer.originalId,
                    success: false,
                    error: error.message
                });
            }
        }
        return results;
    }

    async importOrders(orders: UniversalOrder[]): Promise<ImportResult[]> {
        if (!this.client) throw new Error('Not connected');
        const results: ImportResult[] = [];

        for (const order of orders) {
            try {
                const wcOrder = {
                    status: order.status === 'paid' ? 'completed' : 'pending',
                    billing: {
                        email: order.customer.email,
                        first_name: order.customer.firstName,
                        last_name: order.customer.lastName
                    },
                    line_items: order.lineItems.map(item => ({
                        name: item.title,
                        quantity: item.quantity,
                        total: item.price.toString()
                    })),
                    ...order.mappedFields
                };

                const response = await this.client.post('/orders', wcOrder);
                results.push({
                    originalId: order.originalId,
                    newId: response.data.id.toString(),
                    success: true
                });
            } catch (error: any) {
                results.push({
                    originalId: order.originalId,
                    success: false,
                    error: error.message
                });
            }
        }
        return results;
    }
    async getImportFields(entityType: 'products' | 'customers' | 'orders'): Promise<string[]> {
        // Return standard WooCommerce fields for import
        switch (entityType) {
            case 'products':
                return ['name', 'type', 'regular_price', 'description', 'short_description', 'sku', 'images', 'categories', 'tags'];
            case 'customers':
                return ['email', 'first_name', 'last_name', 'username', 'billing', 'shipping'];
            case 'orders':
                return ['status', 'currency', 'billing', 'shipping', 'line_items', 'payment_method', 'payment_method_title'];
            default:
                return [];
        }
    }
}
