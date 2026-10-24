const Document = require('../models/Document');
const Medication = require('../models/Medication');
const Appointment = require('../models/Appointment');
const Timeline = require('../models/Timeline');
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const AgentAction = require('../models/AgentAction');
const WellnessRecommendation = require('../models/WellnessRecommendation');
const healthTrendsService = require('./healthTrendsService');
const patientProfileService = require('./patientProfileService');
const { sanitizeObjectId } = require('../utils/idSanitizer');

class DashboardService {
  async getDashboardData(userId, patientProfileId = null) {
    // 1. Fetch user profile for customized greeting
    const user = await User.findById(userId).select('name email preferredLanguage');

    // 2. Resolve active patient profile safely
    const cleanProfileId = sanitizeObjectId(patientProfileId);
    let activeProfile = null;
    if (cleanProfileId) {
      activeProfile = await PatientProfile.findOne({ _id: cleanProfileId, userId });
    }
    if (!activeProfile) {
      activeProfile = await PatientProfile.findOne({ userId, isPrimary: true });
    }
    if (!activeProfile) {
      const profiles = await patientProfileService.getProfiles(userId);
      activeProfile = profiles[0] || null;
    }

    const profileFilter = activeProfile ? { patientProfileId: activeProfile._id } : {};

    const now = new Date();
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

    // 3. Fetch counts and datasets in parallel
    const [
      documentCount,
      activeMedicationCount,
      upcomingAppointmentCount,
      reviewRequiredCount,
      recentDocuments,
      upcomingAppointments,
      overdueFollowups,
      medications,
      recentTimeline,
      docsWithLabs,
      pendingAgentActions,
      wellnessRecommendations,
      trends,
    ] = await Promise.all([
      Document.countDocuments({ userId, ...profileFilter }),
      Medication.countDocuments({ userId, status: 'ACTIVE', ...profileFilter }),
      Appointment.countDocuments({
        userId,
        status: 'UPCOMING',
        date: { $gte: startOfToday },
        ...profileFilter,
      }),
      Document.countDocuments({ userId, 'structuredData.reviewStatus': 'REVIEW_REQUIRED', ...profileFilter }),
      Document.find({ userId, ...profileFilter })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('fileName documentType status summary teluguSummary structuredData createdAt fileSize fileUrl'),
      Appointment.find({
        userId,
        status: 'UPCOMING',
        date: { $gte: startOfToday },
        ...profileFilter,
      })
        .sort({ date: 1 })
        .limit(3),
      Appointment.find({
        userId,
        status: 'UPCOMING',
        date: { $lt: now },
        ...profileFilter,
      })
        .sort({ date: 1 })
        .limit(3),
      Medication.find({ userId, status: 'ACTIVE', ...profileFilter })
        .sort({ createdAt: -1 })
        .limit(5),
      Timeline.find({ userId, ...profileFilter })
        .sort({ date: -1 })
        .limit(5),
      Document.find({ userId, 'structuredData.labResults.0': { $exists: true }, ...profileFilter })
        .sort({ createdAt: -1 })
        .select('structuredData.labResults structuredData.documentDate fileName documentType createdAt'),
      AgentAction.find({ userId, status: 'PROPOSED', ...profileFilter })
        .sort({ createdAt: -1 })
        .limit(3),
      WellnessRecommendation.find({ userId, status: 'ACTIVE', ...profileFilter })
        .sort({ urgency: -1, createdAt: -1 })
        .limit(3),
      healthTrendsService.getTrends(userId, activeProfile?._id || null).catch(() => []),
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
    const hour = now.getHours();
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
        name: activeProfile?.name || user?.name || 'Patient',
        relationship: activeProfile?.relationship || 'Self',
        email: user?.email,
        profileId: activeProfile?._id || null,
      },
      activeProfile,
      greeting,
      stats: {
        documents: documentCount,
        medications: activeMedicationCount,
        appointments: upcomingAppointmentCount,
        overdueFollowups: overdueFollowups.length,
        totalLabResults,
        abnormalLabs: abnormalLabsCount,
        reviewRequired: reviewRequiredCount,
        pendingAgentActions: pendingAgentActions.length,
      },
      recentDocuments,
      upcomingAppointments,
      overdueFollowups,
      medications,
      recentTimeline,
      recentLabObservations,
      pendingAgentActions,
      wellnessRecommendations,
      topTrends: trends.slice(0, 3),
    };
  }
}

module.exports = new DashboardService();
