import { IDestinationConnector, UniversalProduct, UniversalCustomer, UniversalOrder, ImportResult } from '../../core/types';
export declare class ShopifyDestination implements IDestinationConnector {
    name: string;
    private shopUrl;
    private accessToken;
    private client;
    constructor(shopUrl: string, accessToken: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    importProducts(products: UniversalProduct[]): Promise<ImportResult[]>;
    importCustomers(customers: UniversalCustomer[]): Promise<ImportResult[]>;
    importOrders(orders: UniversalOrder[]): Promise<ImportResult[]>;
}
//# sourceMappingURL=shopify-destination.d.ts.map