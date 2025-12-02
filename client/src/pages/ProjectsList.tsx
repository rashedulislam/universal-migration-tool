import { useEffect, useState } from 'react';
import { Plus, FolderOpen, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Project {
  id: string;
  name: string;
  sourceType: string;
  destType: string;
}

export function ProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [sourceType, setSourceType] = useState('shopify');
  const [destType, setDestType] = useState('woocommerce');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/projects');
      setProjects(res.data);
    } catch (error) {
      console.error('Failed to load projects', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3001/api/projects', {
        name: newProjectName,
        sourceType,
        destType
      });
      setProjects([...projects, res.data]);
      setIsCreating(false);
      setNewProjectName('');
      setSourceType('shopify');
      setDestType('woocommerce');
    } catch (error) {
      console.error('Failed to create project', error);
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await axios.delete(`http://localhost:3001/api/projects/${id}`);
      setProjects(projects.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete project', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              My Projects
            </h1>
            <p className="text-gray-400 mt-2">Manage your migration clients</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={20} />
            New Project
          </button>
        </header>

        {isCreating && (
          <div className="mb-8 bg-gray-800 p-6 rounded-xl border border-gray-700 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-lg font-semibold mb-4">Create New Project</h3>
            <form onSubmit={createProject} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Project Name (e.g. Client A)"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
              />
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">Source Platform</label>
                  <select
                    value={sourceType}
                    onChange={e => setSourceType(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="shopify">Shopify</option>
                    <option value="woocommerce">WooCommerce</option>
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">Destination Platform</label>
                  <select
                    value={destType}
                    onChange={e => setDestType(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="woocommerce">WooCommerce</option>
                    <option value="shopify">Shopify</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-2">
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Project
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading projects...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => navigate(`/project/${project.id}/dashboard`)}
                className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 cursor-pointer transition-all hover:shadow-xl hover:shadow-blue-500/10 group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <FolderOpen size={24} />
                  </div>
                  <button
                    onClick={(e) => deleteProject(project.id, e)}
                    className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">{project.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="capitalize">{project.sourceType}</span>
                  <span>→</span>
                  <span className="capitalize">{project.destType}</span>
                </div>
              </div>
            ))}

            {projects.length === 0 && !isCreating && (
              <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-800 rounded-xl text-gray-500">
                No projects found. Create one to get started.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
