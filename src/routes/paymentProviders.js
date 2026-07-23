const express = require('express');
const { paymentProviders } = require('../services/paymentProviders');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json(
    Object.fromEntries(
      Object.entries(paymentProviders).map(([k, v]) => [k, { enabled: v.enabled }])
    )
  );
});

router.post('/:provider/checkout', async (req, res) => {
  const p = paymentProviders[req.params.provider];
  if (!p) return res.status(404).json({ error: 'Unknown provider.' });
  try {
    const out = await p.initCheckout(req.body);
    res.json({ success: true, ...out });
  } catch (e) {
    res.status(501).json({ error: e.message });
  }
});

module.exports = router;
