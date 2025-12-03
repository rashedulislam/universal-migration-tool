import axios, { AxiosInstance } from 'axios';
import { ISourceConnector, UniversalProduct, UniversalCustomer, UniversalOrder, UniversalPost, UniversalPage } from '../../core/types';

export class WooCommerceSource implements ISourceConnector {
    name = 'WooCommerce Source';
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

    async getPosts(): Promise<UniversalPost[]> {
        if (!this.client) throw new Error('Not connected');
        
        // Use _embed to get author details
        const response = await this.client.get('/wp/v2/posts?_embed');
        const posts = response.data;

        return posts.map((post: any) => {
            const authorName = post._embedded?.author?.[0]?.name || 'Unknown';
            return {
                originalId: post.id.toString(),
                title: post.title.rendered,
                content: post.content.rendered,
                slug: post.slug,
                status: post.status,
                authorId: post.author.toString(),
                authorName: authorName,
                categories: post.categories.map((c: number) => c.toString()),
                tags: post.tags.map((t: number) => t.toString()),
                featuredImage: post.featured_media ? post.featured_media.toString() : undefined,
                createdAt: new Date(post.date),
                updatedAt: new Date(post.modified),
                originalData: post
            };
        });
    }

    async getPages(): Promise<UniversalPage[]> {
        if (!this.client) throw new Error('Not connected');
        
        // Use _embed to get author details
        const response = await this.client.get('/wp/v2/pages?_embed');
        const pages = response.data;

        return pages.map((page: any) => {
            const authorName = page._embedded?.author?.[0]?.name || 'Unknown';
            return {
                originalId: page.id.toString(),
                title: page.title.rendered,
                content: page.content.rendered,
                slug: page.slug,
                status: page.status,
                authorId: page.author.toString(),
                authorName: authorName,
                createdAt: new Date(page.date),
                updatedAt: new Date(page.modified),
                originalData: page
            };
        });
    }

    async getExportFields(entityType: 'products' | 'customers' | 'orders' | 'posts' | 'pages'): Promise<string[]> {
        if (!this.client) throw new Error('Not connected');
        
        let endpoint = '';
        switch (entityType) {
            case 'products': endpoint = '/wc/v3/products?per_page=1'; break;
            case 'customers': endpoint = '/wc/v3/customers?per_page=1'; break;
            case 'orders': endpoint = '/wc/v3/orders?per_page=1'; break;
            case 'posts': endpoint = '/wp/v2/posts?per_page=1'; break;
            case 'pages': endpoint = '/wp/v2/pages?per_page=1'; break;
        }
        
        const response = await this.client.get(endpoint);
        const items = response.data;
        
        if (items && items.length > 0) {
            return Object.keys(items[0]);
        }
        return [];
    }
}
