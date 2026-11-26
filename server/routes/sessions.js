'use strict';

var express = require('express');
var sessionStore = require('../store/sessionStore');
var groqClient = require('../services/groqClient');

var router = express.Router();

router.get('/sessions', function (req, res, next) {
  try {
    var q = req.query.q || '';
    var sessions = sessionStore.listSessions(q);
    res.json({ sessions: sessions });
  } catch (err) {
    next(err);
  }
});

router.post('/sessions', function (req, res, next) {
  try {
    var created = sessionStore.createSession(req.body || {});
    res.status(201).json({ session: created });
  } catch (err) {
    next(err);
  }
});

router.get('/sessions/:id', function (req, res, next) {
  try {
    var sess = sessionStore.getSession(req.params.id);
    if (!sess) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.json({ session: sess });
  } catch (err) {
    return next(err);
  }
});

router.patch('/sessions/:id', function (req, res, next) {
  try {
    var updated = sessionStore.updateSession(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.json({ session: updated });
  } catch (err) {
    return next(err);
  }
});

router.delete('/sessions/:id', function (req, res, next) {
  try {
    var removed = sessionStore.deleteSession(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    return next(err);
  }
});

router.post('/sessions/:id/messages', async function (req, res, next) {
  try {
    var body = req.body || {};
    var sess = sessionStore.getSession(req.params.id);
    if (!sess) {
      return res.status(404).json({ error: 'Session not found' });
    }

    var role = body.role === 'model' || body.role === 'assistant' ? body.role : 'user';
    var text = String(body.text || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    var msgObj = {
      id: body.id || (role === 'user' ? 'u_' : 'm_') + Date.now(),
      role: role,
      text: text,
      model: body.model || undefined,
      isError: Boolean(body.isError),
      timestamp: typeof body.timestamp === 'number' ? body.timestamp : Date.now()
    };

    sess = sessionStore.appendMessage(req.params.id, msgObj);

    if (!body.generateReply || role !== 'user') {
      return res.status(201).json({ session: sess, message: msgObj });
    }

    var systemText =
      typeof body.systemPrompt === 'string' && body.systemPrompt.trim()
        ? body.systemPrompt.trim()
        : 'You are CIPHER, a precision AI workspace assistant.';

    var chatMessages = [{ role: 'system', content: systemText }];
    var list = Array.isArray(sess.messages) ? sess.messages : [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item || item.isError) continue;
      chatMessages.push({
        role: item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user',
        content: String(item.text || '')
      });
    }

    var completion = await groqClient.createChatCompletion({
      messages: chatMessages,
      model: body.model,
      stream: false
    });

    var replyObj = {
      id: 'm_' + Date.now(),
      role: 'model',
      text: completion.text,
      model: completion.model,
      timestamp: Date.now()
    };

    sess = sessionStore.appendMessage(req.params.id, replyObj);
    return res.status(201).json({ session: sess, message: msgObj, reply: replyObj });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
