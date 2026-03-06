import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import {
  TrendingUp,
  Users,
  FolderKanban,
  FileText,
  AlertCircle,
  Package,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardStats {
  overview: {
    totalCustomers: number;
    newCustomersThisMonth: number;
    activeProjects: number;
    pendingQuotes: number;
    pendingInquiries: number;
    lowStockCount: number;
  };
  revenue: {
    last30Days: number;
    transactionCount: number;
  };
  quotes: {
    total: number;
    accepted: number;
    conversionRate: string;
  };
  recentProjects: Array<{
    id: string;
    title: string;
    status: string;
    updatedAt: string;
    customer: { name: string };
  }>;
}

const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  changeType,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  change?: string;
  changeType?: 'positive' | 'negative';
}) => (
  <div className="stat-card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <p
            className={`text-sm flex items-center gap-1 mt-1 ${
              changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {changeType === 'positive' ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {change}
          </p>
        )}
      </div>
      <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary-700" />
      </div>
    </div>
  </div>
);

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

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => fetcher('/analytics/dashboard'),
  });

  const { data: revenueData } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: () => fetcher('/analytics/revenue?period=month'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `UGX ${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `UGX ${(amount / 1000).toFixed(0)}K`;
    }
    return `UGX ${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-UG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenue (30 days)"
          value={formatCurrency(stats?.revenue.last30Days || 0)}
          icon={TrendingUp}
        />
        <StatCard
          title="Active Projects"
          value={stats?.overview.activeProjects || 0}
          icon={FolderKanban}
        />
        <StatCard
          title="Pending Quotes"
          value={stats?.overview.pendingQuotes || 0}
          icon={FileText}
        />
        <StatCard
          title="Total Customers"
          value={stats?.overview.totalCustomers || 0}
          icon={Users}
          change={`+${stats?.overview.newCustomersThisMonth || 0} this month`}
          changeType="positive"
        />
      </div>

      {/* Alerts */}
      {(stats?.overview.pendingInquiries || 0) > 0 ||
      (stats?.overview.lowStockCount || 0) > 0 ? (
        <div className="flex flex-wrap gap-4">
          {(stats?.overview.pendingInquiries || 0) > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              <span>
                {stats?.overview.pendingInquiries} pending inquiries need attention
              </span>
            </div>
          )}
          {(stats?.overview.lowStockCount || 0) > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <Package className="w-5 h-5" />
              <span>
                {stats?.overview.lowStockCount} materials low in stock
              </span>
            </div>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Trend
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-UG', { day: 'numeric' })
                  }
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    value >= 1000000
                      ? `${(value / 1000000).toFixed(1)}M`
                      : `${(value / 1000).toFixed(0)}K`
                  }
                />
                <Tooltip
                  formatter={(value: number) => [
                    `UGX ${value.toLocaleString()}`,
                    'Revenue',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#8B4513"
                  strokeWidth={2}
                  dot={{ fill: '#8B4513' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quote Conversion */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quotation Performance
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Quotes</span>
              <span className="font-semibold">{stats?.quotes.total || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Accepted</span>
              <span className="font-semibold text-green-600">
                {stats?.quotes.accepted || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Conversion Rate</span>
              <span className="font-semibold text-primary-700">
                {stats?.quotes.conversionRate || '0%'}
              </span>
            </div>
            <div className="pt-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary-700 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: stats?.quotes.conversionRate || '0%',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Projects
          </h2>
          <a href="/projects" className="text-sm text-primary-700 hover:underline">
            View all
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">Project</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Status</th>
                <th className="table-header">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats?.recentProjects?.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{project.title}</td>
                  <td className="table-cell text-gray-600">
                    {project.customer.name}
                  </td>
                  <td className="table-cell">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="table-cell text-gray-500">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {!stats?.recentProjects?.length && (
                <tr>
                  <td colSpan={4} className="table-cell text-center text-gray-500">
                    No recent projects
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
