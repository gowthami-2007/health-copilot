const WellnessRecommendation = require('../models/WellnessRecommendation');
const PatientProfile = require('../models/PatientProfile');
const Document = require('../models/Document');
const Medication = require('../models/Medication');
const Appointment = require('../models/Appointment');
const healthTrendsService = require('./healthTrendsService');

class WellnessService {
  /**
   * Generates or retrieves personalized wellness recommendations for a patient profile.
   */
  async getRecommendations(userId, patientProfileId = null) {
    // 1. Resolve patient profile
    let profile = null;
    if (patientProfileId) {
      profile = await PatientProfile.findOne({ _id: patientProfileId, userId });
    }
    if (!profile) {
      profile = await PatientProfile.findOne({ userId, isPrimary: true });
    }

    // 2. Query clinical data
    const docQuery = { userId, status: 'PROCESSED' };
    if (profile?._id) docQuery.patientProfileId = profile._id;
    const documents = await Document.find(docQuery).sort({ createdAt: -1 }).limit(10);

    const medQuery = { userId, status: 'ACTIVE' };
    if (profile?._id) medQuery.patientProfileId = profile._id;
    const medications = await Medication.find(medQuery);

    const trends = await healthTrendsService.getTrends(userId, profile?._id || null);

    // 3. Generate candidate recommendations grounded in patient data
    const candidates = [];

    // Category 1: Diet and Nutrition
    const hba1cTrend = trends.find((t) => t.key === 'hba1c');
    const fbsTrend = trends.find((t) => t.key === 'fasting_glucose');
    const ldlTrend = trends.find((t) => t.key === 'ldl_cholesterol');
    const cholTrend = trends.find((t) => t.key === 'total_cholesterol');

    if ((hba1cTrend && hba1cTrend.latest?.value > 5.7) || (fbsTrend && fbsTrend.latest?.value > 100)) {
      candidates.push({
        title: 'Low Glycemic Dietary Balance',
        category: 'NUTRITION',
        practicalAction: 'Focus on whole grains, legumes, and fiber-rich vegetables while limiting refined sugars and sweetened drinks.',
        reason: `Your latest recorded blood sugar results (${hba1cTrend ? `HbA1c: ${hba1cTrend.latest.value}%` : `FBS: ${fbsTrend.latest.value} mg/dL`}) are elevated above reference limits.`,
        supportingRecords: hba1cTrend ? [{ recordType: 'Document', recordId: hba1cTrend.latest.sourceDocumentId, description: `HbA1c ${hba1cTrend.latest.value}%` }] : [],
        limitations: 'General nutritional guidance is informational. Consult your physician or registered dietitian for an individualized meal plan.',
        nextStep: 'Ask your doctor whether dietary modifications or nutritional counseling would be beneficial.',
        urgency: 'HIGH',
      });
    }

    if ((ldlTrend && ldlTrend.latest?.value > 100) || (cholTrend && cholTrend.latest?.value > 200)) {
      candidates.push({
        title: 'Heart-Healthy Saturated Fat Moderation',
        category: 'NUTRITION',
        practicalAction: 'Incorporate unsaturated fats (such as nuts, seeds, and olive oil) and soluble fiber (oats, beans) while moderating trans and saturated animal fats.',
        reason: `Your latest lipid panel recorded ${ldlTrend ? `LDL of ${ldlTrend.latest.value} mg/dL` : `Total Cholesterol of ${cholTrend.latest.value} mg/dL`}, above optimal cardiovascular target ranges.`,
        supportingRecords: ldlTrend ? [{ recordType: 'Document', recordId: ldlTrend.latest.sourceDocumentId, description: `LDL ${ldlTrend.latest.value} mg/dL` }] : [],
        limitations: 'Lipid management depends on overall cardiovascular risk factors evaluated by a licensed clinician.',
        nextStep: 'Discuss whether lipid-lowering dietary adjustments or medical management are appropriate for your individual risk.',
        urgency: 'MEDIUM',
      });
    }

    // Default nutrition recommendation if no metabolic flags
    if (candidates.length === 0) {
      candidates.push({
        title: 'Hydration and Whole Foods Routine',
        category: 'NUTRITION',
        practicalAction: 'Aim for 7 to 8 glasses of water daily and include varied colorful vegetables in meals.',
        reason: 'Maintaining consistent hydration and micronutrient intake supports healthy organ function and vitality.',
        supportingRecords: [],
        limitations: 'Fluid intake needs vary with heart or kidney conditions. Follow any specific fluid limits if advised by your physician.',
        nextStep: 'Review baseline daily water intake.',
        urgency: 'LOW',
      });
    }

    // Category 2: Physical Activity
    const age = profile?.dateOfBirth
      ? Math.floor((new Date() - new Date(profile.dateOfBirth)) / (365.25 * 24 * 3600 * 1000))
      : 40;

    candidates.push({
      title: 'Moderate Aerobic & Walking Habit',
      category: 'PHYSICAL_ACTIVITY',
      practicalAction: age > 60
        ? 'Engage in 20-30 minutes of low-impact walking on even ground or gentle stretching, 4-5 days per week.'
        : 'Incorporate 150 minutes of moderate-intensity activity (e.g. brisk walking, cycling, or swimming) spread across the week.',
      reason: `Regular low-impact exercise enhances insulin sensitivity, cardiovascular reserve, and joint mobility appropriate for age ${age}.`,
      supportingRecords: [],
      limitations: 'Stop immediately if you experience dizziness, shortness of breath, or chest discomfort. Clear any new exercise regimen with your physician.',
      nextStep: 'Confirm with your doctor before starting any vigorous exercise program.',
      urgency: 'MEDIUM',
    });

    // Category 3: Sleep Habits
    candidates.push({
      title: 'Circadian Sleep Hygiene Routine',
      category: 'SLEEP',
      practicalAction: 'Maintain a consistent sleep-wake schedule with a 45-minute screen-free wind-down period before bedtime in a cool, dark room.',
      reason: 'Quality sleep regulates cortisol levels, assists nighttime blood pressure dipping, and promotes immune recovery.',
      supportingRecords: [],
      limitations: 'Persistent insomnia or loud snoring with morning tiredness warrants clinical evaluation for sleep apnea.',
      nextStep: 'Set a consistent evening bedtime reminder.',
      urgency: 'LOW',
    });

    // Category 4: General Healthy Habits
    candidates.push({
      title: 'Stress Relief & Daily Mindful Breathing',
      category: 'HEALTHY_HABITS',
      practicalAction: 'Practice 5 to 10 minutes of diaphragmatic breathing (e.g., 4-7-8 breathing) during mid-day transition periods.',
      reason: 'Controlled slow breathing stimulates parasympathetic tone, reducing heart rate and autonomic vascular tension.',
      supportingRecords: [],
      limitations: 'Stress management practices complement but do not substitute for clinical mental health or cardiac care.',
      nextStep: 'Try a 5-minute breathing session today.',
      urgency: 'LOW',
    });

    // Category 5: Medication Adherence Support (if medications exist)
    if (medications.length > 0) {
      candidates.push({
        title: 'Medication Routine Anchoring',
        category: 'MEDICATION_ADHERENCE',
        practicalAction: `Pair taking your prescribed medicines (${medications.map((m) => m.name).slice(0, 3).join(', ')}) with a fixed daily habit like morning breakfast or evening dinner.`,
        reason: `You have ${medications.length} active prescribed medications. Habit stacking improves consistency and prevents missed doses.`,
        supportingRecords: [],
        limitations: 'Never alter dosages, skip doses, or double up after a missed dose without clinician instruction.',
        nextStep: 'Enable daily push or email reminders in your Medication tab.',
        urgency: 'HIGH',
      });
    }

    // Category 6: Follow-up Preparation
    const overdueFollowups = await Appointment.find({
      userId,
      status: 'UPCOMING',
      date: { $lt: new Date() },
    });

    if (overdueFollowups.length > 0) {
      const firstOverdue = overdueFollowups[0];
      candidates.push({
        title: 'Follow-Up Consultation Preparation',
        category: 'FOLLOWUP_PREP',
        practicalAction: `Prepare a written 3-question agenda for Dr. ${firstOverdue.doctorName} regarding your recent laboratory trends and medication tolerance.`,
        reason: `Your records indicate an overdue follow-up visit scheduled with Dr. ${firstOverdue.doctorName}. Structured visits maximize consultation time.`,
        supportingRecords: firstOverdue.sourceDocumentId ? [{ recordType: 'Appointment', recordId: firstOverdue._id, description: `Follow-up with Dr. ${firstOverdue.doctorName}` }] : [],
        limitations: 'Health Copilot provides organizational assistance to facilitate your conversation with your doctor.',
        nextStep: `Reschedule your appointment with Dr. ${firstOverdue.doctorName}.`,
        urgency: 'HIGH',
      });
    }

    // 4. Upsert candidate recommendations into DB idempotently
    for (const cand of candidates) {
      const existing = await WellnessRecommendation.findOne({
        userId,
        patientProfileId: profile?._id || null,
        title: cand.title,
      });

      if (!existing) {
        await WellnessRecommendation.create({
          userId,
          patientProfileId: profile?._id || null,
          ...cand,
        });
      }
    }

    // 5. Return active recommendations
    const query = { userId, status: { $ne: 'DISMISSED' } };
    if (profile?._id) query.patientProfileId = profile._id;

    return await WellnessRecommendation.find(query).sort({ urgency: -1, createdAt: -1 });
  }

  /**
   * Updates recommendation status: COMPLETED or DISMISSED
   */
  async updateStatus(userId, recommendationId, status) {
    const validStatuses = ['ACTIVE', 'COMPLETED', 'DISMISSED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const rec = await WellnessRecommendation.findOne({ _id: recommendationId, userId });
    if (!rec) {
      throw new Error('Recommendation not found or access denied.');
    }

    rec.status = status;
    if (status === 'COMPLETED') rec.completedAt = new Date();
    if (status === 'DISMISSED') rec.dismissedAt = new Date();

    await rec.save();
    return rec;
  }
}

module.exports = new WellnessService();
