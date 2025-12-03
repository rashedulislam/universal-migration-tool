import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { RefreshCw, Database, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface SyncedItem {
  id: number;
  originalId: string;
  data: any;
  syncedAt: string;
}

export function DataViewer() {
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState<'products' | 'customers' | 'orders' | 'posts' | 'pages'>('products');
  const [items, setItems] = useState<SyncedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3001/api/projects/${projectId}/data/${activeTab}`);
      setItems(res.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await axios.post(`http://localhost:3001/api/projects/${projectId}/sync`, {
        entity: activeTab
      });
      setMessage({ type: 'success', text: res.data.message });
      fetchData(); // Refresh table
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Sync failed' 
      });
    } finally {
      setSyncing(false);
    }
  };

  // Helper to render cell content safely
  const renderCell = (item: any, field: string) => {
    const value = item[field];
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...';
    return value;
  };

  // Dynamic columns based on entity type
  const getColumns = () => {
    switch (activeTab) {
      case 'products': return ['title', 'price', 'sku'];
      case 'customers': return ['email', 'firstName', 'lastName'];
      case 'orders': return ['orderNumber', 'totalPrice', 'status'];
      case 'posts': return ['title', 'slug', 'status', 'authorName'];
      case 'pages': return ['title', 'slug', 'status'];
      default: return ['id'];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="text-blue-400" />
            Source Data Viewer
          </h2>
          <p className="text-gray-400 mt-1">View and sync data from your source store.</p>
        </div>
        
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Sync {activeTab}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-red-900/50 text-red-400 border border-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        {['products', 'customers', 'orders', 'posts', 'pages'].map((entity) => (
          <button
            key={entity}
            onClick={() => setActiveTab(entity as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${
              activeTab === entity
                ? 'bg-gray-800 text-blue-400 border-t border-x border-gray-700'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {entity}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
            Loading data...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No data found. Click "Sync" to fetch from source.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/50 border-b border-gray-700">
                  <th className="p-4 text-gray-400 font-medium text-sm">ID</th>
                  {getColumns().map(col => (
                    <th key={col} className="p-4 text-gray-400 font-medium text-sm capitalize">
                      {col.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                  <th className="p-4 text-gray-400 font-medium text-sm text-right">Synced At</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="p-4 text-gray-300 font-mono text-xs">{item.originalId}</td>
                    {getColumns().map(col => (
                      <td key={col} className="p-4 text-gray-300 text-sm">
                        {renderCell(item.data, col)}
                      </td>
                    ))}
                    <td className="p-4 text-gray-500 text-xs text-right">
                      {new Date(item.syncedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
