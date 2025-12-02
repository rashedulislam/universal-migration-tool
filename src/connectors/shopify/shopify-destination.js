"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyDestination = void 0;
const axios_1 = __importStar(require("axios"));
const types_1 = require("../../core/types");
class ShopifyDestination {
    name = 'Shopify Destination';
    shopUrl;
    accessToken;
    client = null;
    constructor(shopUrl, accessToken) {
        this.shopUrl = shopUrl;
        this.accessToken = accessToken;
    }
    async connect() {
        this.client = axios_1.default.create({
            baseURL: `https://${this.shopUrl}/admin/api/2023-10`,
            headers: {
                'X-Shopify-Access-Token': this.accessToken,
                'Content-Type': 'application/json',
            },
        });
        try {
            await this.client.get('/shop.json');
            console.log('Connected to Shopify Destination.');
        }
        catch (error) {
            console.error('Failed to connect to Shopify Destination:', error);
            throw error;
        }
    }
    async disconnect() {
        this.client = null;
    }
    async importProducts(products) {
        if (!this.client)
            throw new Error('Not connected');
        const results = [];
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
            }
            catch (error) {
                results.push({
                    originalId: product.originalId,
                    success: false,
                    error: error.message
                });
            }
        }
        return results;
    }
    async importCustomers(customers) {
        if (!this.client)
            throw new Error('Not connected');
        const results = [];
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
            }
            catch (error) {
                results.push({
                    originalId: customer.originalId,
                    success: false,
                    error: error.message
                });
            }
        }
        return results;
    }
    async importOrders(orders) {
        if (!this.client)
            throw new Error('Not connected');
        const results = [];
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
            }
            catch (error) {
                results.push({
                    originalId: order.originalId,
                    success: false,
                    error: error.message
                });
            }
        }
        return results;
    }
}
exports.ShopifyDestination = ShopifyDestination;
//# sourceMappingURL=shopify-destination.js.map