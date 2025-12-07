import axios, { AxiosInstance } from 'axios';
import { IDestinationConnector, UniversalProduct, UniversalCustomer, UniversalOrder, ImportResult, UniversalPost, UniversalPage, UniversalCategory, UniversalShippingZone, UniversalTaxRate, UniversalCoupon } from '../../core/types';

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
                    categories: product.categories?.map(c => ({ id: parseInt(c) })).filter(c => !isNaN(c.id)), // Assuming category IDs are passed
                    tags: product.tags?.map(t => ({ name: t })),
                    meta_data: product.metafields ? Object.entries(product.metafields).map(([key, value]) => ({
                        key,
                        value: String(value)
                    })) : [],
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
                    shipping: {
                        first_name: customer.addresses?.[1]?.firstName || customer.firstName,
                        last_name: customer.addresses?.[1]?.lastName || customer.lastName,
                        address_1: customer.addresses?.[1]?.address1,
                        city: customer.addresses?.[1]?.city,
                        country: customer.addresses?.[1]?.country,
                        postcode: customer.addresses?.[1]?.zip
                    },
                    meta_data: customer.metafields ? Object.entries(customer.metafields).map(([key, value]) => ({
                        key,
                        value: String(value)
                    })) : [],
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
                    shipping: {
                        first_name: order.shippingAddress?.firstName,
                        last_name: order.shippingAddress?.lastName,
                        address_1: order.shippingAddress?.address1,
                        city: order.shippingAddress?.city,
                        country: order.shippingAddress?.country,
                        postcode: order.shippingAddress?.zip
                    },
                    meta_data: order.metafields ? Object.entries(order.metafields).map(([key, value]) => ({
                        key,
                        value: String(value)
                    })) : [],
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
    async importPosts(posts: UniversalPost[]): Promise<ImportResult[]> {
        if (!this.client) throw new Error('Not connected');

        const results: ImportResult[] = [];
        for (const post of posts) {
            try {
                const postData: any = {
                    title: post.title,
                    content: post.content,
                    slug: post.slug,
                    status: post.status,
                    // author: post.authorId, // Need to map author ID or use default
                    categories: post.categories, // Need to map category IDs
                    tags: post.tags, // Need to map tag IDs
                    date: post.createdAt.toISOString()
                };

                const res = await this.client.post('/wp/v2/posts', postData);
                results.push({ success: true, originalId: post.originalId, newId: res.data.id.toString() });
            } catch (error: any) {
                results.push({ success: false, originalId: post.originalId, error: error.message });
            }
        }
        return results;
    }

    async importPages(pages: UniversalPage[]): Promise<ImportResult[]> {
        if (!this.client) throw new Error('Not connected');

        const results: ImportResult[] = [];
        for (const page of pages) {
            try {
                const pageData = {
                    title: page.title,
                    content: page.content,
                    slug: page.slug,
                    status: page.status,
                    // author: page.authorId,
                    date: page.createdAt.toISOString()
                };

                const res = await this.client.post('/wp/v2/pages', pageData);
                results.push({ success: true, originalId: page.originalId, newId: res.data.id.toString() });
            } catch (error: any) {
                results.push({ success: false, originalId: page.originalId, error: error.message });
            }
        }
        return results;
    }

    async importCategories(categories: UniversalCategory[]): Promise<ImportResult[]> {
        if (!this.client) throw new Error('Not connected');
        const results: ImportResult[] = [];

        for (const cat of categories) {
            try {
                const wcCategory = {
                    name: cat.name,
                    slug: cat.slug,
                    description: cat.description,
                    image: cat.image ? { src: cat.image } : undefined,
                    ...cat.mappedFields
                };

                const response = await this.client.post('/products/categories', wcCategory);
                results.push({
                    originalId: cat.originalId,
                    newId: response.data.id.toString(),
                    success: true
                });
            } catch (error: any) {
                // If slug exists, try to find and update or skip
                results.push({
                    originalId: cat.originalId,
                    success: false,
                    error: error.message
                });
            }
        }
        return results;
    }

    async importShippingZones(zones: UniversalShippingZone[]): Promise<ImportResult[]> {
        if (!this.client) throw new Error('Not connected');
        const results: ImportResult[] = [];

        for (const zone of zones) {
            try {
                // 1. Create Zone
                const wcZone = {
                    name: zone.name,
                    ...zone.mappedFields
                };
                const zoneRes = await this.client.post('/shipping/zones', wcZone);
                const newZoneId = zoneRes.data.id;

                // 2. Add Methods (Simplified: just creating one flat rate if enabled in source methods, or skipping detail mapping for now)
                // WooCommerce methods are separate endpoints /shipping/zones/:id/methods
                // We will try to add methods if defined
                for (const method of zone.methods) {
                    if (method.enabled) {
                        await this.client.post(`/shipping/zones/${newZoneId}/methods`, {
                            method_id: 'flat_rate', // Defaulting to flat rate as a safe fallback
                            settings: {
                                title: method.title,
                                cost: method.cost?.toString() || '0'
                            }
                        });
                    }
                }

                results.push({
                    originalId: zone.originalId,
                    newId: newZoneId.toString(),
                    success: true
                });
            } catch (error: any) {
                results.push({
                    originalId: zone.originalId,
                    success: false,
                    error: error.message
                });
            }
        }
        return results;
    }

    async importTaxRates(rates: UniversalTaxRate[]): Promise<ImportResult[]> {
        if (!this.client) throw new Error('Not connected');
        const results: ImportResult[] = [];

        for (const rate of rates) {
            try {
                const wcTax = {
                    name: rate.name,
                    rate: rate.rate.toString(),
                    country: rate.country || '',
                    state: rate.state || '',
                    city: rate.city || '',
                    postcode: rate.postcode || '',
                    shipping: rate.shipping || false,
                    compound: rate.compound || false,
                    priority: rate.priority || 1,
                    ...rate.mappedFields
                };

                const response = await this.client.post('/taxes', wcTax);
                results.push({
                    originalId: rate.originalId,
                    newId: response.data.id.toString(),
                    success: true
                });
            } catch (error: any) {
                results.push({
                    originalId: rate.originalId,
                    success: false,
                    error: error.message
                });
            }
        }
        return results;
    }

    async importCoupons(coupons: UniversalCoupon[]): Promise<ImportResult[]> {
        if (!this.client) throw new Error('Not connected');
        const results: ImportResult[] = [];

        for (const coupon of coupons) {
            try {
                const wcCoupon = {
                    code: coupon.code,
                    amount: coupon.amount.toString(),
                    discount_type: coupon.discountType,
                    description: coupon.description,
                    date_expires: coupon.dateExpires ? coupon.dateExpires.toISOString() : null,
                    usage_limit: coupon.usageLimit,
                    usage_limit_per_user: coupon.usageLimitPerUser,
                    individual_use: coupon.individualUse,
                    free_shipping: coupon.freeShipping,
                    minimum_amount: coupon.minimumAmount?.toString(),
                    maximum_amount: coupon.maximumAmount?.toString(),
                    exclude_sale_items: false, // Default
                    ...coupon.mappedFields
                };

                const response = await this.client.post('/coupons', wcCoupon);
                results.push({
                    originalId: coupon.originalId,
                    newId: response.data.id.toString(),
                    success: true
                });
            } catch (error: any) {
                 results.push({
                    originalId: coupon.originalId,
                    success: false,
                    error: error.message
                });
            }
        }
        return results;
    }

    async getImportFields(entityType: 'products' | 'customers' | 'orders' | 'posts' | 'pages' | 'categories' | 'shipping_zones' | 'taxes' | 'coupons'): Promise<string[]> {
        if (!this.client) throw new Error('Not connected');

        const standardFields: string[] = [];
        let endpoint = '';

        // Standard writable fields
        switch (entityType) {
            case 'products':
                standardFields.push(
                    'name', 'type', 'regular_price', 'sale_price', 'description', 'short_description', 
                    'sku', 'images', 'categories', 'tags', 'weight', 'dimensions', 'manage_stock', 
                    'stock_quantity', 'status', 'catalog_visibility', 'reviews_allowed', 'attributes', 
                    'default_attributes', 'menu_order', 'slug', 'date_created', 'date_modified', 'meta_data'
                );
                endpoint = '/products?per_page=1';
                break;
            case 'customers':
                standardFields.push(
                    'email', 'first_name', 'last_name', 'username', 'password', 
                    'billing', 'shipping', 'role', 'date_created', 'date_modified', 
                    'is_paying_customer', 'avatar_url', 'meta_data'
                );
                endpoint = '/customers?per_page=1';
                break;
            case 'orders':
                standardFields.push(
                    'status', 'currency', 'billing', 'shipping', 'line_items', 'payment_method', 
                    'payment_method_title', 'transaction_id', 'customer_note', 'date_created', 'meta_data'
                );
                endpoint = '/orders?per_page=1';
                break;
            case 'posts':
                // Expanded logic for Posts
                standardFields.push(
                    'date', 'date_gmt', 'slug', 'status', 'password', 'title', 'content', 'author', 'excerpt', 
                    'featured_media', 'comment_status', 'ping_status', 'format', 'meta', 'sticky', 'template', 
                    'categories', 'tags'
                );
                endpoint = '/wp/v2/posts?per_page=1';
                break;
            case 'pages':
                // Expanded logic for Pages
                standardFields.push(
                    'date', 'date_gmt', 'slug', 'status', 'password', 'title', 'content', 'author', 'excerpt', 
                    'featured_media', 'comment_status', 'ping_status', 'menu_order', 'meta', 'template', 'parent'
                );
                endpoint = '/wp/v2/pages?per_page=1';
                break;
                standardFields.push('name', 'slug', 'parent', 'description', 'display', 'image', 'menu_order', 'count');
                endpoint = '/products/categories?per_page=1';
                break;
            case 'shipping_zones':
                standardFields.push('name', 'order');
                endpoint = '/shipping/zones?per_page=1';
                break;
            case 'taxes':
                standardFields.push('country', 'state', 'postcode', 'city', 'rate', 'name', 'priority', 'compound', 'shipping');
                endpoint = '/taxes?per_page=1';
                break;
            case 'coupons':
                standardFields.push('code', 'amount', 'discount_type', 'description', 'date_expires', 'usage_limit', 'individual_use', 'product_ids', 'exclude_product_ids', 'usage_limit_per_user', 'limit_usage_to_x_items', 'free_shipping', 'product_categories', 'excluded_product_categories', 'exclude_sale_items', 'minimum_amount', 'maximum_amount', 'email_restrictions');
                endpoint = '/coupons?per_page=1';
                break;
        }

        try {
            // Try to fetch one item to get dynamic fields (like custom meta if exposed, or just to verify keys)
            const response = await this.client.get(endpoint);
            const items = response.data;
            if (items && items.length > 0) {
                const dynamicFields = Object.keys(items[0]);
                // Merge and deduplicate
                return Array.from(new Set([...standardFields, ...dynamicFields]));
            }
        } catch (error) {
            console.warn(`Failed to fetch dynamic fields for ${entityType}, falling back to standard list.`, error);
        }

        return standardFields;
    }
}
