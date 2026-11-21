const test = require('node:test');
const assert = require('node:assert/strict');

const pricing = require('../lib/pricing');
const invoice = require('../lib/invoice');

test('invoice matches the customer billed total and GST for an order', () => {
  const items = [
    { id: 1, name: 'Rice', hsn: '1006', price: 640, qty: 1 },
    { id: 4, name: 'Oil', hsn: '1512', price: 190, qty: 2 }
  ];
  const billed = pricing.computeTotals(items, 'SAVE10');
  const invoiceFigures = invoice.computeInvoiceFigures({ items, coupon: 'SAVE10' });

  assert.equal(invoiceFigures.tax, billed.tax);
  assert.equal(invoiceFigures.discount, billed.discount);
  assert.equal(invoiceFigures.total, billed.total);
});

test('CURRENT BEHAVIOUR: order pricing applies HSN GST and apportions SAVE10 before tax', () => {
  const items = [
    { id: 1, name: 'Rice', hsn: '1006', price: 640, qty: 1 },
    { id: 4, name: 'Oil', hsn: '1512', price: 190, qty: 2 }
  ];

  assert.deepEqual(pricing.computeTotals(items, 'SAVE10'), {
    subtotal: 1020,
    discount: 102,
    taxable: 918,
    tax: 45.9,
    cgst: 22.95,
    sgst: 22.95,
    total: 963.9,
    lines: [
      { id: 1, name: 'Rice', hsn: '1006', gstPercent: 5, gross: 640, discount: 64, taxable: 576, tax: 28.8, net: 604.8 },
      { id: 4, name: 'Oil', hsn: '1512', gstPercent: 5, gross: 380, discount: 38, taxable: 342, tax: 17.1, net: 359.1 }
    ]
  });
});

test('invoice uses the item HSN GST rate used by order pricing', () => {
  const order = {
    items: [
      { name: 'Rice', sku: 'GRN-001', hsn: '1006', price: 640, qty: 1 },
      { name: 'Oil', sku: 'OIL-001', hsn: '1512', price: 190, qty: 2 }
    ],
    coupon: 'SAVE10'
  };

  const figures = invoice.computeInvoiceFigures(order);

  assert.equal(figures.subtotal, 1020);
  assert.equal(figures.tax, 45.9);
  assert.equal(figures.rows[0].gstPercent, 5);
  assert.equal(figures.rows[1].gstPercent, 5);
  assert.equal(figures.total, 963.9);
});

test('invoice applies a percentage coupon before GST', () => {
  const order = {
    items: [{ name: 'Rice', hsn: '1006', price: 640, qty: 1 }],
    coupon: 'SAVE10'
  };

  const figures = invoice.computeInvoiceFigures(order);

  assert.equal(figures.subtotal, 640);
  assert.equal(figures.tax, 28.8);
  assert.equal(figures.discount, 64);
  assert.equal(figures.total, 604.8);
});

test('invoice flat coupon totals match order pricing', () => {
  const items = [
    { id: 7, name: 'Butter', hsn: '0405', price: 260, qty: 1 },
    { id: 8, name: 'Tea', hsn: '0902', price: 140, qty: 1 }
  ];

  const ledgerTotals = pricing.computeTotals(items, 'FLAT50');
  const invoiceFigures = invoice.computeInvoiceFigures({ items, coupon: 'FLAT50' });

  assert.equal(ledgerTotals.discount, 50);
  assert.equal(ledgerTotals.tax, 49.35);
  assert.equal(ledgerTotals.total, 399.35);
  assert.equal(invoiceFigures.discount, 50);
  assert.equal(invoiceFigures.tax, 49.35);
  assert.equal(invoiceFigures.total, 399.35);
});
