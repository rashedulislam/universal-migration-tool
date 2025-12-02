export interface UniversalProduct {
    id?: string;
    originalId?: string;
    title: string;
    description?: string;
    sku?: string;
    price: number;
    currency: string;
    weight?: number;
    weightUnit?: string;
    images: string[];
    variants?: UniversalVariant[];
    categories?: string[];
    tags?: string[];
    metafields?: Record<string, any>;
    originalData?: any; // Raw data from source
    mappedFields?: Record<string, any>; // Custom mapped fields for destination
}

export interface UniversalVariant {
    id?: string;
    originalId?: string;
    sku?: string;
    price?: number;
    title: string;
    options: Record<string, string>;
    inventoryQuantity?: number;
}

export interface UniversalCustomer {
    id?: string;
    originalId?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    addresses?: UniversalAddress[];
    createdAt?: Date;
    originalData?: any;
    mappedFields?: Record<string, any>;
}

export interface UniversalAddress {
    firstName?: string;
    lastName?: string;
    address1: string;
    address2?: string;
    city: string;
    province?: string;
    provinceCode?: string;
    country: string;
    countryCode?: string;
    zip: string;
    phone?: string;
}

export interface UniversalOrder {
    id?: string;
    originalId?: string;
    orderNumber?: string;
    customer: UniversalCustomer;
    lineItems: UniversalLineItem[];
    totalPrice: number;
    currency: string;
    status: string;
    createdAt: Date;
    billingAddress?: UniversalAddress;
    shippingAddress?: UniversalAddress;
    originalData?: any;
    mappedFields?: Record<string, any>;
}

export interface UniversalLineItem {
    title: string;
    sku?: string;
    quantity: number;
    price: number;
    variantId?: string;
    productId?: string;
}

export interface ISourceConnector {
    name: string;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getProducts(): Promise<UniversalProduct[]>;
    getCustomers(): Promise<UniversalCustomer[]>;
    getOrders(): Promise<UniversalOrder[]>;
    getExportFields(entityType: 'products' | 'customers' | 'orders'): Promise<string[]>;
}

export interface IDestinationConnector {
    name: string;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    importProducts(products: UniversalProduct[]): Promise<ImportResult[]>;
    importCustomers(customers: UniversalCustomer[]): Promise<ImportResult[]>;
    importOrders(orders: UniversalOrder[]): Promise<ImportResult[]>;
    getImportFields(entityType: 'products' | 'customers' | 'orders'): Promise<string[]>;
}

export interface ImportResult {
    originalId?: string;
    newId?: string;
    success: boolean;
    error?: string;
}
