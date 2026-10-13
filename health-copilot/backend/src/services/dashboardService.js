const Document = require('../models/Document');
const Medication = require('../models/Medication');
const Appointment = require('../models/Appointment');
const Timeline = require('../models/Timeline');
const User = require('../models/User');

class DashboardService {
  async getDashboardData(userId) {
    // 1. Fetch user profile for customized greeting
    const user = await User.findById(userId).select('name email preferredLanguage');

    // 2. Fetch counts in parallel
    const [
      documentCount,
      activeMedicationCount,
      upcomingAppointmentCount,
      reviewRequiredCount,
      recentDocuments,
      upcomingAppointments,
      medications,
      recentTimeline,
      docsWithLabs,
    ] = await Promise.all([
      Document.countDocuments({ userId }),
      Medication.countDocuments({ userId, status: 'ACTIVE' }),
      Appointment.countDocuments({ userId, status: 'UPCOMING', date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Document.countDocuments({ userId, 'structuredData.reviewStatus': 'REVIEW_REQUIRED' }),
      Document.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('fileName documentType status summary teluguSummary structuredData createdAt fileSize fileUrl'),
      Appointment.find({
        userId,
        status: 'UPCOMING',
        date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      })
        .sort({ date: 1 })
        .limit(3),
      Medication.find({ userId, status: 'ACTIVE' })
        .sort({ createdAt: -1 })
        .limit(4),
      Timeline.find({ userId })
        .sort({ date: -1 })
        .limit(5),
      Document.find({ userId, 'structuredData.labResults.0': { $exists: true } })
        .sort({ createdAt: -1 })
        .select('structuredData.labResults structuredData.documentDate fileName documentType createdAt'),
    ]);

    let totalLabResults = 0;
    let abnormalLabsCount = 0;
    const recentLabObservations = [];

    for (const doc of docsWithLabs) {
      const labs = doc.structuredData?.labResults || [];
      for (const lab of labs) {
        totalLabResults++;
        if (lab.abnormalFlag && lab.abnormalFlag !== 'NORMAL') {
          abnormalLabsCount++;
        }
        if (recentLabObservations.length < 6) {
          recentLabObservations.push({
            testName: lab.testName,
            result: lab.result,
            unit: lab.unit,
            referenceRange: lab.referenceRange,
            abnormalFlag: lab.abnormalFlag,
            interpretation: lab.interpretation,
            documentId: doc._id,
            documentName: doc.fileName,
            date: doc.structuredData?.documentDate || doc.createdAt,
          });
        }
      }
    }

    // Determine greeting
    const hour = new Date().getHours();
    const isTe = user?.preferredLanguage === 'te';
    let greeting = isTe ? 'శుభోదయం' : 'Good morning';
    if (hour >= 12 && hour < 17) {
      greeting = isTe ? 'శుభ మధ్యాహ్నం' : 'Good afternoon';
    } else if (hour >= 17) {
      greeting = isTe ? 'శుభ సాయంత్రం' : 'Good evening';
    }

    return {
      user: {
        id: user?._id,
        name: user?.name || 'Patient',
        email: user?.email,
      },
      greeting,
      stats: {
        documents: documentCount,
        medications: activeMedicationCount,
        appointments: upcomingAppointmentCount,
        totalLabResults,
        abnormalLabs: abnormalLabsCount,
        reviewRequired: reviewRequiredCount,
      },
      recentDocuments,
      upcomingAppointments,
      medications,
      recentTimeline,
      recentLabObservations,
    };
  }
}

module.exports = new DashboardService();
