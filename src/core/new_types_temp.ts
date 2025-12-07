
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
