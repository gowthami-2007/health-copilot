const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const healthTrendsService = require('../../backend/src/services/healthTrendsService');
const Document = require('../../backend/src/models/Document');
const Appointment = require('../../backend/src/models/Appointment');
const User = require('../../backend/src/models/User');
const config = require('../../backend/src/config/env');

describe('Round 2: Health Trends & Longitudinal Preventive Insights Tests', () => {
  let testUserId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }
    await User.deleteMany({ email: /test_trends_.*@example\.com/ });
    await Document.deleteMany({ fileName: /Demo_Trend_Doc/ });
    await Appointment.deleteMany({ doctorName: /Dr\. Trend Followup/ });

    const user = await User.create({
      name: 'Trend Test Patient',
      email: `test_trends_${Date.now()}@example.com`,
      password: 'HashPassword123!',
      isEmailVerified: true,
    });
    testUserId = user._id.toString();

    // Create 3 historical documents with HbA1c and Total Cholesterol across dates
    await Document.create({
      userId: testUserId,
      fileName: 'Demo_Trend_Doc_1.pdf',
      fileUrl: '/uploads/demo1.pdf',
      fileType: 'application/pdf',
      fileSize: 12000,
      documentType: 'Blood Report',
      status: 'PROCESSED',
      structuredData: {
        documentDate: new Date('2026-01-15'),
        labResults: [
          {
            testName: 'HbA1c (Glycated Hemoglobin)',
            result: '6.8',
            numericValue: 6.8,
            unit: '%',
            referenceRange: '4.0 - 5.6 %',
            abnormalFlag: 'HIGH',
          },
          {
            testName: 'Total Cholesterol',
            result: '220',
            numericValue: 220,
            unit: 'mg/dL',
            referenceRange: '< 200 mg/dL',
            abnormalFlag: 'HIGH',
          },
        ],
      },
    });

    await Document.create({
      userId: testUserId,
      fileName: 'Demo_Trend_Doc_2.pdf',
      fileUrl: '/uploads/demo2.pdf',
      fileType: 'application/pdf',
      fileSize: 12000,
      documentType: 'Blood Report',
      status: 'PROCESSED',
      structuredData: {
        documentDate: new Date('2026-05-15'),
        labResults: [
          {
            testName: 'HbA1c (Glycated Hemoglobin)',
            result: '7.1',
            numericValue: 7.1,
            unit: '%',
            referenceRange: '4.0 - 5.6 %',
            abnormalFlag: 'HIGH',
          },
          {
            testName: 'Total Cholesterol',
            result: '210',
            numericValue: 210,
            unit: 'mg/dL',
            referenceRange: '< 200 mg/dL',
            abnormalFlag: 'HIGH',
          },
        ],
      },
    });

    await Document.create({
      userId: testUserId,
      fileName: 'Demo_Trend_Doc_3.pdf',
      fileUrl: '/uploads/demo3.pdf',
      fileType: 'application/pdf',
      fileSize: 12000,
      documentType: 'Blood Report',
      status: 'PROCESSED',
      structuredData: {
        documentDate: new Date('2026-09-15'),
        labResults: [
          {
            testName: 'HbA1c (Glycated Hemoglobin)',
            result: '7.4',
            numericValue: 7.4,
            unit: '%',
            referenceRange: '4.0 - 5.6 %',
            abnormalFlag: 'HIGH',
          },
          {
            testName: 'Total Cholesterol',
            result: '195',
            numericValue: 195,
            unit: 'mg/dL',
            referenceRange: '< 200 mg/dL',
            abnormalFlag: 'NORMAL',
          },
        ],
      },
    });

    // Create an overdue appointment for preventive insights
    await Appointment.create({
      userId: testUserId,
      doctorName: 'Dr. Trend Followup',
      specialty: 'Endocrinology',
      date: new Date('2026-08-01'), // past date
      time: '11:00 AM',
      reason: 'Diabetic Review',
      status: 'UPCOMING',
      isOverdueFollowup: true,
    });
  });

  after(async () => {
    await User.deleteMany({ email: /test_trends_.*@example\.com/ });
    await Document.deleteMany({ fileName: /Demo_Trend_Doc/ });
    await Appointment.deleteMany({ doctorName: /Dr\. Trend Followup/ });
    await mongoose.disconnect();
  });

  test('Calculates chronological trends with correct counts and sorting', async () => {
    const trends = await healthTrendsService.getTrends(testUserId);
    assert.ok(Array.isArray(trends));

    const hba1c = trends.find((t) => t.key === 'hba1c');
    assert.ok(hba1c);
    assert.strictEqual(hba1c.measurementCount, 3);
    assert.strictEqual(hba1c.measurements[0].value, 6.8);
    assert.strictEqual(hba1c.measurements[1].value, 7.1);
    assert.strictEqual(hba1c.measurements[2].value, 7.4);
  });

  test('Computes delta, percentage change, and clinical direction', async () => {
    const trends = await healthTrendsService.getTrends(testUserId);

    const hba1c = trends.find((t) => t.key === 'hba1c');
    // From 7.1 to 7.4 is +0.3
    assert.strictEqual(hba1c.delta, 0.3);
    assert.strictEqual(hba1c.direction, 'WORSENING');
    assert.ok(hba1c.clinicalInterpretation.includes('upward change'));

    const chol = trends.find((t) => t.key === 'total_cholesterol');
    // From 210 to 195 is -15
    assert.strictEqual(chol.delta, -15);
    assert.strictEqual(chol.direction, 'IMPROVING');
    assert.ok(chol.clinicalInterpretation.includes('Favorable reduction'));
  });

  test('Generates actionable preventive insights for abnormal labs and overdue visits', async () => {
    const insights = await healthTrendsService.getPreventiveInsights(testUserId);
    assert.ok(Array.isArray(insights));

    const labFlag = insights.find((i) => i.metricKey === 'hba1c');
    assert.ok(labFlag);
    assert.strictEqual(labFlag.urgency, 'HIGH');
    assert.ok(labFlag.explanation.includes('7.4 % is outside the laboratory reference range'));
    assert.ok(labFlag.recommendedDoctorDiscussion);

    const overdueApt = insights.find((i) => i.type === 'OVERDUE_FOLLOWUP');
    assert.ok(overdueApt);
    assert.ok(overdueApt.title.includes('Dr. Trend Followup'));
    assert.strictEqual(overdueApt.urgency, 'HIGH');
  });
});
