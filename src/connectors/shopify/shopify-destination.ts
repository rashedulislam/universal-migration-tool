import axios, { AxiosInstance } from 'axios';
import { IDestinationConnector, UniversalProduct, UniversalCustomer, UniversalOrder, ImportResult, UniversalPost, UniversalPage } from '../../core/types';

export class ShopifyDestination implements IDestinationConnector {
    name = 'Shopify Destination';
    private client: AxiosInstance | null = null;

    constructor(private storeUrl: string, private accessToken: string) {
        // Remove protocol if present to avoid double https://
        const cleanUrl = storeUrl.replace(/^https?:\/\//, '');
        this.client = axios.create({
            baseURL: `https://${cleanUrl}/admin/api/2023-10`,
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken
            }
        });
    }

    async connect(): Promise<void> {
        if (!this.client) {
            // This case should ideally not happen if constructor always initializes client
            // but good for type safety or if constructor logic changes.
            throw new Error('Shopify client not initialized in constructor.');
        }
        try {
            await this.client.get('/shop.json');
            console.log('Connected to Shopify Destination.');
        } catch (error) {
            console.error('Failed to connect to Shopify Destination:', error);
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
                const shopifyProduct = {
                    product: {
                        title: product.title,
                        body_html: product.description,
                        variants: product.variants?.map(v => ({
                            price: v.price,
                            sku: v.sku,
                            option1: v.options ? Object.values(v.options)[0] : 'Default Title'
                        })) || [{ price: product.price, sku: product.sku }],
                        images: product.images.map(src => ({ src }))
                    }
                };

                const response = await this.client.post('/products.json', shopifyProduct);
                results.push({
                    originalId: product.originalId,
                    newId: response.data.product.id.toString(),
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
                const shopifyCustomer = {
                    customer: {
                        first_name: customer.firstName,
                        last_name: customer.lastName,
                        email: customer.email,
                        phone: customer.phone,
                        addresses: customer.addresses?.map(a => ({
                            address1: a.address1,
                            city: a.city,
                            country: a.country,
                            zip: a.zip
                        }))
                    }
                };

                const response = await this.client.post('/customers.json', shopifyCustomer);
                results.push({
                    originalId: customer.originalId,
                    newId: response.data.customer.id.toString(),
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
                // Note: Creating orders usually requires finding the customer and product variant IDs in the new system first.
                // This is a simplified implementation. In a real scenario, we'd need a mapping lookup.
                const shopifyOrder = {
                    order: {
                        email: order.customer.email,
                        financial_status: order.status === 'paid' ? 'paid' : 'pending',
                        line_items: order.lineItems.map(item => ({
                            title: item.title,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                };

                const response = await this.client.post('/orders.json', shopifyOrder);
                results.push({
                    originalId: order.originalId,
                    newId: response.data.order.id.toString(),
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

        // 1. Find or create a Blog to attach articles to
        let blogId: number;
        const blogsRes = await this.client.get('/blogs.json');
        const blogs = blogsRes.data.blogs;
        
        if (blogs.length > 0) {
            blogId = blogs[0].id;
        } else {
            // Create a default blog
            const newBlog = await this.client.post('/blogs.json', {
                blog: { title: 'Imported Posts' }
            });
            blogId = newBlog.data.blog.id;
        }

        const results: ImportResult[] = [];
        for (const post of posts) {
            try {
                const articleData: any = {
                    title: post.title,
                    body_html: post.content,
                    author: post.authorName || 'Imported Author', // Use name, fallback to default
                    tags: post.tags?.join(', '),
                    published_at: post.status === 'publish' ? new Date().toISOString() : null,
                    // handle: post.slug // Shopify handles are auto-generated or strict
                };
                
                if (post.featuredImage) {
                    articleData.image = { src: post.featuredImage };
                }

                const res = await this.client.post(`/blogs/${blogId}/articles.json`, { article: articleData });
                results.push({ success: true, originalId: post.originalId, newId: res.data.article.id.toString() });
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
                    body_html: page.content,
                    author: page.authorName || 'Imported Author', // Use name, fallback to default
                    published: page.status === 'publish',
                    // handle: page.slug
                };

                const res = await this.client.post('/pages.json', { page: pageData });
                results.push({ success: true, originalId: page.originalId, newId: res.data.page.id.toString() });
            } catch (error: any) {
                results.push({ success: false, originalId: page.originalId, error: error.message });
            }
        }
        return results;
    }

    async getImportFields(entityType: 'products' | 'customers' | 'orders' | 'posts' | 'pages'): Promise<string[]> {
        // Return standard Shopify fields for import
        switch (entityType) {
            case 'products':
                return [
                    'title', 'body_html', 'vendor', 'product_type', 'tags', 'variants', 'images', 
                    'options', 'weight', 'weight_unit', 'inventory_quantity', 'requires_shipping', 
                    'taxable', 'published', 'handle', 'template_suffix', 'metafields'
                ];
            case 'customers':
                return ['first_name', 'last_name', 'email', 'phone', 'addresses', 'tags', 'note', 'verified', 'tax_exempt'];
            case 'orders':
                return [
                    'email', 'fulfillment_status', 'line_items', 'billing_address', 'shipping_address', 
                    'financial_status', 'note', 'tags', 'processed_at', 'currency'
                ];
            case 'posts':
                return ['title', 'body_html', 'author', 'tags', 'summary_html', 'published_at', 'handle', 'image'];
            case 'pages':
                return ['title', 'body_html', 'author', 'published', 'handle', 'template_suffix'];
            default:
                return [];
        }
    }
}
