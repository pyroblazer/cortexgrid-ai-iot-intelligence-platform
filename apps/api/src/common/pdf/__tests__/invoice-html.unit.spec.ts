import { generateInvoiceHtml, InvoiceData } from '../templates/invoice.html';

describe('generateInvoiceHtml', () => {
  const sampleData: InvoiceData = {
    id: 'INV-001',
    date: '2024-06-15T00:00:00.000Z',
    amount: 99.99,
    plan: 'PRO',
    orgName: 'Test Organization',
    items: [
      { description: 'Pro Plan - Monthly', quantity: 1, unitPrice: 49.99, total: 49.99 },
      { description: 'Additional Devices (x5)', quantity: 5, unitPrice: 10.00, total: 50.00 },
    ],
  };

  it('should include invoice ID', () => {
    const html = generateInvoiceHtml(sampleData);
    expect(html).toContain('#INV-001');
  });

  it('should include organization name', () => {
    const html = generateInvoiceHtml(sampleData);
    expect(html).toContain('Test Organization');
  });

  it('should include plan name', () => {
    const html = generateInvoiceHtml(sampleData);
    expect(html).toContain('PRO Plan');
  });

  it('should include item descriptions', () => {
    const html = generateInvoiceHtml(sampleData);
    expect(html).toContain('Pro Plan - Monthly');
    expect(html).toContain('Additional Devices (x5)');
  });

  it('should include formatted unit prices', () => {
    const html = generateInvoiceHtml(sampleData);
    expect(html).toContain('$49.99');
    expect(html).toContain('$10.00');
  });

  it('should include formatted totals', () => {
    const html = generateInvoiceHtml(sampleData);
    expect(html).toContain('$50.00');
    expect(html).toContain('$99.99');
  });

  it('should calculate subtotal from items', () => {
    const html = generateInvoiceHtml(sampleData);
    // 49.99 + 50.00 = 99.99
    expect(html).toContain('$99.99');
  });

  it('should include CortexGrid branding', () => {
    const html = generateInvoiceHtml(sampleData);
    expect(html).toContain('CortexGrid');
  });

  it('should include formatted date', () => {
    const html = generateInvoiceHtml(sampleData);
    // Date should be formatted in human-readable form
    expect(html).toMatch(/June.*2024/);
  });

  it('should handle empty items list', () => {
    const emptyData: InvoiceData = {
      id: 'INV-002',
      date: '2024-01-01T00:00:00.000Z',
      amount: 0,
      plan: 'FREE',
      orgName: 'Empty Org',
      items: [],
    };
    const html = generateInvoiceHtml(emptyData);
    expect(html).toContain('Empty Org');
    expect(html).toContain('$0.00');
  });
});
