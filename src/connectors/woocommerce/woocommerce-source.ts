import axios, { AxiosInstance } from 'axios';
import { ISourceConnector, UniversalProduct, UniversalCustomer, UniversalOrder } from '../../core/types';

export class WooCommerceSource implements ISourceConnector {
    name = 'WooCommerce Source';
    private url: string;
    private consumerKey: string;
    private consumerSecret: string;
    private client: AxiosInstance | null = null;

    constructor(url: string, consumerKey: string, consumerSecret: string) {
        this.url = url;
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
    }

    async connect(): Promise<void> {
        this.client = axios.create({
            baseURL: `${this.url}/wp-json/wc/v3`,
            params: {
                consumer_key: this.consumerKey,
                consumer_secret: this.consumerSecret
            }
        });
        try {
            await this.client.get('/system_status');
            console.log('Connected to WooCommerce Source.');
        } catch (error) {
            console.error('Failed to connect to WooCommerce Source:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        this.client = null;
    }

    async getProducts(): Promise<UniversalProduct[]> {
        if (!this.client) throw new Error('Not connected');
        const response = await this.client.get('/products');
        return response.data.map((p: any) => ({
            originalId: p.id.toString(),
            title: p.name,
            description: p.description,
            sku: p.sku,
            price: parseFloat(p.price),
            currency: 'USD', // WooCommerce doesn't always send currency in product
            images: p.images.map((img: any) => img.src),
            variants: [], // Simplified: handling simple products primarily
            originalData: p
        }));
    }

    async getCustomers(): Promise<UniversalCustomer[]> {
        if (!this.client) throw new Error('Not connected');
        const response = await this.client.get('/customers');
        return response.data.map((c: any) => ({
            originalId: c.id.toString(),
            email: c.email,
            firstName: c.first_name,
            lastName: c.last_name,
            phone: c.billing?.phone,
            addresses: [
                {
                    address1: c.billing?.address_1,
                    city: c.billing?.city,
                    country: c.billing?.country,
                    zip: c.billing?.postcode
                }
            ],
            originalData: c
        }));
    }

    async getOrders(): Promise<UniversalOrder[]> {
        if (!this.client) throw new Error('Not connected');
        const response = await this.client.get('/orders');
        return response.data.map((o: any) => ({
            originalId: o.id.toString(),
            orderNumber: o.number,
            totalPrice: parseFloat(o.total),
            currency: o.currency,
            status: o.status === 'completed' ? 'paid' : 'pending',
            createdAt: new Date(o.date_created),
            customer: {
                email: o.billing.email,
                firstName: o.billing.first_name,
                lastName: o.billing.last_name
            },
            lineItems: o.line_items.map((l: any) => ({
                title: l.name,
                quantity: l.quantity,
                price: parseFloat(l.total)
            })),
            originalData: o
        }));
    }

    async getExportFields(entityType: 'products' | 'customers' | 'orders'): Promise<string[]> {
        if (!this.client) throw new Error('Not connected');
        
        const endpoint = `/${entityType}?per_page=1`;
        const response = await this.client.get(endpoint);
        
        if (response.data && response.data.length > 0) {
            return Object.keys(response.data[0]);
        }
        return [];
    }
}
