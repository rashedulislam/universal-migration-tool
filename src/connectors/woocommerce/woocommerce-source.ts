import axios, { AxiosInstance } from 'axios';
import { ISourceConnector, UniversalProduct, UniversalCustomer, UniversalOrder, UniversalPost, UniversalPage, UniversalCategory, UniversalShippingZone, UniversalTaxRate, UniversalCoupon, UniversalStoreSettings } from '../../core/types';

export class WooCommerceSource implements ISourceConnector {
    name = 'WooCommerce Source';
    private client: AxiosInstance | null = null;
    private wpClient: AxiosInstance | null = null;

    constructor(
        private url: string, 
        private consumerKey: string, 
        private consumerSecret: string,
        private wpUser?: string,
        private wpAppPassword?: string
    ) {}

    async connect(): Promise<void> {
        // Remove protocol if present to avoid double https:// or missing protocol
        const cleanUrl = this.url.replace(/^https?:\/\//, '');
        
        // WooCommerce Client
        this.client = axios.create({
            baseURL: `https://${cleanUrl}/wp-json/wc/v3`,
            params: {
                consumer_key: this.consumerKey,
                consumer_secret: this.consumerSecret
            },
            headers: {
                'User-Agent': 'UniversalMigrationTool/1.0',
                'Content-Type': 'application/json'
            }
        });
        
        // WordPress Client (for Settings, Posts, Pages)
        const wpAuthHeaders: any = {
            'User-Agent': 'UniversalMigrationTool/1.0',
            'Content-Type': 'application/json'
        };

        if (this.wpUser && this.wpAppPassword) {
            const token = Buffer.from(`${this.wpUser}:${this.wpAppPassword}`).toString('base64');
            wpAuthHeaders['Authorization'] = `Basic ${token}`;
        }

        this.wpClient = axios.create({
            baseURL: `https://${cleanUrl}/wp-json/wp/v2`,
            headers: wpAuthHeaders
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
            // Use wpClient for WP REST API
            const response = await this.wpClient!.get('/posts', {
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
            const response = await this.wpClient!.get('/pages', {
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

    async getStoreSettings(): Promise<UniversalStoreSettings> {
        if (!this.client || !this.wpClient) throw new Error('Not connected');
        
        const settings: UniversalStoreSettings = {};

        try {
            // 1. WooCommerce Settings
            const wcSettings = [
                { key: 'woocommerce_currency', prop: 'currency' },
                { key: 'woocommerce_weight_unit', prop: 'weightUnit' },
                { key: 'woocommerce_store_address', prop: 'address1' },
                { key: 'woocommerce_store_city', prop: 'city' },
                { key: 'woocommerce_store_postcode', prop: 'zip' },
                { key: 'woocommerce_default_country', prop: 'country' }, // Might contain state like US:CA
                { key: 'woocommerce_currency_pos', prop: 'currencyFormat' }
            ];

            for (const { key, prop } of wcSettings) {
                try {
                    // Correct endpoint for general settings options is /settings/general/{id}
                    const res = await this.client.get(`/settings/general/${key}`);
                    (settings as any)[prop] = res.data.value;
                } catch (e) {
                    // console.warn(`Failed to fetch WC setting ${key}`, e);
                }
            }

            // Handle Country/State split if needed
            if (settings.country && settings.country.includes(':')) {
                const parts = settings.country.split(':');
                settings.country = parts[0];
                settings.state = parts.length > 1 ? parts[1] : undefined;
            } else if (settings.country) {
                // If no colon, it's just country. State might be empty or not set in default_country.
            }
            // Note: weight unit is actually in /settings/products/woocommerce_weight_unit usually?
            // Let's double check. My previous code used /settings/products for weight_unit.
            // Let's re-fetch weight unit from correct path if previous loop failed or just correct it.
            // Actually, woocommerce_weight_unit is in 'products' group.
            
            try {
                const weightRes = await this.client.get('/settings/products/woocommerce_weight_unit');
                settings.weightUnit = weightRes.data.value;
            } catch (e) {}


            // 2. WordPress Settings (Timezone, Title, Email)
            try {
                const wpSettingsRes = await this.wpClient.get('/settings');
                const wpData = wpSettingsRes.data;
                
                if (wpData.timezone_string) settings.timezone = wpData.timezone_string;
                if (wpData.title) settings.siteTitle = wpData.title;
                if (wpData.email) settings.adminEmail = wpData.email;
                
            } catch (e: any) { console.warn('Failed to fetch WP settings.', e.response?.data || e.message); }

        } catch (error) {
            console.error('Failed to get store settings:', error);
        }
        
        return settings;
    }

    async getExportFields(entityType: 'products' | 'customers' | 'orders' | 'posts' | 'pages' | 'categories' | 'shipping_zones' | 'taxes' | 'coupons' | 'store_settings'): Promise<string[]> {
        if (!this.client || !this.wpClient) throw new Error('Not connected');
        
        // ... (rest of switch) ...
        switch (entityType) {
            case 'products': return ['name', 'slug', 'type', 'status', 'description', 'short_description', 'sku', 'price', 'regular_price', 'sale_price', 'date_on_sale_from', 'date_on_sale_to', 'on_sale', 'purchasable', 'total_sales', 'virtual', 'downloadable', 'downloads', 'download_limit', 'download_expiry', 'external_url', 'button_text', 'tax_status', 'tax_class', 'manage_stock', 'stock_quantity', 'backorders', 'backorders_allowed', 'backordered', 'low_stock_amount', 'sold_individually', 'weight', 'dimensions', 'shipping_required', 'shipping_taxable', 'shipping_class', 'shipping_class_id', 'reviews_allowed', 'average_rating', 'rating_count', 'related_ids', 'upsell_ids', 'cross_sell_ids', 'parent_id', 'purchase_note', 'categories', 'tags', 'images', 'attributes', 'default_attributes', 'variations', 'grouped_products', 'menu_order', 'meta_data'];
            case 'customers': return ['email', 'first_name', 'last_name', 'username', 'billing', 'shipping', 'is_paying_customer', 'avatar_url', 'meta_data'];
            case 'orders': return ['parent_id', 'status', 'currency', 'version', 'prices_include_tax', 'date_created', 'date_modified', 'discount_total', 'discount_tax', 'shipping_total', 'shipping_tax', 'cart_tax', 'total', 'total_tax', 'customer_id', 'order_key', 'billing', 'shipping', 'payment_method', 'payment_method_title', 'transaction_id', 'customer_ip_address', 'customer_user_agent', 'created_via', 'customer_note', 'date_completed', 'date_paid', 'cart_hash', 'number', 'meta_data', 'line_items', 'tax_lines', 'shipping_lines', 'fee_lines', 'coupon_lines', 'refunds'];
            case 'posts': return ['date', 'date_gmt', 'guid', 'id', 'link', 'modified', 'modified_gmt', 'slug', 'status', 'type', 'password', 'title', 'content', 'author', 'excerpt', 'featured_media', 'comment_status', 'ping_status', 'sticky', 'template', 'format', 'meta', 'categories', 'tags'];
            case 'pages': return ['date', 'date_gmt', 'guid', 'id', 'link', 'modified', 'modified_gmt', 'slug', 'status', 'type', 'password', 'title', 'content', 'author', 'excerpt', 'featured_media', 'comment_status', 'ping_status', 'menu_order', 'meta', 'template', 'parent'];
            case 'categories': return ['name', 'slug', 'parent', 'description', 'display', 'image', 'menu_order', 'count'];
            case 'shipping_zones': return ['name', 'order'];
            case 'taxes': return ['country', 'state', 'postcode', 'city', 'rate', 'name', 'priority', 'compound', 'shipping', 'order', 'class'];
            case 'coupons': return ['code', 'amount', 'date_created', 'date_created_gmt', 'date_modified', 'date_modified_gmt', 'discount_type', 'description', 'date_expires', 'date_expires_gmt', 'usage_count', 'individual_use', 'product_ids', 'excluded_product_ids', 'usage_limit', 'usage_limit_per_user', 'limit_usage_to_x_items', 'free_shipping', 'product_categories', 'excluded_product_categories', 'exclude_sale_items', 'minimum_amount', 'maximum_amount', 'email_restrictions', 'used_by', 'meta_data'];
            case 'store_settings': return ['siteTitle', 'adminEmail', 'address1', 'city', 'country', 'state', 'zip', 'timezone', 'weightUnit', 'currency', 'currencyFormat'];
        }
        return [];
    }

}
