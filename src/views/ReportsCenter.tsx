import { useState } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import { FileSpreadsheet, Download, FileText, BarChart, FileCheck } from 'lucide-react';

export default function ReportsCenter() {
  const { customers, inventory, invoices, currentCity } = useRentBuddyStore();
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // CSV Generator Helper
  const triggerCSVDownload = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${currentCity}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(filename);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // Export 1: Revenue & Collections Report
  const handleExportRevenue = () => {
    const headers = ['Invoice ID', 'Order ID', 'Customer Name', 'Billing Period', 'DueDate', 'Charges', 'Late Fee', 'Total Paid Amount', 'Status'];
    const rows = invoices.map(i => [
      i.id,
      i.orderId,
      i.customerName,
      i.billingPeriod,
      i.dueDate,
      i.rentalCharges.toString(),
      i.lateFee.toString(),
      i.totalAmount.toString(),
      i.status
    ]);
    triggerCSVDownload('RentBuddy_Revenue_Collections', headers, rows);
  };

  // Export 2: Inventory Ledger Report
  const handleExportInventory = () => {
    const headers = ['Asset ID', 'Barcode', 'Category', 'Brand', 'Model', 'Warehouse', 'City', 'Rack Number', 'Deposit', 'Rent Price', 'Status', 'Condition'];
    const rows = inventory.filter(a => a.city === currentCity).map(a => [
      a.id,
      a.barcode,
      a.category,
      a.brand,
      a.model,
      a.warehouse,
      a.city,
      a.rackNumber,
      a.securityDeposit.toString(),
      a.monthlyRentalPrice.toString(),
      a.status,
      a.lifecycle.currentCondition
    ]);
    triggerCSVDownload('RentBuddy_Inventory_Ledger', headers, rows);
  };

  // Export 3: Customer Demographic Report
  const handleExportCustomers = () => {
    const headers = ['Customer ID', 'Full Name', 'Mobile', 'Email', 'PAN', 'Aadhaar', 'Occupation', 'Employer', 'Current Address', 'Landlord Mobile', 'Compliance Status'];
    const rows = customers.map(c => [
      c.id,
      c.fullName,
      c.mobileNumber,
      c.email,
      c.panNumber,
      c.aadhaarNumber,
      c.occupation,
      c.employer,
      c.currentAddress,
      c.landlordMobile,
      c.status
    ]);
    triggerCSVDownload('RentBuddy_Customer_Ledger', headers, rows);
  };

  // Export 4: Asset ROI Metrics
  const handleExportROI = () => {
    const headers = ['Asset ID', 'Barcode', 'Category', 'Model', 'Purchase Cost', 'Revenue Earned', 'Repairs Cost', 'Rentals Count', 'Calculated ROI %'];
    const rows = inventory.filter(a => a.city === currentCity).map(a => {
      const roi = a.purchaseCost > 0 ? Math.round((a.lifecycle.revenueEarned / a.purchaseCost) * 100) : 0;
      return [
        a.id,
        a.barcode,
        a.category,
        `${a.brand} ${a.model}`,
        a.purchaseCost.toString(),
        a.lifecycle.revenueEarned.toString(),
        a.lifecycle.repairCost.toString(),
        a.lifecycle.totalRentalsCount.toString(),
        `${roi}%`
      ];
    });
    triggerCSVDownload('RentBuddy_Asset_ROI_Ledger', headers, rows);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 text-xs text-slate-300">
      
      {/* Header */}
      <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" /> Export Reports Center
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Simulate actual database query extracts. Export logs and financial telemetry to physical CSV tables.</p>
        </div>
        <span className="text-[10px] text-slate-500 font-mono font-semibold">Ready for auditor review</span>
      </div>

      {downloadSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center rounded-xl font-bold">
          ✓ Export file downloaded successfully: "{downloadSuccess}.csv"
        </div>
      )}

      {/* Grid options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1 */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-[200px] border border-slate-800">
          <div className="space-y-2">
            <BarChart className="w-8 h-8 text-emerald-400" />
            <h4 className="font-bold text-white text-sm">Revenue & Collections</h4>
            <p className="text-slate-400 text-[11px]">Monthly rent logs, transaction payment methods and late penalty fees.</p>
          </div>
          <button
            onClick={handleExportRevenue}
            className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" /> Download CSV Report
          </button>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-[200px] border border-slate-800">
          <div className="space-y-2">
            <FileText className="w-8 h-8 text-indigo-400" />
            <h4 className="font-bold text-white text-sm">Inventory Ledger</h4>
            <p className="text-slate-400 text-[11px]">Asset barcodes, rack placements, depreciated values and warehouse logs.</p>
          </div>
          <button
            onClick={handleExportInventory}
            className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" /> Download CSV Report
          </button>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-[200px] border border-slate-800">
          <div className="space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-purple-400" />
            <h4 className="font-bold text-white text-sm">Customer Demographic</h4>
            <p className="text-slate-400 text-[11px]">Full KYC logs, tenant occupation records and address listings.</p>
          </div>
          <button
            onClick={handleExportCustomers}
            className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" /> Download CSV Report
          </button>
        </div>

        {/* Card 4 */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-[200px] border border-slate-800">
          <div className="space-y-2">
            <FileCheck className="w-8 h-8 text-amber-400" />
            <h4 className="font-bold text-white text-sm">Asset ROI Performance</h4>
            <p className="text-slate-400 text-[11px]">Lifecycle earnings ratio against procurement costs and repairs expenses.</p>
          </div>
          <button
            onClick={handleExportROI}
            className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" /> Download CSV Report
          </button>
        </div>

      </div>

    </div>
  );
}
