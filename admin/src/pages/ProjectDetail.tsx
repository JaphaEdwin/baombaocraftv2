import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher, api } from '@/lib/api';
import { ArrowLeft, Calendar, User, CheckCircle2, Clock, AlertCircle, Plus } from 'lucide-react';
import { useState } from 'react';

export default function ProjectDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetcher(`/projects/${id}`),
  });

  const updateMilestone = useMutation({
    mutationFn: ({ milestoneId, status }: { milestoneId: string; status: string }) =>
      api.patch(`/projects/milestones/${milestoneId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', id] }),
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { class: string; icon: any }> = {
      pending: { class: 'badge-warning', icon: Clock },
      in_progress: { class: 'badge-info', icon: AlertCircle },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/projects" className="btn btn-secondary p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project?.title}</h1>
          <p className="text-gray-600">{project?.description}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={project?.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Info */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Project Details</h3>
          <dl className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <dt className="text-gray-600">Customer:</dt>
              <dd className="font-medium">{project?.customer?.name}</dd>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <dt className="text-gray-600">Start:</dt>
              <dd className="font-medium">
                {project?.startDate && new Date(project.startDate).toLocaleDateString()}
              </dd>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <dt className="text-gray-600">Target:</dt>
              <dd className="font-medium">
                {project?.targetDate && new Date(project.targetDate).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>

        {/* Progress */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Progress</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-700">{project?.progress || 0}%</div>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
              <div
                className="bg-primary-700 h-3 rounded-full transition-all"
                style={{ width: `${project?.progress || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button className="btn btn-primary w-full">Update Status</button>
            <button className="btn btn-secondary w-full">Add Photos</button>
            <button className="btn btn-secondary w-full">Send Update</button>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Milestones</h3>
          <button
            onClick={() => setShowMilestoneForm(true)}
            className="btn btn-primary btn-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Milestone
          </button>
        </div>

        <div className="space-y-4">
          {project?.milestones?.map((milestone: any, index: number) => (
            <div
              key={milestone.id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-700 rounded-full font-semibold">
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{milestone.title}</h4>
                <p className="text-sm text-gray-600">{milestone.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={milestone.status} />
                {milestone.status !== 'completed' && (
                  <button
                    onClick={() =>
                      updateMilestone.mutate({
                        milestoneId: milestone.id,
                        status: 'completed',
                      })
                    }
                    className="text-sm text-primary-700 hover:underline"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))}
          {!project?.milestones?.length && (
            <p className="text-gray-500 text-center py-4">No milestones yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
