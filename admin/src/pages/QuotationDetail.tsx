import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';

export default function QuotationDetail() {
  const { id } = useParams();

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => fetcher(`/quotations/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Quotation {quotation?.quotationNumber}
      </h1>
      <div className="card">
        <p className="text-gray-600">Quotation detail page - Under construction</p>
        <pre className="mt-4 p-4 bg-gray-50 rounded-lg text-sm overflow-auto">
          {JSON.stringify(quotation, null, 2)}
        </pre>
      </div>
    </div>
  );
}
