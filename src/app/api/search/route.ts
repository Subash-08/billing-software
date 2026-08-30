/**
 * GET /api/search?q=<query> — Global Cross-Resource Search API Endpoint
 *
 * Rules:
 * 1. Strict Tenant Isolation: All queries scoped to authenticated session's businessId.
 * 2. Instant regex search across Invoices, Customers, Payments, Products, and Services.
 * 3. 0 cross-tenant data leakage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { connectToDatabase } from '@/db/connection';
import { InvoiceModel } from '@/db/models/invoice.model';
import { CustomerModel } from '@/db/models/customer.model';
import { PaymentModel } from '@/db/models/payment.model';
import { ProductModel } from '@/db/models/product.model';
import { ServiceModel } from '@/db/models/service.model';
import { ApplicationError } from '@/lib/errors';
import { Types } from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        results: { invoices: [], customers: [], payments: [], products: [] },
      });
    }

    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [invoices, customers, payments, products, services] = await Promise.all([
      InvoiceModel.find({
        businessId: bId,
        $or: [{ invoiceNumber: regex }, { 'billToSnapshot.name': regex }, { 'billToSnapshot.gstin': regex }],
      })
        .select('_id invoiceNumber status issueDate grandTotal billToSnapshot.name')
        .limit(5)
        .lean()
        .exec(),

      CustomerModel.find({
        businessId: bId,
        $or: [{ name: regex }, { displayName: regex }, { gstin: regex }, { phone: regex }, { email: regex }],
      })
        .select('_id name displayName gstin phone email')
        .limit(5)
        .lean()
        .exec(),

      PaymentModel.find({
        businessId: bId,
        $or: [{ receiptNumber: regex }, { referenceNumber: regex }, { 'customerSnapshot.displayName': regex }],
      })
        .select('_id receiptNumber amountPaise paymentModeSnapshot paymentDate referenceNumber')
        .limit(5)
        .lean()
        .exec(),

      ProductModel.find({
        businessId: bId,
        $or: [{ name: regex }, { sku: regex }, { hsnCode: regex }],
      })
        .select('_id name sku hsnCode salesUnitPriceGstInclusive pricing.sellingPricePaise')
        .limit(5)
        .lean()
        .exec(),

      ServiceModel.find({
        businessId: bId,
        $or: [{ name: regex }, { sacCode: regex }],
      })
        .select('_id name sacCode salesUnitPriceGstInclusive')
        .limit(5)
        .lean()
        .exec(),
    ]);

    return NextResponse.json({
      success: true,
      query,
      results: {
        invoices: invoices.map((inv: any) => ({
          id: inv._id.toString(),
          title: inv.invoiceNumber,
          subtitle: `${inv.billToSnapshot?.name || 'Customer'} • ₹${((inv.grandTotal || 0) / 100).toLocaleString('en-IN')}`,
          status: inv.status,
          url: `/invoices/${inv._id}`,
        })),
        customers: customers.map((c: any) => ({
          id: c._id.toString(),
          title: c.displayName || c.name,
          subtitle: `${c.gstin ? `GSTIN: ${c.gstin}` : c.phone || c.email || 'Customer'}`,
          url: `/customers/${c._id}`,
        })),
        payments: payments.map((p: any) => ({
          id: p._id.toString(),
          title: p.receiptNumber,
          subtitle: `${p.paymentModeSnapshot?.name || 'Payment'} • ₹${((p.amountPaise || 0) / 100).toLocaleString('en-IN')}`,
          url: `/payments/${p._id}`,
        })),
        products: [
          ...products.map((prd: any) => ({
            id: prd._id.toString(),
            title: prd.name,
            subtitle: `HSN: ${prd.hsnCode || 'N/A'} • SKU: ${prd.sku || 'N/A'}`,
            url: `/products/${prd._id}`,
          })),
          ...services.map((srv: any) => ({
            id: srv._id.toString(),
            title: srv.name,
            subtitle: `SAC: ${srv.sacCode || 'N/A'} (Service)`,
            url: `/services/${srv._id}`,
          })),
        ],
      },
    });
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Global search execution failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
