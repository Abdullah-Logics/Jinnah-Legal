const DANGEROUS_PATTERNS = [
  /<script[\s>]/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /expression\(/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<applet/gi,
];

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  let clean = str;
  for (const pattern of DANGEROUS_PATTERNS) {
    clean = clean.replace(pattern, '');
  }
  return clean;
}

function sanitizeValue(val) {
  if (typeof val === 'string') return sanitizeString(val);
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (val && typeof val === 'object') return sanitizeObject(val);
  return val;
}

function sanitizeObject(obj) {
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    clean[key] = sanitizeValue(val);
  }
  return clean;
}

export function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(req.query)) {
      clean[key] = sanitizeValue(val);
    }
    req.query = clean;
  }
  if (req.params && typeof req.params === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(req.params)) {
      clean[key] = sanitizeValue(val);
    }
    req.params = clean;
  }
  next();
}

export function sqlInjectionGuard(req, res, next) {
  const checkValue = (val) => {
    if (typeof val !== 'string') return false;
    const lower = val.toLowerCase();
    const sqlPatterns = [
      /;\s*drop\s+table/i,
      /;\s*delete\s+from/i,
      /;\s*update\s+.*set/i,
      /;\s*insert\s+into/i,
      /;\s*alter\s+table/i,
      /union\s+select/i,
      /--\s/,
      /\/\*.*\*\//,
    ];
    return sqlPatterns.some(p => p.test(lower));
  };

  const checkObject = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    for (const val of Object.values(obj)) {
      if (checkValue(val)) return true;
      if (typeof val === 'object' && checkObject(val)) return true;
    }
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query)) {
    return res.status(400).json({ error: 'Invalid input detected' });
  }
  next();
}
