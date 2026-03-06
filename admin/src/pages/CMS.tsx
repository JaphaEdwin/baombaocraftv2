import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher, api } from '@/lib/api';
import {
  FileText,
  Star,
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  MoreVertical,
} from 'lucide-react';

type ContentTab = 'blog' | 'testimonials' | 'case-studies';

export default function CMS() {
  const [activeTab, setActiveTab] = useState<ContentTab>('blog');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const tabs = [
    { id: 'blog', label: 'Blog Posts', icon: FileText },
    { id: 'testimonials', label: 'Testimonials', icon: Star },
    { id: 'case-studies', label: 'Case Studies', icon: BookOpen },
  ] as const;

  const { data: blogPosts, isLoading: blogLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: () => fetcher('/cms/blog'),
    enabled: activeTab === 'blog',
  });

  const { data: testimonials, isLoading: testimonialsLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: () => fetcher('/cms/testimonials'),
    enabled: activeTab === 'testimonials',
  });

  const { data: caseStudies, isLoading: caseStudiesLoading } = useQuery({
    queryKey: ['case-studies'],
    queryFn: () => fetcher('/cms/case-studies'),
    enabled: activeTab === 'case-studies',
  });

  const deleteItem = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) =>
      api.delete(`/cms/${type}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [activeTab] });
    },
  });

  const StatusBadge = ({ published }: { published: boolean }) => (
    <span className={`badge ${published ? 'badge-success' : 'badge-gray'}`}>
      {published ? 'Published' : 'Draft'}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add {activeTab === 'blog' ? 'Post' : activeTab === 'testimonials' ? 'Testimonial' : 'Case Study'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-700 text-primary-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab.replace('-', ' ')}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Blog Posts */}
      {activeTab === 'blog' && (
        <div className="card p-0 overflow-hidden">
          {blogLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header">Title</th>
                    <th className="table-header">Category</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {blogPosts?.posts?.map((post: any) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium">{post.title}</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs">
                            {post.excerpt}
                          </p>
                        </div>
                      </td>
                      <td className="table-cell">{post.category}</td>
                      <td className="table-cell">
                        <StatusBadge published={post.published} />
                      </td>
                      <td className="table-cell text-sm text-gray-600">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Edit className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => deleteItem.mutate({ type: 'blog', id: post.id })}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!blogPosts?.posts?.length && (
                    <tr>
                      <td colSpan={5} className="table-cell text-center text-gray-500">
                        No blog posts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Testimonials */}
      {activeTab === 'testimonials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testimonialsLoading ? (
            <div className="col-span-full flex items-center justify-center h-64">
              <div className="spinner" />
            </div>
          ) : (
            <>
              {testimonials?.testimonials?.map((testimonial: any) => (
                <div key={testimonial.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-lg font-semibold">
                        {testimonial.clientName?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold">{testimonial.clientName}</h4>
                        <p className="text-sm text-gray-600">{testimonial.clientTitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge published={testimonial.featured} />
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < testimonial.rating
                            ? 'text-amber-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <blockquote className="mt-3 text-gray-700 italic">
                    "{testimonial.content}"
                  </blockquote>
                  <p className="text-sm text-gray-500 mt-2">{testimonial.projectType}</p>
                </div>
              ))}
              {!testimonials?.testimonials?.length && (
                <div className="col-span-full card text-center text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No testimonials found</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Case Studies */}
      {activeTab === 'case-studies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {caseStudiesLoading ? (
            <div className="col-span-full flex items-center justify-center h-64">
              <div className="spinner" />
            </div>
          ) : (
            <>
              {caseStudies?.caseStudies?.map((study: any) => (
                <div key={study.id} className="card">
                  {study.images?.[0] && (
                    <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden">
                      <img
                        src={study.images[0]}
                        alt={study.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{study.title}</h4>
                      <p className="text-sm text-gray-600">{study.clientName}</p>
                    </div>
                    <StatusBadge published={study.published} />
                  </div>
                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                    {study.challenge}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <button className="btn btn-secondary btn-sm flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    <button className="btn btn-secondary btn-sm flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
              {!caseStudies?.caseStudies?.length && (
                <div className="col-span-full card text-center text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No case studies found</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
