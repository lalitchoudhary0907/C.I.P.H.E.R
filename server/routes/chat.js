'use strict';

var express = require('express');
var groqClient = require('../services/groqClient');

var router = express.Router();

router.get('/models', async function (req, res, next) {
  try {
    var apiKeyOverride = req.get('x-groq-api-key') || '';
    var forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
    var result = await groqClient.getAvailableModels(apiKeyOverride, forceRefresh);
    res.json({
      models: result.models,
      source: result.source
    });
  } catch (err) {
    next(err);
  }
});

router.post('/chat', async function (req, res, next) {
  try {
    var body = req.body || {};
    var apiKeyOverride = req.get('x-groq-api-key') || body.apiKey || '';
    var stream = Boolean(body.stream);
    var result = await groqClient.createChatCompletion({
      messages: body.messages,
      model: body.model,
      stream: stream,
      apiKeyOverride: apiKeyOverride
    });

    if (!stream) {
      return res.json({
        text: result.text,
        model: result.model
      });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Cipher-Model', result.model);

    if (!result.response || !result.response.body) {
      res.write('data: ' + JSON.stringify({ error: 'Upstream stream unavailable' }) + '\n\n');
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    var reader = result.response.body.getReader();
    var decoder = new TextDecoder();

    req.on('close', function () {
      try {
        reader.cancel();
      } catch (e) {}
    });

    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      var textChunk = decoder.decode(chunk.value, { stream: true });
      if (textChunk) res.write(textChunk);
    }

    res.write('data: [DONE]\n\n');
    return res.end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
