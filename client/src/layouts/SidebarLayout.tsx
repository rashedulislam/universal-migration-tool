import { LayoutDashboard, Settings, Database, ArrowLeft } from 'lucide-react';
import { NavLink, Outlet, useParams, Link } from 'react-router-dom';

export function SidebarLayout() {
  const { projectId } = useParams();

  return (
    <div className="flex min-h-screen bg-gray-900 text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors text-sm">
            <ArrowLeft size={16} />
            All Projects
          </Link>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
            <Database className="text-blue-400" />
            Migration Tool
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavLink
            to={`/project/${projectId}/dashboard`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>
          
          <NavLink
            to={`/project/${projectId}/settings`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <Settings size={20} />
            Settings
          </NavLink>
        </nav>

        <div className="p-4 border-t border-gray-700 text-xs text-gray-500 text-center">
          v1.0.0 • Universal Migration
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
