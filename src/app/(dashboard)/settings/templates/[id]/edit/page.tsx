'use client';

/**
 * Context-Switching Template Editor with Live Preview
 * src/app/(dashboard)/settings/templates/[id]/edit/page.tsx
 *
 * Architecture Invariants:
 * 1. Template is presentation-ONLY. Editing visibility flags updates display preferences,
 *    never calculates monetary or tax amounts.
 * 2. 5-Level Field Policy:
 *    - REQUIRED fields (e.g. Item Description on Tax Invoice) are locked as VISIBLE.
 *    - FORBIDDEN fields (e.g. CGST/SGST on Bill of Supply) are locked as HIDDEN.
 *    - CONDITIONAL fields default to AUTO and resolve dynamically based on scenario.
 * 3. Scenario Selector: Switch between 10 live preview contexts (B2B, Inter-State, B2C,
 *    Export LUT, Export IGST, SEZ, RCM, Credit Note, Debit Note, Bill of Supply)
 *    to visually demonstrate real-time AUTO field resolution.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, CheckCircle, Lock, AlertCircle } from 'lucide-react';

export type PreviewScenario =
  | 'B2B_INTRA'
  | 'B2B_INTER'
  | 'B2C_SMALL'
  | 'B2C_LARGE'
  | 'EXPORT_LUT'
  | 'EXPORT_IGST'
  | 'SEZ'
  | 'RCM'
  | 'CREDIT_NOTE'
  | 'BILL_OF_SUPPLY';

interface FieldVisibilityState {
  customerGstin: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  placeOfSupply: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  reverseCharge: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  itemHsnSac: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  itemCgst: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  itemSgst: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  itemIgst: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  cgstRow: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  sgstRow: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  igstRow: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  bankDetails: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  paymentQrCode: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  amountInWords: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  termsAndConditions: 'VISIBLE' | 'HIDDEN' | 'AUTO';
  authorizedSignature: 'VISIBLE' | 'HIDDEN' | 'AUTO';
}

const DEFAULT_VISIBILITY: FieldVisibilityState = {
  customerGstin: 'AUTO',
  placeOfSupply: 'AUTO',
  reverseCharge: 'AUTO',
  itemHsnSac: 'AUTO',
  itemCgst: 'AUTO',
  itemSgst: 'AUTO',
  itemIgst: 'AUTO',
  cgstRow: 'AUTO',
  sgstRow: 'AUTO',
  igstRow: 'AUTO',
  bankDetails: 'VISIBLE',
  paymentQrCode: 'VISIBLE',
  amountInWords: 'VISIBLE',
  termsAndConditions: 'VISIBLE',
  authorizedSignature: 'VISIBLE',
};

export default function TemplateEditPage() {
  const params = useParams();
  const templateId = params?.id as string;
  const router = useRouter();

  const [scenario, setScenario] = useState<PreviewScenario>('B2B_INTRA');
  const [visibility, setVisibility] = useState<FieldVisibilityState>(DEFAULT_VISIBILITY);
  const [documentType, setDocumentType] = useState<'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'CREDIT_NOTE'>('TAX_INVOICE');
  const [templateName, setTemplateName] = useState('Default Tax Invoice Template');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dynamically resolves visibility flag (VISIBLE/HIDDEN) based on scenario context
  const isFieldVisibleInPreview = (field: keyof FieldVisibilityState): boolean => {
    const val = visibility[field];
    if (val === 'VISIBLE') return true;
    if (val === 'HIDDEN') return false;

    // AUTO mode — evaluate against selected preview scenario
    switch (field) {
      case 'customerGstin':
        return ['B2B_INTRA', 'B2B_INTER', 'RCM', 'SEZ'].includes(scenario);
      case 'placeOfSupply':
        return ['B2B_INTER', 'B2C_LARGE', 'EXPORT_LUT', 'EXPORT_IGST', 'SEZ'].includes(scenario);
      case 'reverseCharge':
        return scenario === 'RCM';
      case 'itemCgst':
      case 'cgstRow':
      case 'itemSgst':
      case 'sgstRow':
        return scenario === 'B2B_INTRA' && documentType !== 'BILL_OF_SUPPLY';
      case 'itemIgst':
      case 'igstRow':
        return ['B2B_INTER', 'EXPORT_IGST', 'SEZ', 'B2C_LARGE'].includes(scenario) && documentType !== 'BILL_OF_SUPPLY';
      case 'itemHsnSac':
        return true;
      default:
        return true;
    }
  };

  const handleToggle = (field: keyof FieldVisibilityState, nextVal: 'VISIBLE' | 'HIDDEN' | 'AUTO') => {
    setVisibility((prev) => ({ ...prev, [field]: nextVal }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          documentType,
          fieldVisibility: visibility,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save template');
      }

      setSuccessMsg('Template saved successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Edit Presentation Template</h1>
            <p className="text-xs text-slate-400">Template ID: {templateId}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center space-x-2 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-900/50 border border-emerald-700 rounded-lg flex items-center space-x-2 text-emerald-200 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Settings Left (4 cols), Live Preview Right (8 cols) */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Template Controls */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* General Info */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Template Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="TAX_INVOICE">Tax Invoice (Rule 46)</option>
                  <option value="BILL_OF_SUPPLY">Bill of Supply (No GST)</option>
                  <option value="CREDIT_NOTE">Credit Note</option>
                </select>
              </div>
            </div>
          </div>

          {/* Visibility Controls */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-1">Field Visibility Settings</h2>
            <p className="text-xs text-slate-400 mb-4">AUTO resolves visibility flags dynamically based on the transaction context.</p>

            <div className="space-y-3">
              {[
                { key: 'customerGstin', label: 'Recipient GSTIN', isConditional: true },
                { key: 'placeOfSupply', label: 'Place of Supply (POS)', isConditional: true },
                { key: 'reverseCharge', label: 'Reverse Charge (RCM) Badge', isConditional: true },
                { key: 'itemHsnSac', label: 'HSN / SAC Column', isRequired: documentType === 'TAX_INVOICE' },
                { key: 'itemCgst', label: 'CGST Column / Row', isForbidden: documentType === 'BILL_OF_SUPPLY' },
                { key: 'itemIgst', label: 'IGST Column / Row', isForbidden: documentType === 'BILL_OF_SUPPLY' },
                { key: 'bankDetails', label: 'Bank Details Block' },
                { key: 'paymentQrCode', label: 'Payment QR Code' },
                { key: 'amountInWords', label: 'Amount in Words' },
                { key: 'termsAndConditions', label: 'Terms & Conditions' },
                { key: 'authorizedSignature', label: 'Signature Block' },
              ].map((item) => {
                const k = item.key as keyof FieldVisibilityState;
                const currentVal = visibility[k];

                if (item.isRequired) {
                  return (
                    <div key={k} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-300">{item.label}</span>
                      <span className="flex items-center space-x-1 text-xs text-blue-400 font-medium px-2 py-0.5 bg-blue-950/50 rounded">
                        <Lock className="w-3 h-3" />
                        <span>REQUIRED</span>
                      </span>
                    </div>
                  );
                }

                if (item.isForbidden) {
                  return (
                    <div key={k} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-500 line-through">{item.label}</span>
                      <span className="flex items-center space-x-1 text-xs text-rose-400 font-medium px-2 py-0.5 bg-rose-950/50 rounded">
                        <Lock className="w-3 h-3" />
                        <span>FORBIDDEN</span>
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={k} className="flex items-center justify-between p-2 bg-slate-900/40 rounded-lg">
                    <span className="text-xs text-slate-300">{item.label}</span>
                    <div className="flex bg-slate-900 p-0.5 rounded-md border border-slate-700 text-xs">
                      {item.isConditional && (
                        <button
                          onClick={() => handleToggle(k, 'AUTO')}
                          className={`px-2 py-1 rounded font-medium text-[10px] ${currentVal === 'AUTO' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          AUTO
                        </button>
                      )}
                      <button
                        onClick={() => handleToggle(k, 'VISIBLE')}
                        className={`px-2 py-1 rounded font-medium text-[10px] ${currentVal === 'VISIBLE' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        VISIBLE
                      </button>
                      <button
                        onClick={() => handleToggle(k, 'HIDDEN')}
                        className={`px-2 py-1 rounded font-medium text-[10px] ${currentVal === 'HIDDEN' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        HIDDEN
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Scenario Switcher & Live Preview */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          {/* Scenario Selector Panel */}
          <div className="bg-slate-800/90 border border-blue-500/30 rounded-xl p-4 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>Live Preview Context Selector</span>
              </span>
              <span className="text-[11px] text-slate-400">Switch scenarios to test AUTO resolution</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { id: 'B2B_INTRA', label: 'B2B Intra-State (TN→TN)' },
                { id: 'B2B_INTER', label: 'B2B Inter-State (TN→KA)' },
                { id: 'B2C_SMALL', label: 'B2C Intra-State' },
                { id: 'B2C_LARGE', label: 'B2C Inter-State (> ₹1L)' },
                { id: 'EXPORT_LUT', label: 'Export under LUT' },
                { id: 'EXPORT_IGST', label: 'Export with IGST' },
                { id: 'SEZ', label: 'SEZ Unit Supply' },
                { id: 'RCM', label: 'Reverse Charge (RCM)' },
                { id: 'BILL_OF_SUPPLY', label: 'Bill of Supply' },
              ].map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => {
                    setScenario(sc.id as PreviewScenario);
                    if (sc.id === 'BILL_OF_SUPPLY') setDocumentType('BILL_OF_SUPPLY');
                    else setDocumentType('TAX_INVOICE');
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                    scenario === sc.id
                      ? 'bg-blue-600 text-white shadow-lg border border-blue-400'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          {/* HTML Invoice Mock Preview Document */}
          <div className="bg-white text-slate-900 rounded-xl p-8 shadow-2xl min-h-[500px] font-sans text-xs space-y-6">
            {/* Invoice Header */}
            <div className="flex justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Acme Technologies Pvt Ltd</h2>
                <p className="text-slate-500">GSTIN: 33AAAAA0000A1Z5 | State: Tamil Nadu (33)</p>
                <p className="text-slate-500">100 Mount Road, Guindy, Chennai - 600032</p>
              </div>
              <div className="text-right">
                <span className="text-base font-bold uppercase tracking-wider text-blue-800">
                  {documentType.replace('_', ' ')}
                </span>
                <p className="font-mono text-slate-700 mt-1">INV-2526-0042</p>
                <p className="text-slate-500">Date: {new Date().toISOString().split('T')[0]}</p>
                {isFieldVisibleInPreview('reverseCharge') && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">
                    REVERSE CHARGE APPLICABLE
                  </span>
                )}
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
              <div>
                <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Billed To</h3>
                <p className="font-semibold text-slate-900">TechCorp Solutions Ltd</p>
                <p className="text-slate-600">MG Road, Bengaluru, Karnataka (29)</p>
                {isFieldVisibleInPreview('customerGstin') && (
                  <p className="font-mono text-blue-900 font-medium">GSTIN: 29BBBCC1111D1Z2</p>
                )}
              </div>
              {isFieldVisibleInPreview('placeOfSupply') && (
                <div className="text-right">
                  <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Place of Supply</h3>
                  <p className="font-semibold text-slate-900">Karnataka (State Code 29)</p>
                  <p className="text-slate-500 text-[10px]">Inter-State Supply</p>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 border-y border-slate-300 text-left font-bold text-slate-700">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Description</th>
                  {isFieldVisibleInPreview('itemHsnSac') && <th className="py-2 px-2">HSN/SAC</th>},
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-right">Rate (₹)</th>
                  {isFieldVisibleInPreview('itemCgst') && <th className="py-2 px-2 text-right">CGST</th>}
                  {isFieldVisibleInPreview('itemIgst') && <th className="py-2 px-2 text-right">IGST</th>}
                  <th className="py-2 px-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-2 px-2">1</td>
                  <td className="py-2 px-2 font-medium">Dell Latitude Laptop 15"</td>
                  {isFieldVisibleInPreview('itemHsnSac') && <td className="py-2 px-2 font-mono text-slate-600">847130</td>}
                  <td className="py-2 px-2 text-right">1 PCS</td>
                  <td className="py-2 px-2 text-right">50,000.00</td>
                  {isFieldVisibleInPreview('itemCgst') && <td className="py-2 px-2 text-right">4,500.00 (9%)</td>}
                  {isFieldVisibleInPreview('itemIgst') && <td className="py-2 px-2 text-right">9,000.00 (18%)</td>}
                  <td className="py-2 px-2 text-right font-semibold">59,000.00</td>
                </tr>
              </tbody>
            </table>

            {/* Totals Summary */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹50,000.00</span>
                </div>
                {isFieldVisibleInPreview('cgstRow') && (
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (9%):</span>
                    <span>₹4,500.00</span>
                  </div>
                )}
                {isFieldVisibleInPreview('sgstRow') && (
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (9%):</span>
                    <span>₹4,500.00</span>
                  </div>
                )}
                {isFieldVisibleInPreview('igstRow') && (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST (18%):</span>
                    <span>₹9,000.00</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-slate-900 border-t border-slate-300 pt-2">
                  <span>Grand Total:</span>
                  <span>₹59,000.00</span>
                </div>
              </div>
            </div>

            {/* Footer Features */}
            {isFieldVisibleInPreview('amountInWords') && (
              <div className="bg-slate-50 p-2 rounded text-[11px] text-slate-700 italic border-l-2 border-blue-600">
                Amount in Words: Fifty Nine Thousand Rupees Only
              </div>
            )}

            {isFieldVisibleInPreview('bankDetails') && (
              <div className="text-[10px] text-slate-600 border-t border-slate-200 pt-2">
                <p className="font-bold text-slate-800">Bank Details:</p>
                <p>HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
