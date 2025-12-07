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
    vendor?: string;
    productType?: string;
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
    originalId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    addresses: UniversalAddress[];
    currency?: string;
    createdAt?: Date;
    updatedAt?: Date;
    ordersCount?: number;
    totalSpent?: string;
    state?: string;
    tags?: string[];
    note?: string;
    verifiedEmail?: boolean;
    taxExempt?: boolean;
    lastOrderId?: string;
    lastOrderName?: string;
    multipassIdentifier?: string;
    marketingOptInLevel?: string;
    taxExemptions?: string[];
    emailMarketingConsent?: any;
    smsMarketingConsent?: any;
    defaultAddress?: any;
    metafields?: Record<string, any>;
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
    metafields?: Record<string, any>;
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

export interface UniversalPost {
    id?: string;
    originalId?: string;
    title: string;
    content: string;
    slug: string;
    status: 'publish' | 'draft' | 'private' | 'future';
    authorId?: string;
    authorName?: string;
    categories?: string[];
    tags?: string[];
    featuredImage?: string;
    createdAt: Date;
    updatedAt: Date;
    metafields?: Record<string, any>;
    originalData?: any;
    mappedFields?: Record<string, any>;
}

export interface UniversalPage {
    id?: string;
    originalId?: string;
    title: string;
    content: string;
    slug: string;
    status: 'publish' | 'draft' | 'private';
    authorId?: string;
    authorName?: string;
    createdAt: Date;
    updatedAt: Date;
    metafields?: Record<string, any>;
    originalData?: any;
    mappedFields?: Record<string, any>;
}

export interface UniversalCategory {
    id?: string;
    originalId?: string;
    name: string;
    slug?: string;
    description?: string;
    image?: string;
    parent?: string; // Original ID of parent
    metafields?: Record<string, any>;
    originalData?: any;
    mappedFields?: Record<string, any>;
}

export interface ISourceConnector {
    name: string;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getProducts(onProgress?: (progress: number) => void): Promise<UniversalProduct[]>;
    getCustomers(onProgress?: (progress: number) => void): Promise<UniversalCustomer[]>;
    getOrders(onProgress?: (progress: number) => void): Promise<UniversalOrder[]>;
    getPosts(onProgress?: (progress: number) => void): Promise<UniversalPost[]>;
    getPages(onProgress?: (progress: number) => void): Promise<UniversalPage[]>;
    getCategories(onProgress?: (progress: number) => void): Promise<UniversalCategory[]>;
    getExportFields(entityType: 'products' | 'customers' | 'orders' | 'posts' | 'pages' | 'categories'): Promise<string[]>;
}

export interface IDestinationConnector {
    name: string;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    importProducts(products: UniversalProduct[]): Promise<ImportResult[]>;
    importCustomers(customers: UniversalCustomer[]): Promise<ImportResult[]>;
    importOrders(orders: UniversalOrder[]): Promise<ImportResult[]>;
    importPosts(posts: UniversalPost[]): Promise<ImportResult[]>;
    importPages(pages: UniversalPage[]): Promise<ImportResult[]>;
    importCategories(categories: UniversalCategory[]): Promise<ImportResult[]>;
    getImportFields(entityType: 'products' | 'customers' | 'orders' | 'posts' | 'pages' | 'categories'): Promise<string[]>;
}

export interface ImportResult {
    originalId?: string;
    newId?: string;
    success: boolean;
    error?: string;
}
