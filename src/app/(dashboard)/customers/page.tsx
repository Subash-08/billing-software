'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye, Edit, Loader2, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import { paiseToRupees } from '@/lib/money';

interface CustomerItem {
  _id: string;
  displayName: string;
  legalName?: string;
  phone: string;
  email?: string;
  gstTreatment: string;
  gstin?: string;
  stateCode: string;
  billingAddress: {
    city: string;
    state: string;
  };
  creditBalance: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export default function CustomersListPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [gstFilter, setGstFilter] = useState<string>('');
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (gstFilter) params.set('gstTreatment', gstFilter);
      params.set('page', page.toString());
      params.set('limit', '10');

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.customers) {
        setCustomers(data.customers);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalRecords(data.pagination.total || 0);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, gstFilter, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDeactivate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to deactivate this customer?')) return;

    setDeactivatingId(id);
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCustomers();
      }
    } catch {
      // Error
    } finally {
      setDeactivatingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Customer Directory</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Manage B2B and retail customer tax profiles, GSTIN registrations, and addresses.</p>
        </div>
        <Link href="/customers/new">
          <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-3.5 py-1.5 gap-1.5 rounded shadow-none">
            <Plus className="h-3.5 w-3.5" />
            <span>+ New Customer</span>
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-[#E5E7EB] shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, GSTIN, phone..."
              className="pl-8 text-xs bg-[#F9FAFB]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="ACTIVE">Status: Active</option>
              <option value="INACTIVE">Status: Inactive</option>
              <option value="">All Statuses</option>
            </select>

            <select
              value={gstFilter}
              onChange={(e) => {
                setGstFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="">All GST Treatments</option>
              <option value="REGISTERED">Registered B2B</option>
              <option value="COMPOSITION">Composition</option>
              <option value="UNREGISTERED">Unregistered B2C</option>
              <option value="SEZ">SEZ Unit</option>
              <option value="EXPORT">Export</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Customer Directory Table */}
      <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
              <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
              <span className="text-xs font-medium">Loading customer directory...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#6B7280] space-y-2">
              <p>No customers found matching the criteria.</p>
              <Link href="/customers/new" className="text-[#2563EB] font-medium hover:underline inline-block">
                + Create your first customer
              </Link>
            </div>
          ) : (
            <>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9FAFB] text-[#6B7280] uppercase tracking-wider font-semibold border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-5 py-3">Customer Name</th>
                    <th className="px-5 py-3">GSTIN / Treatment</th>
                    <th className="px-5 py-3">City / State</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3 text-right">Available Credit</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] font-normal text-[#1F2937]">
                  {customers.map((cust) => (
                    <tr key={cust._id} className="hover:bg-[#F9FAFB]">
                      <td className="px-5 py-3.5">
                        <Link href={`/customers/${cust._id}`} className="font-semibold text-[#1F2937] hover:text-[#2563EB]">
                          {cust.displayName}
                        </Link>
                        {cust.legalName && cust.legalName !== cust.displayName && (
                          <div className="text-[11px] text-[#6B7280]">{cust.legalName}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {cust.gstin ? (
                          <span className="font-mono text-[#374151] px-2 py-0.5 rounded bg-[#F3F4F6] border border-[#E5E7EB]">
                            {cust.gstin}
                          </span>
                        ) : (
                          <span className="text-[#6B7280]">{cust.gstTreatment}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[#374151]">
                        {cust.billingAddress?.city || '—'}, {cust.billingAddress?.state || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-[#374151]">{cust.phone}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-[#16A34A] tabular-nums">
                        ₹{paiseToRupees(cust.creditBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            cust.status === 'ACTIVE'
                              ? 'bg-[#F0FDF4] text-[#166534] border border-[#86EFAC]'
                              : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                          }`}
                        >
                          {cust.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1">
                        <Link href={`/customers/${cust._id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#6B7280] hover:text-[#1F2937]" title="View Customer">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/customers/${cust._id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#2563EB] hover:bg-[#EFF6FF]" title="Edit Customer">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        {cust.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeactivate(cust._id, e)}
                            disabled={deactivatingId === cust._id}
                            className="h-7 w-7 text-[#DC2626] hover:bg-[#FEF2F2]"
                            title="Deactivate customer"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Bar */}
              <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between text-xs text-[#6B7280]">
                <span>Showing {customers.length} of {totalRecords} customers</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2 text-xs"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </Button>
                  <span className="font-semibold text-[#1F2937]">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2 text-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
