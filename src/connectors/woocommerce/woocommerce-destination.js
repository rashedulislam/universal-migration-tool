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
exports.WooCommerceDestination = void 0;
const axios_1 = __importStar(require("axios"));
const types_1 = require("../../core/types");
class WooCommerceDestination {
    name = 'WooCommerce Destination';
    url;
    consumerKey;
    consumerSecret;
    client = null;
    constructor(url, consumerKey, consumerSecret) {
        this.url = url;
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
    }
    async connect() {
        this.client = axios_1.default.create({
            baseURL: `${this.url}/wp-json/wc/v3`,
            params: {
                consumer_key: this.consumerKey,
                consumer_secret: this.consumerSecret
            }
        });
        try {
            await this.client.get('/system_status');
            console.log('Connected to WooCommerce Destination.');
        }
        catch (error) {
            console.error('Failed to connect to WooCommerce Destination:', error);
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
                const wcProduct = {
                    name: product.title,
                    description: product.description,
                    type: 'simple', // Simplified
                    regular_price: product.price.toString(),
                    sku: product.sku,
                    images: product.images.map(src => ({ src }))
                };
                const response = await this.client.post('/products', wcProduct);
                results.push({
                    originalId: product.originalId,
                    newId: response.data.id.toString(),
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
                    }
                };
                const response = await this.client.post('/customers', wcCustomer);
                results.push({
                    originalId: customer.originalId,
                    newId: response.data.id.toString(),
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
                    }))
                };
                const response = await this.client.post('/orders', wcOrder);
                results.push({
                    originalId: order.originalId,
                    newId: response.data.id.toString(),
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
exports.WooCommerceDestination = WooCommerceDestination;
//# sourceMappingURL=woocommerce-destination.js.map