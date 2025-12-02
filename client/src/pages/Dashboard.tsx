import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle, AlertCircle, Play, Terminal } from 'lucide-react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const socket = io('http://localhost:3001');

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

export function DashboardPage() {
  const { projectId } = useParams();
  const [status, setStatus] = useState<MigrationStatus>({
    isRunning: false,
    projectId: null,
    logs: [],
    stats: {
      products: { success: 0, failed: 0 },
      customers: { success: 0, failed: 0 },
      orders: { success: 0, failed: 0 }
    }
  });

  useEffect(() => {
    if (projectId) {
      socket.emit('join-project', projectId);
    }

    socket.on('status', (newStatus: MigrationStatus) => {
      // Only update if it's relevant to us or global status
      if (newStatus.projectId === projectId || newStatus.projectId === null) {
        setStatus(newStatus);
      }
    });

    socket.on('log', (msg: string) => {
      // In a real app we'd filter logs by project ID too, but for now we rely on the room or global broadcast
      // If we are in the room, we get the log.
      setStatus(prev => ({ ...prev, logs: [...prev.logs, msg] }));
    });

    return () => {
      socket.off('status');
      socket.off('log');
    };
  }, [projectId]);

  const startMigration = async () => {
    try {
      await axios.post(`http://localhost:3001/api/projects/${projectId}/start`);
    } catch (error: any) {
      console.error('Failed to start migration', error);
      alert(error.response?.data?.message || 'Failed to start');
    }
  };

  return (
    <div>
      <header className="mb-12 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-400 mt-2">Monitor your migration progress</p>
        </div>
        <button
          onClick={startMigration}
          disabled={status.isRunning}
          className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
            status.isRunning
              ? 'bg-gray-700 cursor-not-allowed text-gray-400'
              : 'bg-blue-600 hover:bg-blue-500 shadow-lg hover:shadow-blue-500/25'
          }`}
        >
          {status.isRunning ? (
            <Activity className="animate-spin" />
          ) : (
            <Play size={20} />
          )}
          {status.isRunning ? 'Migrating...' : 'Start Migration'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Products"
          success={status.stats.products.success}
          failed={status.stats.products.failed}
          icon={<div className="w-3 h-3 rounded-full bg-blue-400" />}
        />
        <StatCard
          title="Customers"
          success={status.stats.customers.success}
          failed={status.stats.customers.failed}
          icon={<div className="w-3 h-3 rounded-full bg-green-400" />}
        />
        <StatCard
          title="Orders"
          success={status.stats.orders.success}
          failed={status.stats.orders.failed}
          icon={<div className="w-3 h-3 rounded-full bg-purple-400" />}
        />
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
        <div className="p-4 bg-gray-900/50 border-b border-gray-700 flex items-center gap-2">
          <Terminal size={18} className="text-gray-400" />
          <span className="font-mono text-sm text-gray-400">Migration Logs</span>
        </div>
        <div className="h-96 overflow-y-auto p-4 font-mono text-sm space-y-1">
          <AnimatePresence>
            {status.logs.map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-gray-300 border-l-2 border-transparent hover:border-blue-500 pl-2 transition-colors"
              >
                <span className="text-gray-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                {log}
              </motion.div>
            ))}
            {status.logs.length === 0 && (
              <div className="text-gray-600 italic">Ready to start...</div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, success, failed, icon }: { title: string; success: number; failed: number; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-200 flex items-center gap-2">
          {icon}
          {title}
        </h3>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 flex items-center gap-1">
            <CheckCircle size={14} className="text-green-500" /> Success
          </span>
          <span className="text-2xl font-bold text-white">{success}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 flex items-center gap-1">
            <AlertCircle size={14} className="text-red-500" /> Failed
          </span>
          <span className="text-xl font-semibold text-gray-500">{failed}</span>
        </div>
      </div>
    </div>
  );
}
