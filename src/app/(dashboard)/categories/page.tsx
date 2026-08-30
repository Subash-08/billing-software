'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, RefreshCw, Loader2, Tags, CheckCircle2, Search, FolderTree } from 'lucide-react';
import { Toast } from '@/components/ui/toast';

interface ICategory {
  _id: string;
  name: string;
  type: 'PRODUCT' | 'SERVICE' | 'BOTH';
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'BOTH' as 'PRODUCT' | 'SERVICE' | 'BOTH',
    description: '',
  });

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Category name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create category');

      setToast(`Category "${formData.name}" created successfully!`);
      setModalOpen(false);
      setFormData({ name: '', type: 'BOTH', description: '' });
      loadCategories();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || c.type === typeFilter || c.type === 'BOTH';
    return matchesSearch && matchesType;
  });

  const productCatsCount = categories.filter((c) => c.type === 'PRODUCT' || c.type === 'BOTH').length;
  const serviceCatsCount = categories.filter((c) => c.type === 'SERVICE' || c.type === 'BOTH').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-xs">
      {toast && <Toast type="success" message={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Product & Service Categories</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize catalog items, inventory items, and service offerings into logical category groups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCategories} className="gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white gap-2 font-semibold text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Create Category</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Active Categories</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{categories.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Catalog classification groups</span>
        </Card>

        <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Product Categories</span>
          <p className="text-xl font-extrabold text-blue-700 mt-1">{productCatsCount}</p>
          <span className="text-[11px] text-blue-600 font-medium mt-0.5 block">Goods & inventory items</span>
        </Card>

        <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Service Categories</span>
          <p className="text-xl font-extrabold text-indigo-700 mt-1">{serviceCatsCount}</p>
          <span className="text-[11px] text-indigo-600 font-medium mt-0.5 block">Billable services & labor</span>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Category Name..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-none w-full sm:w-48"
          >
            <option value="">Category Type: All</option>
            <option value="PRODUCT">Products Only</option>
            <option value="SERVICE">Services Only</option>
            <option value="BOTH">Both Products & Services</option>
          </select>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
              <span className="text-xs font-medium">Loading catalog categories...</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No categories found. Click <strong>"Create Category"</strong> to add your first classification group.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Category Name</th>
                  <th className="px-5 py-3.5">Applicability Type</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCategories.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold text-slate-900 font-sans flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-slate-500" />
                      <span>{c.name}</span>
                    </td>
                    <td className="px-5 py-4">
                      {c.type === 'BOTH' ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Both Products & Services</Badge>
                      ) : c.type === 'PRODUCT' ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Products</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Services</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{c.description || 'No description provided.'}</td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant="success">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Create New Category</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">Category Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g. Electronics, Hardware, IT Consulting"
                  className="text-xs font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">Applies To *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-medium"
                >
                  <option value="BOTH">Both Products & Services</option>
                  <option value="PRODUCT">Products Only (Goods)</option>
                  <option value="SERVICE">Services Only (Labor / SAC)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">Description (Optional)</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of items in this category"
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="text-xs">Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-slate-900 text-white font-bold text-xs">
                  {submitting ? 'Saving...' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
