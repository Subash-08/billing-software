'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Clock, FileText, Loader2, RefreshCw } from 'lucide-react';

interface AuditItem {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      const json = await res.json();
      if (json.success) {
        setLogs(json.items || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Operational Audit Log</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Append-only security and financial transaction log enforcing complete accountability.</p>
        </div>

        <Button onClick={fetchLogs} size="sm" variant="outline" className="text-xs gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Log
        </Button>
      </div>

      <Card className="border-[#E5E7EB] bg-white shadow-sm">
        <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
          <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#2563EB]" />
            <span>Immutable Business Activity Log</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
              <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
              <span className="text-xs font-medium">Loading audit history...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#6B7280]">No operational activity recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F9FAFB] text-[#4B5563] font-semibold border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">Resource</th>
                    <th className="px-6 py-3">Resource ID</th>
                    <th className="px-6 py-3">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-slate-800 font-semibold">{log.resource}</td>
                      <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">{log.resourceId}</td>
                      <td className="px-6 py-3.5 text-[11px] font-mono text-slate-600">
                        {JSON.stringify(log.metadata || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
