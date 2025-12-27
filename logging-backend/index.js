
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const swaggerDocument = YAML.load('./openapi.yaml');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const queue = [];
const store = {};
let processedCount = 0;
let memoryLeak = [];

// ENV toggles
const FLAKY_MODE = true; // always ON by default
const FAILURE_RATE = parseFloat(process.env.FAILURE_RATE || '0.3');
const SLOW_DEP_MS = parseInt(process.env.SLOW_DEP_MS || '0');
const MEMORY_LEAK_MODE = process.env.MEMORY_LEAK_MODE === 'true';
const JWT_SECRET = 'qa-secret';

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30
});
app.use(limiter);

// Auth middleware with expiry
function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Unauthorized' });

  const token = header.replace('Bearer ', '');
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

// Async worker
setInterval(() => {
  if (queue.length > 0) {
    const item = queue.shift();

    // Slow dependency simulation
    const start = Date.now();
    while (Date.now() - start < SLOW_DEP_MS) {}

    // Flaky failure
    if (FLAKY_MODE && Math.random() < FAILURE_RATE) {
      store[item.id] = { status: 'FAILED', reason: 'Random processing failure' };
      return;
    }

    // Oversized payload
    if (item.message && item.message.length > 500) {
      store[item.id] = { status: 'FAILED', reason: 'Payload too large' };
      return;
    }

    // Memory leak simulation
    if (MEMORY_LEAK_MODE) {
      memoryLeak.push(new Array(10000).fill(item.message));
    }

    store[item.id] = { status: 'PROCESSED', message: item.message };
    processedCount++;
  }
}, 1000);

app.post('/logs', auth, (req, res) => {
  const correlationId = uuidv4();
  const { message } = req.body;

  queue.push({ id: correlationId, message });
  store[correlationId] = { status: 'QUEUED' };

  res.status(202).json({ correlationId });
});

app.get('/logs/:id', (req, res) => {
  const result = store[req.params.id];
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json(result);
});

app.get('/metrics', (req, res) => {
  res.json({
    queued: queue.length,
    processed: processedCount,
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  });
});

// Helper endpoint to generate short-lived tokens (for testing only)
app.post('/auth/token', (req, res) => {
  const token = jwt.sign({ user: 'qa' }, JWT_SECRET, { expiresIn: '5s' });
  res.json({ token });
});

app.listen(3000, () => {
  console.log('Sample logging backend running on port 3000');
});
