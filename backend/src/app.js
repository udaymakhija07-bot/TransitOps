const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const auth = require('./auth');
const routes = require('./routes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', auth.router);
app.use('/api', auth.authenticateToken, routes);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the TransitOps API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
