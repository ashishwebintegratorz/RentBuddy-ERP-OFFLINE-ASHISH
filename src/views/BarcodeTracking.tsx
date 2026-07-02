import React, { useState, useEffect } from 'react';
import { useRentBuddyStore } from '../store/rentBuddyStore';
import { Asset } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  Search,
  Scan,
  Printer,
  History,
  Box,
  Truck,
  AlertOctagon,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

export default function BarcodeTracking() {
  const { inventory, orders, currentCity } = useRentBuddyStore();
  const [scanInput, setScanInput] = useState('');
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [activeTab, setActiveTab] = useState<'scan' | 'labels'>('scan');

  // Real Camera scan state
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerInstance, setScannerInstance] = useState<Html5Qrcode | null>(null);

  const startCamera = async () => {
    try {
      setCameraActive(true);
      // Wait for the container element to render in DOM
      setTimeout(async () => {
        const html5QrCode = new Html5Qrcode("camera-scanner-view");
        setScannerInstance(html5QrCode);

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // On success scan:
            handleSimulateScan(decodedText);
            setScanInput(decodedText);
            // Auto stop camera
            stopCamera(html5QrCode);
          },
          (errorMessage) => {
            // Silent or verbose debug
          }
        );
      }, 300);
    } catch (err) {
      console.error("Camera scanner error: ", err);
      setCameraActive(false);
    }
  };

  const stopCamera = async (instanceToStop?: Html5Qrcode | null) => {
    const scanner = instanceToStop || scannerInstance;
    if (scanner && scanner.isScanning) {
      try {
        await scanner.stop();
      } catch (err) {
        console.error("Failed to stop scanner: ", err);
      }
    }
    setScannerInstance(null);
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (scannerInstance && scannerInstance.isScanning) {
        scannerInstance.stop().catch(err => console.error(err));
      }
    };
  }, [scannerInstance]);

  // Filter local inventory to print labels
  const cityAssets = inventory.filter(a => a.city === currentCity);

  const handleSimulateScan = (barcodeStr: string) => {
    const asset = inventory.find(
      a => a.barcode.toLowerCase() === barcodeStr.toLowerCase().trim() ||
           a.id.toLowerCase() === barcodeStr.toLowerCase().trim()
    );

    if (asset) {
      setScannedAsset(asset);
      setScanSuccess(true);
      setScanError(false);
      // Play sound
      const storeState = useRentBuddyStore.getState() as any;
      if (storeState.playNotificationSound) {
        storeState.playNotificationSound();
      }
      setTimeout(() => setScanSuccess(false), 2000);
    } else {
      setScannedAsset(null);
      setScanError(true);
      setScanSuccess(false);
      setTimeout(() => setScanError(false), 3000);
    }
  };

  // Get rentals list for scanned asset
  const getAssetRentalHistory = (assetId: string) => {
    return orders.filter(o => o.items.some(item => item.assetId === assetId));
  };

  // Simulated Code-128 line renderer
  const renderBarcodeLines = (code: string) => {
    // Generate static visual representation of Code-128 using styled div stripes
    return (
      <div className="h-10 bg-white p-1 flex justify-around items-stretch rounded border border-slate-300">
        {code.split('').map((char, index) => {
          const charCode = char.charCodeAt(0);
          const isOdd = charCode % 2 === 0;
          return (
            <React.Fragment key={index}>
              <div className={`w-0.5 ${isOdd ? 'bg-slate-900' : 'bg-transparent'}`}></div>
              <div className={`w-1 ${!isOdd ? 'bg-slate-900' : 'bg-transparent'}`}></div>
              <div className="w-0.5 bg-transparent"></div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Tab selection */}
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('scan')}
            className={`text-sm font-bold uppercase tracking-wider pb-1.5 transition-all border-b-2 cursor-pointer ${
              activeTab === 'scan' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            📟 Handheld Scanner Simulator
          </button>
          <button
            onClick={() => setActiveTab('labels')}
            className={`text-sm font-bold uppercase tracking-wider pb-1.5 transition-all border-b-2 cursor-pointer ${
              activeTab === 'labels' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            🖨️ Print Barcode Stickers
          </button>
        </div>
        <span className="text-xs text-slate-400 font-mono">100% Scan Checklist Enforcement active</span>
      </div>

      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Scanner Simulator Terminal */}
          <div className="glass-panel p-5 rounded-2xl space-y-5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Scan className="w-4 h-4 text-indigo-400" /> Scanner Device Simulation
            </h3>

            {/* Simulated camera scanning frame */}
            <div className="aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-4">
              {cameraActive ? (
                <div id="camera-scanner-view" className="absolute inset-0 w-full h-full bg-black"></div>
              ) : (
                <>
                  {/* Scan target overlays */}
                  <div className="absolute inset-8 border border-indigo-500/30 rounded flex flex-col justify-between">
                    <div className="flex justify-between">
                      <div className="w-3 h-3 border-t-2 border-l-2 border-indigo-400"></div>
                      <div className="w-3 h-3 border-t-2 border-r-2 border-indigo-400"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="w-3 h-3 border-b-2 border-l-2 border-indigo-400"></div>
                      <div className="w-3 h-3 border-b-2 border-r-2 border-indigo-400"></div>
                    </div>
                  </div>

                  {/* Red scan laser line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-rose-500 shadow-md shadow-rose-500/80 scan-line-anim"></div>

                  <QrCode className="w-12 h-12 text-slate-800" />
                  <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-2">Active Telemetry Scanner</span>
                </>
              )}

              {scanSuccess && (
                <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-sm flex items-center justify-center flex-col animate-pulse z-10">
                  <span className="text-emerald-400 font-bold text-xs bg-emerald-950/80 px-3 py-1.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    🎯 BEEP! Code Scanned
                  </span>
                </div>
              )}

              {scanError && (
                <div className="absolute inset-0 bg-rose-500/10 backdrop-blur-sm flex items-center justify-center flex-col animate-pulse z-10">
                  <span className="text-rose-400 font-bold text-xs bg-rose-950/80 px-3 py-1.5 rounded-full border border-rose-500/30 flex items-center gap-1">
                    ❌ BEEP BEEP! Code Invalid
                  </span>
                </div>
              )}
            </div>

            {/* Scanner Controls */}
            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium block">Barcode Input / Camera controls</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Enter RB-XXXX-XXXX"
                    className="flex-1 rounded-lg px-2.5 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 text-slate-200"
                  />
                  <button
                    onClick={() => handleSimulateScan(scanInput)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg px-3 py-1.5 cursor-pointer"
                  >
                    Manual
                  </button>
                  {cameraActive ? (
                    <button
                      onClick={() => stopCamera()}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg px-3 py-1.5 cursor-pointer flex items-center gap-1.5"
                    >
                      <Scan className="w-3.5 h-3.5 animate-pulse" /> Stop
                    </button>
                  ) : (
                    <button
                      onClick={startCamera}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg px-3 py-1.5 cursor-pointer flex items-center gap-1.5"
                    >
                      <Scan className="w-3.5 h-3.5" /> Camera
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Select dropdown of existing inventory barcodes to simulate scanner */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium block">Or Select Asset Barcode to scan</label>
                <select
                  onChange={(e) => {
                    setScanInput(e.target.value);
                    handleSimulateScan(e.target.value);
                  }}
                  className="w-full rounded-lg px-2.5 py-1.5 cursor-pointer font-mono"
                  defaultValue=""
                >
                  <option value="">-- Choose Asset Barcode --</option>
                  {cityAssets.slice(0, 15).map(asset => (
                    <option key={asset.id} value={asset.barcode}>
                      {asset.barcode} - {asset.brand} {asset.category} ({asset.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right panel: Scanned Asset Information */}
          <div className="lg:col-span-2 glass-panel p-5 rounded-2xl min-h-[400px] flex flex-col justify-between">
            {scannedAsset ? (
              <div className="space-y-5 text-xs">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[9px] bg-slate-900 border border-slate-800 text-slate-400 font-mono tracking-wider font-semibold">
                      {scannedAsset.category}
                    </span>
                    <h4 className="font-bold text-white text-lg mt-1">{scannedAsset.brand} {scannedAsset.model}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Asset ID: {scannedAsset.id}</p>
                  </div>
                  {renderBarcodeLines(scannedAsset.barcode)}
                </div>

                {/* Grid info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-900">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Status</span>
                    <span className="font-bold text-indigo-300 block text-xs mt-1">{scannedAsset.status}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-900">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Warehouse Location</span>
                    <span className="font-semibold text-slate-200 block text-xs mt-1">{scannedAsset.warehouse}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-900">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Rack Number</span>
                    <span className="font-mono text-slate-200 block text-xs mt-1">{scannedAsset.rackNumber}</span>
                  </div>
                </div>

                {/* History summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 bg-slate-900/10 p-3 rounded-xl border border-slate-850">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lifecycle Statistics</span>
                    <div className="space-y-1 text-[11px] text-slate-300">
                      <div className="flex justify-between"><span>Total Customers:</span> <span className="font-mono text-slate-100">{scannedAsset.lifecycle.totalRentalsCount}</span></div>
                      <div className="flex justify-between"><span>Revenue Generated:</span> <span className="font-mono text-emerald-400">₹{scannedAsset.lifecycle.revenueEarned}</span></div>
                      <div className="flex justify-between"><span>Accumulated Repairs:</span> <span className="font-mono text-rose-400">₹{scannedAsset.lifecycle.repairCost}</span></div>
                      <div className="flex justify-between"><span>Condition:</span> <span className="font-semibold text-slate-200">{scannedAsset.lifecycle.currentCondition}</span></div>
                    </div>
                  </div>

                  <div className="space-y-2 bg-slate-900/10 p-3 rounded-xl border border-slate-850">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <History className="w-3.5 h-3.5" /> Recent Rental logs
                    </span>
                    <div className="space-y-1.5 text-[10px] max-h-24 overflow-y-auto">
                      {getAssetRentalHistory(scannedAsset.id).length === 0 ? (
                        <div className="text-slate-600 text-center py-2">No past rental orders.</div>
                      ) : (
                        getAssetRentalHistory(scannedAsset.id).map(o => (
                          <div key={o.id} className="p-1 rounded border border-slate-800 bg-slate-950/20 flex justify-between text-slate-300">
                            <span>{o.customerName}</span>
                            <span className="font-mono text-[9px]">{o.startDate} ({o.durationMonths}mo)</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 text-xs font-medium flex flex-col items-center justify-center space-y-3">
                <Scan className="w-12 h-12 text-slate-700 animate-pulse" />
                <div>
                  <p className="text-slate-400 font-semibold">No asset currently scanned</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Use the scanner simulator panel on the left to verify barcode integrity.</p>
                </div>
              </div>
            )}

            {/* Print trigger block */}
            {scannedAsset && (
              <div className="mt-5 border-t border-slate-800/80 pt-4 flex justify-end">
                <button
                  onClick={() => alert(`Sticker sent to printer! Code: ${scannedAsset.barcode}`)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs px-4 py-2 flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Sticker Label
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'labels' && (
        <div className="space-y-5">
          <div className="glass-panel p-4 rounded-2xl flex justify-between items-center">
            <div className="text-xs text-slate-400">
              Generating printable barcode sheet for <strong className="text-slate-200">{currentCity}</strong> ({cityAssets.length} assets).
            </div>
            <button
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold px-4 py-2 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" /> Send sheet to label printer
            </button>
          </div>

          {/* Label printing grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cityAssets.slice(0, 12).map(asset => (
              <div key={asset.id} className="p-3 bg-white text-slate-900 rounded-xl space-y-2 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-black text-[9px] uppercase tracking-wider text-slate-500 bg-slate-100 px-1 py-0.5 rounded">RentBuddy</span>
                    <span className="text-[9px] font-bold text-slate-400 font-mono">{asset.id}</span>
                  </div>
                  <h4 className="font-bold text-[11px] text-slate-900 mt-1 line-clamp-1">{asset.brand} {asset.model}</h4>
                  <p className="text-[9px] text-slate-500">{asset.category}</p>
                </div>

                <div className="py-2 flex flex-col items-center justify-center space-y-1 bg-slate-50 rounded border border-dashed border-slate-200">
                  {renderBarcodeLines(asset.barcode)}
                  <span className="text-[8px] font-mono font-bold text-slate-600 tracking-widest uppercase mt-0.5">{asset.barcode}</span>
                </div>

                <div className="flex justify-between items-center text-[8px] text-slate-400 font-semibold border-t border-slate-100 pt-1.5">
                  <span>W: {asset.warehouse.substring(0, 8)}..</span>
                  <span>Rack: {asset.rackNumber}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
