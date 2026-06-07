const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the parent directory FIRST
app.use(express.static(path.join(__dirname, '../')));

// Health check endpoint for Railway
app.get('/health', (req, res) => res.status(200).send('OK'));


// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use('/api/super-admin', require('./routes/super-admin'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => console.log(`Server started on port ${PORT} [PostgreSQL/Prisma v3]`));

module.exports = app;
