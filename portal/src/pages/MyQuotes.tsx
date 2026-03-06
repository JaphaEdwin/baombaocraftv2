import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { Link } from 'react-router-dom';
import { FileText, Search, Filter } from 'lucide-react';
import { useState } from 'react';

export default function MyQuotes() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-quotes', { search, status: statusFilter }],
    queryFn: () =>
      fetcher(
        `/quotations?${statusFilter ? `status=${statusFilter}&` : ''}`
      ),
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      pending: 'badge-warning',
      draft: 'badge-gray',
      sent: 'badge-info',
      accepted: 'badge-success',
      rejected: 'badge-error',
    };
    return (
      <span className={`badge ${styles[status] || 'badge-gray'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Quotes</h1>
        <p className="text-gray-600">View and manage your quote requests.</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search quotes..."
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
            </select>
          </div>
        </div>
      </div>

      {/* Quotes List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      ) : (
        <div className="space-y-4">
          {data?.quotations?.map((quote: any) => (
            <Link
              key={quote.id}
              to={`/quotes/${quote.id}`}
              className="card hover:shadow-md transition-shadow block"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-50 rounded-lg">
                    <FileText className="w-6 h-6 text-primary-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{quote.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {quote.items?.length || 0} items • Created{' '}
                      {new Date(quote.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:text-right">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {quote.total?.toLocaleString()} UGX
                    </p>
                    <p className="text-sm text-gray-500">
                      Valid until{' '}
                      {new Date(quote.validUntil).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={quote.status} />
                </div>
              </div>
            </Link>
          ))}
          {!data?.quotations?.length && (
            <div className="card text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No quotes yet</h3>
              <p className="text-gray-600 mt-1">
                Request a quote to get started with your project.
              </p>
              <Link to="/request-quote" className="btn btn-primary mt-4">
                Request Quote
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
