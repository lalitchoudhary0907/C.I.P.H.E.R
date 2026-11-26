'use strict';

var path = require('path');
var express = require('express');
var cors = require('cors');
var dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

var chatRoutes = require('./routes/chat');
var sessionRoutes = require('./routes/sessions');
var groqClient = require('./services/groqClient');

var app = express();
var PORT = Number(process.env.PORT) || 3001;
var ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
var ROOT_DIR = path.resolve(__dirname, '..');

app.use(
  cors({
    origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN.split(',').map(function (s) { return s.trim(); }),
    credentials: false
  })
);

app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/api/health', function (req, res) {
  var providerStatus = groqClient.getProviderStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    groqConfigured: providerStatus.providers.groq,
    providers: providerStatus.providers,
    configuredProviders: providerStatus.configuredProviders,
    canSwitchModels: providerStatus.canSwitchModels
  });
});

// API routes
app.use('/api', chatRoutes);
app.use('/api', sessionRoutes);

// 404 for unknown API routes
app.use('/api', function (req, res) {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve static frontend assets from project root (without exposing server/ or .env)
app.use('/css', express.static(path.join(ROOT_DIR, 'css')));
app.use('/js', express.static(path.join(ROOT_DIR, 'js')));
app.use('/audio', express.static(path.join(ROOT_DIR, 'audio')));
app.get('/LICENSE', function (req, res) {
  res.sendFile(path.join(ROOT_DIR, 'LICENSE'));
});
app.get(['/', '/index.html'], function (req, res) {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

// Centralized error handler
app.use(function (err, req, res, next) {
  var status = err && err.status ? err.status : 500;
  var message = err && err.message ? err.message : 'Internal server error';
  res.status(status).json({
    error: message,
    model: err && err.model ? err.model : undefined,
    code: err && err.code ? err.code : undefined
  });
});

if (require.main === module) {
  app.listen(PORT, function () {
    console.log('CIPHER backend listening on http://localhost:' + PORT);
  });
}

module.exports = app;
