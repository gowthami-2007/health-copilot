const Timeline = require('../models/Timeline');
const Document = require('../models/Document');
const Appointment = require('../models/Appointment');
const Medication = require('../models/Medication');

class TimelineService {
  /**
   * Generates a comprehensive, chronological health timeline for a patient.
   */
  async getTimeline(userId) {
    // 1. Fetch direct timeline records
    const timelineEvents = await Timeline.find({ userId }).sort({ date: -1 });

    // 2. Fetch documents, appointments, medications to ensure complete chronological sync
    const [docs, appts, meds] = await Promise.all([
      Document.find({ userId }).select('fileName documentType createdAt status'),
      Appointment.find({ userId }).select('doctorName specialty date time status'),
      Medication.find({ userId }).select('name dosage frequency startDate status'),
    ]);

    const combinedEvents = [...timelineEvents.map((t) => ({
      _id: t._id,
      id: t._id,
      eventType: t.eventType,
      title: t.title,
      description: t.description,
      date: t.date,
      metadata: t.metadata,
      source: 'timeline',
    }))];

    // Check for any documents not in timeline
    const existingRefIds = new Set(
      timelineEvents
        .filter((t) => t.referenceId)
        .map((t) => t.referenceId.toString())
    );

    for (const d of docs) {
      if (!existingRefIds.has(d._id.toString())) {
        combinedEvents.push({
          id: d._id,
          eventType: 'DOCUMENT',
          title: `Uploaded ${d.documentType}`,
          description: `Document: ${d.fileName}`,
          date: d.createdAt,
          source: 'document',
        });
      }
    }

    for (const a of appts) {
      if (!existingRefIds.has(a._id.toString())) {
        combinedEvents.push({
          id: a._id,
          eventType: 'APPOINTMENT',
          title: `Appointment with ${a.doctorName}`,
          description: `${a.specialty} at ${a.time} (${a.status})`,
          date: a.date,
          source: 'appointment',
        });
      }
    }

    for (const m of meds) {
      if (!existingRefIds.has(m._id.toString())) {
        combinedEvents.push({
          id: m._id,
          eventType: 'MEDICATION',
          title: `Prescribed: ${m.name}`,
          description: `${m.dosage} - ${m.frequency}`,
          date: m.startDate || new Date(),
          source: 'medication',
        });
      }
    }

    // Sort descending (newest first)
    combinedEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Group events by Year for timeline presentation
    const groupedByYear = {};
    for (const event of combinedEvents) {
      const year = new Date(event.date).getFullYear() || new Date().getFullYear();
      if (!groupedByYear[year]) {
        groupedByYear[year] = [];
      }
      groupedByYear[year].push(event);
    }

    return {
      events: combinedEvents,
      groupedByYear,
    };
  }
}

module.exports = new TimelineService();
