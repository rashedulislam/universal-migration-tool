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
exports.WooCommerceSource = void 0;
const axios_1 = __importStar(require("axios"));
const types_1 = require("../../core/types");
class WooCommerceSource {
    name = 'WooCommerce Source';
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
            console.log('Connected to WooCommerce Source.');
        }
        catch (error) {
            console.error('Failed to connect to WooCommerce Source:', error);
            throw error;
        }
    }
    async disconnect() {
        this.client = null;
    }
    async getProducts() {
        if (!this.client)
            throw new Error('Not connected');
        const response = await this.client.get('/products');
        return response.data.map((p) => ({
            originalId: p.id.toString(),
            title: p.name,
            description: p.description,
            sku: p.sku,
            price: parseFloat(p.price || '0'),
            currency: 'USD', // TODO: Fetch from settings
            images: p.images.map((img) => img.src),
            variants: [] // Simplified: handling simple products primarily
        }));
    }
    async getCustomers() {
        if (!this.client)
            throw new Error('Not connected');
        const response = await this.client.get('/customers');
        return response.data.map((c) => ({
            originalId: c.id.toString(),
            email: c.email,
            firstName: c.first_name,
            lastName: c.last_name,
            phone: c.billing?.phone,
            addresses: [
                {
                    firstName: c.billing?.first_name,
                    lastName: c.billing?.last_name,
                    address1: c.billing?.address_1,
                    city: c.billing?.city,
                    country: c.billing?.country,
                    zip: c.billing?.postcode,
                    phone: c.billing?.phone
                }
            ]
        }));
    }
    async getOrders() {
        if (!this.client)
            throw new Error('Not connected');
        const response = await this.client.get('/orders');
        return response.data.map((o) => ({
            originalId: o.id.toString(),
            orderNumber: o.number,
            totalPrice: parseFloat(o.total),
            currency: o.currency,
            status: o.status,
            createdAt: new Date(o.date_created),
            customer: {
                email: o.billing?.email,
                firstName: o.billing?.first_name,
                lastName: o.billing?.last_name
            },
            lineItems: o.line_items.map((l) => ({
                title: l.name,
                quantity: l.quantity,
                price: parseFloat(l.price)
            }))
        }));
    }
}
exports.WooCommerceSource = WooCommerceSource;
//# sourceMappingURL=woocommerce-source.js.map