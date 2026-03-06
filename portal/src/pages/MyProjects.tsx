import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { Link } from 'react-router-dom';
import { FolderKanban, ArrowRight } from 'lucide-react';

export default function MyProjects() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-projects'],
    queryFn: () => fetcher('/projects'),
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      pending: 'badge-warning',
      in_progress: 'badge-info',
      completed: 'badge-success',
      on_hold: 'badge-gray',
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
        <p className="text-gray-600">Track progress on your active projects.</p>
      </div>

      {data?.projects?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.projects.map((project: any) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary-50 rounded-lg">
                    <FolderKanban className="w-6 h-6 text-primary-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.title}</h3>
                    <p className="text-sm text-gray-600">
                      Started {new Date(project.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <StatusBadge status={project.status} />
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{project.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-700 h-2 rounded-full transition-all"
                    style={{ width: `${project.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Milestones summary */}
              {project.milestones?.length > 0 && (
                <div className="text-sm text-gray-600 mb-4">
                  {project.milestones.filter((m: any) => m.status === 'completed').length} of{' '}
                  {project.milestones.length} milestones completed
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  Target: {new Date(project.targetDate).toLocaleDateString()}
                </span>
                <span className="text-primary-700 flex items-center gap-1 text-sm font-medium">
                  View Details
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No projects yet</h3>
          <p className="text-gray-600 mt-1">
            Projects are created when you accept a quote.
          </p>
          <Link to="/request-quote" className="btn btn-primary mt-4">
            Request Quote
          </Link>
        </div>
      )}
    </div>
  );
}
