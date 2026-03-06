import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetcher } from '@/lib/api';
import { Search, Filter, FolderKanban } from 'lucide-react';

export default function Projects() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, status: statusFilter, page }],
    queryFn: () =>
      fetcher(
        `/projects?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`
      ),
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      pending: 'badge-warning',
      in_progress: 'badge-info',
      completed: 'badge-success',
      on_hold: 'badge-gray',
      cancelled: 'badge-error',
    };
    return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status.replace('_', ' ')}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-40"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Project</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Progress</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.projects?.map((project: any) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <Link
                        to={`/projects/${project.id}`}
                        className="flex items-center gap-2 font-medium text-primary-700 hover:underline"
                      >
                        <FolderKanban className="w-4 h-4" />
                        {project.title}
                      </Link>
                    </td>
                    <td className="table-cell">{project.customer?.name}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-700 h-2 rounded-full"
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{project.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="table-cell">
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-sm text-primary-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {!data?.projects?.length && (
                  <tr>
                    <td colSpan={5} className="table-cell text-center text-gray-500">
                      No projects found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
