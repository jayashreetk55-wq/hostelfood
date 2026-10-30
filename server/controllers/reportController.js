/**
 * reportController.js — Comprehensive reports for SIT Hostel Food Waste & Carbon Emissions
 * Siddaganga Institute of Technology (SIT), Tumakuru, Karnataka
 */
const reportModel = require('../models/reportModel');

// Helper to sum numeric columns
function calculateTotals(rows) {
  return {
    total_prepared_kg:  parseFloat(rows.reduce((s, r) => s + (Number(r.total_prepared_kg  || r.quantity_prepared  || 0)), 0).toFixed(2)),
    total_served_kg:    parseFloat(rows.reduce((s, r) => s + (Number(r.total_served_kg    || r.quantity_served    || 0)), 0).toFixed(2)),
    total_leftover_kg:  parseFloat(rows.reduce((s, r) => s + (Number(r.total_leftover_kg  || r.quantity_leftover  || 0)), 0).toFixed(2)),
    total_discarded_kg: parseFloat(rows.reduce((s, r) => s + (Number(r.total_discarded_kg || r.quantity_discarded || 0)), 0).toFixed(2)),
    total_waste_kg:     parseFloat(rows.reduce((s, r) => s + (Number(r.total_waste_kg     || 0)), 0).toFixed(2)),
    total_co2_kg:       parseFloat(rows.reduce((s, r) => s + (Number(r.total_co2_kg       || r.carbon_emission_kg || 0)), 0).toFixed(3)),
    record_count:       rows.reduce((s, r) => s + (Number(r.record_count || 1)), 0)
  };
}

// ── Daily Report ───────────────────────────────────────────
async function getDailyReport(req, res, next) {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const hostelId = req.query.hostel_id || null;
    const entries = await reportModel.getDailyDetailedReport(date, hostelId);
    const totals = calculateTotals(entries);
    res.json({ date, entries, totals });
  } catch (err) { next(err); }
}

// ── Weekly Report ──────────────────────────────────────────
async function getWeeklyReport(req, res, next) {
  try {
    let { startDate, endDate, hostel_id } = req.query;
    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    if (!startDate) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - 6);
      startDate = d.toISOString().split('T')[0];
    }

    const rows = await reportModel.getWeeklyDetailedReport(startDate, endDate, hostel_id);
    const totals = calculateTotals(rows);
    res.json({ startDate, endDate, rows, totals });
  } catch (err) { next(err); }
}

// ── Monthly Report ─────────────────────────────────────────
async function getMonthlyReport(req, res, next) {
  try {
    const year  = Number(req.query.year)  || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const hostelId = req.query.hostel_id || null;

    const rows = await reportModel.getMonthlyReport(year, month, hostelId);
    const totals = calculateTotals(rows);
    res.json({ year, month, rows, totals });
  } catch (err) { next(err); }
}

// ── Semester Report ────────────────────────────────────────
async function getSemesterReport(req, res, next) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const semester = (req.query.semester || (now.getMonth() >= 7 ? 'odd' : 'even')).toLowerCase();
    const academicYear = req.query.academic_year || (now.getMonth() >= 7 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`);
    const hostelId = req.query.hostel_id || null;

    const [startYearStr, endYearStr] = academicYear.includes('-')
      ? academicYear.split('-')
      : [academicYear, String(Number(academicYear) + 1)];

    let startDate, endDate;
    if (semester === 'odd') {
      startDate = `${startYearStr}-08-01`;
      endDate   = `${startYearStr}-12-31`;
    } else {
      startDate = `${endYearStr}-01-01`;
      endDate   = `${endYearStr}-06-30`;
    }

    const rows = await reportModel.getSemesterDetailedReport(startDate, endDate, hostelId);
    const totals = calculateTotals(rows);
    res.json({ academicYear, semester, startDate, endDate, rows, totals });
  } catch (err) { next(err); }
}

// ── Hostel-Wise Report ─────────────────────────────────────
async function getHostelWiseReport(req, res, next) {
  try {
    const startDate = req.query.startDate || '2020-01-01';
    const endDate   = req.query.endDate   || new Date().toISOString().split('T')[0];
    const rows = await reportModel.getHostelWiseDetailedReport(startDate, endDate);
    const totals = calculateTotals(rows);
    res.json({ startDate, endDate, rows, totals });
  } catch (err) { next(err); }
}

// ── Meal-Wise Report ───────────────────────────────────────
async function getMealWiseReport(req, res, next) {
  try {
    const startDate = req.query.startDate || '2020-01-01';
    const endDate   = req.query.endDate   || new Date().toISOString().split('T')[0];
    const hostelId  = req.query.hostel_id || null;
    const rows = await reportModel.getMealWiseDetailedReport(startDate, endDate, hostelId);
    const totals = calculateTotals(rows);
    res.json({ startDate, endDate, rows, totals });
  } catch (err) { next(err); }
}

// ── Food Item Stats ────────────────────────────────────────
async function getFoodItemStats(req, res, next) {
  try {
    const { startDate = '2020-01-01', endDate = new Date().toISOString().split('T')[0] } = req.query;
    const stats = await reportModel.getFoodItemStats(startDate, endDate);
    res.json({ stats });
  } catch (err) { next(err); }
}

// ── Export CSV ─────────────────────────────────────────────
async function exportCSV(req, res, next) {
  try {
    const { startDate, endDate, hostel_id, meal_type } = req.query;
    const rows = await reportModel.getDetailedRecordsForExport({
      startDate,
      endDate,
      hostelId: hostel_id,
      mealType: meal_type
    });

    const headers = [
      'Date', 'Time', 'Hostel', 'Mess', 'Meal Type', 'Food Item', 'Category',
      'Prepared Qty', 'Served Qty', 'Leftover Qty', 'Discarded Qty', 'Unit',
      'Total Waste (kg)', 'CO2e (kg)', 'Emission Factor (kg CO2e/kg)', 'Factor Source',
      'Reason for Waste', 'Remarks'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
    };

    let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
    csv += headers.map(escapeCsv).join(',') + '\r\n';

    for (const r of rows) {
      const line = [
        r.date,
        r.time || '',
        r.hostel_name,
        r.mess_name || '',
        r.meal_type,
        r.food_name,
        r.category,
        r.quantity_prepared,
        r.quantity_served,
        r.quantity_leftover,
        r.quantity_discarded,
        r.unit,
        r.total_waste_kg,
        r.carbon_emission_kg,
        r.emission_factor,
        r.factor_source || '',
        r.reason || '',
        r.remarks || ''
      ];
      csv += line.map(escapeCsv).join(',') + '\r\n';
    }

    const filename = `SIT_Hostel_Food_Waste_Report_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) { next(err); }
}

// ── Export Excel (.xls HTML table) ─────────────────────────
async function exportExcel(req, res, next) {
  try {
    const { startDate, endDate, hostel_id, meal_type } = req.query;
    const rows = await reportModel.getDetailedRecordsForExport({
      startDate,
      endDate,
      hostelId: hostel_id,
      mealType: meal_type
    });

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>SIT Food Waste Records</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          th { background-color: #0f172a; color: #38bdf8; font-weight: bold; padding: 8px; border: 1px solid #cbd5e1; }
          td { padding: 6px; border: 1px solid #e2e8f0; font-family: Arial, sans-serif; font-size: 12px; }
          .header-title { font-size: 16px; font-weight: bold; color: #1e3a8a; }
          .num { mso-number-format:"0\\.00"; text-align: right; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="18" class="header-title">Siddaganga Institute of Technology (SIT), Tumakuru, Karnataka</td></tr>
          <tr><td colspan="18" style="font-weight:bold;color:#475569">SIT Hostel Food Waste & Carbon Emission Monitoring System Report</td></tr>
          <tr><td colspan="18" style="color:#64748b">Generated: ${new Date().toLocaleString()}</td></tr>
          <tr></tr>
          <thead>
            <tr>
              <th>Date</th><th>Time</th><th>Hostel</th><th>Mess</th><th>Meal Type</th>
              <th>Food Item</th><th>Category</th><th>Prepared Qty</th><th>Served Qty</th>
              <th>Leftover Qty</th><th>Discarded Qty</th><th>Unit</th><th>Total Waste (kg)</th>
              <th>CO2e (kg)</th><th>Emission Factor</th><th>Source</th><th>Reason</th><th>Remarks</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const r of rows) {
      html += `
        <tr>
          <td>${r.date || ''}</td>
          <td>${r.time || ''}</td>
          <td>${r.hostel_name || ''}</td>
          <td>${r.mess_name || ''}</td>
          <td>${r.meal_type || ''}</td>
          <td>${r.food_name || ''}</td>
          <td>${r.category || ''}</td>
          <td class="num">${r.quantity_prepared || 0}</td>
          <td class="num">${r.quantity_served || 0}</td>
          <td class="num">${r.quantity_leftover || 0}</td>
          <td class="num">${r.quantity_discarded || 0}</td>
          <td>${r.unit || 'kg'}</td>
          <td class="num">${r.total_waste_kg || 0}</td>
          <td class="num">${r.carbon_emission_kg || 0}</td>
          <td class="num">${r.emission_factor || ''}</td>
          <td>${r.factor_source || ''}</td>
          <td>${r.reason || ''}</td>
          <td>${r.remarks || ''}</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const filename = `SIT_Hostel_Food_Waste_Report_${new Date().toISOString().split('T')[0]}.xls`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  } catch (err) { next(err); }
}

module.exports = {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getSemesterReport,
  getHostelWiseReport,
  getMealWiseReport,
  getFoodItemStats,
  exportCSV,
  exportExcel
};
