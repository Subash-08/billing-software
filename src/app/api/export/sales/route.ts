import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedBusiness } from '@/lib/auth-context';
import { InvoiceModel } from '@/db/models/invoice.model';
import { connectToDatabase } from '@/db/connection';
import { Types } from 'mongoose';
import { paiseToRupees } from '@/lib/money';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireAuthenticatedBusiness();
    await connectToDatabase();
    const bId = new Types.ObjectId(business._id.toString());

    const invoices = await InvoiceModel.find({ businessId: bId, status: { $in: ['ISSUED', 'RECORDED'] } })
      .sort({ invoiceDate: -1 })
      .lean()
      .exec();

    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Customer Name',
      'Customer GSTIN',
      'Place of Supply',
      'Subtotal (₹)',
      'Discount (₹)',
      'Taxable Amount (₹)',
      'CGST (₹)',
      'SGST (₹)',
      'IGST (₹)',
      'Grand Total (₹)',
      'Paid Amount (₹)',
      'Outstanding (₹)',
      'Payment Status',
    ];

    const csvRows = [headers.join(',')];

    for (const inv of invoices) {
      const row = [
        `"${inv.invoiceNumber}"`,
        `"${new Date(inv.invoiceDate).toISOString().split('T')[0]}"`,
        `"${(inv.billToSnapshot?.name || '').replace(/"/g, '""')}"`,
        `"${inv.billToSnapshot?.gstin || ''}"`,
        `"${inv.supplyDetails?.placeOfSupplyStateCode || ''}"`,
        paiseToRupees(inv.subTotal).toFixed(2),
        paiseToRupees(inv.totalDiscount || 0).toFixed(2),
        paiseToRupees(inv.totalTaxable).toFixed(2),
        paiseToRupees(inv.totalCgst || 0).toFixed(2),
        paiseToRupees(inv.totalSgst || 0).toFixed(2),
        paiseToRupees(inv.totalIgst || 0).toFixed(2),
        paiseToRupees(inv.grandTotal).toFixed(2),
        paiseToRupees(inv.paidAmount).toFixed(2),
        paiseToRupees(inv.outstandingBalance).toFixed(2),
        `"${inv.paymentStatus}"`,
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="sales-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
