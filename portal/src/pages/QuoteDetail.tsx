import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher, api } from '@/lib/api';
import {
  ArrowLeft,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  Download,
  Phone,
} from 'lucide-react';
import { useState } from 'react';

export default function QuoteDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showAcceptModal, setShowAcceptModal] = useState(false);

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => fetcher(`/quotations/${id}`),
  });

  const acceptQuote = useMutation({
    mutationFn: () => api.post(`/quotations/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      setShowAcceptModal(false);
    },
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, { class: string; icon: any }> = {
      pending: { class: 'badge-warning', icon: null },
      draft: { class: 'badge-gray', icon: null },
      sent: { class: 'badge-info', icon: null },
      accepted: { class: 'badge-success', icon: CheckCircle2 },
      rejected: { class: 'badge-error', icon: XCircle },
    };
    const config = styles[status] || styles.pending;
    return (
      <span className={`badge ${config.class} flex items-center gap-1`}>
        {config.icon && <config.icon className="w-3 h-3" />}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/quotes" className="btn btn-secondary p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quote?.title}</h1>
            <p className="text-gray-600">Quote #{quote?.quoteNumber}</p>
          </div>
        </div>
        <StatusBadge status={quote?.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quote Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quote Items</h2>
            <div className="space-y-4">
              {quote?.items?.map((item: any, index: number) => (
                <div
                  key={item.id || index}
                  className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.description}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Qty: {item.quantity} • {item.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {item.total?.toLocaleString()} UGX
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.unitPrice?.toLocaleString()} / {item.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{quote?.subtotal?.toLocaleString()} UGX</span>
              </div>
              {quote?.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{quote?.discount?.toLocaleString()} UGX</span>
                </div>
              )}
              {quote?.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (VAT 18%)</span>
                  <span>{quote?.tax?.toLocaleString()} UGX</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{quote?.total?.toLocaleString()} UGX</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote?.notes && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-2">Notes</h2>
              <p className="text-gray-700">{quote.notes}</p>
            </div>
          )}

          {/* Terms */}
          {quote?.terms && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-2">Terms & Conditions</h2>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">
                {quote.terms}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Validity */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold">Quote Validity</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span>{new Date(quote?.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valid Until</span>
                <span className="font-medium text-primary-700">
                  {new Date(quote?.validUntil).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {quote?.status === 'sent' && (
            <div className="card">
              <h3 className="font-semibold mb-4">Ready to proceed?</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowAcceptModal(true)}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Accept Quote
                </button>
                <button className="btn btn-secondary w-full flex items-center justify-center gap-2">
                  <Phone className="w-5 h-5" />
                  Contact Us
                </button>
              </div>
            </div>
          )}

          {/* Download */}
          <div className="card">
            <button className="btn btn-secondary w-full flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Accept Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Accept Quote</h2>
            <p className="text-gray-600 mb-6">
              By accepting this quote, you agree to the terms and a project will
              be created. You'll receive payment instructions shortly.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => acceptQuote.mutate()}
                disabled={acceptQuote.isPending}
                className="btn btn-primary flex-1"
              >
                {acceptQuote.isPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
