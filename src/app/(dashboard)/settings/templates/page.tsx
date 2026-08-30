'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Save,
  CheckCircle2,
  Lock,
  Eye,
  MoveUp,
  MoveDown,
  Layout,
  Loader2,
  Plus,
  Copy,
  Trash2,
  Star,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

export interface InvoiceTemplateData {
  _id: string;
  name: string;
  code: string;
  documentType: 'TAX_INVOICE' | 'PAYMENT_RECEIPT';
  isDefault: boolean;
  version: number;

  headerConfig: {
    layout: 'LOGO_LEFT' | 'LOGO_CENTER' | 'LOGO_RIGHT' | 'DETAILS_ONLY';
    showLogo: boolean;
    showTagline: boolean;
    showPhone: boolean;
    showEmail: boolean;
  };

  fieldVisibility: {
    businessPan: boolean;
    businessCin: boolean;
    businessWebsite: boolean;
    customerPhone: boolean;
    customerEmail: boolean;
    shippingAddress: boolean;
    vehicleNumber: boolean;
    transportMode: boolean;
    eWayBillNumber: boolean;
    bankDetails: boolean;
    paymentQrCode: boolean;
    termsAndConditions: boolean;
    declaration: boolean;
    authorizedSignature: boolean;
    customerSignature: boolean;
  };

  sectionOrder: string[];

  colorTheme: {
    primaryColor: string;
    accentColor: string;
  };

  termsText: string;
  declarationText: string;
}

export default function DocumentTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<InvoiceTemplateData[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplateData | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      const json = await res.json();
      if (json.success) {
        setTemplates(json.templates || []);
      }
    } catch (err) {
      console.error('Failed to load document templates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    if (!newTemplateName.trim()) return;
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTemplateName }),
      });
      const json = await res.json();
      if (json.success) {
        setNewTemplateName('');
        await fetchTemplates();
        setMessage({ type: 'success', text: `Template '${json.data.name}' created successfully!` });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create template' });
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/templates/${selectedTemplate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedTemplate),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedTemplate(json.data);
        await fetchTemplates();
        setMessage({ type: 'success', text: 'Invoice template configuration saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: json.error || 'Failed to save template' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/templates/${id}/default`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await fetchTemplates();
        setMessage({ type: 'success', text: 'Default active template updated successfully!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleClone = async (id: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/templates/${id}/clone`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await fetchTemplates();
        setMessage({ type: 'success', text: 'Template cloned successfully!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        await fetchTemplates();
        setMessage({ type: 'success', text: 'Template deleted successfully.' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: json.error || 'Failed to delete template' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const toggleField = (field: keyof InvoiceTemplateData['fieldVisibility']) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      fieldVisibility: {
        ...selectedTemplate.fieldVisibility,
        [field]: !selectedTemplate.fieldVisibility[field],
      },
    });
  };

  const moveSection = (index: number, direction: 'UP' | 'DOWN') => {
    if (!selectedTemplate) return;
    const newOrder = [...selectedTemplate.sectionOrder];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setSelectedTemplate({ ...selectedTemplate, sectionOrder: newOrder });
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
        <span className="text-xs font-medium">Loading document template engine...</span>
      </div>
    );
  }

  // Template Directory View
  if (!selectedTemplate) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Invoice & Document Templates</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">Manage reusable document layouts, select active defaults, and customize presentation fields.</p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="New Template Name..."
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="text-xs w-52"
            />
            <Button onClick={handleCreate} disabled={creating || !newTemplateName.trim()} size="sm" className="bg-[#2563EB] text-white text-xs gap-1">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Template</span>
            </Button>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-md text-xs flex items-center space-x-2 ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl._id} className={`border ${tpl.isDefault ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E5E7EB] bg-white'} shadow-sm p-4 space-y-3`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#1F2937]">{tpl.name}</h3>
                    {tpl.isDefault && (
                      <span className="bg-[#2563EB] text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <Star className="h-3 w-3 fill-white" /> DEFAULT
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#6B7280] font-mono block mt-0.5">Layout: {tpl.headerConfig.layout.replace('_', ' ')} • v{tpl.version}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between gap-2 text-xs">
                <Button onClick={() => setSelectedTemplate(tpl)} size="sm" variant="outline" className="text-xs h-8">
                  Edit Layout
                </Button>
                <div className="flex items-center gap-1">
                  {!tpl.isDefault && (
                    <Button onClick={() => handleSetDefault(tpl._id)} size="sm" variant="ghost" className="text-xs text-[#2563EB] h-8">
                      Set Default
                    </Button>
                  )}
                  <Button onClick={() => handleClone(tpl._id)} size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Copy className="h-3.5 w-3.5 text-[#6B7280]" />
                  </Button>
                  {!tpl.isDefault && (
                    <Button onClick={() => handleDelete(tpl._id)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Template Editor View
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Editor Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => setSelectedTemplate(null)} size="sm" variant="outline" className="text-xs gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Templates
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Editing: {selectedTemplate.name}</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">Customize presentation fields, header styles, and section ordering.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {message && (
            <span className={`text-xs font-semibold px-3 py-1 rounded border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
              {message.text}
            </span>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs gap-1.5 font-medium">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save Configuration</span>
          </Button>
        </div>
      </div>

      {/* Editor & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-[#E5E7EB] bg-white p-4 space-y-3">
            <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider flex items-center gap-2">
              <Layout className="h-4 w-4 text-[#2563EB]" />
              <span>Header Layout</span>
            </h2>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {(['LOGO_LEFT', 'LOGO_CENTER', 'LOGO_RIGHT', 'DETAILS_ONLY'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setSelectedTemplate({ ...selectedTemplate, headerConfig: { ...selectedTemplate.headerConfig, layout: l } })}
                  className={`p-2.5 rounded border text-left font-medium transition ${
                    selectedTemplate.headerConfig.layout === l
                      ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                      : 'border-[#E5E7EB] bg-white text-[#374151] hover:bg-slate-50'
                  }`}
                >
                  {l.replace('_', ' ')}
                </button>
              ))}
            </div>
          </Card>

          {/* Statutory Lock Information */}
          <Card className="border-[#BFDBFE] bg-[#EFF6FF] p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#1E40AF]">
              <Lock className="h-4 w-4" />
              <span>Rule 46 GST Statutory Lock Protection</span>
            </div>
            <p className="text-[#1E3A8A] leading-relaxed">
              Business Name, GSTIN, Invoice #, Date, HSN/SAC, Place of Supply, Tax Rates, Tax Amounts, and Grand Total are legally required by Rule 46 and cannot be disabled.
            </p>
          </Card>

          {/* Field Visibility Toggles */}
          <Card className="border-[#E5E7EB] bg-white p-4 space-y-3">
            <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#16A34A]" />
              <span>Show / Hide Optional Fields</span>
            </h2>

            <div className="space-y-2 text-xs">
              {[
                { key: 'customerPhone', label: 'Customer Phone Number' },
                { key: 'customerEmail', label: 'Customer Email Address' },
                { key: 'shippingAddress', label: 'Shipping Address Block' },
                { key: 'vehicleNumber', label: 'Vehicle Number' },
                { key: 'transportMode', label: 'Transport Mode' },
                { key: 'eWayBillNumber', label: 'E-Way Bill Number' },
                { key: 'bankDetails', label: 'Bank Account & Payment Details' },
                { key: 'paymentQrCode', label: 'UPI Payment QR Code' },
                { key: 'termsAndConditions', label: 'Terms & Conditions Footer' },
                { key: 'declaration', label: 'Declaration Statement' },
                { key: 'authorizedSignature', label: 'Authorized Signatory Block' },
                { key: 'customerSignature', label: 'Customer Signature Block' },
              ].map((item) => {
                const k = item.key as keyof InvoiceTemplateData['fieldVisibility'];
                const isVisible = selectedTemplate.fieldVisibility[k];
                return (
                  <div key={item.key} className="flex justify-between items-center p-2 rounded hover:bg-slate-50 border border-[#F3F4F6]">
                    <span className="font-medium text-[#374151]">{item.label}</span>
                    <button
                      onClick={() => toggleField(k)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                        isVisible ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {isVisible ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Section Ordering */}
          <Card className="border-[#E5E7EB] bg-white p-4 space-y-3">
            <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">Section Ordering</h2>
            <div className="space-y-1 text-xs">
              {selectedTemplate.sectionOrder.map((sec, idx) => (
                <div key={sec} className="flex items-center justify-between p-2 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                  <span className="font-semibold text-[#374151]">{idx + 1}. {sec.replace('_', ' ')}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveSection(idx, 'UP')} disabled={idx === 0} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30">
                      <MoveUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveSection(idx, 'DOWN')} disabled={idx === selectedTemplate.sectionOrder.length - 1} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30">
                      <MoveDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Live Document Preview Column */}
        <div className="lg:col-span-7">
          <Card className="border-[#E5E7EB] bg-white shadow-md sticky top-6">
            <div className="p-3 bg-[#F9FAFB] border-b border-[#E5E7EB] flex justify-between items-center text-xs">
              <span className="font-bold text-[#1F2937]">Live Document Template Preview ({selectedTemplate.name})</span>
              <span className="text-[10px] text-[#6B7280] font-mono">100% Real-Time Reflection</span>
            </div>

            <CardContent className="p-6 text-xs text-slate-800 space-y-6 font-sans">
              {selectedTemplate.sectionOrder.map((sec) => {
                if (sec === 'HEADER') {
                  return (
                    <div key="HEADER" className="flex justify-between items-start border-b border-slate-200 pb-4">
                      <div className={selectedTemplate.headerConfig.layout === 'LOGO_CENTER' ? 'text-center w-full' : ''}>
                        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">Apex Technologies Pvt Ltd</h1>
                        <p className="text-slate-600">100 Mount Road, Guindy, Chennai, Tamil Nadu - 600032</p>
                        <p className="font-bold text-slate-800 mt-0.5">GSTIN: 33AAAAA0000A1Z5</p>
                        {selectedTemplate.headerConfig.showPhone && <p className="text-slate-500">Phone: +91 98400 99999</p>}
                      </div>
                      {selectedTemplate.headerConfig.layout === 'LOGO_LEFT' && (
                        <div className="text-right">
                          <h2 className="text-base font-bold uppercase text-slate-800">TAX INVOICE</h2>
                          <p className="text-slate-500 font-mono">INV-202627-0001</p>
                        </div>
                      )}
                    </div>
                  );
                }

                if (sec === 'CUSTOMER_DETAILS') {
                  return (
                    <div key="CUSTOMER_DETAILS" className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <span className="font-bold text-slate-500 uppercase text-[10px] block">Bill To Party</span>
                        <h3 className="font-bold text-sm text-slate-900 mt-1">Karnataka Traders Ltd</h3>
                        <p className="text-slate-600">200 Indiranagar, Bengaluru, Karnataka - 560038</p>
                        <p className="font-bold text-slate-800 mt-0.5">GSTIN: 29BBBCB8888B1Z2</p>
                        {selectedTemplate.fieldVisibility.customerPhone && <p className="text-slate-500">Phone: 98800 88888</p>}
                      </div>

                      {selectedTemplate.fieldVisibility.shippingAddress && (
                        <div>
                          <span className="font-bold text-slate-500 uppercase text-[10px] block">Ship To Party</span>
                          <h3 className="font-bold text-sm text-slate-900 mt-1">Karnataka Warehouse</h3>
                          <p className="text-slate-600">Site 4, Peenya Industrial Area, Bengaluru, KA</p>
                        </div>
                      )}
                    </div>
                  );
                }

                if (sec === 'INVOICE_META') {
                  return (
                    <div key="INVOICE_META" className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded text-[11px] font-medium border border-slate-200">
                      <div><span className="text-slate-500 block">Date:</span> 2026-08-25</div>
                      <div><span className="text-slate-500 block">Place of Supply:</span> Karnataka (29)</div>
                      <div><span className="text-slate-500 block">Reverse Charge:</span> NO</div>
                    </div>
                  );
                }

                if (sec === 'ITEM_TABLE') {
                  return (
                    <div key="ITEM_TABLE" className="border border-slate-200 rounded overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-2">Item Description</th>
                            <th className="p-2 text-center">HSN/SAC</th>
                            <th className="p-2 text-center">Qty</th>
                            <th className="p-2 text-right">Rate</th>
                            <th className="p-2 text-right">Taxable</th>
                            <th className="p-2 text-right">IGST 18%</th>
                            <th className="p-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-normal">
                          <tr>
                            <td className="p-2 font-semibold">Cloud Software License</td>
                            <td className="p-2 text-center font-mono">8471</td>
                            <td className="p-2 text-center font-mono">1 PCS</td>
                            <td className="p-2 text-right">₹1,000.00</td>
                            <td className="p-2 text-right font-semibold">₹1,000.00</td>
                            <td className="p-2 text-right text-blue-600">₹180.00</td>
                            <td className="p-2 text-right font-bold">₹1,180.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                }

                if (sec === 'TAX_SUMMARY') {
                  return (
                    <div key="TAX_SUMMARY" className="flex justify-end text-xs">
                      <div className="w-64 space-y-1.5 border-t border-slate-200 pt-2">
                        <div className="flex justify-between"><span>Taxable Value:</span><span className="font-semibold">₹1,000.00</span></div>
                        <div className="flex justify-between text-blue-600"><span>IGST (18%):</span><span className="font-semibold">₹180.00</span></div>
                        <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-bold text-slate-900">
                          <span>Grand Total:</span><span>₹1,180.00</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (sec === 'BANK_DETAILS' && selectedTemplate.fieldVisibility.bankDetails) {
                  return (
                    <div key="BANK_DETAILS" className="p-3 bg-slate-50 rounded border border-slate-200 text-[11px] space-y-1">
                      <span className="font-bold text-slate-700 block uppercase">Bank Account Details:</span>
                      <p>Bank: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234</p>
                    </div>
                  );
                }

                if (sec === 'TERMS' && selectedTemplate.fieldVisibility.termsAndConditions) {
                  return (
                    <div key="TERMS" className="text-[11px] text-slate-600 space-y-1 border-t border-slate-200 pt-3">
                      <span className="font-bold text-slate-700 block uppercase">Terms & Conditions:</span>
                      <p className="whitespace-pre-line">{selectedTemplate.termsText}</p>
                    </div>
                  );
                }

                if (sec === 'SIGNATURE' && selectedTemplate.fieldVisibility.authorizedSignature) {
                  return (
                    <div key="SIGNATURE" className="pt-6 flex justify-between items-end text-xs text-slate-600">
                      <div />
                      <div className="border-t border-slate-400 pt-1 text-center w-48 font-bold text-slate-800">
                        For Apex Technologies Pvt Ltd<br />
                        <span className="font-normal text-[10px] text-slate-500">(Authorized Signatory)</span>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
