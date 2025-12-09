import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { RefreshCw, Database, Loader2, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface SyncedItem {
  id: number;
  originalId: string;
  data: any;
  syncedAt: string;
}

export function DataViewer() {
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState<'products' | 'customers' | 'orders' | 'posts' | 'pages' | 'categories' | 'shipping_zones' | 'taxes' | 'coupons' | 'store_settings'>('products');
  const [items, setItems] = useState<SyncedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId, activeTab, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3001/api/projects/${projectId}/data/${activeTab}?page=${page}&limit=${limit}`);
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setProgress(0);
    setStatusMessage('Starting sync...');
    setMessage(null);

    const eventSource = new EventSource(`http://localhost:3001/api/projects/${projectId}/sync?entity=${activeTab}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'progress') {
        setProgress(data.progress);
        setStatusMessage(`Syncing... ${data.progress}%`);
      } else if (data.type === 'status') {
        setStatusMessage(data.message);
      } else if (data.type === 'complete') {
        setMessage({ type: 'success', text: data.message });
        setPage(1);
        fetchData();
        eventSource.close();
        setSyncing(false);
        setProgress(0);
        setStatusMessage('');
      } else if (data.type === 'error') {
        setMessage({ type: 'error', text: data.message });
        eventSource.close();
        setSyncing(false);
        setProgress(0);
        setStatusMessage('');
      }
    };

    eventSource.onerror = () => {
      // Only set error if we haven't already finished (sometimes close() triggers error)
      if (syncing) {
        // Check if it was a clean close or actual error
        if (eventSource.readyState === EventSource.CLOSED) return;
        
        setMessage({ type: 'error', text: 'Connection lost during sync' });
        eventSource.close();
        setSyncing(false);
        setProgress(0);
        setStatusMessage('');
      }
    };
  };

  // Helper to render cell content safely
  const renderCell = (item: any, field: string) => {
    if (!item) return '';
    const value = item[field];
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      return (
        <pre className="whitespace-pre-wrap text-xs font-mono bg-gray-900/50 p-2 rounded max-h-[200px] overflow-y-auto min-w-[300px]">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return String(value);
  };

  // Dynamic columns based on entity type
  const getColumns = () => {
    switch (activeTab) {
      case 'products': return [
        'title', 'description', 'sku', 'price', 'currency', 'weight', 'weightUnit',
        'vendor', 'productType', 'status', 'tags', 'categories', 'images', 'variants', 'metafields'
      ];
      case 'customers': return [
        'firstName', 'lastName', 'email', 'phone', 
        'ordersCount', 'totalSpent', 'currency', 'state', 'verifiedEmail', 
        'taxExempt', 'tags', 'note', 'lastOrderId', 'lastOrderName',
        'multipassIdentifier', 'marketingOptInLevel', 'taxExemptions',
        'emailMarketingConsent', 'smsMarketingConsent', 'defaultAddress',
        'addresses', 'createdAt', 'updatedAt'
      ];
      case 'orders': return [
        'orderNumber', 'status', 'currency', 'totalPrice', 'email', 
        'customer', 'lineItems', 'billingAddress', 'shippingAddress', 'createdAt', 'metafields'
      ];
      case 'posts': return [
        'title', 'slug', 'status', 'authorName', 'categories', 'tags', 
        'featuredImage', 'content', 'createdAt', 'updatedAt', 'metafields'
      ];
      case 'pages': return [
        'title', 'slug', 'status', 'authorName', 'content', 'createdAt', 'updatedAt', 'metafields'
      ];
      case 'categories': return [
        'name', 'slug', 'description', 'parent', 'image', 'count', 'metafields'
      ];
      case 'shipping_zones': return [
        'name', 'methods', 'countries', 'metafields'
      ];
      case 'taxes': return [
        'name', 'rate', 'country', 'state', 'city', 'postcode', 'priority', 'compound', 'shipping', 'metafields'
      ];
      case 'coupons': return [
        'code', 'amount', 'discountType', 'description', 'dateExpires', 'usageLimit', 'usageLimitPerUser', 'minimumAmount', 'metafields'
      ];
      case 'store_settings': return [
        'siteTitle', 'adminEmail', 'address1', 'city', 'country', 'state', 'zip', 'currency', 'weightUnit', 'timezone', 'currencyFormat'
      ];
      default: return ['id'];
    }
  };

  const totalPages = Math.ceil(total / limit);

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

      {syncing && (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>{statusMessage}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-red-900/50 text-red-400 border border-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 overflow-x-auto">
        {['products', 'customers', 'orders', 'posts', 'pages', 'categories', 'shipping_zones', 'taxes', 'coupons', 'store_settings'].map((entity) => (
          <button
            key={entity}
            onClick={() => { setActiveTab(entity as any); setPage(1); }}
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
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-900/50 border-b border-gray-700">
                    <th className="p-4 text-gray-400 font-medium text-sm">ID</th>
                    {getColumns().map(col => (
                      <th key={col} className="p-4 text-gray-400 font-medium text-sm capitalize whitespace-nowrap">
                        {col.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                      </th>
                    ))}
                    <th className="p-4 text-gray-400 font-medium text-sm text-right">Synced At</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                      <td className="p-4 text-gray-300 font-mono text-xs align-top">{item.originalId}</td>
                      {getColumns().map(col => (
                        <td key={col} className="p-4 text-gray-300 text-sm align-top">
                          {renderCell(item.data, col)}
                        </td>
                      ))}
                      <td className="p-4 text-gray-500 text-xs text-right whitespace-nowrap align-top">
                        {new Date(item.syncedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="flex justify-between items-center p-4 border-t border-gray-700 bg-gray-900/30">
              <div className="text-sm text-gray-400">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} entries
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="flex items-center px-2 text-sm text-gray-400">
                  Page {page} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
