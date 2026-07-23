const express = require('express');
const {
  executeAutomatedBillingReminderEngine,
} = require('../services/reminderService');
const scheduler = require('../services/schedulerService');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.post('/run-billing-reminders', asyncHandler(async (_req, res) => {
  const result = await executeAutomatedBillingReminderEngine();
  res.status(200).json({ success: true, ...result });
}));

router.post('/reload-config', (_req, res) => {
  scheduler.reloadConfig();
  res.status(200).json({
    success: true,
    message: 'Configuration reloaded — automation will pick up new settings on the next tick.',
  });
});

module.exports = router;
