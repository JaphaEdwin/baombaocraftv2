import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Send,
  Upload,
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
} from 'lucide-react';

type Step = 1 | 2 | 3;

export default function RequestQuote() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    category: '',
    items: '',
    description: '',
    budget: '',
    timeline: '',
    referenceImages: [] as string[],
    contactPhone: '',
    deliveryAddress: '',
    preferredContact: 'email',
  });

  const categories = [
    { id: 'doors', label: 'Doors', description: 'Custom wooden doors and frames' },
    { id: 'furniture', label: 'Furniture', description: 'Tables, chairs, cabinets, beds' },
    { id: 'kitchen', label: 'Kitchen', description: 'Kitchen cabinets and counters' },
    { id: 'interior', label: 'Interior', description: 'Wall panels, ceilings, moldings' },
    { id: 'commercial', label: 'Commercial', description: 'Office and retail fixtures' },
    { id: 'other', label: 'Other', description: 'Custom woodwork projects' },
  ];

  const timelines = [
    { id: 'urgent', label: 'Urgent (1-2 weeks)' },
    { id: 'standard', label: 'Standard (3-4 weeks)' },
    { id: 'flexible', label: 'Flexible (1-2 months)' },
    { id: 'no-rush', label: 'No rush (3+ months)' },
  ];

  const submitInquiry = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/inquiries', {
        ...data,
        source: 'portal',
      }),
    onSuccess: () => {
      navigate('/quotes');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to submit request');
    },
  });

  const handleNext = () => {
    if (step === 1 && !form.category) {
      setError('Please select a category');
      return;
    }
    if (step === 2 && !form.description) {
      setError('Please describe your project');
      return;
    }
    setError('');
    setStep((s) => Math.min(3, s + 1) as Step);
  };

  const handleBack = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1) as Step);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitInquiry.mutate(form);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Request a Quote</h1>
        <p className="text-gray-600 mt-1">
          Tell us about your project and we'll get back to you with a quote.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                step >= s
                  ? 'bg-primary-700 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Category</span>
          <span>Details</span>
          <span>Contact</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-6 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        {/* Step 1: Category */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">What type of project?</h2>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.id })}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    form.category === cat.id
                      ? 'border-primary-700 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold">{cat.label}</p>
                  <p className="text-sm text-gray-600">{cat.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Project Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What items do you need?
              </label>
              <input
                type="text"
                value={form.items}
                onChange={(e) => setForm({ ...form, items: e.target.value })}
                className="input"
                placeholder="e.g., 2 wardrobes, 1 dining table, 6 chairs"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe your project
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input"
                rows={4}
                placeholder="Tell us about your vision, preferred wood types, dimensions, style, etc."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Range (UGX)
              </label>
              <select
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="input"
              >
                <option value="">Select a budget range</option>
                <option value="under-500k">Under 500,000</option>
                <option value="500k-1m">500,000 - 1,000,000</option>
                <option value="1m-3m">1,000,000 - 3,000,000</option>
                <option value="3m-5m">3,000,000 - 5,000,000</option>
                <option value="5m-10m">5,000,000 - 10,000,000</option>
                <option value="above-10m">Above 10,000,000</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeline
              </label>
              <div className="grid grid-cols-2 gap-2">
                {timelines.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm({ ...form, timeline: t.id })}
                    className={`p-3 rounded-lg border-2 text-sm ${
                      form.timeline === t.id
                        ? 'border-primary-700 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Images (optional)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    <label className="cursor-pointer text-primary-700 hover:underline">
                      Upload images
                      <input type="file" className="sr-only" multiple accept="image/*" />
                    </label>
                    {' '}or drag and drop
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG up to 5MB each</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Contact */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Contact Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="input"
                placeholder="+256 700 123 456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address
              </label>
              <textarea
                value={form.deliveryAddress}
                onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                className="input"
                rows={2}
                placeholder="Where should we deliver?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Contact Method
              </label>
              <div className="flex gap-4">
                {['email', 'phone', 'whatsapp'].map((method) => (
                  <label key={method} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="preferredContact"
                      value={method}
                      checked={form.preferredContact === method}
                      onChange={(e) =>
                        setForm({ ...form, preferredContact: e.target.value })
                      }
                      className="w-4 h-4 text-primary-700 focus:ring-primary-500"
                    />
                    <span className="capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Request Summary</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Category:</dt>
                  <dd className="capitalize">{form.category}</dd>
                </div>
                {form.budget && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Budget:</dt>
                    <dd>{form.budget.replace('-', ' - ')}</dd>
                  </div>
                )}
                {form.timeline && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Timeline:</dt>
                    <dd className="capitalize">{form.timeline.replace('-', ' ')}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="btn btn-secondary flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn btn-primary flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitInquiry.isPending}
              className="btn btn-primary flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {submitInquiry.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
