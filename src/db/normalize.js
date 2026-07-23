/**
 * Canonical database shape. Every read/write flows through
 * normalizeStructure() so downstream code can safely assume every
 * top-level collection exists and every boarder has the expected keys.
 *
 * Behavior preserved verbatim from the legacy backend, minus the
 * data.json seeding path — the shape is now the sole source of truth.
 */

const DEFAULT_SETTINGS = {
  reminderDays: 7,
  autoRemindersEnabled: true,
  dailyTime: '08:00',
  reminderSchedule: [7, 3, 1, 0, -1, -7],
  weeklyOverdueInterval: 7,
  retryAttempts: 3,
  retryIntervalMinutes: 5,
  replyTo: '',
  signature: 'Dormitory Administration',
  footer:
    'This is an automated notification from Montesierra Dormitory Management System. Please do not reply directly to this email.',
  dormName: 'Montesierra Dormitory',
  dormLogoUrl: '',
  contactInfo: '',
};

// Brevo-first defaults; legacy Gmail defaults intentionally removed.
const DEFAULT_EMAIL_CONFIG = {
  enabled: true,
  server: 'smtp-relay.brevo.com',
  port: 587,
  email: '',
  pass: '',
  name: 'Montesierra Dormitory',
};

function normalizeStructure(data) {
  const v = data && typeof data === 'object' ? data : {};

  v.rooms = Array.isArray(v.rooms) ? v.rooms : [];
  v.boarders = Array.isArray(v.boarders) ? v.boarders : [];
  v.formerBoarders = Array.isArray(v.formerBoarders) ? v.formerBoarders : [];
  v.reservations = Array.isArray(v.reservations) ? v.reservations : [];
  v.waitingList = Array.isArray(v.waitingList)
    ? v.waitingList
    : Array.isArray(v.waitlist) ? v.waitlist : [];
  v.waitlist = v.waitingList;
  v.transactions = Array.isArray(v.transactions)
    ? v.transactions
    : Array.isArray(v.billingRecords) ? v.billingRecords : [];
  v.billingRecords = v.transactions;
  v.tickets = Array.isArray(v.tickets)
    ? v.tickets
    : Array.isArray(v.maintenanceTickets) ? v.maintenanceTickets : [];
  v.maintenanceTickets = v.tickets;
  v.audit = Array.isArray(v.audit)
    ? v.audit
    : Array.isArray(v.auditLogs) ? v.auditLogs : [];
  v.auditLogs = v.audit;
  v.emailLogs = Array.isArray(v.emailLogs) ? v.emailLogs : [];
  v.emailCounter =
    v.emailCounter && typeof v.emailCounter === 'object' ? v.emailCounter : {};

  v.emailConfig =
    v.emailConfig && typeof v.emailConfig === 'object'
      ? { ...DEFAULT_EMAIL_CONFIG, ...v.emailConfig }
      : { ...DEFAULT_EMAIL_CONFIG };

  v.settings = { ...DEFAULT_SETTINGS, ...(v.settings || {}) };
  if (
    !Array.isArray(v.settings.reminderSchedule) ||
    !v.settings.reminderSchedule.length
  ) {
    v.settings.reminderSchedule = DEFAULT_SETTINGS.reminderSchedule.slice();
  }

  v.boarders.forEach((b) => {
    if (!b.id) b.id = 'BRD-' + Date.now() + Math.floor(Math.random() * 1000);
    if (!b.email) b.email = 'tenant@example.com';
    if (!b.contact) b.contact = 'N/A';
    if (!b.roomId) b.roomId = '';
    if (!b.bedNo) b.bedNo = '';
    if (!b.moveInDate) b.moveInDate = new Date().toISOString().split('T')[0];
    if (b.rentRate !== undefined && b.monthlyRent === undefined)
      b.monthlyRent = parseFloat(b.rentRate) || 0;
    if (b.monthlyRent !== undefined && b.rentRate === undefined)
      b.rentRate = parseFloat(b.monthlyRent) || 0;
    if (b.monthlyRent === undefined) b.monthlyRent = 2500;
    if (b.rentRate === undefined) b.rentRate = 2500;
    b.balance = parseFloat(b.balance) || 0;
    if (b.balance < 0) b.balance = 0;
    if (!b.status) b.status = b.balance === 0 ? 'Paid' : 'Active';
    if (!Array.isArray(b.reminderHistory)) b.reminderHistory = [];
  });

  // Seed a default 24-room layout only on a truly empty install.
  if (v.rooms.length === 0) {
    for (let i = 1; i <= 24; i++) {
      const isAdmin = i === 1;
      const cap = isAdmin ? 0 : 4;
      const beds = [];
      for (let b = 1; b <= cap; b++) {
        beds.push({
          bedNo: `B${b}`,
          isOccupied: false,
          boarder: null,
          isReserved: false,
          reservationId: null,
        });
      }
      v.rooms.push({
        id: i,
        roomNumber: i,
        type: isAdmin ? 'Admin' : 'Rentable',
        capacity: cap,
        occupied: 0,
        status: isAdmin ? 'Admin' : 'Available',
        rate: 2500,
        beds,
        inventory: { beds: cap, chairs: cap, tables: 1, cooling: 1 },
      });
    }
  }

  return v;
}

module.exports = { normalizeStructure, DEFAULT_SETTINGS, DEFAULT_EMAIL_CONFIG };
