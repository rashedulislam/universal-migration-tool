import { useEffect, useState } from 'react';
import { Save, Loader2, Trash2, Plus } from 'lucide-react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  sourceType: string;
  destType: string;
  config: {
    source: { url: string; auth: any };
    destination: { url: string; auth: any };
  };
  mapping?: {
    products: { enabled: boolean; fields: Record<string, string> };
    customers: { enabled: boolean; fields: Record<string, string> };
    orders: { enabled: boolean; fields: Record<string, string> };
  };
}

export function SettingsPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [schema, setSchema] = useState<{
    products: { source: string[], destination: string[] },
    customers: { source: string[], destination: string[] },
    orders: { source: string[], destination: string[] }
  }>({
    products: { source: [], destination: [] },
    customers: { source: [], destination: [] },
    orders: { source: [], destination: [] }
  });

  const [isFetchingSchema, setIsFetchingSchema] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'products' | 'customers' | 'orders'>('products');
  const [hiddenFields, setHiddenFields] = useState<Record<string, string[]>>({
    products: [], customers: [], orders: []
  });
  const [customFields, setCustomFields] = useState<Record<string, string[]>>({
    products: [], customers: [], orders: []
  });
  const [newField, setNewField] = useState('');

  // Helper to get all fields to display (Schema + Custom - Hidden)
  const getDisplayFields = (entity: 'products' | 'customers' | 'orders') => {
    const schemaFields = schema[entity]?.destination || [];
    const mappedFields = project?.mapping?.[entity]?.fields ? Object.keys(project.mapping[entity].fields) : [];
    const custom = customFields[entity] || [];
    
    // Union of all potential fields
    const allFields = Array.from(new Set([...schemaFields, ...mappedFields, ...custom]));
    
    // Filter out hidden fields
    return allFields.filter(f => !hiddenFields[entity]?.includes(f));
  };

  const removeField = (entity: 'products' | 'customers' | 'orders', field: string) => {
    // Add to hidden fields
    setHiddenFields(prev => ({
      ...prev,
      [entity]: [...(prev[entity] || []), field]
    }));
    
    // Clear mapping
    updateMapping(entity, field, '');
  };

  const addField = (entity: 'products' | 'customers' | 'orders') => {
    if (!newField.trim()) return;
    
    // If it was hidden, unhide it
    if (hiddenFields[entity]?.includes(newField)) {
      setHiddenFields(prev => ({
        ...prev,
        [entity]: prev[entity].filter(f => f !== newField)
      }));
    } else {
      // Add to custom fields
      setCustomFields(prev => ({
        ...prev,
        [entity]: [...(prev[entity] || []), newField]
      }));
    }
    setNewField('');
  };

  const updateMapping = (entity: 'products' | 'customers' | 'orders', destField: string, srcField: string) => {
    if (!project) return;
    const currentMapping = project.mapping || {
      products: { enabled: true, fields: {} },
      customers: { enabled: true, fields: {} },
      orders: { enabled: true, fields: {} }
    };
    
    setProject({ 
      ...project, 
      mapping: {
        ...currentMapping,
        [entity]: {
          ...currentMapping[entity],
          fields: {
            ...currentMapping[entity].fields,
            [destField]: srcField
          }
        }
      }
    });
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      // Don't auto-fetch schema on load to avoid immediate errors if config is empty
      // fetchSchema(); 
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const res = await axios.get(`http://localhost:3001/api/projects/${projectId}`);
      setProject(res.data);
    } catch (error) {
      console.error('Failed to fetch project', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchema = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsFetchingSchema(true);
    setMessage(null);
    try {
      const res = await axios.get(`http://localhost:3001/api/projects/${projectId}/schema`);
      setSchema(res.data);
      setMessage({ type: 'success', text: 'Schema loaded successfully' });
    } catch (error: any) {
      console.error('Failed to fetch schema', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to load schema. Check connections.' 
      });
    } finally {
      setIsFetchingSchema(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`http://localhost:3001/api/projects/${projectId}`, project);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (side: 'source' | 'destination', field: string, value: string) => {
    if (!project) return;
    
    // Helper to update deeply nested state safely
    const newProject = { ...project };
    if (field === 'url') {
      newProject.config[side].url = value;
    } else {
      // Assume auth field
      newProject.config[side].auth = {
        ...newProject.config[side].auth,
        [field]: value
      };
    }
    setProject(newProject);
  };

  if (loading) return <div className="text-center p-12 text-gray-400">Loading settings...</div>;
  if (!project) return <div className="text-center p-12 text-red-400">Project not found</div>;

  return (
    <div>


      <form onSubmit={handleSave} className="space-y-8 max-w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Source Section */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full">
            <h3 className="text-xl font-semibold text-blue-400 mb-4 border-b border-gray-700 pb-2 capitalize">
              Source: {project.sourceType}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">URL</label>
                <input
                  type="text"
                  value={project.config.source.url}
                  onChange={e => updateConfig('source', 'url', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>
              {project.sourceType === 'shopify' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Access Token</label>
                  <input
                    type="password"
                    value={project.config.source.auth.token || ''}
                    onChange={e => updateConfig('source', 'token', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
              )}
              {project.sourceType === 'woocommerce' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Consumer Key</label>
                    <input
                      type="text"
                      value={project.config.source.auth.key || ''}
                      onChange={e => updateConfig('source', 'key', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Consumer Secret</label>
                    <input
                      type="password"
                      value={project.config.source.auth.secret || ''}
                      onChange={e => updateConfig('source', 'secret', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Destination Section */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full">
            <h3 className="text-xl font-semibold text-purple-400 mb-4 border-b border-gray-700 pb-2 capitalize">
              Destination: {project.destType}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">URL</label>
                <input
                  type="text"
                  value={project.config.destination.url}
                  onChange={e => updateConfig('destination', 'url', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>
              {project.destType === 'shopify' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Access Token</label>
                  <input
                    type="password"
                    value={project.config.destination.auth.token || ''}
                    onChange={e => updateConfig('destination', 'token', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                  />
                </div>
              )}
              {project.destType === 'woocommerce' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Consumer Key</label>
                    <input
                      type="text"
                      value={project.config.destination.auth.key || ''}
                      onChange={e => updateConfig('destination', 'key', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Consumer Secret</label>
                    <input
                      type="password"
                      value={project.config.destination.auth.secret || ''}
                      onChange={e => updateConfig('destination', 'secret', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Data Mapping Section */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
            <h3 className="text-xl font-semibold text-green-400">Data Mapping</h3>
            <div className="flex items-center gap-3">
              {message && (message.text.includes('Schema') || message.text.includes('Connection')) && (
                <span className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {message.text}
                </span>
              )}
              <button 
                onClick={fetchSchema}
                disabled={isFetchingSchema}
                className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isFetchingSchema && <Loader2 className="animate-spin w-3 h-3" />}
                Refresh Schema
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-700">
            {['products', 'customers', 'orders'].map((entity) => (
              <button
                key={entity}
                type="button"
                onClick={() => setActiveTab(entity as any)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${
                  activeTab === entity
                    ? 'bg-gray-900 text-blue-400 border-t border-x border-gray-700'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {entity}
              </button>
            ))}
          </div>

          {/* Mapping Content */}
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={project.mapping?.[activeTab]?.enabled ?? true}
                  onChange={e => {
                    const currentMapping = project.mapping || {
                      products: { enabled: true, fields: {} },
                      customers: { enabled: true, fields: {} },
                      orders: { enabled: true, fields: {} }
                    };
                    
                    setProject({ 
                      ...project, 
                      mapping: {
                        ...currentMapping,
                        [activeTab]: {
                          ...currentMapping[activeTab],
                          enabled: e.target.checked
                        }
                      }
                    });
                  }}
                  className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-900"
                />
                <span className="text-lg font-medium text-white capitalize">Enable {activeTab} Migration</span>
              </label>
            </div>

            {project.mapping?.[activeTab]?.enabled && (
              <div className="space-y-3">
                {getDisplayFields(activeTab).length > 0 ? (
                  getDisplayFields(activeTab).map((destField) => (
                    <div key={destField} className="flex items-center gap-4 group">
                      <div className="w-1/3 text-sm text-gray-400 text-right font-mono">{destField}</div>
                      <div className="text-gray-500">←</div>
                      <div className="w-1/2">
                        <select
                          value={project.mapping?.[activeTab]?.fields?.[destField] || ''}
                          onChange={e => updateMapping(activeTab, destField, e.target.value)}
                          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                          <option value="">(Skip / Default)</option>
                          {schema[activeTab]?.source.map((srcField: string) => (
                            <option key={srcField} value={srcField}>{srcField}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeField(activeTab, destField)}
                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove field"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 italic">
                    No fields visible. Add a field to start mapping.
                  </div>
                )}

                {/* Add Field Row */}
                <div className="mt-6 pt-4 border-t border-gray-800 flex items-center gap-4">
                  <div className="w-1/3 flex justify-end">
                    <input
                      type="text"
                      placeholder="New destination field..."
                      value={newField}
                      onChange={e => setNewField(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm focus:ring-1 focus:ring-green-500 outline-none w-48 text-right"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addField(activeTab);
                        }
                      }}
                    />
                  </div>
                  <div className="text-gray-500">←</div>
                  <div className="w-1/2">
                    <button
                      type="button"
                      onClick={() => addField(activeTab)}
                      className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Field
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            Save Configuration
          </button>
          
          {message && (
            <span className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message.text}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
