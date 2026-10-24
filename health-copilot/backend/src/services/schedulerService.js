const Medication = require('../models/Medication');
const User = require('../models/User');
const emailService = require('./emailService');

class SchedulerService {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.recentNotifications = new Map(); // key: `${medId}_${timeString}`, val: timestamp to prevent duplicate firing within same minute
  }

  /**
   * Starts the background scheduler loop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('⏰ [SchedulerService] Durable medication reminder scheduler started.');

    // Run check immediately, then every 60 seconds
    this.checkDueReminders().catch((err) => console.error('[SchedulerService] Loop error:', err.message));
    this.timer = setInterval(() => {
      this.checkDueReminders().catch((err) => console.error('[SchedulerService] Loop error:', err.message));
    }, 60000);
  }

  /**
   * Stops the background scheduler loop.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('⏰ [SchedulerService] Scheduler stopped.');
  }

  /**
   * Inspects all active medications across users to dispatch due reminders.
   */
  async checkDueReminders() {
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const todayStr = now.toISOString().split('T')[0];

    // Find active medications with reminders enabled
    const medications = await Medication.find({
      status: 'ACTIVE',
      isReminderActive: true,
      $or: [
        { endDate: null },
        { endDate: { $gte: now } },
      ],
    }).populate('userId', 'email name preferredLanguage');

    for (const med of medications) {
      if (!med.userId) continue;

      let isDue = false;
      let reminderReason = '';

      // Check snooze expiration
      if (med.snoozeUntil && new Date(med.snoozeUntil) <= now) {
        isDue = true;
        reminderReason = 'Snoozed Reminder Expired';
        med.snoozeUntil = null; // Clear snooze once due
        await med.save();
      }

      // Check scheduled times
      if (!isDue && Array.isArray(med.reminderTimes) && med.reminderTimes.includes(currentTimeStr)) {
        const notifKey = `${med._id}_${todayStr}_${currentTimeStr}`;
        if (!this.recentNotifications.has(notifKey)) {
          isDue = true;
          reminderReason = `Scheduled Time: ${currentTimeStr}`;
          this.recentNotifications.set(notifKey, Date.now());
        }
      }

      if (isDue) {
        this.dispatchNotification(med, reminderReason, currentTimeStr);
      }
    }

    // Clean up old notification idempotency cache entries (> 24 hours old)
    const expiryCutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [k, v] of this.recentNotifications.entries()) {
      if (v < expiryCutoff) {
        this.recentNotifications.delete(k);
      }
    }
  }

  /**
   * Dispatches medication reminder notification.
   */
  async dispatchNotification(med, reason, timeStr) {
    const user = med.userId;
    console.log(`🔔 [Medication Reminder] ${med.name} (${med.dosage}) due for ${user.name || user.email} [${reason}]`);

    try {
      // Dispatch email notification if user email is available
      if (user.email) {
        const isTe = user.preferredLanguage === 'te';
        const subject = isTe
          ? `మందుల రిమైండర్: ${med.name} తీసుకునే సమయం`
          : `Medication Reminder: Time to take ${med.name} (${med.dosage})`;

        const text = isTe
          ? `నమస్కారం ${user.name || 'రోగి'},\n\nమీరు మీ మందును తీసుకునే సమయం ఆసన్నమైంది:\nమందు: ${med.name} (${med.dosage})\nసూచనలు: ${med.instructions || 'వైద్యుని సలహా మేరకు'}\nసమయం: ${timeStr}\n\nదయచేసి మీ హెల్త్ కాపైలట్ డాష్‌బోర్డ్‌లో నిర్ధారించండి.`
          : `Hello ${user.name || 'Patient'},\n\nThis is your scheduled reminder to take your medication:\nMedication: ${med.name} (${med.dosage})\nInstructions: ${med.instructions || 'As prescribed'}\nScheduled Time: ${timeStr}\n\nPlease visit your HealthCopilot dashboard to confirm once taken.`;

        await emailService.sendGenericEmail({
          to: user.email,
          subject,
          text,
        });
      }
    } catch (err) {
      console.warn(`[SchedulerService] Notification delivery notice: ${err.message}`);
    }
  }

  /**
   * Calculates the next upcoming occurrence date/time for a medication.
   */
  calculateNextOccurrence(reminderTimes = [], snoozeUntil = null) {
    const now = new Date();

    if (snoozeUntil && new Date(snoozeUntil) > now) {
      return new Date(snoozeUntil);
    }

    if (!Array.isArray(reminderTimes) || reminderTimes.length === 0) {
      return null;
    }

    // Sort reminder times (HH:mm)
    const sortedTimes = [...reminderTimes].sort();

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Check if there is an occurrence remaining today
    for (const timeStr of sortedTimes) {
      const [h, m] = timeStr.split(':').map(Number);
      const targetMinutes = h * 60 + m;
      if (targetMinutes > currentMinutes) {
        const next = new Date(now);
        next.setHours(h, m, 0, 0);
        return next;
      }
    }

    // Otherwise next occurrence is the earliest time tomorrow
    const [firstH, firstM] = sortedTimes[0].split(':').map(Number);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(firstH, firstM, 0, 0);
    return tomorrow;
  }

  /**
   * Records a user medication dose action: TAKEN, SNOOZED, or SKIPPED.
   */
  async recordDoseAction(userId, medicationId, { action, scheduledTime, notes, snoozeMinutes = 15 }) {
    const med = await Medication.findOne({ _id: medicationId, userId });
    if (!med) {
      throw new Error('Medication not found or access denied.');
    }

    const validActions = ['TAKEN', 'SNOOZED', 'SKIPPED'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action. Must be one of: ${validActions.join(', ')}`);
    }

    const now = new Date();

    if (action === 'SNOOZED') {
      med.snoozeUntil = new Date(now.getTime() + snoozeMinutes * 60 * 1000);
    } else {
      med.snoozeUntil = null;
    }

    // Add to history
    med.confirmationHistory.unshift({
      timestamp: now,
      action,
      scheduledTime: scheduledTime || '',
      notes: notes || '',
    });

    // Recompute next occurrence
    med.nextOccurrence = this.calculateNextOccurrence(med.reminderTimes, med.snoozeUntil);

    await med.save();
    return med;
  }
}

module.exports = new SchedulerService();
