import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Circle,
  ImageIcon,
  CreditCard,
} from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetcher(`/projects/${id}`),
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { class: string; icon: any }> = {
      pending: { class: 'badge-warning', icon: Clock },
      in_progress: { class: 'badge-info', icon: Circle },
      completed: { class: 'badge-success', icon: CheckCircle2 },
    };
    const { class: badgeClass, icon: Icon } = config[status] || config.pending;
    return (
      <span className={`badge ${badgeClass} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const MilestoneIcon = ({ status }: { status: string }) => {
    if (status === 'completed') {
      return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    }
    if (status === 'in_progress') {
      return <Circle className="w-6 h-6 text-blue-500 fill-blue-500" />;
    }
    return <Circle className="w-6 h-6 text-gray-300" />;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/projects" className="btn btn-secondary p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project?.title}</h1>
            <p className="text-gray-600">{project?.description}</p>
          </div>
        </div>
        <StatusBadge status={project?.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Overall Progress</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-primary-700 h-4 rounded-full transition-all"
                    style={{ width: `${project?.progress || 0}%` }}
                  />
                </div>
              </div>
              <span className="text-2xl font-bold text-primary-700">
                {project?.progress || 0}%
              </span>
            </div>
          </div>

          {/* Milestones */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Project Milestones</h2>
            <div className="space-y-4">
              {project?.milestones?.map((milestone: any, index: number) => (
                <div
                  key={milestone.id}
                  className={`flex gap-4 p-4 rounded-lg ${
                    milestone.status === 'completed'
                      ? 'bg-green-50'
                      : milestone.status === 'in_progress'
                      ? 'bg-blue-50'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <MilestoneIcon status={milestone.status} />
                    {index < project.milestones.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 mt-2 ${
                          milestone.status === 'completed'
                            ? 'bg-green-300'
                            : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{milestone.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {milestone.description}
                        </p>
                      </div>
                      <StatusBadge status={milestone.status} />
                    </div>
                    {milestone.completedAt && (
                      <p className="text-sm text-gray-500 mt-2">
                        Completed {new Date(milestone.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {!project?.milestones?.length && (
                <p className="text-gray-500 text-center py-4">
                  No milestones defined yet
                </p>
              )}
            </div>
          </div>

          {/* Photos */}
          {project?.photos?.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Progress Photos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {project.photos.map((photo: any, index: number) => (
                  <div
                    key={index}
                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || `Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold">Timeline</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Start Date</span>
                <span>{new Date(project?.startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Target Date</span>
                <span className="font-medium text-primary-700">
                  {new Date(project?.targetDate).toLocaleDateString()}
                </span>
              </div>
              {project?.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed</span>
                  <span className="text-green-600">
                    {new Date(project.completedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Status */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold">Payment</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-semibold">
                  {project?.totalAmount?.toLocaleString()} UGX
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Paid</span>
                <span className="text-green-600">
                  {project?.amountPaid?.toLocaleString()} UGX
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-600">Balance</span>
                <span className="font-semibold text-amber-600">
                  {(
                    (project?.totalAmount || 0) - (project?.amountPaid || 0)
                  ).toLocaleString()}{' '}
                  UGX
                </span>
              </div>
              {(project?.totalAmount || 0) > (project?.amountPaid || 0) && (
                <button className="btn btn-primary w-full mt-2">
                  Make Payment
                </button>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="card">
            <h3 className="font-semibold mb-3">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-3">
              Contact us if you have any questions about your project.
            </p>
            <a
              href="tel:+256700123456"
              className="btn btn-secondary w-full text-center"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
