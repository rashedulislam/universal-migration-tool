import { IDestinationConnector, UniversalProduct, UniversalCustomer, UniversalOrder, ImportResult } from '../../core/types';
export declare class WooCommerceDestination implements IDestinationConnector {
    name: string;
    private url;
    private consumerKey;
    private consumerSecret;
    private client;
    constructor(url: string, consumerKey: string, consumerSecret: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    importProducts(products: UniversalProduct[]): Promise<ImportResult[]>;
    importCustomers(customers: UniversalCustomer[]): Promise<ImportResult[]>;
    importOrders(orders: UniversalOrder[]): Promise<ImportResult[]>;
}
//# sourceMappingURL=woocommerce-destination.d.ts.map