import { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
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
      <h2 className="text-3xl font-bold text-white mb-8">Configuration: {project.name}</h2>

      <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
        {/* Source Section */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
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
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
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

          <div className="space-y-8">
            {['products', 'customers', 'orders'].map((entity) => (
              <div key={entity} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={project.mapping?.[entity as keyof typeof project.mapping]?.enabled ?? true}
                      onChange={e => {
                        const currentMapping = project.mapping || {
                          products: { enabled: true, fields: {} },
                          customers: { enabled: true, fields: {} },
                          orders: { enabled: true, fields: {} }
                        };
                        const entityKey = entity as keyof typeof currentMapping;
                        
                        setProject({ 
                          ...project, 
                          mapping: {
                            ...currentMapping,
                            [entityKey]: {
                              ...currentMapping[entityKey],
                              enabled: e.target.checked
                            }
                          }
                        });
                      }}
                      className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-900"
                    />
                    <span className="text-lg font-medium text-white capitalize">{entity}</span>
                  </label>
                </div>

                {project.mapping?.[entity as keyof typeof project.mapping]?.enabled && (
                  <div className="pl-7 space-y-3">
                    {schema[entity as keyof typeof schema]?.destination.length > 0 ? (
                      schema[entity as keyof typeof schema].destination.map((destField: string) => (
                        <div key={destField} className="flex items-center gap-4">
                          <div className="w-1/3 text-sm text-gray-400 text-right">{destField}</div>
                          <div className="text-gray-500">←</div>
                          <div className="w-1/2">
                            <select
                              value={project.mapping?.[entity as keyof typeof project.mapping]?.fields?.[destField] || ''}
                              onChange={e => {
                                const currentMapping = project.mapping || {
                                  products: { enabled: true, fields: {} },
                                  customers: { enabled: true, fields: {} },
                                  orders: { enabled: true, fields: {} }
                                };
                                const entityKey = entity as keyof typeof currentMapping;
                                const currentFields = currentMapping[entityKey].fields || {};

                                setProject({ 
                                  ...project, 
                                  mapping: {
                                    ...currentMapping,
                                    [entityKey]: {
                                      ...currentMapping[entityKey],
                                      fields: {
                                        ...currentFields,
                                        [destField]: e.target.value
                                      }
                                    }
                                  }
                                });
                              }}
                              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                              <option value="">(Skip / Default)</option>
                              {schema[entity as keyof typeof schema]?.source.map((srcField: string) => (
                                <option key={srcField} value={srcField}>{srcField}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        {project.config.source.url && project.config.destination.url 
                          ? "Click 'Refresh Schema' to load fields." 
                          : "Configure Source and Destination first."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
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
