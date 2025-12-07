import axios, { AxiosInstance } from 'axios';
import { ISourceConnector, UniversalProduct, UniversalCustomer, UniversalOrder, UniversalPost, UniversalPage, UniversalCategory, UniversalShippingZone, UniversalTaxRate, UniversalCoupon } from '../../core/types';

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

    async getProducts(onProgress?: (progress: number) => void): Promise<UniversalProduct[]> {
        if (!this.client) throw new Error('Not connected');
        
        let allProducts: any[] = [];
        let page = 1;
        const perPage = 100; // Max allowed by WooCommerce
        let total = 0;

        while (true) {
            const response = await this.client.get('/products', {
                params: { page, per_page: perPage }
            });
            
            if (page === 1) {
                total = parseInt(response.headers['x-wp-total'] || '0');
            }

            const products = response.data;
            if (products.length === 0) break;
            
            allProducts = [...allProducts, ...products];
            
            if (onProgress && total > 0) {
                onProgress(Math.min(100, Math.round((allProducts.length / total) * 100)));
            }
            
            page++;
        }

        return allProducts.map((p: any) => ({
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

    async getCustomers(onProgress?: (progress: number) => void): Promise<UniversalCustomer[]> {
        if (!this.client) throw new Error('Not connected');
        
        let allCustomers: any[] = [];
        let page = 1;
        const perPage = 100;
        let total = 0;

        while (true) {
            const response = await this.client.get('/customers', {
                params: { page, per_page: perPage }
            });

            if (page === 1) {
                total = parseInt(response.headers['x-wp-total'] || '0');
            }

            const customers = response.data;
            if (customers.length === 0) break;

            allCustomers = [...allCustomers, ...customers];

            if (onProgress && total > 0) {
                onProgress(Math.min(100, Math.round((allCustomers.length / total) * 100)));
            }

            page++;
        }

        return allCustomers.map((c: any) => ({
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

    async getOrders(onProgress?: (progress: number) => void): Promise<UniversalOrder[]> {
        if (!this.client) throw new Error('Not connected');
        
        let allOrders: any[] = [];
        let page = 1;
        const perPage = 100;
        let total = 0;

        while (true) {
            const response = await this.client.get('/orders', {
                params: { page, per_page: perPage }
            });

            if (page === 1) {
                total = parseInt(response.headers['x-wp-total'] || '0');
            }

            const orders = response.data;
            if (orders.length === 0) break;

            allOrders = [...allOrders, ...orders];

            if (onProgress && total > 0) {
                onProgress(Math.min(100, Math.round((allOrders.length / total) * 100)));
            }

            page++;
        }

        return allOrders.map((o: any) => ({
            originalId: o.id.toString(),
            orderNumber: o.number,
            totalPrice: parseFloat(o.total),
            currency: o.currency,
            status: o.status === 'completed' ? 'paid' : 'pending',
            createdAt: new Date(o.date_created),
            customer: {
                originalId: o.customer_id?.toString(),
                email: o.billing.email,
                firstName: o.billing.first_name,
                lastName: o.billing.last_name,
                addresses: [] // Simplified for nested object
            },
            lineItems: o.line_items.map((l: any) => ({
                title: l.name,
                quantity: l.quantity,
                price: parseFloat(l.total)
            })),
            originalData: o
        }));
    }

    async getPosts(onProgress?: (progress: number) => void): Promise<UniversalPost[]> {
        if (!this.client) throw new Error('Not connected');
        
        let allPosts: any[] = [];
        let page = 1;
        const perPage = 100;
        let total = 0;

        while (true) {
            // Use _embed to get author details
            const response = await this.client.get('/wp/v2/posts', {
                params: { page, per_page: perPage, _embed: true }
            });

            if (page === 1) {
                total = parseInt(response.headers['x-wp-total'] || '0');
            }

            const posts = response.data;
            if (posts.length === 0) break;

            allPosts = [...allPosts, ...posts];

            if (onProgress && total > 0) {
                onProgress(Math.min(100, Math.round((allPosts.length / total) * 100)));
            }

            page++;
        }

        return allPosts.map((post: any) => {
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

    async getPages(onProgress?: (progress: number) => void): Promise<UniversalPage[]> {
        if (!this.client) throw new Error('Not connected');
        
        let allPages: any[] = [];
        let page = 1;
        const perPage = 100;
        let total = 0;

        while (true) {
            const response = await this.client.get('/wp/v2/pages', {
                params: { page, per_page: perPage, _embed: true }
            });

            if (page === 1) {
                total = parseInt(response.headers['x-wp-total'] || '0');
            }

            const pages = response.data;
            if (pages.length === 0) break;

            allPages = [...allPages, ...pages];

            if (onProgress && total > 0) {
                onProgress(Math.min(100, Math.round((allPages.length / total) * 100)));
            }

            page++;
        }

        return allPages.map((page: any) => {
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

    async getCategories(onProgress?: (progress: number) => void): Promise<UniversalCategory[]> {
        // WooCommerce source categories fetch not strictly required for this task (Shopify -> WC)
        // But implementing for interface compliance.
        if (!this.client) throw new Error('Not connected');
        
        // Basic implementation
        const response = await this.client.get('/products/categories');
        return response.data.map((c: any) => ({
            originalId: c.id.toString(),
            name: c.name,
            slug: c.slug,
            description: c.description,
            image: c.image?.src,
            originalData: c
        }));
    }

    async getShippingZones(onProgress?: (progress: number) => void): Promise<UniversalShippingZone[]> {
        if (onProgress) onProgress(100);
        return [];
    }

    async getTaxRates(onProgress?: (progress: number) => void): Promise<UniversalTaxRate[]> {
        if (onProgress) onProgress(100);
        return [];
    }

    async getCoupons(onProgress?: (progress: number) => void): Promise<UniversalCoupon[]> {
        if (onProgress) onProgress(100);
        return [];
    }

    async getExportFields(entityType: 'products' | 'customers' | 'orders' | 'posts' | 'pages' | 'categories' | 'shipping_zones' | 'taxes' | 'coupons'): Promise<string[]> {
        if (!this.client) throw new Error('Not connected');
        
        let endpoint = '';
        switch (entityType) {
            case 'products': endpoint = '/wc/v3/products?per_page=1'; break;
            case 'customers': endpoint = '/wc/v3/customers?per_page=1'; break;
            case 'orders': endpoint = '/wc/v3/orders?per_page=1'; break;
            case 'posts': endpoint = '/wp/v2/posts?per_page=1'; break;
            case 'pages': endpoint = '/wp/v2/pages?per_page=1'; break;
            case 'categories': endpoint = '/products/categories?per_page=1'; break;
        }
        
        const response = await this.client.get(endpoint);
        const items = response.data;
        
        if (items && items.length > 0) {
            return Object.keys(items[0]);
        }
        return [];
    }
}
