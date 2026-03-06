import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import {
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  FolderKanban,
  BarChart3,
  PieChart,
  Target,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';

export default function Analytics() {
  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => fetcher('/analytics/dashboard'),
  });

  const { data: revenue, isLoading: revLoading } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn: () => fetcher('/analytics/revenue?period=monthly'),
  });

  const { data: quotations } = useQuery({
    queryKey: ['analytics-quotations'],
    queryFn: () => fetcher('/analytics/quotations'),
  });

  const { data: leads } = useQuery({
    queryKey: ['analytics-leads'],
    queryFn: () => fetcher('/analytics/leads'),
  });

  const COLORS = ['#4A3728', '#C8A570', '#8B7355', '#D4B896', '#6B5344'];

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    prefix = '',
    suffix = '',
  }: {
    title: string;
    value: number | string;
    change?: number;
    icon: any;
    prefix?: string;
    suffix?: string;
  }) => (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">
            {prefix}
            {typeof value === 'number' ? value.toLocaleString() : value}
            {suffix}
          </p>
          {change !== undefined && (
            <p
              className={`text-sm mt-1 flex items-center gap-1 ${
                change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${change < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(change)}% vs last month
            </p>
          )}
        </div>
        <div className="p-3 bg-primary-50 rounded-xl">
          <Icon className="w-6 h-6 text-primary-700" />
        </div>
      </div>
    </div>
  );

  if (dashLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <select className="input w-40">
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={dashboard?.totalRevenue || 0}
          change={dashboard?.revenueChange}
          icon={DollarSign}
          suffix=" UGX"
        />
        <StatCard
          title="Total Customers"
          value={dashboard?.totalCustomers || 0}
          change={dashboard?.customerChange}
          icon={Users}
        />
        <StatCard
          title="Conversion Rate"
          value={dashboard?.conversionRate || 0}
          change={dashboard?.conversionChange}
          icon={Target}
          suffix="%"
        />
        <StatCard
          title="Active Projects"
          value={dashboard?.activeProjects || 0}
          icon={FolderKanban}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Revenue Overview</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue?.data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#4A3728" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quotation Conversion */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Quotation Status</h3>
          </div>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={quotations?.byStatus || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {(quotations?.byStatus || []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Lead Sources</h3>
          </div>
          <div className="space-y-3">
            {(leads?.sources || []).map((source: any, index: number) => (
              <div key={source.source} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="flex-1 text-sm">{source.source}</span>
                <span className="font-semibold">{source.count}</span>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${source.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inquiry Trend */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Inquiry Trend</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leads?.trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="inquiries"
                  stroke="#4A3728"
                  strokeWidth={2}
                  dot={{ fill: '#4A3728' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
