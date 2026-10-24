const crypto = require('crypto');
const AgentAction = require('../models/AgentAction');
const Document = require('../models/Document');
const Medication = require('../models/Medication');
const Appointment = require('../models/Appointment');
const Timeline = require('../models/Timeline');
const medicationService = require('./medicationService');
const appointmentService = require('./appointmentService');
const healthTrendsService = require('./healthTrendsService');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');
const { sanitizeObjectId } = require('../utils/idSanitizer');

class AgentService {
  /**
   * Generates a deterministic idempotency key for an event and proposal.
   */
  generateKey(userId, triggerEvent, actionType, entityId) {
    return crypto
      .createHash('sha256')
      .update(`${userId}_${triggerEvent}_${actionType}_${entityId}`)
      .digest('hex');
  }

  /**
   * Scans a patient's records to proactively detect events and prepare proposed actions.
   */
  async scanAndGenerateActions(userId, patientProfileId = null) {
    const cleanProfileId = sanitizeObjectId(patientProfileId);
    const actionsGenerated = [];

    // 1. Scan Processed Documents for Prescriptions with missing reminders
    const docQuery = { userId, status: 'PROCESSED' };
    if (cleanProfileId) docQuery.patientProfileId = cleanProfileId;

    const documents = await Document.find(docQuery).sort({ createdAt: -1 }).limit(10);

    for (const doc of documents) {
      const prescriptions = doc.structuredData?.prescriptions || [];
      for (const rx of prescriptions) {
        if (!rx.medicationName) continue;

        // Check if an active medication reminder already exists
        const existingMed = await Medication.findOne({
          userId,
          name: new RegExp(`^${rx.medicationName.trim()}$`, 'i'),
          status: 'ACTIVE',
        });

        if (!existingMed) {
          const key = this.generateKey(userId, 'PRESCRIPTION_PROCESSED', 'SCHEDULE_MEDICATION_REMINDER', `${doc._id}_${rx.medicationName}`);
          const existingAction = await AgentAction.findOne({ idempotencyKey: key });

          if (!existingAction) {
            const defaultTimes = medicationService.deriveDefaultReminderTimes(rx.frequency || 'Once daily');
            const newAction = await AgentAction.create({
              userId,
              patientProfileId: doc.patientProfileId || patientProfileId || null,
              triggerEvent: 'PRESCRIPTION_PROCESSED',
              actionType: 'SCHEDULE_MEDICATION_REMINDER',
              title: `Propose Reminder: ${rx.medicationName}`,
              description: `Schedule daily medication reminders for ${rx.medicationName} ${rx.dosage || ''} (${rx.frequency || 'Once daily'}).`,
              rationale: `Extracted from prescription document "${doc.fileName}". Frequency indicated: ${rx.frequency || 'Standard'}. Proposed times: ${defaultTimes.join(', ')}.`,
              supportingData: {
                sourceDocumentId: doc._id,
                documentName: doc.fileName,
                medicationName: rx.medicationName,
                dosage: rx.dosage || 'Standard dose',
                frequency: rx.frequency || 'Once daily',
                instructions: rx.instructions || 'As prescribed by doctor',
                prescribedBy: rx.prescribingDoctor || doc.structuredData?.healthcareProvider || 'Doctor',
                proposedReminderTimes: defaultTimes,
              },
              status: 'PROPOSED',
              idempotencyKey: key,
              approvalRequired: true,
              auditTrail: [
                {
                  timestamp: new Date(),
                  action: 'PROPOSAL_GENERATED',
                  actor: 'AI_AGENT',
                  details: { trigger: 'Prescription extraction without active reminder' },
                },
              ],
            });
            actionsGenerated.push(newAction);
          }
        }
      }
    }

    // 2. Scan for Overdue Follow-ups
    const overdueFollowups = await appointmentService.getOverdueFollowups(userId, patientProfileId);
    for (const apt of overdueFollowups) {
      const key = this.generateKey(userId, 'FOLLOWUP_OVERDUE', 'CREATE_APPOINTMENT', String(apt._id));
      const existingAction = await AgentAction.findOne({ idempotencyKey: key });

      if (!existingAction) {
        const newAction = await AgentAction.create({
          userId,
          patientProfileId: apt.patientProfileId || patientProfileId || null,
          triggerEvent: 'FOLLOWUP_OVERDUE',
          actionType: 'CREATE_APPOINTMENT',
          title: `Reschedule Overdue Follow-up: Dr. ${apt.doctorName}`,
          description: `Prepare a consultation rescheduling request for Dr. ${apt.doctorName} (${apt.specialty}).`,
          rationale: `Original appointment on ${new Date(apt.date).toLocaleDateString()} has passed without a completion confirmation.`,
          supportingData: {
            appointmentId: apt._id,
            doctorName: apt.doctorName,
            specialty: apt.specialty,
            reason: apt.reason || 'Routine follow-up',
            sourceDocumentId: apt.sourceDocumentId,
          },
          status: 'PROPOSED',
          idempotencyKey: key,
          approvalRequired: true,
          auditTrail: [
            {
              timestamp: new Date(),
              action: 'PROPOSAL_GENERATED',
              actor: 'AI_AGENT',
              details: { trigger: 'Overdue follow-up check' },
            },
          ],
        });
        actionsGenerated.push(newAction);
      }
    }

    // 3. Scan for Abnormal Lab Trends (e.g., HbA1c > 7.0%)
    const trends = await healthTrendsService.getTrends(userId, patientProfileId);
    for (const t of trends) {
      if (t.latest && (t.latest.abnormalFlag === 'HIGH' || t.latest.abnormalFlag === 'LOW')) {
        const key = this.generateKey(userId, 'LAB_RESULT_ABNORMAL', 'FLAG_REPEAT_TEST', `${t.key}_${t.latest.formattedDate}`);
        const existingAction = await AgentAction.findOne({ idempotencyKey: key });

        if (!existingAction) {
          const newAction = await AgentAction.create({
            userId,
            patientProfileId: patientProfileId || null,
            triggerEvent: 'LAB_RESULT_ABNORMAL',
            actionType: 'FLAG_REPEAT_TEST',
            title: `Flag Repeat Testing: ${t.displayName}`,
            description: `Schedule a 3-month reminder to discuss re-testing ${t.displayName} with your clinician.`,
            rationale: `Latest recorded result of ${t.latest.value} ${t.latest.unit} is marked ${t.latest.abnormalFlag} against reference limits (${t.latest.referenceRange}).`,
            supportingData: {
              metricKey: t.key,
              displayName: t.displayName,
              value: t.latest.value,
              unit: t.latest.unit,
              referenceRange: t.latest.referenceRange,
              sourceDocumentId: t.latest.sourceDocumentId,
              documentName: t.latest.documentName,
            },
            status: 'PROPOSED',
            idempotencyKey: key,
            approvalRequired: true,
            auditTrail: [
              {
                timestamp: new Date(),
                action: 'PROPOSAL_GENERATED',
                actor: 'AI_AGENT',
                details: { trigger: 'Abnormal lab threshold flagged' },
              },
            ],
          });
          actionsGenerated.push(newAction);
        }
      }
    }

    return actionsGenerated;
  }

  /**
   * Retrieves all agent actions for a user, optionally filtered by status and profile.
   */
  async getActions(userId, status = null, patientProfileId = null) {
    const cleanProfileId = sanitizeObjectId(patientProfileId);
    const query = { userId };
    if (status && status !== 'ALL') query.status = status;
    if (cleanProfileId) query.patientProfileId = cleanProfileId;

    return await AgentAction.find(query).sort({ createdAt: -1 });
  }

  /**
   * Approves and safely executes a proposed agent action.
   */
  async approveAction(userId, actionId, editData = {}) {
    const action = await AgentAction.findOne({ _id: actionId, userId });
    if (!action) {
      throw new NotFoundError('Agent action not found or access denied.');
    }

    if (action.status !== 'PROPOSED') {
      throw new BadRequestError(`Cannot approve action in '${action.status}' state.`);
    }

    // Merge permitted edits from user
    if (editData.supportingData) {
      action.supportingData = { ...action.supportingData, ...editData.supportingData };
    }

    action.status = 'APPROVED';
    action.reviewedAt = new Date();
    action.auditTrail.push({
      timestamp: new Date(),
      action: 'ACTION_APPROVED',
      actor: 'USER',
      details: { editData },
    });

    // Execute permitted safe tool
    try {
      let executionResult = null;

      if (action.actionType === 'SCHEDULE_MEDICATION_REMINDER') {
        const s = action.supportingData;
        const newMed = await medicationService.createMedication(userId, {
          patientProfileId: action.patientProfileId,
          name: s.medicationName,
          dosage: s.dosage || 'As prescribed',
          frequency: s.frequency || 'Once daily',
          instructions: s.instructions || '',
          prescribedBy: s.prescribedBy || '',
          reminderTimes: s.proposedReminderTimes || ['08:00'],
          sourceDocumentId: s.sourceDocumentId || null,
          verificationStatus: 'VERIFIED',
        });
        executionResult = { medicationId: newMed._id, name: newMed.name, reminderTimes: newMed.reminderTimes };
      } else if (action.actionType === 'CREATE_APPOINTMENT') {
        const s = action.supportingData;
        const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000);
        const apt = await appointmentService.createAppointment(userId, {
          patientProfileId: action.patientProfileId,
          doctorName: s.doctorName,
          specialty: s.specialty || 'General Practitioner',
          date: nextWeek,
          time: '10:00 AM',
          reason: `Follow-up: ${s.reason || 'Clinical Review'}`,
          sourceDocumentId: s.sourceDocumentId || null,
          type: 'APPOINTMENT',
        });
        executionResult = { appointmentId: apt._id, doctorName: apt.doctorName, date: apt.date };
      } else if (action.actionType === 'FLAG_REPEAT_TEST') {
        const s = action.supportingData;
        const targetDate = new Date(Date.now() + 90 * 24 * 3600 * 1000);
        await Timeline.create({
          userId,
          patientProfileId: action.patientProfileId,
          eventType: 'NOTE',
          title: `Scheduled Repeat Test: ${s.displayName}`,
          description: `Recommended re-test discussion for ${s.displayName} (previous: ${s.value} ${s.unit}).`,
          date: targetDate,
          referenceId: s.sourceDocumentId || null,
          metadata: s,
        });
        executionResult = { targetDate, testName: s.displayName, scheduled: true };
      }

      action.status = 'EXECUTED';
      action.executedAt = new Date();
      action.executionResult = executionResult;
      action.auditTrail.push({
        timestamp: new Date(),
        action: 'ACTION_EXECUTED',
        actor: 'SYSTEM',
        details: executionResult,
      });
    } catch (execErr) {
      action.status = 'FAILED';
      action.errorMessage = execErr.message;
      action.auditTrail.push({
        timestamp: new Date(),
        action: 'EXECUTION_FAILED',
        actor: 'SYSTEM',
        details: { error: execErr.message },
      });
    }

    await action.save();
    return action;
  }

  /**
   * Rejects a proposed agent action.
   */
  async rejectAction(userId, actionId, rejectionReason = '') {
    const action = await AgentAction.findOne({ _id: actionId, userId });
    if (!action) {
      throw new NotFoundError('Agent action not found or access denied.');
    }

    if (action.status !== 'PROPOSED') {
      throw new BadRequestError(`Cannot reject action in '${action.status}' state.`);
    }

    action.status = 'REJECTED';
    action.reviewedAt = new Date();
    action.auditTrail.push({
      timestamp: new Date(),
      action: 'ACTION_REJECTED',
      actor: 'USER',
      details: { reason: rejectionReason || 'User dismissed proposal' },
    });

    await action.save();
    return action;
  }
}

module.exports = new AgentService();
