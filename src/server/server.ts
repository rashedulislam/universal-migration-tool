import express from 'express';
// Trigger restart for type updates
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { MigrationManager } from '../core/migration-manager';
import { ShopifySource } from '../connectors/shopify/shopify-source';
import { ShopifyDestination } from '../connectors/shopify/shopify-destination';
import { WooCommerceSource } from '../connectors/woocommerce/woocommerce-source';
import { WooCommerceDestination } from '../connectors/woocommerce/woocommerce-destination';
import { ISourceConnector, IDestinationConnector } from '../core/types';
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase } from '../db/database';
import { projectRepository, Project } from '../db/repositories/project-repository';
import { migrateFromJson } from '../db/migrate';
import { syncedItemRepository } from '../db/repositories/synced-item-repository';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "DELETE", "PUT"]
    }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Initialize database on startup
initializeDatabase();
migrateFromJson().catch(console.error);

// --- Types ---
interface ConnectorConfig {
    url: string;
    auth: any; // Flexible for different connector types
}

interface MigrationStatus {
    isRunning: boolean;
    projectId: string | null;
    logs: string[];
    stats: {
        products: { success: number; failed: number };
        customers: { success: number; failed: number };
        orders: { success: number; failed: number };
        posts: { success: number; failed: number };
        pages: { success: number; failed: number };
        categories: { success: number; failed: number };
        shipping_zones: { success: number; failed: number };
        taxes: { success: number; failed: number };
        coupons: { success: number; failed: number };
    };
}

// --- State ---
let activeMigration: MigrationStatus = {
    isRunning: false,
    projectId: null,
    logs: [],
    stats: {
        products: { success: 0, failed: 0 },
        customers: { success: 0, failed: 0 },
        orders: { success: 0, failed: 0 },
        posts: { success: 0, failed: 0 },
        pages: { success: 0, failed: 0 },
        categories: { success: 0, failed: 0 },
        shipping_zones: { success: 0, failed: 0 },
        taxes: { success: 0, failed: 0 },
        coupons: { success: 0, failed: 0 }
    }
};

// --- Socket.IO ---
io.on('connection', (socket) => {
    console.log('Client connected');
    socket.emit('status', activeMigration);
    
    socket.on('join-project', (projectId) => {
        socket.join(projectId);
        // If the active migration matches this project, send full history
        if (activeMigration.projectId === projectId) {
            socket.emit('status', activeMigration);
        }
    });
});

// --- API Endpoints ---

// List Projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = projectRepository.getAllProjects();
        res.json(projects);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
    }
});

// Get Project Details
app.get('/api/projects/:id', async (req, res) => {
    try {
        const project = projectRepository.getProjectById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch project', error: error.message });
    }
});

// Update Project Config
app.put('/api/projects/:id', async (req, res) => {
    try {
        const updated = projectRepository.updateProject(req.params.id, req.body);
        if (!updated) return res.status(404).json({ message: 'Project not found' });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to update project', error: error.message });
    }
});

// Delete Project
app.delete('/api/projects/:id', async (req, res) => {
    try {
        const deleted = projectRepository.deleteProject(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Project not found' });
        res.json({ message: 'Project deleted' });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to delete project', error: error.message });
    }
});

// Create Project
app.post('/api/projects', async (req, res) => {
    const { name, sourceType, destType } = req.body;
    const newProject: Project = {
        id: uuidv4(),
        name: name || 'Untitled Project',
        sourceType: sourceType || 'shopify',
        destType: destType || 'woocommerce',
        config: {
            source: { url: '', auth: {} },
            destination: { url: '', auth: {} }
        },
        mapping: {
            products: { enabled: true, fields: {} },
            customers: { enabled: true, fields: {} },
            orders: { enabled: true, fields: {} },
            posts: { enabled: true, fields: {} },
            pages: { enabled: true, fields: {} },
            categories: { enabled: true, fields: {} },
            shipping_zones: { enabled: true, fields: {} },
            taxes: { enabled: true, fields: {} },
            coupons: { enabled: true, fields: {} }
        }
    };
    
    projectRepository.createProject(newProject);
    
    res.json(newProject);
});

// Get Schema for Mapping
app.get('/api/projects/:id/schema', async (req, res) => {
    const project = projectRepository.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (!project.config.source.url || !project.config.destination.url) {
        return res.status(400).json({ message: 'Configure source and destination first' });
    }

    try {
        // Initialize Connectors
        let source: ISourceConnector;
        let destination: IDestinationConnector;

        try {
            if (project.sourceType === 'shopify') {
                source = new ShopifySource(project.config.source.url, project.config.source.auth.token);
            } else {
                source = new WooCommerceSource(project.config.source.url, project.config.source.auth.key, project.config.source.auth.secret);
            }
            console.log('Source initialized:', source.constructor.name);
            await source.connect();
        } catch (err: any) {
            return res.status(400).json({ message: `Source Connection Failed: ${err.message}` });
        }

        try {
            if (project.destType === 'woocommerce') {
                destination = new WooCommerceDestination(project.config.destination.url, project.config.destination.auth.key, project.config.destination.auth.secret);
            } else {
                destination = new ShopifyDestination(project.config.destination.url, project.config.destination.auth.token);
            }
            console.log('Destination initialized:', destination.constructor.name);
            await destination.connect();
        } catch (err: any) {
            return res.status(400).json({ message: `Destination Connection Failed: ${err.message}` });
        }

        // Helper to safely fetch fields without crashing the whole request
        const getFieldsSafe = async (fn: () => Promise<string[]>, context: string) => {
            try {
                return await fn();
            } catch (error: any) {
                console.error(`Warning: Failed to fetch fields for ${context}:`, error.message);
                return [];
            }
        };

        const schema = {
            products: {
                source: await getFieldsSafe(() => source.getExportFields('products'), 'source products'),
                destination: await getFieldsSafe(() => destination.getImportFields('products'), 'destination products')
            },
            customers: {
                source: await getFieldsSafe(() => source.getExportFields('customers'), 'source customers'),
                destination: await getFieldsSafe(() => destination.getImportFields('customers'), 'destination customers')
            },
            orders: {
                source: await getFieldsSafe(() => source.getExportFields('orders'), 'source orders'),
                destination: await getFieldsSafe(() => destination.getImportFields('orders'), 'destination orders')
            },
            posts: {
                source: await getFieldsSafe(() => source.getExportFields('posts'), 'source posts'),
                destination: await getFieldsSafe(() => destination.getImportFields('posts'), 'destination posts')
            },
            pages: {
                source: await getFieldsSafe(() => source.getExportFields('pages'), 'source pages'),
                destination: await getFieldsSafe(() => destination.getImportFields('pages'), 'destination pages')
            },
            categories: {
                source: await getFieldsSafe(() => source.getExportFields('categories'), 'source categories'),
                destination: await getFieldsSafe(() => destination.getImportFields('categories'), 'destination categories')
            },
            shipping_zones: {
                source: await getFieldsSafe(() => source.getExportFields('shipping_zones'), 'source shipping_zones'),
                destination: await getFieldsSafe(() => destination.getImportFields('shipping_zones'), 'destination shipping_zones')
            },
            taxes: {
                source: await getFieldsSafe(() => source.getExportFields('taxes'), 'source taxes'),
                destination: await getFieldsSafe(() => destination.getImportFields('taxes'), 'destination taxes')
            },
            coupons: {
                source: await getFieldsSafe(() => source.getExportFields('coupons'), 'source coupons'),
                destination: await getFieldsSafe(() => destination.getImportFields('coupons'), 'destination coupons')
            }
        };

        res.json(schema);
    } catch (error: any) {
        console.error('Schema fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch schema', error: error.message });
    }
});

// Sync Source Data
app.get('/api/projects/:id/sync', async (req, res) => {
    const { entity } = req.query; // 'products', 'customers', etc.
    const project = projectRepository.getProjectById(req.params.id);
    
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!project.config.source.url) return res.status(400).json({ message: 'Source not configured' });

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        // Initialize Source
        let source: ISourceConnector;
        if (project.sourceType === 'shopify') {
            source = new ShopifySource(project.config.source.url, project.config.source.auth.token);
        } else {
            source = new WooCommerceSource(project.config.source.url, project.config.source.auth.key, project.config.source.auth.secret);
        }
        await source.connect();

        // Fetch Data with Progress
        let items: any[] = [];
        const onProgress = (progress: number) => {
            sendEvent({ type: 'progress', progress });
        };

        switch (entity) {
            case 'products': items = await source.getProducts(onProgress); break;
            case 'customers': items = await source.getCustomers(onProgress); break;
            case 'orders': items = await source.getOrders(onProgress); break;
            case 'posts': items = await source.getPosts(onProgress); break;
            case 'pages': items = await source.getPages(onProgress); break;
            case 'categories': items = await source.getCategories(onProgress); break;
            case 'shipping_zones': items = await source.getShippingZones(onProgress); break;
            case 'taxes': items = await source.getTaxRates(onProgress); break;
            case 'coupons': items = await source.getCoupons(onProgress); break;
            default: 
                sendEvent({ type: 'error', message: 'Invalid entity type' });
                res.end();
                return;
        }

        // Save to DB
        sendEvent({ type: 'status', message: 'Saving to database...' });
        syncedItemRepository.upsertItems(project.id, entity as string, items);

        sendEvent({ type: 'complete', message: `Synced ${items.length} ${entity} successfully`, count: items.length });
    } catch (error: any) {
        console.error('Sync failed:', error);
        sendEvent({ type: 'error', message: error.message });
    } finally {
        res.end();
    }
});

// Get Synced Data
app.get('/api/projects/:id/data/:entity', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        
        const result = syncedItemRepository.getItems(req.params.id, req.params.entity, page, limit);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch data', error: error.message });
    }
});

// Start Migration
app.post('/api/projects/:id/start', async (req, res) => {
    if (activeMigration.isRunning) {
        return res.status(400).json({ message: 'A migration is already running' });
    }

    const project = projectRepository.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Validate Config (Basic check)
    if (!project.config.source.url || !project.config.destination.url) {
        return res.status(400).json({ message: 'Missing configuration. Please check Settings.' });
    }

    // Initialize State
    activeMigration = {
        isRunning: true,
        projectId: project.id,
        logs: [`Starting migration for project: ${project.name}...`],
        stats: {
            products: { success: 0, failed: 0 },
            customers: { success: 0, failed: 0 },
            orders: { success: 0, failed: 0 },
            posts: { success: 0, failed: 0 },
            pages: { success: 0, failed: 0 },
            categories: { success: 0, failed: 0 },
            shipping_zones: { success: 0, failed: 0 },
            taxes: { success: 0, failed: 0 },
            coupons: { success: 0, failed: 0 }
        }
    };
    
    // Broadcast to everyone, but UI should filter by project ID
    io.emit('status', activeMigration);

    (async () => {
        try {
            // Initialize Connectors based on type
            let source, destination;

            // Source Factory
            if (project.sourceType === 'shopify') {
                source = new ShopifySource(project.config.source.url, project.config.source.auth.token);
            } else if (project.sourceType === 'woocommerce') {
                source = new WooCommerceSource(project.config.source.url, project.config.source.auth.key, project.config.source.auth.secret);
            } else {
                throw new Error(`Unsupported source type: ${project.sourceType}`);
            }

            // Destination Factory
            if (project.destType === 'woocommerce') {
                destination = new WooCommerceDestination(project.config.destination.url, project.config.destination.auth.key, project.config.destination.auth.secret);
            } else if (project.destType === 'shopify') {
                destination = new ShopifyDestination(project.config.destination.url, project.config.destination.auth.token);
            } else {
                throw new Error(`Unsupported destination type: ${project.destType}`);
            }

            const manager = new MigrationManager(source, destination);

            // Log Interceptor
            const originalLog = console.log;
            console.log = (...args) => {
                const msg = args.join(' ');
                originalLog(msg);
                activeMigration.logs.push(msg);
                io.emit('log', msg);
            };

            // Use project mapping settings
            await manager.runMigration({
                products: project.mapping?.products?.enabled ?? true,
                customers: project.mapping?.customers?.enabled ?? true,
                orders: project.mapping?.orders?.enabled ?? true,
                posts: project.mapping?.posts?.enabled ?? true,
                pages: project.mapping?.pages?.enabled ?? true,
                categories: project.mapping?.categories?.enabled ?? true,
                shipping_zones: project.mapping?.shipping_zones?.enabled ?? true,
                taxes: project.mapping?.taxes?.enabled ?? true,
                coupons: project.mapping?.coupons?.enabled ?? true
            });

            activeMigration.isRunning = false;
            activeMigration.logs.push('Migration completed.');
            io.emit('status', activeMigration);
            console.log = originalLog;

        } catch (error: any) {
            console.error(error);
            activeMigration.isRunning = false;
            activeMigration.logs.push(`Error: ${error.message}`);
            io.emit('status', activeMigration);
        }
    })();

    res.json({ message: 'Migration started' });
});

app.get('/api/status', (req, res) => {
    res.json(activeMigration);
});

httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
