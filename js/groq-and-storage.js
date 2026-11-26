(function (global) {
  'use strict';

  var CIPHER = global.CIPHER;
  var backendState = {
    checked: false,
    available: false,
    groqConfigured: false,
    configuredProviders: [],
    canSwitchModels: false
  };

  function canUseSameOriginBackend() {
    return typeof global.location !== 'undefined' && global.location.protocol !== 'file:';
  }

  function isBackendAvailable() {
    return backendState.available;
  }

  function isBackendGroqReady() {
    return backendState.available && backendState.groqConfigured;
  }

  function canSwitchModels() {
    return Boolean(backendState.available && backendState.canSwitchModels);
  }

  async function apiRequest(path, options, timeoutMs) {
    if (!canUseSameOriginBackend()) {
      throw new Error('Backend unavailable on file:// origin');
    }
    var opts = options || {};
    var headers = Object.assign({}, opts.headers || {});
    if (opts.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = null;
    if (controller && timeoutMs) {
      timer = setTimeout(function () {
        try {
          controller.abort();
        } catch (e) {}
      }, timeoutMs);
    }

    try {
      var resp = await fetch(path, {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body,
        signal: controller ? controller.signal : undefined
      });
      var json = null;
      try {
        json = await resp.json();
      } catch (e) {}
      if (!resp.ok) {
        var err = new Error((json && json.error) || 'Backend request failed (HTTP ' + resp.status + ')');
        err.status = resp.status;
        err.model = json && json.model ? json.model : undefined;
        err.code = json && json.code ? json.code : undefined;
        err.isHttpError = true;
        throw err;
      }
      return json || {};
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function checkBackendHealth() {
    if (!canUseSameOriginBackend()) {
      backendState = {
        checked: true,
        available: false,
        groqConfigured: false,
        configuredProviders: [],
        canSwitchModels: false
      };
      CIPHER.state.configuredProviders = [];
      CIPHER.state.canSwitchModels = false;
      return backendState;
    }
    try {
      var data = await apiRequest('/api/health', { method: 'GET' }, 1800);
      var configuredProviders = Array.isArray(data && data.configuredProviders)
        ? data.configuredProviders
        : data && data.groqConfigured
          ? ['groq']
          : [];
      var canSwitch =
        typeof (data && data.canSwitchModels) === 'boolean'
          ? data.canSwitchModels
          : configuredProviders.length > 1;
      backendState = {
        checked: true,
        available: Boolean(data && data.status === 'ok'),
        groqConfigured: Boolean(data && data.groqConfigured),
        configuredProviders: configuredProviders,
        canSwitchModels: canSwitch
      };
      CIPHER.state.configuredProviders = configuredProviders.slice();
      CIPHER.state.canSwitchModels = canSwitch;
    } catch (err) {
      backendState = {
        checked: true,
        available: false,
        groqConfigured: false,
        configuredProviders: [],
        canSwitchModels: false
      };
      CIPHER.state.configuredProviders = [];
      CIPHER.state.canSwitchModels = false;
    }
    return backendState;
  }

  async function syncSessionsFromBackend() {
    if (!backendState.available) return false;
    try {
      var data = await apiRequest('/api/sessions', { method: 'GET' }, 3000);
      var serverSessions = data && Array.isArray(data.sessions) ? data.sessions : [];
      if (serverSessions.length > 0) {
        CIPHER.state.sessions = serverSessions;
        if (!CIPHER.state.activeSessionId || (CIPHER.findSessionById && !CIPHER.findSessionById(CIPHER.state.activeSessionId))) {
          CIPHER.state.activeSessionId = serverSessions[0].id;
          saveConfig();
        }
        saveSessions();
        return true;
      }

      var localSessions = Array.isArray(CIPHER.state.sessions) ? CIPHER.state.sessions : [];
      for (var i = localSessions.length - 1; i >= 0; i--) {
        await apiRequest(
          '/api/sessions',
          { method: 'POST', body: JSON.stringify(localSessions[i]) },
          3000
        );
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function syncCreateSessionBackend(sess) {
    if (!backendState.available || !sess) return;
    apiRequest('/api/sessions', { method: 'POST', body: JSON.stringify(sess) }, 3000).catch(function () {});
  }

  function syncUpdateSessionBackend(sess) {
    if (!backendState.available || !sess || !sess.id) return;
    apiRequest(
      '/api/sessions/' + encodeURIComponent(sess.id),
      {
        method: 'PATCH',
        body: JSON.stringify({
          title: sess.title,
          messages: sess.messages,
          updatedAt: sess.updatedAt
        })
      },
      3000
    ).catch(function () {});
  }

  function syncDeleteSessionBackend(sessionId) {
    if (!backendState.available || !sessionId) return;
    apiRequest('/api/sessions/' + encodeURIComponent(sessionId), { method: 'DELETE' }, 3000).catch(function () {});
  }

  function isChatCapableGroqModel(modelId) {
    var id = String(modelId || '').trim();
    if (!id) return false;
    return !/whisper|guard|embedding|tts|orpheus|safeguard/i.test(id);
  }

  function normalizeGroqModel(modelValue) {
    var clean = String(modelValue || '').trim();
    var list =
      Array.isArray(CIPHER.PROVIDER_MODELS.groq) && CIPHER.PROVIDER_MODELS.groq.length > 0
        ? CIPHER.PROVIDER_MODELS.groq
        : [CIPHER.DEFAULT_GROQ_MODEL];
    if (!clean || list.indexOf(clean) === -1) {
      return list[0] || CIPHER.DEFAULT_GROQ_MODEL;
    }
    return clean;
  }

  function getActiveModel() {
    return normalizeGroqModel(CIPHER.state.groqModel);
  }

  function setActiveModel(modelValue) {
    CIPHER.state.groqModel = normalizeGroqModel(modelValue);
  }

  function populateModelSelect(selectEl, selectedModel) {
    if (!selectEl) return;
    var list = CIPHER.PROVIDER_MODELS.groq.slice();
    var effectiveSelected = normalizeGroqModel(selectedModel);
    if (effectiveSelected && list.indexOf(effectiveSelected) === -1) {
      list.unshift(effectiveSelected);
    }
    selectEl.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
      var opt = document.createElement('option');
      opt.value = list[i];
      opt.textContent = list[i];
      opt.className = 'bg-[#070f1a] text-slate-100';
      selectEl.appendChild(opt);
    }
    selectEl.value = effectiveSelected && list.indexOf(effectiveSelected) !== -1 ? effectiveSelected : list[0];
  }

  function applyGroqModelList(modelsList) {
    var state = CIPHER.state;
    var dom = CIPHER.dom;
    if (!Array.isArray(modelsList) || modelsList.length === 0) return;
    CIPHER.PROVIDER_MODELS.groq = modelsList.slice();
    if (CIPHER.PROVIDER_MODELS.groq.indexOf(state.groqModel) === -1) {
      state.groqModel = CIPHER.PROVIDER_MODELS.groq[0];
      saveConfig();
    }
    if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
    if (dom.apiConfigModal && !dom.apiConfigModal.classList.contains('hidden')) {
      populateModelSelect(dom.modalModelSelect, getActiveModel());
    }
  }

  async function fetchGroqAvailableModels(_unusedKey, forceRefresh) {
    if (backendState.available) {
      try {
        var qs = forceRefresh ? '?refresh=1' : '';
        var backendData = await apiRequest('/api/models' + qs, { method: 'GET' }, 4000);
        if (backendData) {
          if (Array.isArray(backendData.configuredProviders)) {
            backendState.configuredProviders = backendData.configuredProviders.slice();
            CIPHER.state.configuredProviders = backendData.configuredProviders.slice();
          }
          if (typeof backendData.canSwitchModels === 'boolean') {
            backendState.canSwitchModels = backendData.canSwitchModels;
            CIPHER.state.canSwitchModels = backendData.canSwitchModels;
          }
          if (Array.isArray(backendData.models) && backendData.models.length > 0) {
            applyGroqModelList(backendData.models);
            return backendData.models.slice();
          }
        }
      } catch (backendErr) {}
    }

    return CIPHER.PROVIDER_MODELS.groq.slice();
  }

  function buildInitialSessions() {
    var now = Date.now();
    var defaultModel = CIPHER.DEFAULT_GROQ_MODEL;
    return [
      {
        id: 'cipher_sess_' + (now - 7200000),
        title: 'RAG + Embeddings Design',
        updatedAt: now - 7200000,
        messages: [
          {
            id: 'msg_init_1',
            role: 'user',
            text: 'Break down how RAG + vector embeddings + reranking work together in a modern AI app',
            timestamp: now - 7200000
          },
          {
            id: 'msg_init_2',
            role: 'model',
            text:
              'Directive logged. Here is a crisp **RAG + Vector Retrieval** breakdown:\n\n' +
              '- **Chunk & Embed:** Split source documents into tight semantic chunks and embed them.\n' +
              '- **Vector Recall:** Query nearest neighbors (`topK: 8`) using cosine similarity.\n' +
              '- **Rerank & Synthesize:** Rank top candidates and feed grounded context into **CIPHER**.\n\n' +
              '```javascript\nconst matches = await vectorIndex.query({ vector: queryEmbedding, topK: 8 });\nconst contextBlock = matches.slice(0, 4).map(m => m.text).join("\\n---\\n");\n```',
            model: defaultModel,
            timestamp: now - 7190000
          }
        ]
      },
      {
        id: 'cipher_sess_' + (now - 14400000),
        title: 'Groq API Helper',
        updatedAt: now - 14400000,
        messages: [
          {
            id: 'msg_init_3',
            role: 'user',
            text: 'Write a clean JavaScript helper for Groq chat completions with retry and error handling',
            timestamp: now - 14400000
          },
          {
            id: 'msg_init_4',
            role: 'model',
            text:
              '```javascript\nexport async function askCipherGroq(apiKey, prompt, model = "llama-3.3-70b-versatile") {\n  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {\n    method: "POST",\n    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },\n    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] })\n  });\n  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);\n  const data = await res.json();\n  return data.choices?.[0]?.message?.content ?? "";\n}\n```',
            model: defaultModel,
            timestamp: now - 14390000
          }
        ]
      },
      {
        id: 'cipher_sess_' + (now - 21600000),
        title: 'WebSocket Event Bus',
        updatedAt: now - 21600000,
        messages: [
          {
            id: 'msg_init_5',
            role: 'user',
            text: 'Design a low-latency WebSocket event bus with exponential backoff and message deduping',
            timestamp: now - 21600000
          },
          {
            id: 'msg_init_6',
            role: 'model',
            text:
              'Architecture brief for a fault-tolerant **WebSocket Event Bus**:\n\n' +
              '- **Jittered Backoff:** Retry on `500ms * 2^n + randomJitter`, capped at `12s`.\n' +
              '- **Idempotent Event IDs:** Attach a unique `eventId` so reconnect replays never double-apply state.\n' +
              '- **Outbound Buffer:** Queue dispatches locally while reconnecting and flush in order on `open`.',
            model: defaultModel,
            timestamp: now - 21590000
          }
        ]
      },
      {
        id: 'cipher_sess_' + (now - 86400000),
        title: 'Gen-Z UI Components',
        updatedAt: now - 86400000,
        messages: [
          {
            id: 'msg_init_7',
            role: 'user',
            text: 'Build a sleek keyboard-driven command bar component with Tailwind CSS and vanilla JS',
            timestamp: now - 86400000
          },
          {
            id: 'msg_init_8',
            role: 'model',
            text: 'Command bar blueprint ready with `Cmd/Ctrl + K` focus, fuzzy filtering, and keyboard arrow navigation.',
            model: defaultModel,
            timestamp: now - 86390000
          }
        ]
      },
      {
        id: 'cipher_sess_' + now,
        title: 'New Session',
        updatedAt: now,
        messages: []
      }
    ];
  }

  function saveSessions() {
    try {
      localStorage.setItem(CIPHER.STORAGE_KEYS.SESSIONS, JSON.stringify(CIPHER.state.sessions));
    } catch (err) {
      if (CIPHER.triggerToast) CIPHER.triggerToast('Storage quota reached; unable to persist session.');
    }
  }

  function saveConfig() {
    var state = CIPHER.state;
    var KEYS = CIPHER.STORAGE_KEYS;
    try {
      localStorage.setItem(KEYS.DEMO_MODE, String(state.demoMode));
      localStorage.setItem(KEYS.GROQ_MODEL, normalizeGroqModel(state.groqModel));
      localStorage.setItem(KEYS.VIBE, state.vibe);
      localStorage.setItem(KEYS.VOICE_READOUT, String(state.voiceReadoutEnabled));
      localStorage.setItem(KEYS.BGM_ENABLED, String(state.bgmEnabled));
      localStorage.setItem(KEYS.INTRO_AUDIO_ENABLED, String(state.introAudioEnabled));
      localStorage.setItem(KEYS.SCREEN, state.screen === 'chat' ? 'chat' : 'intro');
      if (state.activeSessionId) {
        localStorage.setItem(KEYS.ACTIVE_SESSION_ID, state.activeSessionId);
      }
    } catch (err) {}
  }

  function loadState() {
    var state = CIPHER.state;
    var KEYS = CIPHER.STORAGE_KEYS;
    try {
      var savedDemo = localStorage.getItem(KEYS.DEMO_MODE);
      var savedGroqModel = localStorage.getItem(KEYS.GROQ_MODEL);
      var savedVibe = localStorage.getItem(KEYS.VIBE);
      var savedVoiceReadout = localStorage.getItem(KEYS.VOICE_READOUT);
      var savedBgmEnabled = localStorage.getItem(KEYS.BGM_ENABLED);
      var savedIntroAudioEnabled = localStorage.getItem(KEYS.INTRO_AUDIO_ENABLED);
      var savedScreen = localStorage.getItem(KEYS.SCREEN);
      var savedActiveSessionId = localStorage.getItem(KEYS.ACTIVE_SESSION_ID);
      var savedSessionsRaw = localStorage.getItem(KEYS.SESSIONS);

      state.provider = 'groq';
      state.groqModel = normalizeGroqModel(savedGroqModel);
      state.demoMode = savedDemo === 'true';
      if (savedVibe === 'GEN-Z TECH' || savedVibe === 'TACTICAL HUD') state.vibe = savedVibe;
      state.voiceReadoutEnabled = savedVoiceReadout === 'true';
      state.bgmEnabled = savedBgmEnabled === null ? true : savedBgmEnabled === 'true';
      state.introAudioEnabled = savedIntroAudioEnabled === null ? true : savedIntroAudioEnabled === 'true';

      var hash = typeof global.location !== 'undefined' ? global.location.hash : '';
      if (hash === '#workspace') {
        state.screen = 'chat';
      } else if (hash === '#intro') {
        state.screen = 'intro';
      } else if (savedScreen === 'chat' || savedScreen === 'workspace') {
        state.screen = 'chat';
      } else {
        state.screen = 'intro';
      }

      if (savedSessionsRaw) {
        var parsed = JSON.parse(savedSessionsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.sessions = parsed;
        } else {
          state.sessions = buildInitialSessions();
        }
      } else {
        state.sessions = buildInitialSessions();
        saveSessions();
      }

      if (savedActiveSessionId && CIPHER.findSessionById) {
        state.activeSessionId = savedActiveSessionId;
      }
      if (!state.activeSessionId || (CIPHER.findSessionById && !CIPHER.findSessionById(state.activeSessionId))) {
        state.activeSessionId = state.sessions[state.sessions.length - 1].id;
      }
      saveConfig();
    } catch (err) {
      state.sessions = buildInitialSessions();
      state.activeSessionId = state.sessions[state.sessions.length - 1].id;
      state.groqModel = CIPHER.DEFAULT_GROQ_MODEL;
      state.demoMode = true;
    }
  }

  function exportSessionsJson() {
    return JSON.stringify(CIPHER.state.sessions || [], null, 2);
  }

  function importSessionsJson(rawJson) {
    try {
      var parsed = JSON.parse(String(rawJson || ''));
      if (!Array.isArray(parsed) || parsed.length === 0) return false;
      CIPHER.state.sessions = parsed;
      CIPHER.state.activeSessionId = parsed[0].id;
      saveSessions();
      return true;
    } catch (err) {
      return false;
    }
  }

  function generateDemoReply(promptText) {
    var q = String(promptText || '').toLowerCase();
    var state = CIPHER.state;
    var isTactical = state.vibe === 'TACTICAL HUD';
    var activeModel = getActiveModel();

    if (q.indexOf('groq') !== -1 || q.indexOf('llama') !== -1 || q.indexOf('api') !== -1) {
      return (
        (isTactical
          ? 'Directive acknowledged. Here is a **Groq Chat Completions** client module calibrated for `' + activeModel + '`:\n\n'
          : 'Here is a clean **Groq REST API** snippet using `' + activeModel + '`:\n\n') +
        '```javascript\nexport async function askCipherGroq(apiKey, prompt, model = "llama-3.3-70b-versatile") {\n  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {\n    method: "POST",\n    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },\n    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] })\n  });\n  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);\n  const data = await res.json();\n  return data.choices?.[0]?.message?.content ?? "";\n}\n```'
      );
    }

    if (q.indexOf('websocket') !== -1 || q.indexOf('backoff') !== -1 || q.indexOf('event bus') !== -1) {
      return (
        'Architecture brief for a fault-tolerant **WebSocket Event Bus**:\n\n' +
        '- **Jittered Backoff:** Retry on `500ms * 2^n + randomJitter`, capped at `12s`.\n' +
        '- **Idempotent Event IDs:** Attach a unique `eventId` so reconnect replays never double-apply state.\n' +
        '- **Outbound Buffer:** Queue dispatches locally while reconnecting and flush in order on `open`.'
      );
    }

    return (
      '**CIPHER // ' +
      state.vibe +
      '** sandbox response on `' +
      activeModel +
      '`:\n\n> ' +
      promptText +
      '\n\n- **1. Scope & Contracts:** Lock down latency budgets, schemas, and error states.\n- **2. Core Loop:** Build the minimal vertical slice and verify transitions.\n- **3. Live Uplink:** Start the CIPHER backend server for live AI responses.'
    );
  }

  function sleepMs(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function isTransientGroqError(err) {
    if (!err) return false;
    if (err.status === 429 || err.status === 503) return true;
    var msg = String(err.message || '');
    return /\b(429|503)\b|rate.?limit|too many requests|high demand|overloaded|capacity|temporarily unavailable/i.test(msg);
  }

  function isModelNotFoundError(err) {
    if (!err) return false;
    if (err.status === 404 || err.code === 'model_not_found') return true;
    var msg = String(err.message || '');
    return /model_not_found|does not exist or you do not have access to it|unknown model|model .* not found/i.test(msg);
  }

  function buildChatMessages(session) {
    var state = CIPHER.state;
    var systemText = CIPHER.SYSTEM_PROMPTS[state.vibe] || CIPHER.SYSTEM_PROMPTS['GEN-Z TECH'];
    var messages = [{ role: 'system', content: systemText }];
    var list = Array.isArray(session.messages) ? session.messages : [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item || item.isError) continue;
      messages.push({
        role: item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user',
        content: String(item.text || '')
      });
    }
    return messages;
  }

  async function requestActiveProviderCompletion(session) {
    var state = CIPHER.state;
    var primaryModel = getActiveModel();

    var backendResult = await apiRequest(
      '/api/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          model: primaryModel,
          messages: buildChatMessages(session),
          stream: false
        })
      },
      60000
    );
    if (backendResult && backendResult.model && backendResult.model !== state.groqModel) {
      state.groqModel = backendResult.model;
      saveConfig();
      if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
    }
    return {
      text: String((backendResult && backendResult.text) || ''),
      model: (backendResult && backendResult.model) || primaryModel
    };
  }

  CIPHER.isBackendAvailable = isBackendAvailable;
  CIPHER.isBackendGroqReady = isBackendGroqReady;
  CIPHER.canSwitchModels = canSwitchModels;
  CIPHER.checkBackendHealth = checkBackendHealth;
  CIPHER.syncSessionsFromBackend = syncSessionsFromBackend;
  CIPHER.syncCreateSessionBackend = syncCreateSessionBackend;
  CIPHER.syncUpdateSessionBackend = syncUpdateSessionBackend;
  CIPHER.syncDeleteSessionBackend = syncDeleteSessionBackend;
  CIPHER.isChatCapableGroqModel = isChatCapableGroqModel;
  CIPHER.normalizeGroqModel = normalizeGroqModel;
  CIPHER.getActiveModel = getActiveModel;
  CIPHER.setActiveModel = setActiveModel;
  CIPHER.populateModelSelect = populateModelSelect;
  CIPHER.fetchGroqAvailableModels = fetchGroqAvailableModels;
  CIPHER.buildInitialSessions = buildInitialSessions;
  CIPHER.saveSessions = saveSessions;
  CIPHER.saveConfig = saveConfig;
  CIPHER.loadState = loadState;
  CIPHER.exportSessionsJson = exportSessionsJson;
  CIPHER.importSessionsJson = importSessionsJson;
  CIPHER.generateDemoReply = generateDemoReply;
  CIPHER.requestActiveProviderCompletion = requestActiveProviderCompletion;
})(window);
