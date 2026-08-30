'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  Receipt,
  CreditCard,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  Trash2,
  FileText,
} from 'lucide-react';

export default function BusinessSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'gst' | 'invoice' | 'bank'>('profile');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    legalName: '',
    tradeName: '',
    businessType: 'PROPRIETORSHIP',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    stateCode: '33',
    pincode: '',

    // Branding / Logo
    logoUrl: '',
    signatureUrl: '',

    // GST Settings
    gstRegistrationType: 'REGULAR',
    gstin: '',
    isComposition: false,

    // Invoice Settings
    prefix: 'INV',
    financialYearFormat: 'YYYY-YY',
    defaultPaymentTermsDays: 15,
    defaultNotes: 'Thank you for your business!',
    defaultTermsAndConditions: '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.',
    footerText: 'This is a computer-generated tax invoice and does not require physical signature.',

    // Bank Details
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    accountType: 'CURRENT',
    upiId: '',
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/business/profile');
        const data = await res.json();
        if (res.ok && data.business) {
          const b = data.business;
          setFormData({
            legalName: b.legalName || '',
            tradeName: b.tradeName || '',
            businessType: b.businessType || 'PROPRIETORSHIP',
            phone: b.phone || '',
            email: b.email || '',
            website: b.website || '',
            address: b.address || '',
            city: b.city || '',
            state: b.state || '',
            stateCode: b.stateCode || '33',
            pincode: b.pincode || '',

            logoUrl: b.branding?.logo?.secureUrl || b.branding?.invoiceLogo?.secureUrl || '',
            signatureUrl: b.branding?.signature?.secureUrl || '',

            gstRegistrationType: b.gstRegistrationType || b.gstSettings?.registrationType || 'REGULAR',
            gstin: b.gstin || b.gstSettings?.gstin || '',
            isComposition: b.gstSettings?.isComposition || false,

            prefix: b.invoiceSettings?.prefix || 'INV',
            financialYearFormat: b.invoiceSettings?.financialYearFormat || 'YYYY-YY',
            defaultPaymentTermsDays: b.invoiceSettings?.defaultPaymentTermsDays || 15,
            defaultNotes: b.invoiceSettings?.defaultNotes || 'Thank you for your business!',
            defaultTermsAndConditions:
              b.invoiceSettings?.defaultTermsAndConditions ||
              '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.',
            footerText: b.invoiceSettings?.footerText || 'This is a computer-generated tax invoice.',

            accountHolderName: b.bankDetails?.accountHolderName || '',
            bankName: b.bankDetails?.bankName || '',
            accountNumber: b.bankDetails?.accountNumber || '',
            ifscCode: b.bankDetails?.ifscCode || '',
            branch: b.bankDetails?.branch || '',
            accountType: b.bankDetails?.accountType || 'CURRENT',
            upiId: b.bankDetails?.upiId || '',
          });
        }
      } catch {
        setMessage({ type: 'error', text: 'Failed to load business configuration' });
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'signatureUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image file size must be less than 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({ ...prev, [field]: reader.result as string }));
        setMessage({ type: 'success', text: 'Logo preview loaded. Click "Save Configuration" to apply.' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        ...formData,
        gstSettings: {
          registrationType: formData.gstRegistrationType,
          gstin: formData.gstin,
          stateCode: formData.stateCode,
          isComposition: formData.isComposition,
        },
        bankDetails: {
          accountHolderName: formData.accountHolderName,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          branch: formData.branch,
          accountType: formData.accountType,
          upiId: formData.upiId,
        },
        invoiceSettings: {
          prefix: formData.prefix,
          financialYearFormat: formData.financialYearFormat,
          defaultPaymentTermsDays: Number(formData.defaultPaymentTermsDays) || 15,
          defaultNotes: formData.defaultNotes,
          defaultTermsAndConditions: formData.defaultTermsAndConditions,
          footerText: formData.footerText,
        },
      };

      const res = await fetch('/api/business/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save business settings');
      }

      setMessage({ type: 'success', text: 'Business profile & logo configuration saved successfully.' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
        <span className="text-xs font-medium">Loading business profile & GST configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Business Profile & Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage entity branding, GST profile, company logo, digital signature, and invoice templates.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center space-x-2 border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="border-b border-slate-200 flex flex-wrap gap-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'profile' ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building className="h-4 w-4" />
          <span>Business Identity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'branding' ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>Logo & Signature</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gst')}
          className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'gst' ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>GST & Tax Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoice')}
          className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'invoice' ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Invoice Terms & Notes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bank')}
          className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'bank' ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Bank & UPI Details</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-slate-200 shadow-sm bg-white rounded-xl">
          <CardContent className="p-6 text-xs space-y-6">
            {/* TAB 1: PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Registered Business Identity</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Legal Registered Business Name <span className="text-red-500">*</span>
                    </label>
                    <Input name="legalName" value={formData.legalName} onChange={handleChange} required className="text-xs font-semibold" />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Trade / Brand Name (Optional)</label>
                    <Input name="tradeName" value={formData.tradeName} onChange={handleChange} placeholder="e.g. Niramaalai Enterprises" className="text-xs" />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Business Structure</label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900"
                    >
                      <option value="PROPRIETORSHIP">Proprietorship</option>
                      <option value="PARTNERSHIP">Partnership Firm</option>
                      <option value="LLP">Limited Liability Partnership (LLP)</option>
                      <option value="PRIVATE_LIMITED">Private Limited (Pvt Ltd)</option>
                      <option value="PUBLIC_LIMITED">Public Limited</option>
                      <option value="OTHER">Other / Individual</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Primary Phone Number <span className="text-red-500">*</span>
                    </label>
                    <Input name="phone" value={formData.phone} onChange={handleChange} required maxLength={10} placeholder="10-digit mobile" className="text-xs" />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Email Address</label>
                    <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="info@company.com" className="text-xs" />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Website URL</label>
                  <Input name="website" value={formData.website} onChange={handleChange} placeholder="https://www.yourcompany.com" className="text-xs" />
                </div>

                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider pt-4 border-t border-slate-100">
                  Registered Business Address
                </h3>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Address Line <span className="text-red-500">*</span>
                  </label>
                  <Input name="address" value={formData.address} onChange={handleChange} required placeholder="Shop No / Building / Street" className="text-xs" />
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <Input name="city" value={formData.city} onChange={handleChange} required className="text-xs" />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <Input name="state" value={formData.state} onChange={handleChange} required className="text-xs" />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      State Code <span className="text-red-500">*</span>
                    </label>
                    <Input name="stateCode" value={formData.stateCode} onChange={handleChange} required maxLength={2} placeholder="33" className="text-xs font-mono font-bold" />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <Input name="pincode" value={formData.pincode} onChange={handleChange} required maxLength={6} className="text-xs font-mono" />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BRANDING & LOGO */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">
                    Company Logo & Branding Assets
                  </h3>
                  <p className="text-xs text-slate-500">
                    Your logo will automatically render on Tax Invoices, Quotations, and PDF Printouts.
                  </p>
                </div>

                {/* Logo Uploader Card */}
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Preview Box */}
                    <div className="w-24 h-24 rounded-xl border border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Company Logo Preview" className="max-w-full max-h-full object-contain p-1" />
                      ) : (
                        <div className="text-center p-2">
                          <ImageIcon className="h-8 w-8 text-slate-300 mx-auto" />
                          <span className="text-[9px] text-slate-400 font-medium block mt-1">No Logo</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      <label className="font-bold text-slate-900 block text-xs">Upload Company Logo Image</label>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors">
                          <Upload className="h-3.5 w-3.5" />
                          <span>Choose Image File</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            className="hidden"
                            onChange={(e) => handleLogoFileUpload(e, 'logoUrl')}
                          />
                        </label>

                        {formData.logoUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData({ ...formData, logoUrl: '' })}
                            className="text-red-600 hover:bg-red-50 border-red-200 h-8 gap-1 text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove Logo</span>
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Supports PNG, JPG, WEBP, or SVG (Recommended size: 300x100 px, max 2MB).
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Direct Image URL (Optional)</label>
                    <Input
                      name="logoUrl"
                      value={formData.logoUrl}
                      onChange={handleChange}
                      placeholder="https://res.cloudinary.com/your-cloud/image/upload/v12345/logo.png"
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Digital Signature Card */}
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-32 h-16 rounded-xl border border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {formData.signatureUrl ? (
                        <img src={formData.signatureUrl} alt="Authorised Signature Preview" className="max-w-full max-h-full object-contain p-1" />
                      ) : (
                        <div className="text-center p-1">
                          <FileText className="h-6 w-6 text-slate-300 mx-auto" />
                          <span className="text-[9px] text-slate-400 font-medium block">No Signature</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      <label className="font-bold text-slate-900 block text-xs">Authorised Signatory Signature</label>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors">
                          <Upload className="h-3.5 w-3.5" />
                          <span>Upload Signature</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden"
                            onChange={(e) => handleLogoFileUpload(e, 'signatureUrl')}
                          />
                        </label>

                        {formData.signatureUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData({ ...formData, signatureUrl: '' })}
                            className="text-red-600 hover:bg-red-50 border-red-200 h-8 gap-1 text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove Signature</span>
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Transparent PNG signature image for auto-signing computer generated invoices.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: GST SETTINGS */}
            {activeTab === 'gst' && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">GST & Tax Registration Status</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">GST Registration Type</label>
                    <select
                      name="gstRegistrationType"
                      value={formData.gstRegistrationType}
                      onChange={handleChange}
                      className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900"
                    >
                      <option value="REGULAR">Regular Taxable Person</option>
                      <option value="COMPOSITION">Composition Scheme</option>
                      <option value="UNREGISTERED">Unregistered Business</option>
                      <option value="SEZ">SEZ Unit / Developer</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">15-Digit GSTIN Number</label>
                    <Input
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleChange}
                      maxLength={15}
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      className="text-xs font-mono font-bold uppercase"
                      disabled={formData.gstRegistrationType === 'UNREGISTERED'}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isComposition"
                    name="isComposition"
                    checked={formData.isComposition}
                    onChange={handleChange}
                    className="rounded border-slate-300 text-slate-900"
                  />
                  <label htmlFor="isComposition" className="font-semibold text-slate-800 cursor-pointer">
                    Opted for Composition Levy under Section 10 of CGST Act
                  </label>
                </div>
              </div>
            )}

            {/* TAB 4: INVOICE TERMS & NOTES */}
            {activeTab === 'invoice' && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Invoice Defaults & Terms</h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Default Invoice Prefix</label>
                    <Input name="prefix" value={formData.prefix} onChange={handleChange} required className="text-xs font-mono font-bold" />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Financial Year Format</label>
                    <select
                      name="financialYearFormat"
                      value={formData.financialYearFormat}
                      onChange={handleChange}
                      className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900"
                    >
                      <option value="YYYY-YY">2026-27 (YYYY-YY)</option>
                      <option value="YY-YY">26-27 (YY-YY)</option>
                      <option value="NONE">None (No FY suffix)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Default Payment Terms (Days)</label>
                    <Input type="number" name="defaultPaymentTermsDays" value={formData.defaultPaymentTermsDays} onChange={handleChange} min={0} className="text-xs" />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Default Terms & Conditions</label>
                  <textarea
                    name="defaultTermsAndConditions"
                    value={formData.defaultTermsAndConditions}
                    onChange={handleChange}
                    rows={3}
                    className="w-full p-2.5 rounded-md border border-slate-300 text-xs text-slate-900 font-sans focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Default Notes / Bank Instructions</label>
                  <textarea
                    name="defaultNotes"
                    value={formData.defaultNotes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full p-2.5 rounded-md border border-slate-300 text-xs text-slate-900 font-sans focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Invoice Footer Declaration Text</label>
                  <Input name="footerText" value={formData.footerText} onChange={handleChange} className="text-xs" />
                </div>
              </div>
            )}

            {/* TAB 5: BANK DETAILS */}
            {activeTab === 'bank' && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Bank Account & UPI Details</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Account Holder Name</label>
                    <Input name="accountHolderName" value={formData.accountHolderName} onChange={handleChange} placeholder="e.g. Niramaalai Enterprises" className="text-xs" />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Bank Name</label>
                    <Input name="bankName" value={formData.bankName} onChange={handleChange} placeholder="e.g. HDFC Bank Ltd" className="text-xs" />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Account Number</label>
                    <Input name="accountNumber" value={formData.accountNumber} onChange={handleChange} placeholder="5010029381928" className="text-xs font-mono" />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">IFSC Code</label>
                    <Input name="ifscCode" value={formData.ifscCode} onChange={handleChange} maxLength={11} placeholder="HDFC0001234" className="text-xs font-mono uppercase font-bold" />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Branch Name</label>
                    <Input name="branch" value={formData.branch} onChange={handleChange} placeholder="Main Branch, Chennai" className="text-xs" />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">UPI ID / VPA (for Instant QR Payment)</label>
                  <Input name="upiId" value={formData.upiId} onChange={handleChange} placeholder="business@hdfcbank or 9876543210@paytm" className="text-xs font-mono" />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-1.5">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Configuration</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
