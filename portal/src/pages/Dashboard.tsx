import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  FileText,
  FolderKanban,
  Clock,
  CheckCircle2,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: () => fetcher('/users/dashboard'),
  });

  const { data: recentQuotes } = useQuery({
    queryKey: ['recent-quotes'],
    queryFn: () => fetcher('/quotations?limit=3'),
  });

  const { data: activeProjects } = useQuery({
    queryKey: ['active-projects'],
    queryFn: () => fetcher('/projects?status=in_progress&limit=3'),
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      pending: 'badge-warning',
      draft: 'badge-gray',
      sent: 'badge-info',
      accepted: 'badge-success',
      rejected: 'badge-error',
      in_progress: 'badge-info',
      completed: 'badge-success',
    };
    return (
      <span className={`badge ${styles[status] || 'badge-gray'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with your projects.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <FileText className="w-6 h-6 text-primary-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalQuotes || 0}</p>
              <p className="text-sm text-gray-600">Total Quotes</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.pendingQuotes || 0}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FolderKanban className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.activeProjects || 0}</p>
              <p className="text-sm text-gray-600">Active Projects</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.completedProjects || 0}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action */}
      <div className="card bg-gradient-to-r from-primary-700 to-primary-800 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Ready for a new project?</h2>
            <p className="text-primary-100 mt-1">
              Request a quote for your custom furniture needs.
            </p>
          </div>
          <Link
            to="/request-quote"
            className="btn bg-white text-primary-700 hover:bg-primary-50 flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            Request Quote
          </Link>
        </div>
      </div>

      {/* Recent Quotes & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Quotes</h2>
            <Link
              to="/quotes"
              className="text-sm text-primary-700 hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentQuotes?.quotations?.map((quote: any) => (
              <Link
                key={quote.id}
                to={`/quotes/${quote.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium">{quote.title}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(quote.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={quote.status} />
              </Link>
            ))}
            {!recentQuotes?.quotations?.length && (
              <p className="text-gray-500 text-center py-4">No quotes yet</p>
            )}
          </div>
        </div>

        {/* Active Projects */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Active Projects</h2>
            <Link
              to="/projects"
              className="text-sm text-primary-700 hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {activeProjects?.projects?.map((project: any) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{project.title}</p>
                  <span className="text-sm text-gray-600">
                    {project.progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-700 h-2 rounded-full transition-all"
                    style={{ width: `${project.progress || 0}%` }}
                  />
                </div>
              </Link>
            ))}
            {!activeProjects?.projects?.length && (
              <p className="text-gray-500 text-center py-4">No active projects</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
