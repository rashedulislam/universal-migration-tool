import { useEffect, useState } from 'react';
import { Save, Loader2, Trash2, Plus } from 'lucide-react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  sourceType: 'shopify' | 'woocommerce';
  destType: 'shopify' | 'woocommerce';
  config: {
    source: { url: string; auth: any };
    destination: { url: string; auth: any };
  };
  mapping: {
    products: { enabled: boolean; fields: Record<string, string> };
    customers: { enabled: boolean; fields: Record<string, string> };
    orders: { enabled: boolean; fields: Record<string, string> };
    posts: { enabled: boolean; fields: Record<string, string> };
    pages: { enabled: boolean; fields: Record<string, string> };
    categories: { enabled: boolean; fields: Record<string, string> };
    shipping_zones: { enabled: boolean; fields: Record<string, string> };
    taxes: { enabled: boolean; fields: Record<string, string> };
    coupons: { enabled: boolean; fields: Record<string, string> };
    store_settings: { enabled: boolean; fields: Record<string, string> }; // Added for S2W parity
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
    orders: { source: string[], destination: string[] },
    posts: { source: string[], destination: string[] },
    pages: { source: string[], destination: string[] },
    categories: { source: string[], destination: string[] },
    shipping_zones: { source: string[], destination: string[] },
    taxes: { source: string[], destination: string[] },
    coupons: { source: string[], destination: string[] },
    store_settings: { source: string[], destination: string[] }
  }>({
    products: { source: [], destination: [] },
    customers: { source: [], destination: [] },
    orders: { source: [], destination: [] },
    posts: { source: [], destination: [] },
    pages: { source: [], destination: [] },
    categories: { source: [], destination: [] },
    shipping_zones: { source: [], destination: [] },
    taxes: { source: [], destination: [] },
    coupons: { source: [], destination: [] },
    store_settings: { source: [], destination: [] }
  });

  const [isFetchingSchema, setIsFetchingSchema] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'products' | 'customers' | 'orders' | 'posts' | 'pages' | 'categories' | 'shipping_zones' | 'taxes' | 'coupons' | 'store_settings'>('products');

  const updateMapping = (entity: 'products' | 'customers' | 'orders' | 'posts' | 'pages' | 'categories' | 'shipping_zones' | 'taxes' | 'coupons' | 'store_settings', destField: string, srcField: string) => {
    if (!project) return;
    const currentMapping = project.mapping || {
      products: { enabled: true, fields: {} },
      customers: { enabled: true, fields: {} },
      orders: { enabled: true, fields: {} },
      posts: { enabled: true, fields: {} },
      pages: { enabled: true, fields: {} },
      categories: { enabled: true, fields: {} },
      shipping_zones: { enabled: true, fields: {} },
      taxes: { enabled: true, fields: {} },
      coupons: { enabled: true, fields: {} },
      store_settings: { enabled: true, fields: {} }
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
      
      // Auto-fetch schema if credentials exist
      const p = res.data;
      if (p.config.source.url && p.config.destination.url) {
         fetchSchema(undefined, p);
      }
    } catch (error) {
      console.error('Failed to fetch project', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchema = async (e?: React.MouseEvent, currentProject?: Project) => {
    if (e) e.preventDefault();
    const proj = currentProject || project;
    if (!proj) return;

    setIsFetchingSchema(true);
    setMessage(null);
    try {
      const res = await axios.get(`http://localhost:3001/api/projects/${projectId}/schema`);
      const newSchema = res.data;
      setSchema(newSchema);

      // Merge found fields into project mapping so they persist
      const newProject = { ...proj };
      
      // Ensure mapping structure exists
      if (!newProject.mapping) {
        newProject.mapping = {
          products: { enabled: true, fields: {} },
          customers: { enabled: true, fields: {} },
          orders: { enabled: true, fields: {} },
          posts: { enabled: true, fields: {} },
          pages: { enabled: true, fields: {} },
          categories: { enabled: true, fields: {} },
          shipping_zones: { enabled: true, fields: {} },
          taxes: { enabled: true, fields: {} },
          coupons: { enabled: true, fields: {} },
          store_settings: { enabled: true, fields: {} }
        };
      }

      (['products', 'customers', 'orders', 'posts', 'pages', 'categories', 'shipping_zones', 'taxes', 'coupons', 'store_settings'] as const).forEach(entity => {
        const destFields = newSchema[entity]?.destination || [];
        // Initialize entity mapping if missing
        if (!newProject.mapping![entity]) {
          newProject.mapping![entity] = { enabled: true, fields: {} };
        }
        
        const currentFields = { ...newProject.mapping![entity].fields };
        
        destFields.forEach((field: string) => {
          // Only add if not already present (preserve existing mappings)
          if (currentFields[field] === undefined || currentFields[field] === '') {
             // Smart Auto-Mapping Logic
             const sourceFields = newSchema[entity]?.source || [];
             let mapped = '';
             
             // 1. Direct match (case-insensitive)
             const directMatch = sourceFields.find((sf: string) => sf.toLowerCase() === field.toLowerCase());
             if (directMatch) {
                mapped = directMatch;
             } else {
                 // 2. Fuzzy match (ignore underscores) - handles camelCase/snake_case differences
                 const fuzzyMatch = sourceFields.find((sf: string) => 
                    sf.toLowerCase().replace(/_/g, '') === field.toLowerCase().replace(/_/g, '')
                 );
                 
                 if (fuzzyMatch) {
                     mapped = fuzzyMatch;
                 } else {
                     // 3. Synonyms
                     const synonyms: Record<string, string[]> = {
                         'postcode': ['zip', 'zipcode', 'postal_code'],
                         'zip': ['postcode', 'postal_code'],
                         'state': ['province', 'region'],
                         'province': ['state', 'region'],
                         'rate': ['tax_rate', 'percentage'],
                         'shipping': ['shipping_tax', 'is_shipping'],
                         'discount_type': ['discountType'],
                         'date_expires': ['dateExpires'],
                         'usage_limit': ['usageLimit'],
                         'individual_use': ['individualUse'],
                         'product_ids': ['productIds'],
                         'exclude_product_ids': ['excludedProductIds'], // Map exclude to excluded
                         'usage_limit_per_user': ['usageLimitPerUser'],
                         'minimum_amount': ['minimumAmount'],
                         'maximum_amount': ['maximumAmount'],
                         'free_shipping': ['freeShipping']
                     };
                     
                     const possibleMatches = synonyms[field.toLowerCase()] || [];
                     const synonymMatch = sourceFields.find((sf: string) => possibleMatches.includes(sf.toLowerCase()) || possibleMatches.includes(sf));
                     if (synonymMatch) {
                         mapped = synonymMatch;
                     }
                 }
             }

             // Only set if not already set (or if we want to overwrite empty ones, which we do here for undefined)
             if (currentFields[field] === undefined || currentFields[field] === '') {
                 currentFields[field] = mapped;
             }
          }
        });

        // Cleanup: Remove fields that are no longer in the destination schema (e.g. read-only fields filtered out by backend)
        Object.keys(currentFields).forEach(key => {
            if (!destFields.includes(key)) {
                delete currentFields[key];
            }
        });
        
        newProject.mapping![entity].fields = currentFields;
      });

      setProject(newProject);
      if (e) {
          setMessage({ type: 'success', text: 'Schema loaded and fields updated.' });
      }
    } catch (error: any) {
      console.error('Failed to fetch schema', error);
      // Only show error on manual click, or log it silently on auto-load
      if (e) {
        setMessage({ 
            type: 'error', 
            text: error.response?.data?.message || 'Failed to load schema. Check connections.' 
        });
      }
    } finally {
      setIsFetchingSchema(false);
    }
  };

  const handleSave = async () => {
    if (!project) return;

    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`http://localhost:3001/api/projects/${projectId}`, project);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error: any) {
      console.error('Save failed:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'Failed to save settings.' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center p-12 text-gray-400">Loading settings...</div>;
  if (!project) return <div className="text-center p-12 text-red-400">Project not found</div>;

  return (
    <div>


      <form className="space-y-8 max-w-full" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
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
                  onChange={e => setProject({ ...project, config: { ...project.config, source: { ...project.config.source, url: e.target.value } } })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>
              {project.sourceType === 'shopify' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Access Token</label>
                  <input
                    type="password"
                    value={project.config.source.auth.token || ''}
                    onChange={e => setProject({ ...project, config: { ...project.config, source: { ...project.config.source, auth: { ...project.config.source.auth, token: e.target.value } } } })}
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
                      onChange={e => setProject({ ...project, config: { ...project.config, source: { ...project.config.source, auth: { ...project.config.source.auth, key: e.target.value } } } })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Consumer Secret</label>
                    <input
                      type="password"
                      value={project.config.source.auth.secret || ''}
                      onChange={e => setProject({ ...project, config: { ...project.config, source: { ...project.config.source, auth: { ...project.config.source.auth, secret: e.target.value } } } })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="border-t border-gray-700 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">WordPress API (Optional)</h4>
                    <p className="text-xs text-gray-500 mb-3">Required for migrating Store Settings (Timezone, etc) and ensuring Posts/Pages access.</p>
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-400 mb-1">WP Username / Email</label>
                        <input
                            type="text"
                            value={project.config.source.auth.wpUser || ''}
                            onChange={e => setProject({ ...project, config: { ...project.config, source: { ...project.config.source, auth: { ...project.config.source.auth, wpUser: e.target.value } } } })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                            placeholder="user@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">WP Application Password</label>
                        <input
                            type="password"
                            value={project.config.source.auth.wpAppPassword || ''}
                            onChange={e => setProject({ ...project, config: { ...project.config, source: { ...project.config.source, auth: { ...project.config.source.auth, wpAppPassword: e.target.value } } } })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                            placeholder="xxxx xxxx xxxx xxxx"
                        />
                    </div>
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
                  onChange={e => setProject({ ...project, config: { ...project.config, destination: { ...project.config.destination, url: e.target.value } } })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>
              {project.destType === 'shopify' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Access Token</label>
                  <input
                    type="password"
                    value={project.config.destination.auth.token || ''}
                    onChange={e => setProject({ ...project, config: { ...project.config, destination: { ...project.config.destination, auth: { ...project.config.destination.auth, token: e.target.value } } } })}
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
                      onChange={e => setProject({ ...project, config: { ...project.config, destination: { ...project.config.destination, auth: { ...project.config.destination.auth, key: e.target.value } } } })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Consumer Secret</label>
                    <input
                      type="password"
                      value={project.config.destination.auth.secret || ''}
                      onChange={e => setProject({ ...project, config: { ...project.config, destination: { ...project.config.destination, auth: { ...project.config.destination.auth, secret: e.target.value } } } })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="border-t border-gray-700 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">WordPress API (Optional)</h4>
                    <p className="text-xs text-gray-500 mb-3">Required for migrating Store Settings (Timezone, etc) and ensuring Posts/Pages access.</p>
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-400 mb-1">WP Username / Email</label>
                        <input
                            type="text"
                            value={project.config.destination.auth.wpUser || ''}
                            onChange={e => setProject({ ...project, config: { ...project.config, destination: { ...project.config.destination, auth: { ...project.config.destination.auth, wpUser: e.target.value } } } })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                            placeholder="user@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">WP Application Password</label>
                        <input
                            type="password"
                            value={project.config.destination.auth.wpAppPassword || ''}
                            onChange={e => setProject({ ...project, config: { ...project.config, destination: { ...project.config.destination, auth: { ...project.config.destination.auth, wpAppPassword: e.target.value } } } })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                            placeholder="xxxx xxxx xxxx xxxx"
                        />
                    </div>
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
          <div className="flex gap-2 mb-6 border-b border-gray-700 overflow-x-auto">
            {['products', 'customers', 'orders', 'posts', 'pages', 'categories', 'shipping_zones', 'taxes', 'coupons', 'store_settings'].map((entity) => (
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
                      orders: { enabled: true, fields: {} },
                      posts: { enabled: true, fields: {} },
                      pages: { enabled: true, fields: {} },
                      categories: { enabled: true, fields: {} },
                      shipping_zones: { enabled: true, fields: {} },
                      taxes: { enabled: true, fields: {} },
                      coupons: { enabled: true, fields: {} },
                      store_settings: { enabled: true, fields: {} }
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
                {Object.keys(project.mapping[activeTab].fields).length > 0 ? (
                  Object.entries(project.mapping[activeTab].fields).map(([destField, srcField]) => (
                    <div key={destField} className="flex items-center gap-4 group">
                      <div className="w-1/3">
                         <select
                            value={destField}
                            onChange={(e) => {
                                const newDest = e.target.value;
                                if (newDest && newDest !== destField) {
                                    // 1. Get current fields
                                    const currentFields = { ...project.mapping[activeTab].fields };
                                    const val = currentFields[destField];
                                    
                                    // 2. Remove old key
                                    delete currentFields[destField];
                                    
                                    // 3. Add new key with same value
                                    currentFields[newDest] = val;
                                    
                                    // 4. Update
                                    setProject({
                                        ...project,
                                        mapping: {
                                            ...project.mapping,
                                            [activeTab]: {
                                                ...project.mapping[activeTab],
                                                fields: currentFields
                                            }
                                        }
                                    });
                                }
                            }}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none text-right"
                         >
                            {/* Option for the current field itself to ensure it shows up even if not in schema yet */}
                            <option value={destField}>{destField}</option>
                            {schema[activeTab]?.destination
                                .filter(f => f !== destField) // Avoid duplicates with the current value
                                .map((field: string) => (
                                <option key={field} value={field}>{field}</option>
                            ))}
                         </select>
                      </div>
                      
                      <div className="text-gray-500">←</div>
                      
                      <div className="w-1/2">
                        <select
                          value={srcField}
                          onChange={e => updateMapping(activeTab, destField, e.target.value)}
                          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                          <option value="">(Skip / Default)</option>
                          {schema[activeTab]?.source.map((field: string) => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                            const currentFields = { ...project.mapping[activeTab].fields };
                            delete currentFields[destField];
                            setProject({
                                ...project,
                                mapping: {
                                    ...project.mapping,
                                    [activeTab]: {
                                        ...project.mapping[activeTab],
                                        fields: currentFields
                                    }
                                }
                            })
                        }}
                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove field"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 italic">
                    No fields mapped. Add a field to start.
                  </div>
                )}

                {/* Add Field Row */}
                <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                          const existingKeys = Object.keys(project.mapping[activeTab].fields);
                          // Find first available field that isn't already mapped
                          const availableFields = schema[activeTab]?.destination || [];
                          const nextField = availableFields.find(f => !existingKeys.includes(f)) || 'new_field';
                          
                          updateMapping(activeTab, nextField, '');
                      }}
                      className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1 border border-green-900 bg-green-900/20 px-4 py-2 rounded-lg"
                    >
                      <Plus size={16} />
                      Add Mapping Row
                    </button>
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
