'use strict';

var CURATED_GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
];

var MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
var modelCache = {
  keyHash: '',
  models: [],
  fetchedAt: 0
};

function resolveApiKey(apiKeyOverride) {
  var override = String(apiKeyOverride || '').trim();
  if (override) return override;
  return String(process.env.GROQ_API_KEY || '').trim();
}

function isChatCapableGroqModel(modelId) {
  var id = String(modelId || '').trim();
  if (!id) return false;
  return !/whisper|guard|embedding|tts|orpheus|safeguard/i.test(id);
}

function isTransientError(err) {
  if (!err) return false;
  if (err.status === 429 || err.status === 503) return true;
  var msg = String(err.message || '');
  return /\b(429|503)\b|rate.?limit|too many requests|high demand|overloaded|capacity|temporarily unavailable/i.test(
    msg
  );
}

function isModelNotFoundError(err) {
  if (!err) return false;
  if (err.status === 404 || err.code === 'model_not_found') return true;
  var msg = String(err.message || '');
  return /model_not_found|does not exist or you do not have access to it|unknown model|model .* not found/i.test(
    msg
  );
}

function sleepMs(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function getAvailableModels(apiKeyOverride, forceRefresh) {
  var apiKey = resolveApiKey(apiKeyOverride);
  if (!apiKey) {
    return { models: CURATED_GROQ_MODELS.slice(), source: 'fallback' };
  }

  var keyHash = apiKey.length + ':' + apiKey.slice(-6);
  var now = Date.now();
  if (
    !forceRefresh &&
    modelCache.keyHash === keyHash &&
    modelCache.models.length > 0 &&
    now - modelCache.fetchedAt < MODEL_CACHE_TTL_MS
  ) {
    return { models: modelCache.models.slice(), source: 'cache' };
  }

  try {
    var resp = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + apiKey
      }
    });

    if (!resp.ok) {
      return { models: CURATED_GROQ_MODELS.slice(), source: 'fallback' };
    }

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
      modelCache = {
        keyHash: keyHash,
        models: filtered.slice(),
        fetchedAt: now
      };
      return { models: filtered, source: 'groq' };
    }
  } catch (err) {
    // Fall back to curated list on network error
  }

  return { models: CURATED_GROQ_MODELS.slice(), source: 'fallback' };
}

async function requestSingleModel(apiKey, modelName, messages, stream) {
  var resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: modelName,
      messages: messages,
      stream: Boolean(stream)
    })
  });

  if (!resp.ok) {
    var json = null;
    try {
      json = await resp.json();
    } catch (e) {}
    var errObj = json && json.error ? json.error : null;
    var message =
      errObj && errObj.message
        ? errObj.message
        : 'Groq API request failed (HTTP ' + resp.status + ')';
    var err = new Error(message);
    err.status = resp.status;
    err.code = errObj && errObj.code ? String(errObj.code) : '';
    err.model = modelName;
    throw err;
  }

  if (stream) {
    return { response: resp, model: modelName };
  }

  var data = null;
  try {
    data = await resp.json();
  } catch (parseErr) {
    var badJson = new Error('Malformed JSON response from Groq (HTTP ' + resp.status + ')');
    badJson.status = 502;
    badJson.model = modelName;
    throw badJson;
  }

  var choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
  var content = choice && choice.message ? choice.message.content : '';
  if (Array.isArray(content)) {
    content = content
      .map(function (part) {
        return part && typeof part.text === 'string' ? part.text : '';
      })
      .join('');
  }

  var output = String(content || '').trim();
  if (!output) {
    var emptyErr = new Error('Empty response received from Groq.');
    emptyErr.status = 502;
    emptyErr.model = modelName;
    throw emptyErr;
  }

  return { text: output, model: modelName };
}

async function createChatCompletion(options) {
  var opts = options || {};
  var apiKey = resolveApiKey(opts.apiKeyOverride);
  if (!apiKey) {
    var authErr = new Error(
      'No Groq API key configured. Set GROQ_API_KEY in server/.env or provide a custom key in API settings.'
    );
    authErr.status = 400;
    throw authErr;
  }

  var messages = Array.isArray(opts.messages) ? opts.messages : [];
  if (messages.length === 0) {
    var reqErr = new Error('Request must include a non-empty messages array.');
    reqErr.status = 400;
    throw reqErr;
  }

  var stream = Boolean(opts.stream);
  var requestedModel = String(opts.model || '').trim() || CURATED_GROQ_MODELS[1];
  var discovered = await getAvailableModels(apiKey, false);
  var candidates = [requestedModel];
  var pool = Array.isArray(discovered.models) ? discovered.models : CURATED_GROQ_MODELS;
  for (var i = 0; i < pool.length; i++) {
    if (candidates.indexOf(pool[i]) === -1) candidates.push(pool[i]);
  }

  var lastError = null;
  var lastAttemptedModel = requestedModel;
  var refreshed = false;

  for (var c = 0; c < candidates.length; c++) {
    var candidate = candidates[c];
    lastAttemptedModel = candidate;

    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        return await requestSingleModel(apiKey, candidate, messages, stream);
      } catch (err) {
        lastError = err;
        if (!lastError.model) lastError.model = candidate;

        if (isModelNotFoundError(err)) {
          if (!refreshed) {
            refreshed = true;
            var live = await getAvailableModels(apiKey, true);
            var fallbackModel = null;
            for (var k = 0; k < live.models.length; k++) {
              if (live.models[k] !== candidate) {
                fallbackModel = live.models[k];
                break;
              }
            }
            if (!fallbackModel && live.models.length > 0) fallbackModel = live.models[0];
            if (fallbackModel) {
              lastAttemptedModel = fallbackModel;
              try {
                return await requestSingleModel(apiKey, fallbackModel, messages, stream);
              } catch (retryErr) {
                lastError = retryErr;
                if (!lastError.model) lastError.model = fallbackModel;
              }
            }
          }
          break;
        }

        if (!isTransientError(err)) throw err;
        if (attempt === 0) await sleepMs(500);
      }
    }
  }

  if (lastError) {
    if (!lastError.model) lastError.model = lastAttemptedModel;
    throw lastError;
  }

  var failErr = new Error('Groq API request failed across all candidate models.');
  failErr.status = 502;
  failErr.model = lastAttemptedModel;
  throw failErr;
}

module.exports = {
  CURATED_GROQ_MODELS: CURATED_GROQ_MODELS,
  resolveApiKey: resolveApiKey,
  getAvailableModels: getAvailableModels,
  createChatCompletion: createChatCompletion
};
