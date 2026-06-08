const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});


// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoints for Railway (Catches multiple common health check paths)
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/api/health', (req, res) => res.status(200).send('OK'));
app.get('/ping', (req, res) => res.status(200).send('pong'));

// Serve static files from the parent directory FIRST
app.use(express.static(path.join(__dirname, '../')));


// Health check endpoint for Railway
app.get('/health', (req, res) => res.status(200).send('OK'));


// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use('/api/super-admin', require('./routes/super-admin'));

const PORT = parseInt(process.env.PORT, 10) || 5000;

app.listen(PORT, '0.0.0.0', () => console.log(`Server started on port ${PORT} [PostgreSQL/Prisma v3]`));

module.exports = app;
