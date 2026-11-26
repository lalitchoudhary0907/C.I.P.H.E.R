'use strict';

var fs = require('fs');
var path = require('path');

function resolveDataDir() {
  var configured = process.env.DATA_DIR;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(__dirname, '..', configured);
  }
  return path.resolve(__dirname, '..', 'data');
}

function getStoreFilePath() {
  return path.join(resolveDataDir(), 'sessions.json');
}

function ensureStoreFile() {
  var dir = resolveDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  var filePath = getStoreFilePath();
  if (!fs.existsSync(filePath)) {
    writeSessionsAtomic([]);
  }
  return filePath;
}

function readAllSessions() {
  var filePath = ensureStoreFile();
  try {
    var raw = fs.readFileSync(filePath, 'utf8');
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function writeSessionsAtomic(sessions) {
  var dir = resolveDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  var filePath = getStoreFilePath();
  var tmpPath = filePath + '.tmp.' + process.pid + '.' + Date.now();
  fs.writeFileSync(tmpPath, JSON.stringify(sessions, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function listSessions(query) {
  var sessions = readAllSessions();
  var q = String(query || '').trim().toLowerCase();
  if (!q) return sessions;

  return sessions.filter(function (sess) {
    if (String(sess.title || '').toLowerCase().indexOf(q) !== -1) return true;
    var msgs = Array.isArray(sess.messages) ? sess.messages : [];
    for (var i = 0; i < msgs.length; i++) {
      if (String(msgs[i].text || '').toLowerCase().indexOf(q) !== -1) return true;
    }
    return false;
  });
}

function getSession(id) {
  var sessions = readAllSessions();
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].id === id) return sessions[i];
  }
  return null;
}

function createSession(payload) {
  var data = payload || {};
  var sessions = readAllSessions();
  var now = Date.now();
  var id =
    typeof data.id === 'string' && data.id.trim()
      ? data.id.trim()
      : 'cipher_sess_' + now + '_' + Math.floor(Math.random() * 1000);

  var existingIndex = sessions.findIndex(function (s) {
    return s.id === id;
  });
  var fresh = {
    id: id,
    title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'New Session',
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : now,
    messages: Array.isArray(data.messages) ? data.messages : []
  };

  if (existingIndex !== -1) {
    sessions[existingIndex] = fresh;
  } else {
    sessions.unshift(fresh);
  }
  writeSessionsAtomic(sessions);
  return fresh;
}

function updateSession(id, patch) {
  var sessions = readAllSessions();
  var index = sessions.findIndex(function (s) {
    return s.id === id;
  });
  if (index === -1) return null;

  var current = sessions[index];
  var updates = patch || {};
  if (typeof updates.title === 'string') {
    current.title = updates.title.trim() || 'New Session';
  }
  if (Array.isArray(updates.messages)) {
    current.messages = updates.messages;
  }
  current.updatedAt = typeof updates.updatedAt === 'number' ? updates.updatedAt : Date.now();

  sessions[index] = current;
  writeSessionsAtomic(sessions);
  return current;
}

function deleteSession(id) {
  var sessions = readAllSessions();
  var index = sessions.findIndex(function (s) {
    return s.id === id;
  });
  if (index === -1) return false;
  sessions.splice(index, 1);
  writeSessionsAtomic(sessions);
  return true;
}

function appendMessage(sessionId, message) {
  var sessions = readAllSessions();
  var index = sessions.findIndex(function (s) {
    return s.id === sessionId;
  });
  if (index === -1) return null;

  var sess = sessions[index];
  if (!Array.isArray(sess.messages)) sess.messages = [];
  sess.messages.push(message);
  sess.updatedAt = Date.now();
  sessions[index] = sess;
  writeSessionsAtomic(sessions);
  return sess;
}

module.exports = {
  listSessions: listSessions,
  getSession: getSession,
  createSession: createSession,
  updateSession: updateSession,
  deleteSession: deleteSession,
  appendMessage: appendMessage
};
