const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateBoarderPayload(b) {
  if (!b || typeof b !== 'object') throw new Error('Boarder payload missing.');
  if (!b.name || typeof b.name !== 'string' || b.name.trim() === '')
    throw new Error('Full Name is mandatory.');
  if (!b.email || !EMAIL_REGEX.test(b.email))
    throw new Error('Invalid email format.');
  if (b.monthlyRent !== undefined && (isNaN(b.monthlyRent) || b.monthlyRent < 0))
    throw new Error('Rent must be a non-negative number.');
  if (b.balance !== undefined && (isNaN(b.balance) || b.balance < 0))
    throw new Error('Balance cannot be negative.');
}

module.exports = { EMAIL_REGEX, validateBoarderPayload };
