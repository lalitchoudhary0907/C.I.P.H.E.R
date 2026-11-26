(function (global) {
  'use strict';

  if (typeof global.tailwind !== 'undefined') {
    global.tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Inter"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
            hud: ['"Orbitron"', '"Space Grotesk"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace']
          },
          colors: {
            cipherObsidian: '#04080e',
            cipherRail: '#060c14',
            cipherBlack: '#000000',
            cipherVoid: '#050c14',
            cipherPanel: '#0a1624',
            arcCyan: '#00E5FF',
            iceBlue: '#38BDF8',
            starkGold: '#FBBF24',
            cipherText: '#F0F9FF',
            cipherSubtext: '#BAE6FD',
            cipherMuted: '#7DD3FC',
            cipherLine: 'rgba(56, 189, 248, 0.16)',
            cipherLineStrong: 'rgba(0, 229, 255, 0.38)'
          }
        }
      }
    };
  }

  var DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

  var STORAGE_KEYS = {
    GROQ_MODEL: 'cipher_groq_model',
    DEMO_MODE: 'cipher_hud_demo',
    VIBE: 'cipher_hud_vibe',
    VOICE_READOUT: 'cipher_hud_voice_readout',
    BGM_ENABLED: 'cipher_hud_bgm',
    INTRO_AUDIO_ENABLED: 'cipher_hud_intro_audio',
    SESSIONS: 'cipher_hud_sessions'
  };

  var PROVIDER_MODELS = {
    groq: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
  };

  var STARTER_CARDS = [
    {
      id: 'ai-stack',
      title: 'AI Stack',
      desc: 'RAG, embeddings, and reranking workflows',
      prompt: 'Break down how RAG + vector embeddings + reranking work together in a modern AI app',
      side: 'left',
      icon:
        '<svg class="w-4 h-4 text-arcCyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>'
    },
    {
      id: 'systems-hud',
      title: 'Systems HUD',
      desc: 'Low-latency WebSocket bus with backoff & deduping',
      prompt: 'Design a low-latency WebSocket event bus with exponential backoff and message deduping',
      side: 'left',
      icon:
        '<svg class="w-4 h-4 text-arcCyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'
    },
    {
      id: 'groq-api',
      title: 'Groq API',
      desc: 'JS helper for Groq chat with retry & error handling',
      prompt: 'Write a clean JavaScript helper for Groq chat completions with retry and error handling',
      side: 'right',
      icon:
        '<svg class="w-4 h-4 text-arcCyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
    },
    {
      id: 'genz-ui',
      title: 'Gen-Z UI Craft',
      desc: 'Sleek command bar with Tailwind CSS & vanilla JS',
      prompt: 'Build a sleek keyboard-driven command bar component with Tailwind CSS and vanilla JS',
      side: 'right',
      icon:
        '<svg class="w-4 h-4 text-arcCyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
    }
  ];

  var QUICK_ACTIONS = [
    {
      label: 'Write',
      prefix: 'Write a clean, well-structured implementation for: ',
      icon: '<svg class="w-3.5 h-3.5 text-arcCyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
    },
    {
      label: 'Debug',
      prefix: 'Debug and pinpoint the root cause of this issue: ',
      icon: '<svg class="w-3.5 h-3.5 text-iceBlue" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>'
    },
    {
      label: 'Build',
      prefix: 'Architect and build a production-ready module for: ',
      icon: '<svg class="w-3.5 h-3.5 text-arcCyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'
    },
    {
      label: 'Explain',
      prefix: 'Explain clearly with trade-offs and examples: ',
      icon: '<svg class="w-3.5 h-3.5 text-iceBlue" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'
    },
    {
      label: 'Optimize',
      prefix: 'Optimize for latency, clarity, and minimal overhead: ',
      icon: '<svg class="w-3.5 h-3.5 text-arcCyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>'
    }
  ];

  var SYSTEM_PROMPTS = {
    'GEN-Z TECH':
      'You are CIPHER, an AI workspace assistant with a sharp Gen-Z tech edge and systems precision. ' +
      'Give crisp, high-signal, accurate answers with clear structure, practical insights, and clean code blocks when helpful.',
    'TACTICAL HUD':
      'You are CIPHER, a precision AI workspace intelligence assistant. ' +
      'Deliver concise, structured technical briefings, clear architectural trade-offs, step-by-step execution plans, and production-ready code.'
  };

  var state = {
    screen: 'intro',
    provider: 'groq',
    demoMode: false,
    groqModel: DEFAULT_GROQ_MODEL,
    canSwitchModels: false,
    configuredProviders: [],
    vibe: 'GEN-Z TECH',
    hudWaveEnabled: true,
    filterQuery: '',
    sessions: [],
    activeSessionId: null,
    isGenerating: false,
    purgeArmed: false,
    editingMessageId: null,
    voiceListening: false,
    voiceReadoutEnabled: false,
    speakingMessageId: null,
    bgmEnabled: true,
    bgmPlaying: false,
    introAudioEnabled: true,
    introAudioPlaying: false
  };

  global.CIPHER = global.CIPHER || {};
  global.CIPHER.DEFAULT_GROQ_MODEL = DEFAULT_GROQ_MODEL;
  global.CIPHER.STORAGE_KEYS = STORAGE_KEYS;
  global.CIPHER.PROVIDER_MODELS = PROVIDER_MODELS;
  global.CIPHER.STARTER_CARDS = STARTER_CARDS;
  global.CIPHER.QUICK_ACTIONS = QUICK_ACTIONS;
  global.CIPHER.SYSTEM_PROMPTS = SYSTEM_PROMPTS;
  global.CIPHER.state = state;
  global.CIPHER.dom = {};
})(window);
