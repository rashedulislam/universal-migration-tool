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

// UniversalOrder removed (duplicate)

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

export interface UniversalShippingZone {
    id?: string;
    originalId?: string;
    name: string;
    countries: string[]; // List of country codes (e.g., 'US', 'CA')
    methods: UniversalShippingMethod[];
    originalData?: any;
    mappedFields?: Record<string, any>;
}

export interface UniversalShippingMethod {
    id?: string;
    originalId?: string;
    title: string;
    cost?: number;
    enabled: boolean;
    methodTitle?: string; // e.g. "Flat Rate"
    originalData?: any;
}

export interface UniversalTaxRate {
    id?: string;
    originalId?: string;
    name: string;
    rate: number; // Percentage (e.g. 20.0 for 20%)
    country?: string;
    state?: string;
    city?: string; // Optional
    postcode?: string; // Optional, can be wildcard
    priority?: number;
    compound?: boolean;
    shipping?: boolean;
    originalData?: any;
    mappedFields?: Record<string, any>;
}

export interface UniversalCoupon {
    id?: string;
    originalId?: string;
    code: string;
    amount: number;
    discountType: 'percent' | 'fixed_cart' | 'fixed_product'; // Simplified types
    description?: string;
    dateExpires?: Date;
    usageCount?: number;
    individualUse?: boolean;
    productIds?: string[];
    excludedProductIds?: string[];
    usageLimit?: number;
    usageLimitPerUser?: number;
    freeShipping?: boolean;
    minimumAmount?: number;
    maximumAmount?: number;
    emailRestrictions?: string[];
    originalData?: any;
    mappedFields?: Record<string, any>;
}

export interface UniversalFulfillment {
    trackingCompany?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    status?: string;
}

export interface UniversalOrder {
    id?: string;
    originalId: string;
    orderNumber: string;
    customer: UniversalCustomer;
    lineItems: UniversalLineItem[];
    totalPrice: number;
    currency: string;
    status: string;
    createdAt: Date;
    billingAddress?: UniversalAddress;
    shippingAddress?: UniversalAddress; // Added back
    fulfillments?: UniversalFulfillment[];
    metafields?: Record<string, any>; // Added back
    mappedFields?: Record<string, any>;
    originalData?: any;
}

export interface UniversalStoreSettings {
    currency: string;     // e.g. 'USD'
    timezone: string;     // e.g. 'America/New_York'
    weightUnit: string;   // e.g. 'kg', 'lb'
    currencyFormat?: string; // e.g. '${{amount}}'
}

export interface ISourceConnector {
    name: string;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getExportFields(entityType: string): Promise<string[]>;
    
    getStoreSettings?(): Promise<UniversalStoreSettings>;
    getProducts(onProgress?: (progress: number) => void): Promise<UniversalProduct[]>;
    getCustomers(onProgress?: (progress: number) => void): Promise<UniversalCustomer[]>;
    getOrders(onProgress?: (progress: number) => void): Promise<UniversalOrder[]>;
    getPosts(onProgress?: (progress: number) => void): Promise<UniversalPost[]>;
    getPages(onProgress?: (progress: number) => void): Promise<UniversalPage[]>;
    getCategories(onProgress?: (progress: number) => void): Promise<UniversalCategory[]>;
    getShippingZones(onProgress?: (progress: number) => void): Promise<UniversalShippingZone[]>;
    getTaxRates(onProgress?: (progress: number) => void): Promise<UniversalTaxRate[]>;
    getCoupons(onProgress?: (progress: number) => void): Promise<UniversalCoupon[]>;
}

export interface IDestinationConnector {
    name: string;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getImportFields(entityType: string): Promise<string[]>;

    importStoreSettings?(settings: UniversalStoreSettings): Promise<ImportResult>;
    importProducts(products: UniversalProduct[]): Promise<ImportResult[]>;
    importCustomers(customers: UniversalCustomer[]): Promise<ImportResult[]>;
    importOrders(orders: UniversalOrder[]): Promise<ImportResult[]>;
    importPosts(posts: UniversalPost[]): Promise<ImportResult[]>;
    importPages(pages: UniversalPage[]): Promise<ImportResult[]>;
    importCategories(categories: UniversalCategory[]): Promise<ImportResult[]>;
    importShippingZones(zones: UniversalShippingZone[]): Promise<ImportResult[]>;
    importTaxRates(rates: UniversalTaxRate[]): Promise<ImportResult[]>;
    importCoupons(coupons: UniversalCoupon[]): Promise<ImportResult[]>;
}

export interface ImportResult {
    originalId: string;
    newId?: string;
    success: boolean;
    error?: string;
}
