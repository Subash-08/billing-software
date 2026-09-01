import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { connectToDatabase } from '@/db/connection';
import { InvoiceModel } from '@/db/models/invoice.model';
import { QuotationModel } from '@/db/models/quotation.model';
import { SalesOrderModel } from '@/db/models/sales-order.model';
import { DeliveryChallanModel } from '@/db/models/delivery-challan.model';
import { ProductModel } from '@/db/models/product.model';
import { ServiceModel } from '@/db/models/service.model';
import { CustomerModel } from '@/db/models/customer.model';
import { SupplierModel } from '@/db/models/supplier.model';
import { PaymentModel } from '@/db/models/payment.model';
import { Types } from 'mongoose';
import { ApplicationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireAuthenticatedBusiness();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, results: { invoices: [], products: [], customers: [], suppliers: [] } });
    }

    await connectToDatabase();
    const bId = new Types.ObjectId(business._id.toString());
    const regex = new RegExp(q, 'i');

    const [invoices, quotations, salesOrders, products, services, customers, suppliers, payments] = await Promise.all([
      InvoiceModel.find({ businessId: bId, $or: [{ invoiceNumber: regex }, { 'billToSnapshot.name': regex }, { 'billToSnapshot.gstin': regex }] }).limit(10).lean().exec(),
      QuotationModel.find({ businessId: bId, $or: [{ quotationNumber: regex }, { 'billToSnapshot.name': regex }] }).limit(5).lean().exec(),
      SalesOrderModel.find({ businessId: bId, $or: [{ orderNumber: regex }, { 'billToSnapshot.name': regex }] }).limit(5).lean().exec(),
      ProductModel.find({ businessId: bId, $or: [{ name: regex }, { code: regex }, { hsnCode: regex }] }).limit(10).lean().exec(),
      ServiceModel.find({ businessId: bId, $or: [{ name: regex }, { code: regex }, { sacCode: regex }] }).limit(10).lean().exec(),
      CustomerModel.find({ businessId: bId, $or: [{ displayName: regex }, { legalName: regex }, { gstin: regex }, { phone: regex }] }).limit(10).lean().exec(),
      SupplierModel.find({ businessId: bId, $or: [{ name: regex }, { legalName: regex }, { gstin: regex }] }).limit(10).lean().exec(),
      PaymentModel.find({ businessId: bId, $or: [{ paymentNumber: regex }, { referenceNumber: regex }] }).limit(5).lean().exec(),
    ]);

    return NextResponse.json({
      success: true,
      query: q,
      results: {
        invoices,
        quotations,
        salesOrders,
        products,
        services,
        customers,
        suppliers,
        payments,
      },
    });
  } catch (err: any) {
    if (err instanceof ApplicationError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
