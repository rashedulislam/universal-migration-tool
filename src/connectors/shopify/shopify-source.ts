import axios, { AxiosInstance } from 'axios';
import { ISourceConnector, UniversalProduct, UniversalCustomer, UniversalOrder } from '../../core/types';

export class ShopifySource implements ISourceConnector {
    name = 'Shopify Source';
    private client: AxiosInstance | null = null;

    constructor(private storeUrl: string, private accessToken: string) {
        // super(); // Removed as ShopifySource does not extend a class in the provided code
        // this.name = 'Shopify'; // Moved to property declaration

        // Remove protocol if present to avoid double https://
        const cleanUrl = storeUrl.replace(/^https?:\/\//, '');
        this.client = axios.create({
            baseURL: `https://${cleanUrl}/admin/api/2023-10`,
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
    }

    async connect(): Promise<void> {
        // Validate connection
        try {
            await this.client!.get('/shop.json'); // Use non-null assertion as client is initialized in constructor
            console.log('Connected to Shopify Source.');
        } catch (error) {
            console.error('Failed to connect to Shopify:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        this.client = null;
    }

    async getProducts(): Promise<UniversalProduct[]> {
        if (!this.client) throw new Error('Not connected');
        const response = await this.client.get('/products.json');
        const shopifyProducts = response.data.products;

        return shopifyProducts.map((p: any) => ({
            originalId: p.id.toString(),
            title: p.title,
            description: p.body_html,
            sku: p.variants[0]?.sku,
            price: parseFloat(p.variants[0]?.price || '0'),
            currency: 'USD', // TODO: Fetch from shop settings
            images: p.images.map((img: any) => img.src),
            variants: p.variants.map((v: any) => ({
                originalId: v.id.toString(),
                title: v.title,
                sku: v.sku,
                price: parseFloat(v.price),
                options: {
                    [p.options[0]?.name]: v.option1, // Simplified mapping
                }
            })),
            originalData: p
        }));
    }

    async getCustomers(): Promise<UniversalCustomer[]> {
        if (!this.client) throw new Error('Not connected');
        const response = await this.client.get('/customers.json');
        return response.data.customers.map((c: any) => ({
            originalId: c.id.toString(),
            email: c.email,
            firstName: c.first_name,
            lastName: c.last_name,
            phone: c.phone,
            addresses: c.addresses.map((a: any) => ({
                address1: a.address1,
                city: a.city,
                country: a.country,
                zip: a.zip,
            })),
            originalData: c
        }));
    }

    async getOrders(): Promise<UniversalOrder[]> {
        if (!this.client) throw new Error('Not connected');
        
        // Fetch orders from Shopify
        const response = await this.client.get('/orders.json?status=any');
        const shopifyOrders = response.data.orders;

        return shopifyOrders.map((order: any) => ({
            originalId: order.id.toString(),
            orderNumber: order.order_number.toString(),
            customer: {
                originalId: order.customer?.id?.toString(),
                email: order.email || order.customer?.email,
                firstName: order.customer?.first_name,
                lastName: order.customer?.last_name,
                phone: order.customer?.phone
            },
            lineItems: order.line_items.map((item: any) => ({
                title: item.title,
                sku: item.sku,
                quantity: item.quantity,
                price: parseFloat(item.price),
                variantId: item.variant_id?.toString(),
                productId: item.product_id?.toString()
            })),
            totalPrice: parseFloat(order.total_price),
            currency: order.currency,
            status: order.financial_status === 'paid' ? 'paid' : 'pending',
            createdAt: new Date(order.created_at),
            billingAddress: order.billing_address ? {
                firstName: order.billing_address.first_name,
                lastName: order.billing_address.last_name,
                address1: order.billing_address.address1,
                city: order.billing_address.city,
                country: order.billing_address.country,
                zip: order.billing_address.zip,
                phone: order.billing_address.phone
            } : undefined,
            originalData: order
        }));
    }

    async getExportFields(entityType: 'products' | 'customers' | 'orders'): Promise<string[]> {
        if (!this.client) throw new Error('Not connected');
        
        let endpoint = '';
        switch (entityType) {
            case 'products': endpoint = '/products.json?limit=1'; break;
            case 'customers': endpoint = '/customers.json?limit=1'; break;
            case 'orders': endpoint = '/orders.json?limit=1&status=any'; break;
        }
        
        const response = await this.client.get(endpoint);
        const items = response.data[entityType];
        
        if (items && items.length > 0) {
            return Object.keys(items[0]);
        }
        return [];
    }
}
