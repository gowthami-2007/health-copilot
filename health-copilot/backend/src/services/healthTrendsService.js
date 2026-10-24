const Document = require('../models/Document');
const Appointment = require('../models/Appointment');

// Standardized clinical lab metric definitions
const TRACKED_METRICS = [
  {
    key: 'hba1c',
    displayName: 'HbA1c (Glycated Hemoglobin)',
    canonicalUnit: '%',
    matcher: /hba1c|glycated\s*hemoglobin/i,
    lowerIsBetter: true,
    healthyRange: '4.0 - 5.6 %',
    clinicalSignificance: 'Indicator of average blood glucose control over past 2-3 months.',
    repeatIntervalMonths: 3,
  },
  {
    key: 'fasting_glucose',
    displayName: 'Fasting Blood Glucose',
    canonicalUnit: 'mg/dL',
    matcher: /fasting\s*(?:blood\s*)?glucose|fasting\s*(?:blood\s*)?sugar|fbs\b/i,
    lowerIsBetter: true,
    healthyRange: '70 - 99 mg/dL',
    clinicalSignificance: 'Baseline blood sugar level measured after an overnight fast.',
    repeatIntervalMonths: 6,
  },
  {
    key: 'total_cholesterol',
    displayName: 'Total Cholesterol',
    canonicalUnit: 'mg/dL',
    matcher: /total\s*cholesterol/i,
    lowerIsBetter: true,
    healthyRange: '< 200 mg/dL',
    clinicalSignificance: 'Overall measure of circulating blood cholesterol and lipids.',
    repeatIntervalMonths: 6,
  },
  {
    key: 'ldl_cholesterol',
    displayName: 'LDL (Bad) Cholesterol',
    canonicalUnit: 'mg/dL',
    matcher: /ldl\s*(?:cholesterol)?|low\s*density/i,
    lowerIsBetter: true,
    healthyRange: '< 100 mg/dL',
    clinicalSignificance: 'Atherogenic cholesterol associated with plaque accumulation in arteries.',
    repeatIntervalMonths: 6,
  },
  {
    key: 'hdl_cholesterol',
    displayName: 'HDL (Good) Cholesterol',
    canonicalUnit: 'mg/dL',
    matcher: /hdl\s*(?:cholesterol)?|high\s*density/i,
    lowerIsBetter: false, // Higher is protective
    healthyRange: '> 40 mg/dL',
    clinicalSignificance: 'Cardioprotective cholesterol that transports fats away from vessel walls.',
    repeatIntervalMonths: 6,
  },
  {
    key: 'triglycerides',
    displayName: 'Serum Triglycerides',
    canonicalUnit: 'mg/dL',
    matcher: /triglycerides?/i,
    lowerIsBetter: true,
    healthyRange: '< 150 mg/dL',
    clinicalSignificance: 'Fat molecules in the bloodstream used for energy storage.',
    repeatIntervalMonths: 6,
  },
  {
    key: 'hemoglobin',
    displayName: 'Hemoglobin',
    canonicalUnit: 'g/dL',
    matcher: /hemo?globin|hb\b/i,
    targetNormalRange: [13.0, 17.0],
    healthyRange: '13.0 - 17.0 g/dL',
    clinicalSignificance: 'Oxygen-carrying protein in circulating red blood cells.',
    repeatIntervalMonths: 12,
  },
  {
    key: 'platelets',
    displayName: 'Platelet Count',
    canonicalUnit: '/mcL',
    matcher: /platelets?|platelet\s*count/i,
    targetNormalRange: [150000, 450000],
    healthyRange: '150,000 - 450,000 /mcL',
    clinicalSignificance: 'Blood cell fragments vital for hemostasis and clotting.',
    repeatIntervalMonths: 12,
  },
  {
    key: 'creatinine',
    displayName: 'Serum Creatinine',
    canonicalUnit: 'mg/dL',
    matcher: /serum\s*creatinine|creatinine/i,
    lowerIsBetter: true,
    healthyRange: '0.6 - 1.2 mg/dL',
    clinicalSignificance: 'Waste product filtered by kidneys reflecting glomerular filtration.',
    repeatIntervalMonths: 6,
  },
];

class HealthTrendsService {
  /**
   * Retrieves and computes longitudinal health trends for a patient profile.
   */
  async getTrends(userId, patientProfileId = null) {
    const docQuery = { userId, status: 'PROCESSED' };
    if (patientProfileId) {
      docQuery.patientProfileId = patientProfileId;
    }

    const documents = await Document.find(docQuery)
      .sort({ createdAt: 1 })
      .select('fileName documentType structuredData createdAt');

    // Extract all structured lab results into standardized test buckets
    const metricSeriesMap = {};
    for (const m of TRACKED_METRICS) {
      metricSeriesMap[m.key] = {
        key: m.key,
        displayName: m.displayName,
        canonicalUnit: m.canonicalUnit,
        healthyRange: m.healthyRange,
        clinicalSignificance: m.clinicalSignificance,
        measurements: [],
      };
    }

    for (const doc of documents) {
      const docDate = doc.structuredData?.documentDate || doc.createdAt;
      const labResults = doc.structuredData?.labResults || [];

      for (const lab of labResults) {
        if (!lab.testName) continue;
        const testName = lab.testName.trim();

        // Match against tracked metrics
        for (const metricDef of TRACKED_METRICS) {
          if (metricDef.matcher.test(testName)) {
            let numericVal = lab.numericValue;
            if (numericVal === null || numericVal === undefined) {
              const parsed = parseFloat(String(lab.result).replace(/[^\d.-]/g, ''));
              if (!isNaN(parsed)) numericVal = parsed;
            }

            if (numericVal !== null && !isNaN(numericVal)) {
              metricSeriesMap[metricDef.key].measurements.push({
                date: docDate,
                formattedDate: new Date(docDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
                value: numericVal,
                displayValue: `${numericVal} ${lab.unit || metricDef.canonicalUnit}`.trim(),
                unit: lab.unit || metricDef.canonicalUnit,
                referenceRange: lab.referenceRange || metricDef.healthyRange,
                abnormalFlag: lab.abnormalFlag || 'NORMAL',
                sourceDocumentId: doc._id,
                documentName: doc.fileName,
              });
            }
            break;
          }
        }
      }
    }

    // Process each series: sort chronologically and compute trend insights
    const processedTrends = [];
    for (const metricDef of TRACKED_METRICS) {
      const series = metricSeriesMap[metricDef.key];
      // Sort measurements ascending by date
      series.measurements.sort((a, b) => new Date(a.date) - new Date(b.date));

      if (series.measurements.length > 0) {
        const count = series.measurements.length;
        const latest = series.measurements[count - 1];
        const previous = count > 1 ? series.measurements[count - 2] : null;

        let delta = null;
        let percentageChange = null;
        let direction = 'STABLE';
        let clinicalInterpretation = 'Single recorded baseline measurement. Longitudinal trend will update as further reports are uploaded.';

        if (previous) {
          delta = Math.round((latest.value - previous.value) * 100) / 100;
          if (previous.value !== 0) {
            percentageChange = Math.round((delta / previous.value) * 1000) / 10;
          }

          if (Math.abs(delta) < 0.05) {
            direction = 'STABLE';
            clinicalInterpretation = `Your ${series.displayName} is stable across your last two records (${previous.value} -> ${latest.value} ${latest.unit}).`;
          } else if (metricDef.lowerIsBetter !== undefined) {
            if (metricDef.lowerIsBetter) {
              direction = delta < 0 ? 'IMPROVING' : 'WORSENING';
              clinicalInterpretation = delta < 0
                ? `Favorable reduction in ${series.displayName} of ${Math.abs(delta)} ${latest.unit} (${Math.abs(percentageChange)}% decrease).`
                : `Observed upward change in ${series.displayName} of ${delta} ${latest.unit} (${percentageChange}% increase). Consider discussing with your physician.`;
            } else {
              // Higher is better (e.g. HDL)
              direction = delta > 0 ? 'IMPROVING' : 'WORSENING';
              clinicalInterpretation = delta > 0
                ? `Favorable elevation in protective ${series.displayName} of ${delta} ${latest.unit}.`
                : `Observed decrease in ${series.displayName} of ${Math.abs(delta)} ${latest.unit}.`;
            }
          } else if (metricDef.targetNormalRange) {
            const [minNorm, maxNorm] = metricDef.targetNormalRange;
            const prevDistance = Math.abs(previous.value - (minNorm + maxNorm) / 2);
            const latestDistance = Math.abs(latest.value - (minNorm + maxNorm) / 2);
            direction = latestDistance < prevDistance ? 'IMPROVING' : 'WORSENING';
            clinicalInterpretation = `${series.displayName} measured ${latest.value} ${latest.unit} on ${latest.formattedDate} compared to ${previous.value} ${previous.unit} previously.`;
          }
        }

        processedTrends.push({
          ...series,
          measurementCount: count,
          latest,
          previous,
          delta,
          percentageChange,
          direction,
          clinicalInterpretation,
          hasMultiplePoints: count > 1,
        });
      }
    }

    return processedTrends;
  }

  /**
   * Generates actionable preventive insights combining abnormal labs, repeat testing intervals, and overdue visits.
   */
  async getPreventiveInsights(userId, patientProfileId = null) {
    const trends = await this.getTrends(userId, patientProfileId);
    const insights = [];

    // 1. Identify abnormal and worsening trends
    for (const t of trends) {
      const latest = t.latest;
      if (!latest) continue;

      if (latest.abnormalFlag === 'HIGH' || latest.abnormalFlag === 'LOW' || latest.abnormalFlag === 'ABNORMAL') {
        const isWorsening = t.direction === 'WORSENING';
        insights.push({
          id: `insight_abnormal_${t.key}`,
          type: 'LAB_FLAG',
          urgency: isWorsening ? 'HIGH' : 'MEDIUM',
          title: `${t.displayName}: Result ${latest.abnormalFlag}`,
          metricKey: t.key,
          currentValue: `${latest.value} ${latest.unit}`,
          referenceRange: latest.referenceRange,
          testDate: latest.formattedDate,
          sourceDocumentId: latest.sourceDocumentId,
          documentName: latest.documentName,
          explanation: `Your recorded ${t.displayName} of ${latest.value} ${latest.unit} is outside the laboratory reference range of ${latest.referenceRange}.`,
          reasonForInsight: isWorsening
            ? `Result remains outside reference limits with an upward change of ${t.delta} ${latest.unit} across recent visits.`
            : 'Result is outside standard laboratory reference limits.',
          limitations: 'A reference range is an informational laboratory guide and does not independently establish a diagnosis.',
          recommendedDoctorDiscussion: `Ask your doctor if repeat testing, lifestyle adjustments, or medication reviews are recommended for your ${t.displayName}.`,
        });
      }
    }

    // 2. Identify overdue medical appointments / follow-ups
    const overdueQuery = {
      userId,
      status: 'UPCOMING',
      date: { $lt: new Date() },
    };
    if (patientProfileId) overdueQuery.patientProfileId = patientProfileId;

    const overdueApts = await Appointment.find(overdueQuery).sort({ date: 1 });
    for (const apt of overdueApts) {
      const formattedAptDate = new Date(apt.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      insights.push({
        id: `insight_overdue_${apt._id}`,
        type: 'OVERDUE_FOLLOWUP',
        urgency: 'HIGH',
        title: `Overdue Follow-up: Dr. ${apt.doctorName}`,
        metricKey: 'appointment',
        currentValue: `${apt.specialty} Consultation`,
        referenceRange: 'Scheduled Follow-up',
        testDate: formattedAptDate,
        sourceDocumentId: apt.sourceDocumentId,
        documentName: apt.sourceDocumentId ? 'Consultation Record' : 'Clinical Visit',
        explanation: `Scheduled follow-up with Dr. ${apt.doctorName} was set for ${formattedAptDate} and has passed.`,
        reasonForInsight: 'Explicit follow-up consultation noted in medical records.',
        limitations: 'Missing follow-up status may occur if you attended without recording completion.',
        recommendedDoctorDiscussion: `Contact Dr. ${apt.doctorName} or clinic to reschedule your review visit for ${apt.reason || apt.specialty}.`,
      });
    }

    return insights;
  }
}

module.exports = new HealthTrendsService();
