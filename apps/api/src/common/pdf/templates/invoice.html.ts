export interface InvoiceData {
  id: string;
  date: string;
  amount: number;
  plan: string;
  orgName: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
}

export function generateInvoiceHtml(data: InvoiceData): string {
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  const formattedDate = new Date(data.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon { width: 40px; height: 40px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 16px; }
    .brand-name { font-size: 24px; font-weight: 700; color: #111827; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 20px; color: #6b7280; font-weight: 600; }
    .invoice-meta p { font-size: 14px; color: #6b7280; margin-top: 4px; }
    .divider { height: 1px; background: #e5e7eb; margin: 32px 0; }
    .bill-to { margin-bottom: 32px; }
    .bill-to h3 { font-size: 12px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; margin-bottom: 8px; }
    .bill-to p { font-size: 14px; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    thead th { text-align: left; font-size: 12px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; padding: 12px 16px; border-bottom: 2px solid #e5e7eb; }
    thead th:last-child { text-align: right; }
    tbody td { padding: 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; }
    tbody td:last-child { text-align: right; font-family: 'SF Mono', 'Fira Code', monospace; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #6b7280; }
    .totals-row.total { font-size: 20px; font-weight: 700; color: #111827; border-top: 2px solid #111827; padding-top: 16px; margin-top: 8px; }
    .footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-icon">CG</div>
      <span class="brand-name">CortexGrid</span>
    </div>
    <div class="invoice-meta">
      <h2>Invoice</h2>
      <p>#${data.id}</p>
      <p>${formattedDate}</p>
    </div>
  </div>

  <div class="bill-to">
    <h3>Bill To</h3>
    <p>${data.orgName}</p>
    <p>${data.plan} Plan</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${data.items.map(item => `
      <tr>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>$${item.unitPrice.toFixed(2)}</td>
        <td>$${item.total.toFixed(2)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-table">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>$${subtotal.toFixed(2)}</span>
      </div>
      <div class="totals-row total">
        <span>Total</span>
        <span>$${data.amount.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>CortexGrid IoT Intelligence Platform</p>
    <p>Thank you for your business</p>
  </div>
</body>
</html>`;
}
