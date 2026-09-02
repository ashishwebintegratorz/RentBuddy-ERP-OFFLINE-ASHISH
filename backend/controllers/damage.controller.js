import { DamageReport, Asset, Log } from '../models/index.js';
import { addNotification } from '../utils/notification.helper.js';

export const reportDamage = async (req, res) => {
  try {
    const {
      assetId,
      assetBarcode,
      assetName,
      orderId,
      pickupId,
      reportedByDriverId,
      reportedByDriverName,
      damageType,
      severity,
      description,
      photos,
      estimatedRepairCost
    } = req.body;

    const reportId = `DMG-${Date.now().toString().slice(-6)}`;
    const damage = new DamageReport({
      id: reportId,
      assetId,
      assetBarcode,
      assetName,
      orderId,
      pickupId,
      reportedByDriverId,
      reportedByDriverName,
      damageType: damageType || 'Physical Damage',
      severity: severity || 'Medium',
      description,
      photos: photos || [],
      estimatedRepairCost: estimatedRepairCost || 0,
      status: 'PENDING_REVIEW'
    });

    await damage.save();

    // Mark physical asset as DAMAGE_REVIEW / DAMAGED
    if (assetId) {
      await Asset.findOneAndUpdate(
        { $or: [{ id: assetId }, { barcode: assetBarcode }] },
        { status: 'DAMAGE_REVIEW', currentStatus: 'DAMAGED', condition: severity || 'DAMAGED' }
      );
    }

    await Log.create({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userRole: 'Driver / Warehouse',
      action: 'DAMAGE_REPORTED',
      details: `Damage reported for asset ${assetId} (${severity}). Damage ID: ${reportId}`
    });

    await addNotification({
      title: '⚠️ Asset Damage Reported',
      message: `Damage reported on Asset ${assetBarcode || assetId} (${severity || 'Medium'}). Issue: ${damageType || 'Defect'}. Reported by: ${reportedByDriverName || 'Inspector'}`,
      type: 'warning',
      city: 'Indore (Head Office)',
      orderId: orderId || '',
      category: 'damage'
    });

    return res.status(201).json({
      success: true,
      message: 'Damage report submitted to Admin for repair review.',
      data: damage
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getDamageReports = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const reports = await DamageReport.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, data: reports, count: reports.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resolveDamageReport = async (req, res) => {
  try {
    const reportId = String(req.params.id || '').trim();
    if (!reportId || reportId.length > 100) {
      return res.status(400).json({ success: false, message: 'Invalid report ID provided' });
    }
    const { action, adminNotes, estimatedRepairCost } = req.body; // action: 'APPROVED_REPAIR' | 'RETIRED' | 'RESOLVED'
    const report = await DamageReport.findOne({ id: reportId }) || await DamageReport.findById(reportId);
    if (!report) return res.status(404).json({ success: false, message: 'Damage report not found' });

    report.status = action || 'RESOLVED';
    report.adminNotes = adminNotes || '';
    if (estimatedRepairCost) report.estimatedRepairCost = estimatedRepairCost;
    report.resolvedAt = new Date().toISOString();
    await report.save();

    // Update physical asset
    if (report.assetId) {
      const newStatus = action === 'APPROVED_REPAIR' ? 'REPAIR_PENDING' : action === 'RETIRED' ? 'RETIRED' : 'AVAILABLE';
      await Asset.findOneAndUpdate(
        { id: report.assetId },
        { status: newStatus, currentStatus: newStatus }
      );
    }

    await addNotification({
      title: '🛠️ Damage Ticket Resolved',
      message: `Damage report #${report.id} on Asset ${report.assetBarcode || report.assetId} marked as ${report.status}.`,
      type: 'success',
      city: 'Indore (Head Office)',
      orderId: report.orderId || '',
      category: 'damage'
    });

    return res.json({
      success: true,
      message: `Damage report updated to ${report.status}`,
      data: report
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
