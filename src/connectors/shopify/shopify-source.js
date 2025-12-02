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
exports.ShopifySource = void 0;
const axios_1 = __importStar(require("axios"));
const types_1 = require("../../core/types");
class ShopifySource {
    name = 'Shopify Source';
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
        // Validate connection
        try {
            await this.client.get('/shop.json');
            console.log('Connected to Shopify Source.');
        }
        catch (error) {
            console.error('Failed to connect to Shopify:', error);
            throw error;
        }
    }
    async disconnect() {
        this.client = null;
    }
    async getProducts() {
        if (!this.client)
            throw new Error('Not connected');
        const response = await this.client.get('/products.json');
        const shopifyProducts = response.data.products;
        return shopifyProducts.map((p) => ({
            originalId: p.id.toString(),
            title: p.title,
            description: p.body_html,
            sku: p.variants[0]?.sku,
            price: parseFloat(p.variants[0]?.price || '0'),
            currency: 'USD', // TODO: Fetch from shop settings
            images: p.images.map((img) => img.src),
            variants: p.variants.map((v) => ({
                originalId: v.id.toString(),
                title: v.title,
                sku: v.sku,
                price: parseFloat(v.price),
                options: {
                    [p.options[0]?.name]: v.option1, // Simplified mapping
                }
            }))
        }));
    }
    async getCustomers() {
        if (!this.client)
            throw new Error('Not connected');
        const response = await this.client.get('/customers.json');
        return response.data.customers.map((c) => ({
            originalId: c.id.toString(),
            email: c.email,
            firstName: c.first_name,
            lastName: c.last_name,
            phone: c.phone,
            addresses: c.addresses.map((a) => ({
                address1: a.address1,
                city: a.city,
                country: a.country,
                zip: a.zip,
            }))
        }));
    }
    async getOrders() {
        if (!this.client)
            throw new Error('Not connected');
        const response = await this.client.get('/orders.json?status=any');
        return response.data.orders.map((o) => ({
            originalId: o.id.toString(),
            orderNumber: o.order_number.toString(),
            totalPrice: parseFloat(o.total_price),
            currency: o.currency,
            status: o.financial_status,
            createdAt: new Date(o.created_at),
            customer: {
                email: o.email,
                firstName: o.customer?.first_name,
                lastName: o.customer?.last_name
            },
            lineItems: o.line_items.map((l) => ({
                title: l.title,
                quantity: l.quantity,
                price: parseFloat(l.price)
            }))
        }));
    }
}
exports.ShopifySource = ShopifySource;
//# sourceMappingURL=shopify-source.js.map