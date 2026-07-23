/**
 * Placeholder registry for future online payment integrations.
 * Kept behind the same API surface as the legacy backend so the
 * frontend continues to work unchanged.
 */

const paymentProviders = {
  gcash:    { enabled: false, initCheckout: async () => { throw new Error('GCash integration not enabled yet.'); } },
  maya:     { enabled: false, initCheckout: async () => { throw new Error('Maya integration not enabled yet.'); } },
  paymongo: { enabled: false, initCheckout: async () => { throw new Error('PayMongo integration not enabled yet.'); } },
  stripe:   { enabled: false, initCheckout: async () => { throw new Error('Stripe integration not enabled yet.'); } },
  paypal:   { enabled: false, initCheckout: async () => { throw new Error('PayPal integration not enabled yet.'); } },
};

module.exports = { paymentProviders };
