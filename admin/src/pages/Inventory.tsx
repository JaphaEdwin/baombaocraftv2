import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import {
  Search,
  Filter,
  Package,
  AlertTriangle,
  Plus,
  ArrowUpDown,
  Building2,
} from 'lucide-react';

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['materials', { search, category: categoryFilter, lowStock: lowStockOnly, page }],
    queryFn: () =>
      fetcher(
        `/inventory/materials?page=${page}&limit=20${
          categoryFilter ? `&category=${categoryFilter}` : ''
        }${lowStockOnly ? '&lowStock=true' : ''}`
      ),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => fetcher('/inventory/suppliers'),
  });

  const StockBadge = ({ quantity, minStock }: { quantity: number; minStock: number }) => {
    if (quantity <= 0) {
      return <span className="badge badge-error">Out of Stock</span>;
    }
    if (quantity <= minStock) {
      return <span className="badge badge-warning">Low Stock</span>;
    }
    return <span className="badge badge-success">In Stock</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" />
            Record Transaction
          </button>
          <button className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Material
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <Package className="w-10 h-10 text-primary-700" />
            <div>
              <p className="text-2xl font-bold">{data?.totalMaterials || 0}</p>
              <p className="text-sm text-gray-600">Total Materials</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{data?.lowStockCount || 0}</p>
              <p className="text-sm text-gray-600">Low Stock Items</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <Building2 className="w-10 h-10 text-gray-500" />
            <div>
              <p className="text-2xl font-bold">{suppliers?.length || 0}</p>
              <p className="text-sm text-gray-600">Suppliers</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <Package className="w-10 h-10 text-green-600" />
            <div>
              <p className="text-2xl font-bold">
                {data?.totalValue?.toLocaleString() || 0} UGX
              </p>
              <p className="text-sm text-gray-600">Inventory Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input w-40"
            >
              <option value="">All Categories</option>
              <option value="wood">Wood</option>
              <option value="hardware">Hardware</option>
              <option value="finish">Finishes</option>
              <option value="fabric">Fabric</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-700 focus:ring-primary-500"
            />
            <span className="text-sm">Low stock only</span>
          </label>
        </div>
      </div>

      {/* Materials Table */}
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
                  <th className="table-header">Material</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Quantity</th>
                  <th className="table-header">Unit Cost</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.materials?.map((material: any) => (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div>
                        <p className="font-medium">{material.name}</p>
                        <p className="text-sm text-gray-500">{material.sku}</p>
                      </div>
                    </td>
                    <td className="table-cell capitalize">{material.category}</td>
                    <td className="table-cell">
                      {material.quantity} {material.unit}
                    </td>
                    <td className="table-cell">
                      {material.unitCost?.toLocaleString()} UGX
                    </td>
                    <td className="table-cell">
                      <StockBadge
                        quantity={material.quantity}
                        minStock={material.minStockLevel}
                      />
                    </td>
                    <td className="table-cell">
                      <button className="text-sm text-primary-700 hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {!data?.materials?.length && (
                  <tr>
                    <td colSpan={6} className="table-cell text-center text-gray-500">
                      No materials found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
