/**
 * Water Company Report Generation Job
 * Generates formatted reports for water company submission
 * Includes lab results, exceedances, discharge volumes, and compliance data
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import PDFDocument from 'pdfkit';

export interface WaterCompanyReportJobData {
  report_id: string;
  company_id: string;
  site_id: string;
  consent_id?: string;
  report_type: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'EXCEEDANCE' | 'CUSTOM';
  period_start: string;
  period_end: string;
  water_company?: string;
  generated_by: string;
}

// UK Water Company configurations
const WATER_COMPANY_CONFIG: Record<string, { name: string; logo?: string; format?: string }> = {
  TW: { name: 'Thames Water', format: 'STANDARD' },
  ST: { name: 'Severn Trent', format: 'STANDARD' },
  UU: { name: 'United Utilities', format: 'STANDARD' },
  AW: { name: 'Anglian Water', format: 'STANDARD' },
  YW: { name: 'Yorkshire Water', format: 'STANDARD' },
  NW: { name: 'Northumbrian Water', format: 'STANDARD' },
  SW: { name: 'Southern Water', format: 'STANDARD' },
  SWW: { name: 'South West Water', format: 'STANDARD' },
  WX: { name: 'Wessex Water', format: 'STANDARD' },
  DC: { name: 'Dwr Cymru (Welsh Water)', format: 'STANDARD' },
  SCW: { name: 'Scottish Water', format: 'STANDARD' },
};

const COLORS = {
  PRIMARY: '#1E40AF',
  SUCCESS: '#16A34A',
  WARNING: '#F59E0B',
  DANGER: '#DC2626',
  GRAY: '#6B7280',
  BLACK: '#1F2937',
};

export async function processWaterCompanyReportJob(job: Job<WaterCompanyReportJobData>): Promise<void> {
  const { report_id, company_id, site_id, consent_id, report_type, period_start, period_end, water_company, generated_by } = job.data;

  const generationStartTime = Date.now();

  try {
    // Update status to GENERATING
    await supabaseAdmin
      .from('water_company_reports')
      .update({ status: 'GENERATING', updated_at: new Date().toISOString() })
      .eq('id', report_id);

    await job.updateProgress(10);

    // Collect report data
    const reportData = await collectReportData(company_id, site_id, consent_id, period_start, period_end);

    await job.updateProgress(30);

    // Generate the PDF report
    const pdfBuffer = await generateWaterCompanyReportPDF(reportData, {
      report_type,
      period_start,
      period_end,
      water_company,
    });

    await job.updateProgress(70);

    // Upload to Supabase Storage
    const storagePath = await uploadReportToStorage(report_id, pdfBuffer);

    await job.updateProgress(90);

    // Calculate generation time
    const generationEndTime = Date.now();
    const generationSeconds = Math.floor((generationEndTime - generationStartTime) / 1000);

    // Update report record
    await supabaseAdmin
      .from('water_company_reports')
      .update({
        status: 'COMPLETED',
        file_path: storagePath,
        file_size_bytes: pdfBuffer.length,
        generation_seconds: generationSeconds,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        summary: {
          total_samples: reportData.labResults.length,
          exceedances: reportData.exceedances.length,
          parameters_monitored: reportData.parameters.length,
          total_discharge_volume: reportData.totalDischargeVolume,
          compliance_rate: reportData.complianceRate,
        },
      })
      .eq('id', report_id);

    // Create notification
    const { error: notifyError } = await supabaseAdmin.from('notifications').insert({
      user_id: generated_by,
      company_id: company_id,
      site_id: site_id,
      notification_type: 'SYSTEM_ALERT',
      channel: 'EMAIL',
      priority: 'NORMAL',
      subject: 'Water Company Report Ready',
      body_text: `Your ${report_type.toLowerCase()} water company report for ${new Date(period_start).toLocaleDateString('en-GB')} - ${new Date(period_end).toLocaleDateString('en-GB')} is ready for download.`,
      entity_type: 'water_company_report',
      entity_id: report_id,
      status: 'PENDING',
      scheduled_for: new Date().toISOString(),
    });

    if (notifyError) {
      console.error(`Failed to create water company report notification for ${report_id}:`, notifyError);
    }

    await job.updateProgress(100);

    console.log(`Water company report generated: ${report_id} in ${generationSeconds} seconds`);
  } catch (error: any) {
    console.error(`Water company report job failed: ${report_id}`, error);

    // Update status to FAILED
    await supabaseAdmin
      .from('water_company_reports')
      .update({
        status: 'FAILED',
        error_message: error.message || 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', report_id);

    throw error;
  }
}

interface ReportData {
  site: any;
  consent: any;
  parameters: any[];
  labResults: any[];
  exceedances: any[];
  dischargeVolumes: any[];
  totalDischargeVolume: number;
  complianceRate: number;
}

async function collectReportData(
  companyId: string,
  siteId: string,
  consentId: string | undefined,
  periodStart: string,
  periodEnd: string
): Promise<ReportData> {
  // Fetch site details
  const { data: site } = await supabaseAdmin
    .from('sites')
    .select('id, name, address_line_1, city, postcode, water_company')
    .eq('id', siteId)
    .single();

  // Fetch consent if specified
  let consent = null;
  if (consentId) {
    const { data } = await supabaseAdmin
      .from('documents')
      .select('id, filename, document_type, metadata')
      .eq('id', consentId)
      .single();
    consent = data;
  }

  // Fetch parameters for the site
  const { data: parameters } = await supabaseAdmin
    .from('parameters')
    .select('id, parameter_type, limit_value, unit, limit_type, warning_threshold_percent')
    .eq('site_id', siteId)
    .eq('is_active', true);

  // Fetch lab results for the period
  const { data: labResults } = await supabaseAdmin
    .from('lab_results')
    .select(`
      id,
      parameter_id,
      sample_date,
      sample_id,
      recorded_value,
      unit,
      percentage_of_limit,
      is_exceedance,
      lab_reference,
      parameters(parameter_type, limit_value)
    `)
    .eq('site_id', siteId)
    .gte('sample_date', periodStart)
    .lte('sample_date', periodEnd)
    .order('sample_date', { ascending: true });

  // Fetch exceedances for the period
  const { data: exceedances } = await supabaseAdmin
    .from('exceedances')
    .select(`
      id,
      parameter_id,
      recorded_value,
      limit_value,
      percentage_of_limit,
      recorded_date,
      status,
      resolution_notes,
      water_company_notified,
      notification_date,
      parameters(parameter_type)
    `)
    .eq('site_id', siteId)
    .gte('recorded_date', periodStart)
    .lte('recorded_date', periodEnd)
    .order('recorded_date', { ascending: true });

  // Fetch discharge volumes for the period
  const { data: dischargeVolumes } = await supabaseAdmin
    .from('discharge_volumes')
    .select('id, volume_date, volume_m3, measurement_method, notes')
    .eq('site_id', siteId)
    .gte('volume_date', periodStart)
    .lte('volume_date', periodEnd)
    .order('volume_date', { ascending: true });

  // Calculate totals
  const totalDischargeVolume = (dischargeVolumes || []).reduce((sum, dv) => sum + (dv.volume_m3 || 0), 0);
  const totalSamples = (labResults || []).length;
  const exceedanceCount = (exceedances || []).length;
  const complianceRate = totalSamples > 0 ? Math.round(((totalSamples - exceedanceCount) / totalSamples) * 100) : 100;

  return {
    site: site || {},
    consent,
    parameters: parameters || [],
    labResults: labResults || [],
    exceedances: exceedances || [],
    dischargeVolumes: dischargeVolumes || [],
    totalDischargeVolume,
    complianceRate,
  };
}

async function generateWaterCompanyReportPDF(
  data: ReportData,
  options: {
    report_type: string;
    period_start: string;
    period_end: string;
    water_company?: string;
  }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const waterCompanyName = options.water_company
        ? WATER_COMPANY_CONFIG[options.water_company]?.name || options.water_company
        : data.site.water_company || 'Water Company';

      // Title Page
      doc.fontSize(24).fillColor(COLORS.PRIMARY).text('Trade Effluent Monitoring Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).fillColor(COLORS.BLACK).text(waterCompanyName, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor(COLORS.GRAY).text(
        `${options.report_type.replace('_', ' ')} Report`,
        { align: 'center' }
      );
      doc.moveDown(2);

      // Site Details
      doc.fontSize(14).fillColor(COLORS.BLACK).text('Site Details');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Site Name: ${data.site.name || 'N/A'}`);
      doc.text(`Address: ${[data.site.address_line_1, data.site.city, data.site.postcode].filter(Boolean).join(', ') || 'N/A'}`);
      doc.text(`Reporting Period: ${new Date(options.period_start).toLocaleDateString('en-GB')} - ${new Date(options.period_end).toLocaleDateString('en-GB')}`);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`);
      doc.moveDown(2);

      // Executive Summary
      doc.fontSize(14).fillColor(COLORS.BLACK).text('Executive Summary');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Summary boxes
      const summaryY = doc.y;
      const boxWidth = 120;
      const boxHeight = 60;

      // Samples Box
      doc.rect(50, summaryY, boxWidth, boxHeight).fillAndStroke('#E0F2FE', COLORS.PRIMARY);
      doc.fontSize(24).fillColor(COLORS.PRIMARY).text(String(data.labResults.length), 60, summaryY + 10, { width: boxWidth - 20, align: 'center' });
      doc.fontSize(9).fillColor(COLORS.GRAY).text('Total Samples', 60, summaryY + 40, { width: boxWidth - 20, align: 'center' });

      // Exceedances Box
      const exceedanceColor = data.exceedances.length > 0 ? COLORS.DANGER : COLORS.SUCCESS;
      doc.rect(180, summaryY, boxWidth, boxHeight).fillAndStroke(data.exceedances.length > 0 ? '#FEE2E2' : '#DCFCE7', exceedanceColor);
      doc.fontSize(24).fillColor(exceedanceColor).text(String(data.exceedances.length), 190, summaryY + 10, { width: boxWidth - 20, align: 'center' });
      doc.fontSize(9).fillColor(COLORS.GRAY).text('Exceedances', 190, summaryY + 40, { width: boxWidth - 20, align: 'center' });

      // Compliance Rate Box
      const complianceColor = data.complianceRate >= 95 ? COLORS.SUCCESS : data.complianceRate >= 80 ? COLORS.WARNING : COLORS.DANGER;
      doc.rect(310, summaryY, boxWidth, boxHeight).fillAndStroke(data.complianceRate >= 95 ? '#DCFCE7' : data.complianceRate >= 80 ? '#FEF3C7' : '#FEE2E2', complianceColor);
      doc.fontSize(24).fillColor(complianceColor).text(`${data.complianceRate}%`, 320, summaryY + 10, { width: boxWidth - 20, align: 'center' });
      doc.fontSize(9).fillColor(COLORS.GRAY).text('Compliance Rate', 320, summaryY + 40, { width: boxWidth - 20, align: 'center' });

      // Total Discharge Box
      doc.rect(440, summaryY, boxWidth, boxHeight).fillAndStroke('#F3E8FF', '#9333EA');
      doc.fontSize(16).fillColor('#9333EA').text(data.totalDischargeVolume.toLocaleString(), 450, summaryY + 12, { width: boxWidth - 20, align: 'center' });
      doc.fontSize(9).fillColor(COLORS.GRAY).text('m\u00B3', 450, summaryY + 30, { width: boxWidth - 20, align: 'center' });
      doc.text('Total Discharge', 450, summaryY + 42, { width: boxWidth - 20, align: 'center' });

      doc.y = summaryY + boxHeight + 30;

      // Parameters Monitored
      doc.addPage();
      doc.fontSize(14).fillColor(COLORS.BLACK).text('Consent Parameters');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      if (data.parameters.length > 0) {
        // Table header
        const tableTop = doc.y;
        doc.fontSize(9).fillColor(COLORS.GRAY);
        doc.text('Parameter', 50, tableTop, { width: 120 });
        doc.text('Limit', 170, tableTop, { width: 80 });
        doc.text('Unit', 250, tableTop, { width: 60 });
        doc.text('Limit Type', 310, tableTop, { width: 80 });
        doc.text('Warning %', 390, tableTop, { width: 70 });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();

        // Table rows
        doc.fontSize(9).fillColor(COLORS.BLACK);
        for (const param of data.parameters) {
          doc.moveDown(0.3);
          const rowY = doc.y;
          doc.text(param.parameter_type, 50, rowY, { width: 120 });
          doc.text(String(param.limit_value), 170, rowY, { width: 80 });
          doc.text(param.unit || '-', 250, rowY, { width: 60 });
          doc.text(param.limit_type || 'MAXIMUM', 310, rowY, { width: 80 });
          doc.text(`${param.warning_threshold_percent || 80}%`, 390, rowY, { width: 70 });
        }
      } else {
        doc.fontSize(10).fillColor(COLORS.GRAY).text('No parameters configured for this site.');
      }

      // Lab Results Section
      doc.addPage();
      doc.fontSize(14).fillColor(COLORS.BLACK).text('Lab Results');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      if (data.labResults.length > 0) {
        const tableTop = doc.y;
        doc.fontSize(8).fillColor(COLORS.GRAY);
        doc.text('Date', 50, tableTop, { width: 70 });
        doc.text('Parameter', 120, tableTop, { width: 90 });
        doc.text('Value', 210, tableTop, { width: 60 });
        doc.text('Limit', 270, tableTop, { width: 60 });
        doc.text('% of Limit', 330, tableTop, { width: 60 });
        doc.text('Status', 390, tableTop, { width: 70 });
        doc.text('Lab Ref', 460, tableTop, { width: 85 });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();

        doc.fontSize(8).fillColor(COLORS.BLACK);
        for (const result of data.labResults.slice(0, 50)) { // Limit to 50 rows per page
          if (doc.y > 700) {
            doc.addPage();
            doc.y = 50;
          }
          doc.moveDown(0.2);
          const rowY = doc.y;
          const paramInfo = result.parameters as any;

          doc.text(new Date(result.sample_date).toLocaleDateString('en-GB'), 50, rowY, { width: 70 });
          doc.text(paramInfo?.parameter_type || '-', 120, rowY, { width: 90 });
          doc.text(String(result.recorded_value), 210, rowY, { width: 60 });
          doc.text(String(paramInfo?.limit_value || '-'), 270, rowY, { width: 60 });
          doc.text(`${Math.round(result.percentage_of_limit)}%`, 330, rowY, { width: 60 });

          // Status with color
          const statusColor = result.is_exceedance ? COLORS.DANGER : COLORS.SUCCESS;
          doc.fillColor(statusColor).text(result.is_exceedance ? 'EXCEEDANCE' : 'COMPLIANT', 390, rowY, { width: 70 });
          doc.fillColor(COLORS.BLACK);

          doc.text(result.lab_reference || '-', 460, rowY, { width: 85 });
        }

        if (data.labResults.length > 50) {
          doc.moveDown();
          doc.fontSize(9).fillColor(COLORS.GRAY).text(`... and ${data.labResults.length - 50} more results. See appendix for full data.`);
        }
      } else {
        doc.fontSize(10).fillColor(COLORS.GRAY).text('No lab results recorded for this period.');
      }

      // Exceedances Section
      if (data.exceedances.length > 0) {
        doc.addPage();
        doc.fontSize(14).fillColor(COLORS.DANGER).text('Exceedance Report');
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);

        for (const exceedance of data.exceedances) {
          const paramInfo = exceedance.parameters as any;

          doc.fontSize(11).fillColor(COLORS.BLACK).text(`${paramInfo?.parameter_type || 'Unknown Parameter'} - ${new Date(exceedance.recorded_date).toLocaleDateString('en-GB')}`);
          doc.moveDown(0.3);
          doc.fontSize(9).fillColor(COLORS.GRAY);
          doc.text(`Recorded Value: ${exceedance.recorded_value} (Limit: ${exceedance.limit_value})`);
          doc.text(`Percentage of Limit: ${Math.round(exceedance.percentage_of_limit)}%`);
          doc.text(`Status: ${exceedance.status}`);
          if (exceedance.water_company_notified) {
            doc.text(`Water Company Notified: ${new Date(exceedance.notification_date).toLocaleDateString('en-GB')}`);
          }
          if (exceedance.resolution_notes) {
            doc.moveDown(0.2);
            doc.text(`Resolution Notes: ${exceedance.resolution_notes}`);
          }
          doc.moveDown(0.8);
        }
      }

      // Discharge Volumes Section
      if (data.dischargeVolumes.length > 0) {
        doc.addPage();
        doc.fontSize(14).fillColor(COLORS.BLACK).text('Discharge Volumes');
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);

        const tableTop = doc.y;
        doc.fontSize(9).fillColor(COLORS.GRAY);
        doc.text('Date', 50, tableTop, { width: 100 });
        doc.text('Volume (m\u00B3)', 150, tableTop, { width: 100 });
        doc.text('Method', 250, tableTop, { width: 100 });
        doc.text('Notes', 350, tableTop, { width: 195 });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();

        doc.fontSize(9).fillColor(COLORS.BLACK);
        for (const volume of data.dischargeVolumes) {
          doc.moveDown(0.3);
          const rowY = doc.y;
          doc.text(new Date(volume.volume_date).toLocaleDateString('en-GB'), 50, rowY, { width: 100 });
          doc.text(volume.volume_m3.toLocaleString(), 150, rowY, { width: 100 });
          doc.text(volume.measurement_method || '-', 250, rowY, { width: 100 });
          doc.text(volume.notes || '-', 350, rowY, { width: 195 });
        }

        doc.moveDown();
        doc.fontSize(10).fillColor(COLORS.BLACK).text(`Total Discharge Volume: ${data.totalDischargeVolume.toLocaleString()} m\u00B3`, { align: 'right' });
      }

      // Footer
      doc.fontSize(8).fillColor(COLORS.GRAY);
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.text(
          `Page ${i + 1} of ${pageCount} | Generated by EcoComply | ${new Date().toISOString()}`,
          50,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 100 }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function uploadReportToStorage(reportId: string, pdfBuffer: Buffer): Promise<string> {
  const storage = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY).storage;
  const bucket = 'reports';
  const path = `water-company/${reportId}.pdf`;

  // Ensure bucket exists
  const { data: buckets } = await storage.listBuckets();
  if (!buckets?.find(b => b.name === bucket)) {
    await storage.createBucket(bucket, { public: false });
  }

  const { error } = await storage.from(bucket).upload(path, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload report: ${error.message}`);
  }

  return `${bucket}/${path}`;
}
