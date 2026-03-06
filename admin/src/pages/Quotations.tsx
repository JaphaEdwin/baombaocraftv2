import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetcher } from '@/lib/api';
import { Plus, Search, Filter, FileText, Send, Check, X } from 'lucide-react';

interface Quotation {
  id: string;
  quotationNumber: string;
  status: string;
  total: number;
  createdAt: string;
  customer: {
    name: string;
    email: string;
  };
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    draft: 'badge-gray',
    sent: 'badge-info',
    accepted: 'badge-success',
    rejected: 'badge-error',
    expired: 'badge-warning',
  };

  const icons: Record<string, React.ReactNode> = {
    sent: <Send className="w-3 h-3" />,
    accepted: <Check className="w-3 h-3" />,
    rejected: <X className="w-3 h-3" />,
  };

  return (
    <span className={`badge ${styles[status] || 'badge-gray'} flex items-center gap-1`}>
      {icons[status]}
      {status}
    </span>
  );
};

export default function Quotations() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', { search, status: statusFilter, page }],
    queryFn: () =>
      fetcher(
        `/quotations?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`
      ),
  });

  const formatCurrency = (amount: number) =>
    `UGX ${amount.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
        <Link to="/quotations/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Quotation
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search quotations..."
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
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quotations Table */}
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
                  <th className="table-header">Quote #</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.quotations?.map((quote: Quotation) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <Link
                        to={`/quotations/${quote.id}`}
                        className="flex items-center gap-2 font-medium text-primary-700 hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        {quote.quotationNumber}
                      </Link>
                    </td>
                    <td className="table-cell">
                      <div>
                        <p className="font-medium">{quote.customer.name}</p>
                        <p className="text-sm text-gray-500">{quote.customer.email}</p>
                      </div>
                    </td>
                    <td className="table-cell font-medium">
                      {formatCurrency(quote.total)}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={quote.status} />
                    </td>
                    <td className="table-cell text-gray-500">
                      {new Date(quote.createdAt).toLocaleDateString()}
                    </td>
                    <td className="table-cell">
                      <Link
                        to={`/quotations/${quote.id}`}
                        className="text-sm text-primary-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {!data?.quotations?.length && (
                  <tr>
                    <td colSpan={6} className="table-cell text-center text-gray-500">
                      No quotations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Page {data.pagination.page} of {data.pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.pages}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
