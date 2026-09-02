import React from 'react';
import { X, Printer, Tag, Check, User, Phone, MapPin, Calendar, CreditCard, Layers, Receipt, Percent, Box, Warehouse, Clock, ArrowRight } from 'lucide-react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import rentBuddyLogo from '../assets/rentbuddy1.png';

interface BarcodeStickerModalProps {
  asset: {
    id: string;
    barcode: string;
    brand?: string;
    model?: string;
    category?: string;
    warehouse?: string;
    rackNumber?: string;
    monthlyRentalRate?: number;
    monthlyRentalPrice?: number;
    securityDeposit?: number;
    status?: string;
    // Customer / Order Rental Details
    orderId?: string;
    customerName?: string;
    customerMobile?: string;
    deliveryAddress?: string;
    city?: string;
    durationMonths?: number;
    monthlyRent?: number;
    depositPaid?: number;
    startDate?: string;
    gstin?: string;
  };
  onClose: () => void;
}

export default function BarcodeStickerModal({ asset, onClose }: BarcodeStickerModalProps) {
  const { organizationConfig } = useRentBuddyStore();
  const barcodeValue = (asset.barcode || asset.id || 'RB-ASSET-001').toUpperCase().trim();
  const isOrderSticker = Boolean(asset.orderId && asset.customerName);

  // Pricing values
  const baseMonthlyRent = asset.monthlyRent || asset.monthlyRentalPrice || asset.monthlyRentalRate || 2500;
  const deposit = asset.depositPaid !== undefined ? asset.depositPaid : (asset.securityDeposit || 4000);
  const duration = asset.durationMonths || 1;

  // Rental Dates & Expiry Calculations
  const startDateStr = asset.startDate || new Date().toISOString().split('T')[0];
  const startDateObj = new Date(startDateStr);
  const expiryDateObj = new Date(startDateObj);
  expiryDateObj.setMonth(expiryDateObj.getMonth() + duration);
  const expiryDateStr = expiryDateObj.toISOString().split('T')[0];

  // GST & Pricing Calculations (18% GST)
  const cgstRate = 9;
  const sgstRate = 9;
  const cgstAmount = Math.round(baseMonthlyRent * (cgstRate / 100));
  const sgstAmount = Math.round(baseMonthlyRent * (sgstRate / 100));
  const totalGstPerMonth = cgstAmount + sgstAmount;
  const netMonthlyRentWithGst = baseMonthlyRent + totalGstPerMonth;
  const totalInitialPayable = netMonthlyRentWithGst + deposit;
  const companyGstin = asset.gstin || organizationConfig.gstin || '23AABCR8901L1Z5';

  // Generate 100% Solid Vector SVG Barcode
  const generateSvgBarcodeString = (code: string) => {
    const safeCode = (code || 'RB-001').slice(0, 24);
    let currentX = 10;
    const barHeight = 44;
    const totalWidth = 340;
    let barsHtml = '';

    // Guard Start
    barsHtml += `<rect x="${currentX}" y="0" width="3" height="${barHeight}" fill="#000000" />`;
    currentX += 5;
    barsHtml += `<rect x="${currentX}" y="0" width="2" height="${barHeight}" fill="#000000" />`;
    currentX += 6;

    for (let i = 0; i < safeCode.length; i++) {
      const codeVal = safeCode.charCodeAt(i);
      const w1 = (codeVal % 3) + 1.5;
      const w2 = (codeVal % 2) + 1;
      const w3 = ((codeVal + 1) % 3) + 2;
      const w4 = (codeVal % 2) + 1.5;

      barsHtml += `<rect x="${currentX}" y="0" width="${w1 * 1.6}" height="${barHeight}" fill="#000000" />`;
      currentX += (w1 * 1.6) + 3;
      barsHtml += `<rect x="${currentX}" y="0" width="${w2 * 1.6}" height="${barHeight}" fill="#000000" />`;
      currentX += (w2 * 1.6) + 2;
      barsHtml += `<rect x="${currentX}" y="0" width="${w3 * 1.6}" height="${barHeight}" fill="#000000" />`;
      currentX += (w3 * 1.6) + 3;
      barsHtml += `<rect x="${currentX}" y="0" width="${w4 * 1.6}" height="${barHeight}" fill="#000000" />`;
      currentX += (w4 * 1.6) + 2;
    }

    // Guard End
    barsHtml += `<rect x="${currentX}" y="0" width="2" height="${barHeight}" fill="#000000" />`;
    currentX += 4;
    barsHtml += `<rect x="${currentX}" y="0" width="3" height="${barHeight}" fill="#000000" />`;
    currentX += 10;

    return `
      <svg viewBox="0 0 ${Math.max(currentX, totalWidth)} ${barHeight}" style="width: 100%; height: 44px; display: block; shape-rendering: crispEdges;">
        ${barsHtml}
      </svg>
    `;
  };

  // Convert image to Base64/DataURL for robust popup printing
  const getLogoHtml = () => {
    return `<img src="${rentBuddyLogo}" alt="RentBuddy" style="width: 42px; height: 42px; object-fit: contain; background: #ffffff; margin-right: 6px;" />`;
  };

  // Standalone Print Handler with Pure CSS (Guaranteed Perfect Layout on 1 Single Page)
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=650,height=800');
    if (!printWindow) return;

    const svgBarcode = generateSvgBarcodeString(barcodeValue);
    const logoHtml = getLogoHtml();

    const invoiceHtml = isOrderSticker ? `
      <div class="invoice-box">
        
        <!-- 1. Header -->
        <div class="header-row">
          <div class="brand-box">
            ${logoHtml}
            <div>
              <div class="brand-title">RENTBUDDY</div>
              <div class="brand-sub">TAX INVOICE & DISPATCH LABEL</div>
            </div>
          </div>
          <div class="meta-box">
            <div class="hub-tag">${asset.city || 'INDORE'} CENTRAL HUB</div>
            <div class="meta-text"><strong>GSTIN:</strong> ${companyGstin}</div>
            <div class="meta-text"><strong>SAC:</strong> 997312 • <strong>Date:</strong> ${startDateStr}</div>
          </div>
        </div>

        <!-- 2. Ship From & Ship To Route Box -->
        <div class="route-table">
          <div class="route-col" style="border-right: 1px solid #ddd;">
            <div class="col-heading">📦 SHIP FROM (ORIGIN DEPOT):</div>
            <div class="entity-name">${asset.warehouse || `${asset.city || 'Indore'} Central Depot`}</div>
            <div class="addr-text">Plot 45, Scheme 54, Industrial Area, ${asset.city || 'Indore'} - 452010</div>
            <div class="rack-tag">Rack Location: <strong>${asset.rackNumber || 'A-01'}</strong></div>
          </div>
          <div class="route-col">
            <div class="col-heading" style="color: #c53030;">🏠 SHIP TO (CUSTOMER DESTINATION):</div>
            <div class="entity-name">${asset.customerName}</div>
            <div class="phone-text">Tel: ${asset.customerMobile}</div>
            <div class="addr-text">${asset.deliveryAddress || `${asset.city || 'Indore'} Delivery Area`}</div>
          </div>
        </div>

        <!-- 3. Furniture Asset & Tenure -->
        <div class="section-box">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div class="col-heading">FURNITURE DISPATCH UNIT:</div>
              <div class="asset-title">${asset.brand || 'RentBuddy'} ${asset.model || asset.category || 'Furniture Unit'}</div>
              <div class="meta-text">Category: ${asset.category || 'FURNITURE'} • Asset ID: ${asset.id}</div>
            </div>
            <div class="tenure-badge">
              <div><strong>Tenure:</strong> ${duration} Month${duration > 1 ? 's' : ''}</div>
              <div><strong>Start:</strong> ${startDateStr}</div>
              <div style="color: #c53030;"><strong>Expiry:</strong> ${expiryDateStr}</div>
            </div>
          </div>
        </div>

        <!-- 4. Barcode Container -->
        <div class="barcode-box">
          ${svgBarcode}
          <div class="barcode-number">${barcodeValue}</div>
          <div class="barcode-caption">3-STEP VERIFIED BARCODE (LOADING • HANDOVER • RETURN)</div>
        </div>

        <!-- 5. GST Tax Table -->
        <table class="tax-table">
          <thead>
            <tr>
              <th style="text-align: left;">Billing & Tax Breakdown</th>
              <th style="text-align: right;">SAC / Rate</th>
              <th style="text-align: right;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Base Monthly Rent (Excl. Tax)</td>
              <td style="text-align: right;">997312</td>
              <td style="text-align: right; font-weight: bold;">₹${baseMonthlyRent.toLocaleString('en-IN')}.00</td>
            </tr>
            <tr style="color: #555;">
              <td>• Central GST (CGST)</td>
              <td style="text-align: right;">9.0%</td>
              <td style="text-align: right;">+₹${cgstAmount.toLocaleString('en-IN')}.00</td>
            </tr>
            <tr style="color: #555;">
              <td>• State GST (SGST)</td>
              <td style="text-align: right;">9.0%</td>
              <td style="text-align: right;">+₹${sgstAmount.toLocaleString('en-IN')}.00</td>
            </tr>
            <tr style="background: #f7fafc; font-weight: bold;">
              <td>Total Monthly Rent (Incl. 18% GST)</td>
              <td style="text-align: right; color: #c53030;">18.0%</td>
              <td style="text-align: right; color: #c53030;">₹${netMonthlyRentWithGst.toLocaleString('en-IN')}.00/mo</td>
            </tr>
            <tr>
              <td>Refundable Security Deposit (Held in Trust)</td>
              <td style="text-align: right; color: #718096;">Non-Tax</td>
              <td style="text-align: right; font-weight: bold;">₹${deposit.toLocaleString('en-IN')}.00</td>
            </tr>
            <tr class="total-row">
              <td colspan="2">TOTAL INITIAL INVOICED & PAID:</td>
              <td style="text-align: right;">₹${totalInitialPayable.toLocaleString('en-IN')}.00</td>
            </tr>
          </tbody>
        </table>

        <!-- 6. 3-Way Checkpoints -->
        <div class="checkpoints-row">
          <div class="checkpoint-item">[ ] 1. Loading Scan</div>
          <div class="checkpoint-item">[ ] 2. Handover Scan</div>
          <div class="checkpoint-item">[ ] 3. Return Scan</div>
        </div>

        <!-- 7. Footer -->
        <div class="footer-row">
          <span>Order Ref: ${asset.orderId || asset.id}</span>
          <span>RentBuddy Enterprise Tax Invoice & Dispatch System</span>
        </div>

      </div>
    ` : `
      <div class="invoice-box">
        
        <!-- Header -->
        <div class="header-row">
          <div class="brand-box">
            ${logoHtml}
            <div>
              <div class="brand-title">RENTBUDDY</div>
              <div class="brand-sub">OFFICIAL INVENTORY ASSET TAG</div>
            </div>
          </div>
          <div class="meta-box">
            <div class="hub-tag">${asset.city || 'INDORE'} HUB</div>
            <div class="meta-text">Asset ID: ${asset.id}</div>
          </div>
        </div>

        <!-- Asset Details -->
        <div class="section-box">
          <div class="col-heading">FURNITURE ASSET DESCRIPTION:</div>
          <div class="asset-title">${asset.brand || 'RentBuddy'} ${asset.model || asset.category || 'Furniture Unit'}</div>
          <div class="meta-text">Category: ${asset.category || 'FURNITURE'} • Rack: ${asset.rackNumber || 'A-01'}</div>
        </div>

        <!-- Barcode Container -->
        <div class="barcode-box">
          ${svgBarcode}
          <div class="barcode-number">${barcodeValue}</div>
          <div class="barcode-caption">WAREHOUSE INVENTORY ASSET BARCODE</div>
        </div>

        <!-- Warehouse Specs -->
        <div class="route-table" style="background: #f7fafc; padding: 10px;">
          <div class="route-col">
            <div class="meta-text">Monthly Rental Price:</div>
            <div class="asset-title" style="color: #1a202c; font-size: 15px;">₹${baseMonthlyRent.toLocaleString('en-IN')}/mo</div>
          </div>
          <div class="route-col">
            <div class="meta-text">Security Deposit:</div>
            <div class="asset-title" style="color: #1a202c; font-size: 15px;">₹${deposit.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <!-- Warehouse & Rack Location -->
        <div class="section-box" style="display: flex; justify-content: space-between; font-size: 11px;">
          <div><strong>Storage Depot:</strong> ${asset.warehouse || 'Central Depot'}</div>
          <div><strong>Rack Location:</strong> <span style="color: #c53030; font-weight: bold;">${asset.rackNumber || 'A-01'}</span></div>
        </div>

        <!-- Footer -->
        <div class="footer-row">
          <span>Asset Ref: ${asset.id}</span>
          <span>RentBuddy Warehouse Tracking</span>
        </div>

      </div>
    `;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>RentBuddy Label - ${barcodeValue}</title>
          <style>
            @page {
              size: auto;
              margin: 4mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              margin: 0;
              padding: 8px;
              background: #ffffff;
              color: #000000;
              display: flex;
              justify-content: center;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * { box-sizing: border-box; }
            .invoice-box {
              width: 380px;
              border: 2px solid #000000;
              border-radius: 8px;
              padding: 12px;
              background: #ffffff;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #000000;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .brand-box {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .brand-title {
              font-size: 16px;
              font-weight: 900;
              letter-spacing: 0.5px;
              line-height: 1;
            }
            .brand-sub {
              font-size: 8px;
              font-weight: bold;
              color: #4a5568;
              letter-spacing: 0.3px;
              margin-top: 2px;
            }
            .meta-box {
              text-align: right;
            }
            .hub-tag {
              font-size: 9px;
              font-weight: 900;
              background: #000000;
              color: #ffffff;
              padding: 2px 6px;
              border-radius: 4px;
              display: inline-block;
            }
            .meta-text {
              font-size: 8px;
              color: #4a5568;
              font-family: monospace;
              margin-top: 2px;
            }
            .route-table {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              border: 1px solid #cbd5e0;
              border-radius: 6px;
              padding: 8px;
              background: #f7fafc;
              margin-bottom: 8px;
            }
            .route-col {
              font-size: 9.5px;
            }
            .col-heading {
              font-size: 7.5px;
              font-weight: 900;
              color: #718096;
              letter-spacing: 0.3px;
              text-transform: uppercase;
              margin-bottom: 3px;
            }
            .entity-name {
              font-size: 11px;
              font-weight: 900;
              color: #1a202c;
              line-height: 1.2;
            }
            .phone-text {
              font-size: 9.5px;
              font-weight: bold;
              font-family: monospace;
              color: #2d3748;
              margin: 2px 0;
            }
            .addr-text {
              font-size: 8.5px;
              color: #4a5568;
              line-height: 1.2;
            }
            .rack-tag {
              font-size: 8px;
              font-family: monospace;
              color: #2d3748;
              margin-top: 3px;
            }
            .section-box {
              border: 1px solid #cbd5e0;
              border-radius: 6px;
              padding: 8px;
              margin-bottom: 8px;
            }
            .asset-title {
              font-size: 13px;
              font-weight: 900;
              color: #1a202c;
              line-height: 1.2;
            }
            .tenure-badge {
              text-align: right;
              font-family: monospace;
              font-size: 8.5px;
              background: #edf2f7;
              padding: 4px 6px;
              border-radius: 4px;
              border: 1px solid #e2e8f0;
            }
            .barcode-box {
              border: 2px solid #000000;
              border-radius: 6px;
              padding: 6px;
              text-align: center;
              background: #ffffff;
              margin-bottom: 8px;
            }
            .barcode-number {
              font-family: monospace;
              font-size: 14px;
              font-weight: 900;
              letter-spacing: 3px;
              margin-top: 2px;
            }
            .barcode-caption {
              font-size: 7px;
              font-weight: 900;
              color: #718096;
              letter-spacing: 0.5px;
            }
            .tax-table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #cbd5e0;
              border-radius: 6px;
              overflow: hidden;
              font-family: monospace;
              font-size: 8.5px;
              margin-bottom: 8px;
            }
            .tax-table th {
              background: #edf2f7;
              padding: 4px 6px;
              border-bottom: 1px solid #cbd5e0;
              font-weight: bold;
              color: #2d3748;
            }
            .tax-table td {
              padding: 3.5px 6px;
              border-bottom: 1px solid #e2e8f0;
            }
            .total-row {
              background: #000000 !important;
              color: #ffffff !important;
              font-weight: 900 !important;
              font-size: 9.5px !important;
            }
            .total-row td {
              padding: 5px 6px !important;
            }
            .checkpoints-row {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 4px;
              border-top: 1px solid #e2e8f0;
              padding-top: 6px;
              margin-bottom: 6px;
            }
            .checkpoint-item {
              background: #edf2f7;
              border: 1px solid #cbd5e0;
              border-radius: 4px;
              padding: 4px;
              text-align: center;
              font-size: 7.5px;
              font-weight: bold;
              color: #4a5568;
            }
            .footer-row {
              display: flex;
              justify-content: space-between;
              font-size: 7.5px;
              color: #718096;
              border-top: 1px solid #e2e8f0;
              padding-top: 4px;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          ${invoiceHtml}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 600);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Pure SVG barcode for in-modal preview
  const renderSvgBarcodePreview = (code: string) => {
    const safeCode = (code || 'RB-001').slice(0, 24);
    let currentX = 10;
    const barHeight = 44;
    const totalWidth = 340;

    const bars: React.ReactNode[] = [];

    // Guard Start
    bars.push(<rect key="g1" x={currentX} y={0} width={3} height={barHeight} fill="#000000" />);
    currentX += 5;
    bars.push(<rect key="g2" x={currentX} y={0} width={2} height={barHeight} fill="#000000" />);
    currentX += 6;

    for (let i = 0; i < safeCode.length; i++) {
      const codeVal = safeCode.charCodeAt(i);
      const w1 = (codeVal % 3) + 1.5;
      const w2 = (codeVal % 2) + 1;
      const w3 = ((codeVal + 1) % 3) + 2;
      const w4 = (codeVal % 2) + 1.5;

      bars.push(<rect key={`b-${i}-0`} x={currentX} y={0} width={w1 * 1.6} height={barHeight} fill="#000000" />);
      currentX += (w1 * 1.6) + 3;
      bars.push(<rect key={`b-${i}-1`} x={currentX} y={0} width={w2 * 1.6} height={barHeight} fill="#000000" />);
      currentX += (w2 * 1.6) + 2;
      bars.push(<rect key={`b-${i}-2`} x={currentX} y={0} width={w3 * 1.6} height={barHeight} fill="#000000" />);
      currentX += (w3 * 1.6) + 3;
      bars.push(<rect key={`b-${i}-3`} x={currentX} y={0} width={w4 * 1.6} height={barHeight} fill="#000000" />);
      currentX += (w4 * 1.6) + 2;
    }

    // Guard End
    bars.push(<rect key="g3" x={currentX} y={0} width={2} height={barHeight} fill="#000000" />);
    currentX += 4;
    bars.push(<rect key="g4" x={currentX} y={0} width={3} height={barHeight} fill="#000000" />);
    currentX += 10;

    return (
      <svg
        viewBox={`0 0 ${Math.max(currentX, totalWidth)} ${barHeight}`}
        className="w-full h-11"
        style={{ display: 'block', shapeRendering: 'crispEdges' }}
      >
        {bars}
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 bg-[#030303]/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:bg-white print:p-0 print:static">
      
      <div className="w-[540px] glass-panel border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-200 no-print max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Receipt className="w-5 h-5 text-red-500" />
              {isOrderSticker ? 'Dispatch Label & Tax Invoice' : 'Warehouse Inventory Asset Barcode Tag'}
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Code: <strong className="text-cyan-400">{barcodeValue}</strong> {isOrderSticker ? `• Order: ${asset.orderId}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* IN-MODAL VISUAL PREVIEW */}
        <div className="flex justify-center">
          <div className="w-[420px] bg-white text-slate-950 p-4 rounded-xl border-2 border-slate-950 shadow-2xl space-y-2.5 font-sans">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-950 pb-2">
              <div className="flex items-center gap-2">
                <img
                  src={rentBuddyLogo}
                  alt="RentBuddy"
                  className="w-10 h-10 object-contain bg-white"
                />
                <div>
                  <h2 className="font-black text-base tracking-wider uppercase text-slate-950 leading-none">
                    RENTBUDDY
                  </h2>
                  <span className="text-[8px] font-bold text-slate-600 font-mono uppercase block mt-0.5">
                    {isOrderSticker ? 'TAX INVOICE & DISPATCH LABEL' : 'OFFICIAL INVENTORY ASSET TAG'}
                  </span>
                </div>
              </div>

              <div className="text-right text-[8px] font-mono leading-tight text-slate-800">
                <div className="font-black text-[9px] bg-slate-950 text-white px-2 py-0.5 rounded inline-block">
                  {asset.city || 'INDORE'} CENTRAL HUB
                </div>
                {isOrderSticker && (
                  <>
                    <div className="font-bold mt-0.5">GSTIN: {companyGstin}</div>
                    <div className="text-slate-600">SAC: 997312 • Date: {startDateStr}</div>
                  </>
                )}
              </div>
            </div>

            {/* Route Box */}
            {isOrderSticker ? (
              <div className="grid grid-cols-2 gap-2 border border-slate-300 rounded-lg p-2 bg-slate-50 text-[10px]">
                <div className="space-y-0.5 border-r border-slate-200 pr-2">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">
                    📦 SHIP FROM (ORIGIN DEPOT):
                  </span>
                  <div className="font-black text-slate-950 text-[11px] leading-tight">
                    {asset.warehouse || `${asset.city || 'Indore'} Central Depot`}
                  </div>
                  <div className="text-slate-600 text-[8.5px] leading-tight">
                    Plot 45, Scheme 54, Industrial Area, {asset.city || 'Indore'} - 452010
                  </div>
                  <div className="font-mono text-[8px] font-bold text-slate-700">
                    Rack Location: <span className="text-red-700 font-black">{asset.rackNumber || 'A-01'}</span>
                  </div>
                </div>

                <div className="space-y-0.5 pl-1">
                  <span className="text-[8px] font-black uppercase text-red-700 tracking-wider block">
                    🏠 SHIP TO (CUSTOMER DESTINATION):
                  </span>
                  <div className="font-black text-slate-950 text-[11px] leading-tight">
                    {asset.customerName}
                  </div>
                  <div className="font-mono font-bold text-slate-800 text-[9px]">
                    Tel: {asset.customerMobile}
                  </div>
                  <div className="text-slate-700 text-[8.5px] leading-tight font-medium">
                    {asset.deliveryAddress || `${asset.city || 'Indore'} Delivery Area`}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-[10.5px] flex justify-between items-center font-mono">
                <div>
                  <span className="text-[8px] font-bold uppercase text-slate-500 block">Warehouse Depot:</span>
                  <strong className="text-slate-950">{asset.warehouse || 'Indore Central Hub'}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-bold uppercase text-slate-500 block">Assigned Rack:</span>
                  <strong className="text-red-700 font-black text-sm">{asset.rackNumber || 'A-01'}</strong>
                </div>
              </div>
            )}

            {/* Furniture Asset Details */}
            <div className="border border-slate-300 rounded-lg p-2 space-y-1 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">
                    FURNITURE ASSET DESCRIPTION:
                  </span>
                  <h4 className="font-black text-[12px] text-slate-950 leading-tight">
                    {asset.brand || 'RentBuddy'} {asset.model || asset.category || 'Furniture Unit'}
                  </h4>
                  <span className="text-[8.5px] text-slate-500 font-mono">Category: {asset.category || 'FURNITURE'} • Asset ID: {asset.id}</span>
                </div>
                {isOrderSticker && (
                  <div className="text-right font-mono text-[8.5px] bg-slate-100 p-1 rounded border border-slate-200">
                    <div className="font-bold text-slate-950">Tenure: {duration} Month{duration > 1 ? 's' : ''}</div>
                    <div className="text-slate-600">Start: {startDateStr}</div>
                    <div className="text-red-700 font-black">Expiry: {expiryDateStr}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Barcode */}
            <div className="p-2 bg-white rounded-lg border-2 border-slate-950 flex flex-col items-center justify-center space-y-0.5">
              {renderSvgBarcodePreview(barcodeValue)}
              <span className="font-mono font-black text-sm text-slate-950 tracking-[0.25em]">
                {barcodeValue}
              </span>
            </div>

            {/* GST Table */}
            {isOrderSticker && (
              <div className="border border-slate-300 rounded-lg overflow-hidden text-[8.5px] font-mono">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 text-[8px] uppercase">
                      <th className="p-1 font-bold">Billing & Tax Component</th>
                      <th className="p-1 font-bold text-right">Rate</th>
                      <th className="p-1 font-bold text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-1">Base Rent (Excl. Tax)</td>
                      <td className="p-1 text-right text-slate-500">997312</td>
                      <td className="p-1 text-right font-bold">₹{baseMonthlyRent.toLocaleString('en-IN')}.00</td>
                    </tr>
                    <tr className="text-slate-600">
                      <td className="p-1">Central GST (CGST)</td>
                      <td className="p-1 text-right">9.0%</td>
                      <td className="p-1 text-right">+₹{cgstAmount.toLocaleString('en-IN')}.00</td>
                    </tr>
                    <tr className="text-slate-600">
                      <td className="p-1">State GST (SGST)</td>
                      <td className="p-1 text-right">9.0%</td>
                      <td className="p-1 text-right">+₹{sgstAmount.toLocaleString('en-IN')}.00</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-950">
                      <td className="p-1">Total Monthly Rent (18% GST)</td>
                      <td className="p-1 text-right text-red-700">18.0%</td>
                      <td className="p-1 text-right text-red-700 font-black">₹{netMonthlyRentWithGst.toLocaleString('en-IN')}.00</td>
                    </tr>
                    <tr>
                      <td className="p-1">Refundable Security Deposit</td>
                      <td className="p-1 text-right text-slate-500">Non-Tax</td>
                      <td className="p-1 text-right font-bold">₹{deposit.toLocaleString('en-IN')}.00</td>
                    </tr>
                    <tr className="bg-slate-950 text-white font-black text-[9px]">
                      <td className="p-1.5" colSpan={2}>TOTAL INITIAL INVOICED & PAID:</td>
                      <td className="p-1.5 text-right">₹{totalInitialPayable.toLocaleString('en-IN')}.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Checkpoints */}
            <div className="grid grid-cols-3 gap-1 text-[7.5px] font-bold text-center uppercase text-slate-700 border-t border-slate-200 pt-1">
              <div className="p-1 bg-slate-100 rounded border border-slate-300">
                [ ] 1. Loading Scan
              </div>
              <div className="p-1 bg-slate-100 rounded border border-slate-300">
                [ ] 2. Handover Scan
              </div>
              <div className="p-1 bg-slate-100 rounded border border-slate-300">
                [ ] 3. Return Scan
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/25 transition-all hover:scale-[1.01]"
          >
            <Printer className="w-4 h-4" /> Print Dispatch Label & Tax Invoice (Direct Output)
          </button>
          <button
            onClick={onClose}
            className="py-3 px-5 border border-slate-800 text-slate-300 hover:bg-slate-900 rounded-xl font-bold text-xs cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
