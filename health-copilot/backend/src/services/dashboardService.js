const Document = require('../models/Document');
const Medication = require('../models/Medication');
const Appointment = require('../models/Appointment');
const Timeline = require('../models/Timeline');
const User = require('../models/User');

class DashboardService {
  async getDashboardData(userId) {
    // 1. Fetch user profile for customized greeting
    const user = await User.findById(userId).select('name email');

    // 2. Fetch counts in parallel
    const [
      documentCount,
      activeMedicationCount,
      upcomingAppointmentCount,
      recentDocuments,
      upcomingAppointments,
      medications,
      recentTimeline,
    ] = await Promise.all([
      Document.countDocuments({ userId }),
      Medication.countDocuments({ userId, status: 'ACTIVE' }),
      Appointment.countDocuments({ userId, status: 'UPCOMING', date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Document.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('fileName documentType status summary createdAt fileSize fileUrl'),
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
    ]);

    // Determine greeting
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) {
      greeting = 'Good afternoon';
    } else if (hour >= 17) {
      greeting = 'Good evening';
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
      },
      recentDocuments,
      upcomingAppointments,
      medications,
      recentTimeline,
    };
  }
}

module.exports = new DashboardService();
