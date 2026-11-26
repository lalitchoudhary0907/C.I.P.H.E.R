(function (global) {
  'use strict';

  var CIPHER = global.CIPHER;
  var groqModelsCache = { apiKey: '', models: [] };

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

  function getActiveApiKey() {
    return CIPHER.state.groqKey;
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

  async function fetchGroqAvailableModels(apiKey, forceRefresh) {
    var key = String(apiKey || '').trim();
    if (!key) return CIPHER.PROVIDER_MODELS.groq.slice();

    if (!forceRefresh && groqModelsCache.apiKey === key && groqModelsCache.models.length > 0) {
      applyGroqModelList(groqModelsCache.models);
      return groqModelsCache.models.slice();
    }

    try {
      var resp = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + key }
      });
      if (!resp.ok) return CIPHER.PROVIDER_MODELS.groq.slice();
      var json = await resp.json();
      var data = json && Array.isArray(json.data) ? json.data : [];
      var filtered = [];
      for (var i = 0; i < data.length; i++) {
        var item = data[i];
        if (!item || !item.id || item.active === false) continue;
        if (!isChatCapableGroqModel(item.id)) continue;
        if (filtered.indexOf(item.id) === -1) filtered.push(item.id);
      }

      if (filtered.length > 0) {
        groqModelsCache.apiKey = key;
        groqModelsCache.models = filtered.slice();
        try {
          localStorage.setItem(
            CIPHER.STORAGE_KEYS.GROQ_MODELS_CACHE,
            JSON.stringify({ keyLength: key.length, keyTail: key.slice(-6), models: filtered })
          );
        } catch (e) {}
        applyGroqModelList(filtered);
        return filtered.slice();
      }
    } catch (err) {}

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
      localStorage.setItem(KEYS.GROQ_KEY, state.groqKey);
      localStorage.setItem(KEYS.DEMO_MODE, String(state.demoMode));
      localStorage.setItem(KEYS.GROQ_MODEL, normalizeGroqModel(state.groqModel));
      localStorage.setItem(KEYS.VIBE, state.vibe);
      localStorage.setItem(KEYS.VOICE_READOUT, String(state.voiceReadoutEnabled));
      localStorage.setItem(KEYS.BGM_ENABLED, String(state.bgmEnabled));
      localStorage.setItem(KEYS.INTRO_AUDIO_ENABLED, String(state.introAudioEnabled));
    } catch (err) {}
  }

  function loadState() {
    var state = CIPHER.state;
    var KEYS = CIPHER.STORAGE_KEYS;
    try {
      var savedGroqKey = localStorage.getItem(KEYS.GROQ_KEY);
      var savedDemo = localStorage.getItem(KEYS.DEMO_MODE);
      var savedGroqModel = localStorage.getItem(KEYS.GROQ_MODEL);
      var savedVibe = localStorage.getItem(KEYS.VIBE);
      var savedVoiceReadout = localStorage.getItem(KEYS.VOICE_READOUT);
      var savedBgmEnabled = localStorage.getItem(KEYS.BGM_ENABLED);
      var savedIntroAudioEnabled = localStorage.getItem(KEYS.INTRO_AUDIO_ENABLED);
      var savedSessionsRaw = localStorage.getItem(KEYS.SESSIONS);

      state.provider = 'groq';
      state.groqKey = savedGroqKey ? savedGroqKey.trim() : '';

      var savedCacheRaw = localStorage.getItem(KEYS.GROQ_MODELS_CACHE);
      if (savedCacheRaw && state.groqKey) {
        try {
          var cachedObj = JSON.parse(savedCacheRaw);
          if (
            cachedObj &&
            cachedObj.keyLength === state.groqKey.length &&
            cachedObj.keyTail === state.groqKey.slice(-6) &&
            Array.isArray(cachedObj.models) &&
            cachedObj.models.length > 0
          ) {
            var validCached = cachedObj.models.filter(isChatCapableGroqModel);
            if (validCached.length > 0) {
              CIPHER.PROVIDER_MODELS.groq = validCached;
              groqModelsCache.apiKey = state.groqKey;
              groqModelsCache.models = validCached.slice();
            }
          }
        } catch (e) {}
      }

      state.groqModel = normalizeGroqModel(savedGroqModel);
      state.demoMode = savedDemo === null ? !state.groqKey : savedDemo === 'true';
      if (!state.demoMode && !state.groqKey) state.demoMode = true;
      if (savedVibe === 'GEN-Z TECH' || savedVibe === 'TACTICAL HUD') state.vibe = savedVibe;
      state.voiceReadoutEnabled = savedVoiceReadout === 'true';
      state.bgmEnabled = savedBgmEnabled === null ? true : savedBgmEnabled === 'true';
      state.introAudioEnabled = savedIntroAudioEnabled === null ? true : savedIntroAudioEnabled === 'true';

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
      '\n\n- **1. Scope & Contracts:** Lock down latency budgets, schemas, and error states.\n- **2. Core Loop:** Build the minimal vertical slice and verify transitions.\n- **3. Live Uplink:** Add your Groq API key via the **CIPHER Online / Demo** pill anytime for live responses.'
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

  async function requestGroqSingleModel(session, modelName) {
    var state = CIPHER.state;
    var targetModel = String(modelName || '').trim() || getActiveModel();
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

    var resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + state.groqKey
      },
      body: JSON.stringify({ model: targetModel, messages: messages })
    });

    var json = null;
    try {
      json = await resp.json();
    } catch (err) {
      var parseErr = new Error('Malformed JSON response from Groq (HTTP ' + resp.status + ')');
      parseErr.status = resp.status;
      parseErr.model = targetModel;
      throw parseErr;
    }

    if (!resp.ok) {
      var errObj = json && json.error ? json.error : null;
      var message = errObj && errObj.message ? errObj.message : 'Groq API request failed (HTTP ' + resp.status + ')';
      var httpErr = new Error(message);
      httpErr.status = resp.status;
      httpErr.code = errObj && errObj.code ? String(errObj.code) : '';
      httpErr.model = targetModel;
      throw httpErr;
    }

    var choice = json && Array.isArray(json.choices) ? json.choices[0] : null;
    var content = choice && choice.message ? choice.message.content : '';
    if (Array.isArray(content)) {
      content = content.map(function (p) { return p && typeof p.text === 'string' ? p.text : ''; }).join('');
    }

    var output = String(content || '').trim();
    if (!output) {
      var emptyErr = new Error('Empty response received from Groq.');
      emptyErr.model = targetModel;
      throw emptyErr;
    }
    return output;
  }

  async function requestActiveProviderCompletion(session) {
    var state = CIPHER.state;
    var primaryModel = getActiveModel();
    var candidates = [primaryModel];
    for (var i = 0; i < CIPHER.PROVIDER_MODELS.groq.length; i++) {
      var m = CIPHER.PROVIDER_MODELS.groq[i];
      if (candidates.indexOf(m) === -1) candidates.push(m);
    }

    var lastError = null;
    var lastAttemptedModel = primaryModel;
    var refreshedModels = false;

    for (var c = 0; c < candidates.length; c++) {
      var candidateModel = candidates[c];
      lastAttemptedModel = candidateModel;

      for (var attempt = 0; attempt < 2; attempt++) {
        try {
          var text = await requestGroqSingleModel(session, candidateModel);
          if (candidateModel !== state.groqModel) {
            state.groqModel = candidateModel;
            saveConfig();
            if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
          }
          return { text: text, model: candidateModel };
        } catch (err) {
          lastError = err;
          if (lastError && !lastError.model) lastError.model = candidateModel;

          if (isModelNotFoundError(err)) {
            if (!refreshedModels) {
              refreshedModels = true;
              var liveModels = await fetchGroqAvailableModels(state.groqKey, true);
              var fallbackModel = null;
              for (var k = 0; k < liveModels.length; k++) {
                if (liveModels[k] !== candidateModel) {
                  fallbackModel = liveModels[k];
                  break;
                }
              }
              if (!fallbackModel && liveModels.length > 0) fallbackModel = liveModels[0];
              if (fallbackModel) {
                state.groqModel = fallbackModel;
                saveConfig();
                if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
                lastAttemptedModel = fallbackModel;
                try {
                  var retryText = await requestGroqSingleModel(session, fallbackModel);
                  return { text: retryText, model: fallbackModel };
                } catch (retryErr) {
                  lastError = retryErr;
                  if (lastError && !lastError.model) lastError.model = fallbackModel;
                }
              }
            }
            break;
          }

          if (!isTransientGroqError(err)) throw err;
          if (attempt === 0) await sleepMs(600);
        }
      }
    }

    if (lastError) {
      if (!lastError.model) lastError.model = lastAttemptedModel || 'GROQ';
      throw lastError;
    }
    var fallbackErr = new Error('Groq API request failed across all candidate models.');
    fallbackErr.model = lastAttemptedModel || 'GROQ';
    throw fallbackErr;
  }

  CIPHER.isChatCapableGroqModel = isChatCapableGroqModel;
  CIPHER.normalizeGroqModel = normalizeGroqModel;
  CIPHER.getActiveApiKey = getActiveApiKey;
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
  CIPHER.requestGroqSingleModel = requestGroqSingleModel;
  CIPHER.requestActiveProviderCompletion = requestActiveProviderCompletion;
})(window);
