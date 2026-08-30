'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';

interface AssetMetadata {
  publicId?: string;
  secureUrl?: string;
  width?: number;
  height?: number;
  uploadedAt?: Date;
}

export default function BrandingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [branding, setBranding] = useState<{
    logo?: AssetMetadata;
    invoiceLogo?: AssetMetadata;
    signature?: AssetMetadata;
  }>({});

  useEffect(() => {
    async function loadBranding() {
      try {
        const res = await fetch('/api/business/branding');
        const data = await res.json();
        if (res.ok && data.branding) {
          setBranding(data.branding);
        }
      } catch {
        setMessage({ type: 'error', text: 'Failed to load branding settings' });
      } finally {
        setLoading(false);
      }
    }
    loadBranding();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, assetType: 'logo' | 'invoiceLogo' | 'signature') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(assetType);
    setMessage(null);

    try {
      // 1. Fetch server-signed upload parameters
      const signRes = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'niramaalai_business_assets' }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error || 'Failed to authorize image upload');

      const { timestamp, signature, apiKey, cloudName, folder, isMock } = signData.params;

      let assetMetadata: AssetMetadata;

      if (isMock) {
        // Dev mock upload fallback for local testing when Cloudinary API credentials aren't set
        const objectUrl = URL.createObjectURL(file);
        assetMetadata = {
          publicId: `dev_mock_${assetType}_${Date.now()}`,
          secureUrl: objectUrl,
          width: 300,
          height: 100,
          uploadedAt: new Date(),
        };
      } else {
        // Real signed Cloudinary upload
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('api_key', apiKey);
        uploadData.append('timestamp', String(timestamp));
        uploadData.append('signature', signature);
        uploadData.append('folder', folder);

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        const cRes = await fetch(cloudinaryUrl, { method: 'POST', body: uploadData });
        const cData = await cRes.json();
        if (!cRes.ok) throw new Error(cData.error?.message || 'Cloudinary upload failed');

        assetMetadata = {
          publicId: cData.public_id,
          secureUrl: cData.secure_url,
          width: cData.width,
          height: cData.height,
          uploadedAt: new Date(cData.created_at),
        };
      }

      // 2. Persist asset metadata into MongoDB
      const updatedBranding = { ...branding, [assetType]: assetMetadata };
      const saveRes = await fetch('/api/business/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBranding),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save branding metadata');

      setBranding(updatedBranding);
      setMessage({ type: 'success', text: `${assetType} uploaded and saved successfully.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveAsset = async (assetType: 'logo' | 'invoiceLogo' | 'signature') => {
    setUploading(assetType);
    setMessage(null);

    try {
      const res = await fetch(`/api/business/branding?assetType=${assetType}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove asset');

      const updated = { ...branding };
      delete updated[assetType];
      setBranding(updated);
      setMessage({ type: 'success', text: `${assetType} removed.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
        <span className="text-xs font-medium">Loading branding settings...</span>
      </div>
    );
  }

  const renderUploadCard = (
    title: string,
    description: string,
    assetType: 'logo' | 'invoiceLogo' | 'signature',
    asset?: AssetMetadata
  ) => (
    <Card className="border-[#E5E7EB] shadow-sm bg-white">
      <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
        <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 text-xs space-y-4">
        <p className="text-[#6B7280]">{description}</p>

        {asset?.secureUrl ? (
          <div className="flex items-center justify-between p-3 rounded-md border border-[#E5E7EB] bg-[#F9FAFB]">
            <div className="flex items-center space-x-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.secureUrl} alt={title} className="h-12 w-auto max-w-[160px] object-contain rounded border border-[#E5E7EB] bg-white p-1" />
              <div>
                <div className="font-semibold text-[#1F2937] text-xs">Asset uploaded</div>
                <div className="text-[11px] text-[#6B7280]">ID: {asset.publicId || 'Stored'}</div>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => handleRemoveAsset(assetType)}
              disabled={uploading === assetType}
              className="bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] text-xs px-2.5 py-1"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-[#D1D5DB] rounded-md p-6 text-center hover:bg-[#F9FAFB] transition">
            <ImageIcon className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" />
            <div className="text-xs font-medium text-[#374151]">Upload image file (PNG, JPG, SVG)</div>
            <div className="text-[11px] text-[#9CA3AF] mt-0.5">Maximum file size 2MB</div>
            <label className="mt-3 inline-block px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs rounded cursor-pointer transition">
              {uploading === assetType ? 'Uploading...' : 'Choose file'}
              <input
                type="file"
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={(e) => handleFileUpload(e, assetType)}
                disabled={uploading === assetType}
                className="hidden"
              />
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Business Branding & Assets</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Upload business logo, PDF header logo, and authorized signature for generated invoices.</p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-md text-xs flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-[#F0FDF4] border border-[#86EFAC] text-[#166534]'
              : 'bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626]'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="space-y-4">
        {renderUploadCard('Main Business Logo', 'Displays on your dashboard, client emails, and business portal.', 'logo', branding.logo)}
        {renderUploadCard('Invoice PDF Header Logo', 'Appears on the top header of printed or emailed PDF tax invoices.', 'invoiceLogo', branding.invoiceLogo)}
        {renderUploadCard('Authorized Signatory Image', 'Digital signature image printed on tax invoices above signatory label.', 'signature', branding.signature)}
      </div>
    </div>
  );
}
