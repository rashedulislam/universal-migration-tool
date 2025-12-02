import express from 'express';
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
import { projectRepository } from '../db/repositories/project-repository';
import { migrateFromJson } from '../db/migrate';

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

interface Project {
    id: string;
    name: string;
    sourceType: 'shopify' | 'woocommerce';
    destType: 'shopify' | 'woocommerce';
    config: {
        source: ConnectorConfig;
        destination: ConnectorConfig;
    };
    mapping: {
        products: { enabled: boolean; fields: Record<string, string> };
        customers: { enabled: boolean; fields: Record<string, string> };
        orders: { enabled: boolean; fields: Record<string, string> };
    };
}

interface MigrationStatus {
    isRunning: boolean;
    projectId: string | null;
    logs: string[];
    stats: {
        products: { success: number; failed: number };
        customers: { success: number; failed: number };
        orders: { success: number; failed: number };
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
        orders: { success: 0, failed: 0 }
    }
};

// Database is now initialized, no file helper functions needed

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
            orders: { enabled: true, fields: {} }
        }
    };
    
    projectRepository.createProject(newProject);
    
    res.json(newProject);
});

// ... (existing code)

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

        // Debug logging to check available methods
        console.log('Source type:', source.constructor.name);
        console.log('Source prototype:', Object.getPrototypeOf(source));
        console.log('Source keys:', Object.keys(source));
        
        if (typeof source.getExportFields !== 'function') {
             console.error('CRITICAL ERROR: source.getExportFields is not a function!');
             console.error('Source object:', source);
             throw new Error(`Source connector (${source.constructor.name}) does not implement getExportFields`);
        }

        const schema = {
            products: {
                source: await source.getExportFields('products'),
                destination: await destination.getImportFields('products')
            },
            customers: {
                source: await source.getExportFields('customers'),
                destination: await destination.getImportFields('customers')
            },
            orders: {
                source: await source.getExportFields('orders'),
                destination: await destination.getImportFields('orders')
            }
        };

        res.json(schema);
    } catch (error: any) {
        console.error('Schema fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch schema', error: error.message });
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
            orders: { success: 0, failed: 0 }
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
                orders: project.mapping?.orders?.enabled ?? true
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
