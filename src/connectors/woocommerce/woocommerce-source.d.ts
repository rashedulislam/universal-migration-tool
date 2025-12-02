import { ISourceConnector, UniversalProduct, UniversalCustomer, UniversalOrder } from '../../core/types';
export declare class WooCommerceSource implements ISourceConnector {
    name: string;
    private url;
    private consumerKey;
    private consumerSecret;
    private client;
    constructor(url: string, consumerKey: string, consumerSecret: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getProducts(): Promise<UniversalProduct[]>;
    getCustomers(): Promise<UniversalCustomer[]>;
    getOrders(): Promise<UniversalOrder[]>;
}
//# sourceMappingURL=woocommerce-source.d.ts.map