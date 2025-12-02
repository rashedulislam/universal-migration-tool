import { ISourceConnector, UniversalProduct, UniversalCustomer, UniversalOrder } from '../../core/types';
export declare class ShopifySource implements ISourceConnector {
    name: string;
    private shopUrl;
    private accessToken;
    private client;
    constructor(shopUrl: string, accessToken: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getProducts(): Promise<UniversalProduct[]>;
    getCustomers(): Promise<UniversalCustomer[]>;
    getOrders(): Promise<UniversalOrder[]>;
}
//# sourceMappingURL=shopify-source.d.ts.map