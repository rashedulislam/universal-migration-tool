import { createAdminApiClient, AdminApiClient } from '@shopify/admin-api-client';
import { ISourceConnector, UniversalProduct, UniversalCustomer, UniversalOrder, UniversalPost, UniversalPage, UniversalCategory, UniversalShippingZone, UniversalTaxRate, UniversalCoupon, UniversalStoreSettings } from '../../core/types';

export class ShopifySource implements ISourceConnector {
    name = 'Shopify Source';
    private client: AdminApiClient | null = null;
    private storeUrl: string;

    constructor(storeUrl: string, private accessToken: string) {
        // Remove protocol if present
        this.storeUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        
        this.client = createAdminApiClient({
            storeDomain: this.storeUrl,
            apiVersion: '2025-01',
            accessToken: this.accessToken
        });
    }

    async connect(): Promise<void> {
        // Validate connection by fetching shop name
        try {
            const response = await this.client!.request(`
                query {
                    shop {
                        name
                    }
                }
            `);
            
            if (response.errors) {
                const errors = Array.isArray(response.errors) ? response.errors : [response.errors];
                throw new Error(errors.map((e: any) => e.message || JSON.stringify(e)).join(', '));
            }
            console.log('Connected to Shopify Source:', response.data?.shop?.name);
        } catch (error) {
            console.error('Failed to connect to Shopify:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        this.client = null;
    }

    async getProducts(onProgress?: (progress: number) => void): Promise<UniversalProduct[]> {
        if (!this.client) throw new Error('Not connected');
        
        // 1. Get total count (optional, for progress)
        let total = 0;
        try {
            const countQuery = `query { productsCount { count } }`;
            const countRes = await this.client.request(countQuery);
            total = countRes.data?.productsCount?.count || 0;
        } catch (e) {
            console.warn('Failed to fetch product count', e);
        }

        let allProducts: any[] = [];
        let hasNextPage = true;
        let endCursor: string | null = null;

        while (hasNextPage) {
            const query = `
                query getProducts($cursor: String) {
                    products(first: 50, after: $cursor) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        edges {
                            node {
                                id
                                title
                                descriptionHtml
                                vendor
                                productType
                                status
                                variants(first: 1) {
                                    edges {
                                        node {
                                            id
                                            sku
                                            price
                                            title
                                        }
                                    }
                                }
                                images(first: 10) {
                                    edges {
                                        node {
                                            src: url
                                        }
                                    }
                                }
                                options {
                                    name
                                    values
                                }
                                metafields(first: 25) {
                                    edges {
                                        node {
                                            namespace
                                            key
                                            value
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `;

            let response: any;
            try {
                response = await this.client.request(query, { variables: { cursor: endCursor } });
            } catch (error: any) {
                if (error.graphQLErrors) {
                    const messages = error.graphQLErrors.map((e: any) => e.message).join(', ');
                    throw new Error(messages);
                }
                throw error;
            }

            if (response?.errors) {
                const errors = Array.isArray(response.errors) ? response.errors : [response.errors];
                throw new Error(errors.map((e: any) => e.message || JSON.stringify(e)).join(', '));
            }

            const data = response.data?.products;
            const nodes = data?.edges.map((edge: any) => edge.node) || [];
            allProducts = [...allProducts, ...nodes];

            if (onProgress && total > 0) {
                onProgress(Math.min(100, Math.round((allProducts.length / total) * 100)));
            }

            hasNextPage = data?.pageInfo?.hasNextPage || false;
            endCursor = data?.pageInfo?.endCursor || null;
        }

        return allProducts.map((p: any) => ({
            originalId: p.id.split('/').pop(), // GraphQL ID is a URL, extract the ID
            title: p.title,
            description: p.descriptionHtml,
            vendor: p.vendor,
            productType: p.productType,
            tags: p.tags,
            sku: p.variants.edges[0]?.node?.sku,
            price: parseFloat(p.variants.edges[0]?.node?.price || '0'),
            currency: 'USD', // TODO: Fetch from shop settings
            images: p.images.edges.map((img: any) => img.node.src),
            variants: p.variants.edges.map((v: any) => ({
                originalId: v.node.id.split('/').pop(),
                title: v.node.title,
                sku: v.node.sku,
                price: parseFloat(v.node.price),
                options: {} // Simplified
            })),
            metafields: p.metafields?.edges.reduce((acc: any, edge: any) => {
                acc[`${edge.node.namespace}.${edge.node.key}`] = edge.node.value;
                return acc;
            }, {}),
            originalData: p
        }));
    }

    async getCustomers(onProgress?: (progress: number) => void): Promise<UniversalCustomer[]> {
        if (!this.client) throw new Error('Not connected');

        // 1. Get total count
        let total = 0;
        try {
            const countQuery = `query { customersCount { count } }`;
            const countRes = await this.client.request(countQuery);
            total = countRes.data?.customersCount?.count || 0;
        } catch (e) {
            console.warn('Failed to fetch customer count', e);
        }

        let allCustomers: any[] = [];
        let hasNextPage = true;
        let endCursor: string | null = null;

        while (hasNextPage) {
            const query = `
                query getCustomers($cursor: String) {
                    customers(first: 50, after: $cursor) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        edges {
                            node {
                                id
                                email
                                firstName
                                lastName
                                phone
                                note
                                state
                                tags
                                taxExempt
                                verifiedEmail
                                createdAt
                                updatedAt
                                numberOfOrders
                                amountSpent {
                                    amount
                                    currencyCode
                                }
                                defaultAddress {
                                    address1
                                    address2
                                    city
                                    company
                                    country
                                    province
                                    zip
                                    phone
                                }
                                addresses {
                                    address1
                                    address2
                                    city
                                    company
                                    country
                                    province
                                    zip
                                    phone
                                }
                                lastOrder {
                                    id
                                    name
                                }
                                metafields(first: 10) {
                                    edges {
                                        node {
                                            namespace
                                            key
                                            value
                                        }
                                    }
                                }
                                emailMarketingConsent {
                                    marketingState
                                    consentUpdatedAt
                                }
                                smsMarketingConsent {
                                    marketingState
                                    consentUpdatedAt
                                }
                            }
                        }
                    }
                }
            `;

            let response: any;
            try {
                response = await this.client.request(query, { variables: { cursor: endCursor } });
            } catch (error: any) {
                if (error.graphQLErrors) {
                    const messages = error.graphQLErrors.map((e: any) => e.message).join(', ');
                    throw new Error(messages);
                }
                throw error;
            }

            if (response?.errors) {
                const errors = Array.isArray(response.errors) ? response.errors : [response.errors];
                throw new Error(errors.map((e: any) => e.message || JSON.stringify(e)).join(', '));
            }

            const data = response.data?.customers;
            const nodes = data?.edges.map((edge: any) => edge.node) || [];
            allCustomers = [...allCustomers, ...nodes];

            if (onProgress && total > 0) {
                onProgress(Math.min(100, Math.round((allCustomers.length / total) * 100)));
            }

            hasNextPage = data?.pageInfo?.hasNextPage || false;
            endCursor = data?.pageInfo?.endCursor || null;
        }

        return allCustomers.map((c: any) => ({
            originalId: c.id.split('/').pop(),
            email: c.email,
            firstName: c.firstName,
            lastName: c.lastName,
            phone: c.phone,
            addresses: c.addresses.map((a: any) => ({
                address1: a.address1,
                city: a.city,
                country: a.country,
                zip: a.zip,
            })),
            currency: c.amountSpent?.currencyCode,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
            ordersCount: parseInt(c.numberOfOrders || '0'),
            totalSpent: c.amountSpent?.amount,
            state: c.state,
            tags: c.tags,
            note: c.note,
            verifiedEmail: c.verifiedEmail,
            taxExempt: c.taxExempt,
            lastOrderId: c.lastOrder?.id?.split('/').pop(),
            lastOrderName: c.lastOrder?.name,
            emailMarketingConsent: c.emailMarketingConsent,
            smsMarketingConsent: c.smsMarketingConsent,
            defaultAddress: c.defaultAddress,
            originalData: c
        }));
    }

    async getStoreSettings(): Promise<UniversalStoreSettings> {
        if (!this.client) throw new Error('Not connected');
        const query = `
            query {
                shop {
                    name
                    email
                    billingAddress {
                        address1
                        city
                        province
                        country
                        zip
                    }
                    currencyCode
                    timezoneAbbreviation
                    ianaTimezone
                    weightUnit
                    currencyFormats {
                        moneyFormat
                    }
                }
            }
        `;
        const response = await this.client.request(query);
        const shop = response.data?.shop;
        return {
            siteTitle: shop?.name,
            adminEmail: shop?.email,
            address1: shop?.billingAddress?.address1,
            city: shop?.billingAddress?.city,
            state: shop?.billingAddress?.province,
            country: shop?.billingAddress?.country,
            zip: shop?.billingAddress?.zip,
            currency: shop?.currencyCode || 'USD',
            timezone: shop?.ianaTimezone || 'UTC',
            weightUnit: shop?.weightUnit?.toLowerCase() || 'kg',
            currencyFormat: shop?.currencyFormats?.moneyFormat
        };
    }

    async getOrders(onProgress?: (progress: number) => void): Promise<UniversalOrder[]> {
        if (!this.client) throw new Error('Not connected');

        // 1. Get total count
        let total = 0;
        try {
            const countQuery = `query { ordersCount { count } }`;
            const countRes = await this.client.request(countQuery);
            total = countRes.data?.ordersCount?.count || 0;
        } catch (e) {
            console.warn('Failed to fetch order count', e);
        }

        let allOrders: any[] = [];
        let hasNextPage = true;
        let endCursor: string | null = null;

        while (hasNextPage) {
            const query = `
                query getOrders($cursor: String) {
                    orders(first: 50, after: $cursor) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        edges {
                            node {
                                id
                                name
                                email
                                createdAt
                                totalPriceSet {
                                    shopMoney {
                                        amount
                                        currencyCode
                                    }
                                }
                                displayFinancialStatus
                                customer {
                                    id
                                    email
                                    firstName
                                    lastName
                                    phone
                                }
                                lineItems(first: 50) {
                                    edges {
                                        node {
                                            title
                                            quantity
                                            originalUnitPriceSet {
                                                shopMoney {
                                                    amount
                                                }
                                            }
                                            sku
                                        }
                                    }
                                }
                                billingAddress {
                                    address1
                                    city
                                    country
                                    zip
                                }
                                fulfillments(first: 10) {
                                    edges {
                                        node {
                                            trackingCompany
                                            trackingInfo(first: 1) {
                                                edges {
                                                    node {
                                                        number
                                                        url
                                                    }
                                                }
                                            }
                                            status
                                        }
                                    }
                                }
                                metafields(first: 25) {
                                    edges {
                                        node {
                                            namespace
                                            key
                                            value
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `;

            let response: any;
            try {
                response = await this.client.request(query, { variables: { cursor: endCursor } });
            } catch (error: any) {
                if (error.graphQLErrors) {
                    const messages = error.graphQLErrors.map((e: any) => e.message).join(', ');
                    throw new Error(messages);
                }
                throw error;
            }

            if (response?.errors) {
                const errors = Array.isArray(response.errors) ? response.errors : [response.errors];
                throw new Error(errors.map((e: any) => e.message || JSON.stringify(e)).join(', '));
            }

            const data = response.data?.orders;
            const nodes = data?.edges.map((edge: any) => edge.node) || [];
            allOrders = [...allOrders, ...nodes];

            if (onProgress && total > 0) {
                onProgress(Math.min(100, Math.round((allOrders.length / total) * 100)));
            }

            hasNextPage = data?.pageInfo?.hasNextPage || false;
            endCursor = data?.pageInfo?.endCursor || null;
        }

        return allOrders.map((order: any) => ({
            originalId: order.id.split('/').pop(),
            orderNumber: order.name,
            customer: {
                originalId: order.customer?.id?.split('/').pop(),
                email: order.email || order.customer?.email,
                firstName: order.customer?.firstName,
                lastName: order.customer?.lastName,
                phone: order.customer?.phone,
                addresses: [] // Simplified
            },
            lineItems: order.lineItems.edges.map((item: any) => ({
                title: item.node.title,
                quantity: item.node.quantity,
                price: parseFloat(item.node.originalUnitPriceSet?.shopMoney?.amount || '0'),
                sku: item.node.sku
            })),
            totalPrice: parseFloat(order.totalPriceSet?.shopMoney?.amount || '0'),
            currency: order.totalPriceSet?.shopMoney?.currencyCode,
            status: order.displayFinancialStatus?.toLowerCase() || 'pending',
            createdAt: new Date(order.createdAt),
            billingAddress: order.billingAddress ? {
                address1: order.billingAddress.address1,
                city: order.billingAddress.city,
                country: order.billingAddress.country,
                zip: order.billingAddress.zip
            } : undefined,
            fulfillments: order.fulfillments?.edges.map((f: any) => ({
                trackingCompany: f.node.trackingCompany,
                trackingNumber: f.node.trackingInfo?.edges[0]?.node?.number,
                trackingUrl: f.node.trackingInfo?.edges[0]?.node?.url,
                status: f.node.status
            })),
            metafields: order.metafields?.edges.reduce((acc: any, edge: any) => {
                acc[`${edge.node.namespace}.${edge.node.key}`] = edge.node.value;
                return acc;
            }, {}),
            originalData: order
        }));
    }

    async getPosts(onProgress?: (progress: number) => void): Promise<UniversalPost[]> {
        if (!this.client) throw new Error('Not connected');

        // 1. Get total count (approximate, hard to get exact total of all articles across all blogs efficiently without iterating)
        // We'll skip total count for posts or just report progress per blog
        
        let allPosts: any[] = [];
        
        // Fetch all blogs first
        const blogsQuery = `
            query {
                blogs(first: 50) {
                    edges {
                        node {
                            id
                            title
                        }
                    }
                }
            }
        `;
        
        const blogsRes = await this.client.request(blogsQuery);
        const blogs = blogsRes.data?.blogs?.edges.map((e: any) => e.node) || [];

        for (const blog of blogs) {
            let hasNextPage = true;
            let endCursor: string | null = null;

            while (hasNextPage) {
                const query = `
                    query getArticles($blogId: ID!, $cursor: String) {
                        blog(id: $blogId) {
                            articles(first: 50, after: $cursor) {
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                                edges {
                                    node {
                                        id
                                        title
                                        body
                                        handle
                                        publishedAt
                                        authorV2 {
                                            name
                                            email
                                        }
                                        tags
                                        image {
                                            url
                                        }
                                        metafields(first: 25) {
                                            edges {
                                                node {
                                                    namespace
                                                    key
                                                    value
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                `;

                let response: any;
                try {
                    response = await this.client.request(query, { 
                        variables: { blogId: blog.id, cursor: endCursor } 
                    });
                } catch (error: any) {
                    if (error.graphQLErrors) {
                        const messages = error.graphQLErrors.map((e: any) => e.message).join(', ');
                        throw new Error(messages);
                    }
                    throw error;
                }

                if (response?.errors) {
                    if (response.errors.graphQLErrors) {
                        const messages = response.errors.graphQLErrors.map((e: any) => e.message).join(', ');
                        console.error('Error fetching articles for blog', blog.id, messages);
                        break; 
                    }
                    const errors = Array.isArray(response.errors) ? response.errors : [response.errors];
                    console.error('Error fetching articles for blog', blog.id, errors.map((e: any) => e.message || JSON.stringify(e)).join(', '));
                    break;
                }

                const data = response.data?.blog?.articles;
                const nodes = data?.edges.map((edge: any) => edge.node) || [];
                
                const mappedPosts = nodes.map((p: any) => ({
                    originalId: p.id.split('/').pop(),
                    title: p.title,
                    content: p.body,
                    slug: p.handle,
                    status: p.publishedAt ? 'publish' : 'draft',
                    authorId: p.authorV2?.email, // Use email as ID for mapping
                    authorName: p.authorV2?.name,
                    categories: [blog.title],
                    tags: p.tags,
                    featuredImage: p.image?.url,
                    createdAt: new Date(p.publishedAt || Date.now()),
                    metafields: p.metafields?.edges.reduce((acc: any, edge: any) => {
                        acc[`${edge.node.namespace}.${edge.node.key}`] = edge.node.value;
                        return acc;
                    }, {}),
                    originalData: p
                }));

                allPosts = [...allPosts, ...mappedPosts];

                // Simple progress reporting (just updates as we fetch)
                if (onProgress) {
                    onProgress(50); // Indeterminate progress
                }

                hasNextPage = data?.pageInfo?.hasNextPage || false;
                endCursor = data?.pageInfo?.endCursor || null;
            }
        }
        
        if (onProgress) onProgress(100);

        return allPosts;
    }

    async getPages(onProgress?: (progress: number) => void): Promise<UniversalPage[]> {
        if (!this.client) throw new Error('Not connected');

        // 1. Get total count
        let total = 0;
        try {
            const countQuery = `query { pagesCount { count } }`;
            const countRes = await this.client.request(countQuery);
            total = countRes.data?.pagesCount?.count || 0;
        } catch (e) {
            console.warn('Failed to fetch page count', e);
        }

        let allPages: any[] = [];
        let hasNextPage = true;
        let endCursor: string | null = null;

        while (hasNextPage) {
            const query = `
                query getPages($cursor: String) {
                    pages(first: 50, after: $cursor) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        edges {
                            node {
                                id
                                title
                                body
                                handle
                                createdAt
                                updatedAt
                                publishedAt
                                metafields(first: 25) {
                                    edges {
                                        node {
                                            namespace
                                            key
                                            value
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `;

            let response: any;
            try {
                response = await this.client.request(query, { variables: { cursor: endCursor } });
            } catch (error: any) {
                if (error.graphQLErrors) {
                    const messages = error.graphQLErrors.map((e: any) => e.message).join(', ');
                    throw new Error(messages);
                }
                throw error;
            }

            if (response?.errors) {
                if (response.errors.graphQLErrors) {
                    const messages = response.errors.graphQLErrors.map((e: any) => e.message).join(', ');
                    throw new Error(messages);
                }
                const errors = Array.isArray(response.errors) ? response.errors : [response.errors];
                throw new Error(errors.map((e: any) => e.message || JSON.stringify(e)).join(', '));
            }

            const data = response.data?.pages;
            const nodes = data?.edges.map((edge: any) => edge.node) || [];
            allPages = [...allPages, ...nodes];

            if (onProgress && total > 0) {
                onProgress(Math.min(100, Math.round((allPages.length / total) * 100)));
            }

            hasNextPage = data?.pageInfo?.hasNextPage || false;
            endCursor = data?.pageInfo?.endCursor || null;
        }

        return allPages.map((p: any) => ({
            originalId: p.id.split('/').pop(),
            title: p.title,
            content: p.body,
            slug: p.handle,
            status: p.publishedAt ? 'publish' : 'draft',
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt || p.createdAt),
            authorName: 'Admin', // Shopify pages don't strictly have authors in the same way
            metafields: p.metafields?.edges.reduce((acc: any, edge: any) => {
                acc[`${edge.node.namespace}.${edge.node.key}`] = edge.node.value;
                return acc;
            }, {}),
            originalData: p
        }));
    }

    async getCategories(onProgress?: (progress: number) => void): Promise<UniversalCategory[]> {
        if (!this.client) throw new Error('Not connected');

        let allCollections: any[] = [];
        let hasNextPage = true;
        let endCursor: string | null = null;
        let total = 0; // Approximate

        while (hasNextPage) {
             const query = `
                query getCollections($cursor: String) {
                    collections(first: 50, after: $cursor) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        edges {
                            node {
                                id
                                title
                                handle
                                descriptionHtml
                                image {
                                    url
                                }
                                metafields(first: 10) {
                                    edges {
                                        node {
                                            namespace
                                            key
                                            value
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `;

            let response: any;
            try {
                response = await this.client.request(query, { variables: { cursor: endCursor } });
            } catch (error: any) {
                if (error.graphQLErrors) {
                    const messages = error.graphQLErrors.map((e: any) => e.message).join(', ');
                    throw new Error(messages);
                }
                throw error;
            }

            if (response?.errors) {
                 const errors = Array.isArray(response.errors) ? response.errors : [response.errors];
                 throw new Error(errors.map((e: any) => e.message || JSON.stringify(e)).join(', '));
            }

            const data = response.data?.collections;
            const nodes = data?.edges.map((edge: any) => edge.node) || [];
            allCollections = [...allCollections, ...nodes];

            if (onProgress) {
                onProgress(50); // Indeterminate
            }

            hasNextPage = data?.pageInfo?.hasNextPage || false;
            endCursor = data?.pageInfo?.endCursor || null;
        }
        
        if (onProgress) onProgress(100);

        return allCollections.map((c: any) => ({
            originalId: c.id.split('/').pop(),
            name: c.title,
            slug: c.handle,
            description: c.descriptionHtml,
            image: c.image?.url,
            metafields: c.metafields?.edges.reduce((acc: any, edge: any) => {
                acc[`${edge.node.namespace}.${edge.node.key}`] = edge.node.value;
                return acc;
            }, {}),
            originalData: c
        }));
    }

    async getShippingZones(onProgress?: (progress: number) => void): Promise<UniversalShippingZone[]> {
        // Shopify uses Delivery Profiles in GraphQL, which is complex. 
        // We will fetch basic General Profile information as a "Zone" approximation.
        if (!this.client) throw new Error('Not connected');

        // Simplified implementation using DeliveryProfiles
        const query = `
            query {
                deliveryProfiles(first: 10) {
                    edges {
                        node {
                            id
                            name
                            profileLocationGroups {
                                locationGroup {
                                    id
                                }
                                locationGroupZones(first: 10) {
                                    edges {
                                        node {
                                            zone {
                                                id
                                                name
                                                countries {
                                                    code
                                                }
                                                provinces {
                                                    code
                                                }
                                            }
                                            methodDefinitions(first: 10) {
                                                edges {
                                                    node {
                                                        id
                                                        name
                                                        rateProvider {
                                                            ... on DeliveryRateDefinition {
                                                                price {
                                                                    amount
                                                                    currencyCode
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        try {
            const response: any = await this.client.request(query);
            const profiles = response.data?.deliveryProfiles?.edges || [];
            
            // Flatten zones from profiles
            const zones: UniversalShippingZone[] = [];

            profiles.forEach((p: any) => {
                p.node.profileLocationGroups.forEach((group: any) => {
                    group.locationGroupZones.edges.forEach((z: any) => {
                        const zoneNode = z.node.zone;
                        const methods = z.node.methodDefinitions.edges.map((m: any) => {
                            const cost = parseFloat(m.node.rateProvider?.price?.amount || '0');
                            const isFree = cost === 0;
                            
                            return {
                                originalId: m.node.id.split('/').pop(),
                                title: m.node.name,
                                cost: cost,
                                enabled: true,
                                methodType: isFree ? 'free_shipping' : 'flat_rate'
                            };
                        });

                        const locations: string[] = [];
                        zoneNode.countries?.forEach((c: any) => locations.push(c.code));
                        zoneNode.provinces?.forEach((p: any) => locations.push(p.code));

                        zones.push({
                            originalId: zoneNode.id.split('/').pop(),
                            name: zoneNode.name,
                            countries: locations,
                            methods: methods,
                            originalData: z.node
                        });
                    });
                });
            });

            if (onProgress) onProgress(100);
            return zones;

        } catch (error) {
            console.warn('Failed to fetch shipping zones (delivery profiles)', error);
            if (onProgress) onProgress(100);
            return [];
        }
    }

    async getTaxRates(onProgress?: (progress: number) => void): Promise<UniversalTaxRate[]> {
        // Shopify GraphQL Admin API doesn't expose TaxRates easily (legacy REST does).
        // Returning empty to comply with interface without crashing.
        if (onProgress) onProgress(100);
        return [];
    }

    async getCoupons(onProgress?: (progress: number) => void): Promise<UniversalCoupon[]> {
        if (!this.client) throw new Error('Not connected');

        let allCoupons: any[] = [];
        let hasNextPage = true;
        let endCursor: string | null = null;
        let total = 0; // Approximate

        while (hasNextPage) {
            const query = `
                query getDiscounts($cursor: String) {
                    discountNodes(first: 50, after: $cursor) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        edges {
                            node {
                                id
                                discount {
                                    ... on DiscountCodeBasic {
                                        title
                                        startsAt
                                        endsAt
                                        codes(first: 10) {
                                            edges {
                                                node {
                                                    code
                                                }
                                            }
                                        }
                                        customerGets {
                                            value {
                                                ... on DiscountPercentage {
                                                    percentage
                                                }
                                                ... on DiscountAmount {
                                                    amount {
                                                        amount
                                                    }
                                                }
                                            }
                                        }
                                        usageLimit
                                    }
                                    ... on DiscountAutomaticBasic {
                                        title
                                        startsAt
                                        endsAt
                                        customerGets {
                                            value {
                                                ... on DiscountPercentage {
                                                    percentage
                                                }
                                                ... on DiscountAmount {
                                                    amount {
                                                        amount
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `;

            let response: any;
            try {
                response = await this.client.request(query, { variables: { cursor: endCursor } });
            } catch (error: any) {
                console.log('--- DEBUG COUPON ERROR ---');
                // Log all properties including non-enumerable
                console.log(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
                
                // Try to find the inner errors
                const gqlErrors = error.graphQLErrors || error.response?.errors || error.cause?.graphQLErrors;
                
                if (gqlErrors) {
                    const messages = Array.isArray(gqlErrors) 
                        ? gqlErrors.map((e: any) => e.message).join(', ') 
                        : JSON.stringify(gqlErrors);
                    throw new Error(`GraphQL Validation Error: ${messages}`);
                }
                
                // Fallback: Dump the whole error into the message so the user sees it
                throw new Error(`Deep GraphQL Error: ${error.message} \n Details: ${JSON.stringify(error, null, 2)}`);
            }
            
            if (response?.errors) {
                const errors = Array.isArray(response.errors) ? response.errors : [response.errors];
                
                // Check for Access Denied specifically
                // The error structure might be nested: error.graphQLErrors OR error.extensions
                const accessDenied = errors.find((e: any) => {
                    if (e.extensions?.code === 'ACCESS_DENIED') return true;
                    if (e.graphQLErrors) {
                        return e.graphQLErrors.some((ge: any) => ge.extensions?.code === 'ACCESS_DENIED' || ge.message.includes('Access denied'));
                    }
                    return false;
                });

                if (accessDenied) {
                    // Try to get the required access scope hint
                    let hint = 'read_discounts';
                    let rawHint = '';
                    
                    if (accessDenied.extensions?.requiredAccess) rawHint = accessDenied.extensions.requiredAccess;
                    else if (accessDenied.graphQLErrors) {
                         const nested = accessDenied.graphQLErrors.find((ge: any) => ge.extensions?.code === 'ACCESS_DENIED');
                         if (nested?.extensions?.requiredAccess) rawHint = nested.extensions.requiredAccess;
                    }

                    // Extract just the scope name if possible (e.g. from "Apps must have `read_discounts` access scope")
                    const match = rawHint.match(/`([^`]+)`/);
                    if (match) {
                        hint = match[1];
                    } else if (rawHint) {
                        hint = rawHint;
                    }

                    // Friendly error message
                    throw new Error(`Permission Missing: Your Shopify Admin Token is missing the '${hint}' scope. Please enable it in your Shopify App settings.`);
                }

                // For other errors, still useful to see them, but maybe less shouting
                console.warn('Coupon Sync Error (GraphQL):', JSON.stringify(errors, null, 2));
                throw new Error(`Shopify API Error: ${errors[0]?.message || 'Unknown error'}`);
            }

            const data = response.data?.discountNodes;
            const nodes = data?.edges.map((edge: any) => edge.node) || [];
            
            allCoupons = [...allCoupons, ...nodes];
            
            if (onProgress) {
                onProgress(50); // Indeterminate
            }

            if (data?.pageInfo?.hasNextPage) {
                endCursor = data.pageInfo.endCursor;
            } else {
                hasNextPage = false;
            }
        }

        // Map Shopify Discounts to Universal Coupons
        return allCoupons.map(node => {
            const discount = node.discount || {};
            
            // Extract codes
            let code = '';
            if (discount.codes?.edges?.length > 0) {
                code = discount.codes.edges[0].node.code;
            } else if (discount.title) {
                // For automatic discounts or fallback
                code = discount.title.replace(/\s+/g, '_').toUpperCase(); 
            }

            // Extract value
            let amount = 0;
            let type: UniversalCoupon['discountType'] = 'fixed_cart'; // default
            
            const valueObj = discount.customerGets?.value;
            if (valueObj) {
                if (valueObj.percentage !== undefined) {
                    type = 'percent';
                    amount = parseFloat(valueObj.percentage) * 100; // WC expects percent? Actually strict value usually. wait.
                    // WC expects '10' for 10% usually. Graphql returns 0.1? No, usually 0.1 or 10.0 depending on API.
                    // Shopify returns 0.15 for 15% usually.
                    amount = valueObj.percentage * 100; 
                } else if (valueObj.amount) {
                    type = 'fixed_cart';
                    amount = parseFloat(valueObj.amount.amount);
                }
            }

            // Usage Limits
            const usageLimit = discount.usageLimit;
            // usageLimitPerUser not directly on Basic interface easily, skipping for simplicity

            return {
                originalId: node.id.split('/').pop(),
                code: code,
                amount: amount,
                discountType: type,
                description: discount.title,
                dateExpires: discount.endsAt ? new Date(discount.endsAt) : undefined, 
                usageLimit: usageLimit,
                usageLimitPerUser: undefined, 
                minimumAmount: undefined, 
                freeShipping: false, 
                productIds: [], 
                originalData: node
            };
        });
    }

    async getExportFields(entityType: 'products' | 'customers' | 'orders' | 'posts' | 'pages' | 'categories' | 'shipping_zones' | 'taxes' | 'coupons' | 'store_settings'): Promise<string[]> {
        // Return the fields we are explicitly fetching in our GraphQL queries
        // Since we map GraphQL responses to Universal Types, we return the keys of those types primarily, 
        // plus any known metafields or raw data keys if we were using REST.
        // For GraphQL source, dynamic field discovery is harder without introspection.
        // We will return standard field sets that match our mapping logic.
        
        switch (entityType) {
            case 'products':
                return ['title', 'description', 'vendor', 'productType', 'tags', 'sku', 'price', 'images', 'metafields'];
            case 'customers':
                return [
                    'email', 'firstName', 'lastName', 'phone', 'note', 'state', 'tags', 
                    'taxExempt', 'verifiedEmail', 'createdAt', 'updatedAt', 'totalSpent', 
                    'ordersCount', 'lastOrderName', 'metafields'
                ];
            case 'orders':
                return [
                    'orderNumber', 'email', 'createdAt', 'totalPrice', 'currency', 'status', 
                    'customer', 'lineItems', 'billingAddress', 'metafields'
                ];
            case 'posts':
                return [
                    'title', 'content', 'slug', 'status', 'authorName', 'tags', 'featuredImage', 'metafields'
                ];
            case 'pages':
                return [
                    'title', 'content', 'slug', 'status', 'createdAt', 'metafields'
                ];
            case 'categories':
                return [
                     'name', 'slug', 'description', 'image', 'metafields'
                ];
            case 'shipping_zones':
                return ['name', 'methods', 'countries'];
            case 'taxes':
                return ['name', 'rate', 'country', 'state', 'zip', 'city', 'shipping', 'priority', 'compound'];
            case 'coupons':
                return ['code', 'amount', 'discountType', 'description', 'dateExpires', 'usageLimit', 'usageLimitPerUser', 'minimumAmount', 'freeShipping', 'productIds'];
            case 'store_settings':
                return ['siteTitle', 'adminEmail', 'address1', 'city', 'country', 'state', 'zip', 'currency', 'weightUnit', 'timezone', 'currencyFormat'];
            default:
                return [];
        }
    }
}
