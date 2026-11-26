(function (global) {
  'use strict';

  var CIPHER = global.CIPHER;
  var speechRecognitionInstance = null;

  function stripMarkdownForSpeech(rawText) {
    return String(rawText || '')
      .replace(/```[\s\S]*?```/g, ' Code block omitted. ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .replace(/^[-*]\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stopVoiceReadout() {
    CIPHER.state.speakingMessageId = null;
    try {
      if (typeof global !== 'undefined' && 'speechSynthesis' in global && global.speechSynthesis) {
        global.speechSynthesis.cancel();
      }
    } catch (err) {}
    if (CIPHER.renderChatStream) CIPHER.renderChatStream();
  }

  function speakMessageText(rawText, messageId) {
    var state = CIPHER.state;
    try {
      if (typeof global === 'undefined' || !('speechSynthesis' in global) || !global.speechSynthesis) {
        if (CIPHER.triggerToast) CIPHER.triggerToast('Speech synthesis unavailable in this browser.');
        return;
      }
      var cleanText = stripMarkdownForSpeech(rawText);
      if (!cleanText) return;

      global.speechSynthesis.cancel();
      state.speakingMessageId = messageId || null;
      if (CIPHER.renderChatStream) CIPHER.renderChatStream();

      var utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.03;
      utterance.pitch = 0.96;

      try {
        var voices = global.speechSynthesis.getVoices ? global.speechSynthesis.getVoices() : [];
        if (Array.isArray(voices)) {
          for (var i = 0; i < voices.length; i++) {
            if (voices[i] && /^en/i.test(voices[i].lang || '')) {
              utterance.voice = voices[i];
              break;
            }
          }
        }
      } catch (voiceErr) {}

      utterance.onend = function () {
        if (state.speakingMessageId === messageId) {
          state.speakingMessageId = null;
          if (CIPHER.renderChatStream) CIPHER.renderChatStream();
        }
      };
      utterance.onerror = function () {
        if (state.speakingMessageId === messageId) {
          state.speakingMessageId = null;
          if (CIPHER.renderChatStream) CIPHER.renderChatStream();
        }
      };

      global.speechSynthesis.speak(utterance);
    } catch (err) {
      state.speakingMessageId = null;
      if (CIPHER.triggerToast) CIPHER.triggerToast('Unable to start voice readout.');
    }
  }

  function toggleJarvisVoiceListener() {
    var state = CIPHER.state;
    var dom = CIPHER.dom;
    var SpeechRecognitionCtor =
      typeof global !== 'undefined' && (global.SpeechRecognition || global.webkitSpeechRecognition);

    if (!SpeechRecognitionCtor) {
      if (CIPHER.triggerToast) CIPHER.triggerToast('Speech recognition unavailable in this browser; text input active.');
      return;
    }

    if (state.voiceListening && speechRecognitionInstance) {
      try {
        speechRecognitionInstance.stop();
      } catch (err) {}
      state.voiceListening = false;
      if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
      if (CIPHER.triggerToast) CIPHER.triggerToast('CIPHER voice listener standing by');
      return;
    }

    try {
      var recognition = new SpeechRecognitionCtor();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = function () {
        state.voiceListening = true;
        if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
        if (CIPHER.triggerToast) CIPHER.triggerToast('CIPHER listening... speak directive');
      };

      recognition.onresult = function (event) {
        try {
          var transcript = '';
          if (event && event.results && event.results[0] && event.results[0][0]) {
            transcript = String(event.results[0][0].transcript || '').trim();
          }
          if (!transcript) return;

          var stripped = transcript
            .replace(/^(?:hey\s+)?(?:jarvis|cipher|c\.i\.p\.h\.e\.r\.?)[,:\s-]*/i, '')
            .trim();

          if (!stripped) {
            if (CIPHER.triggerToast) CIPHER.triggerToast('CIPHER online. Issue a full directive.');
            return;
          }

          if (/^(?:stop\s+speaking|mute|quiet|silence)$/i.test(stripped)) {
            stopVoiceReadout();
            if (CIPHER.triggerToast) CIPHER.triggerToast('Voice readout muted');
            return;
          }

          if (dom.promptTextarea) {
            dom.promptTextarea.value = stripped;
            if (CIPHER.autoResizePrompt) CIPHER.autoResizePrompt();
          }
          if (CIPHER.sendPromptMessage) CIPHER.sendPromptMessage(stripped);
        } catch (resErr) {
          if (CIPHER.triggerToast) CIPHER.triggerToast('Voice command parse failed.');
        }
      };

      recognition.onerror = function (event) {
        state.voiceListening = false;
        if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
        var code = event && event.error ? event.error : 'unknown';
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          if (CIPHER.triggerToast) CIPHER.triggerToast('Microphone permission denied for voice input.');
        } else if (code === 'no-speech') {
          if (CIPHER.triggerToast) CIPHER.triggerToast('No speech detected; standing by.');
        } else if (code !== 'aborted') {
          if (CIPHER.triggerToast) CIPHER.triggerToast('Voice recognition error: ' + code);
        }
      };

      recognition.onend = function () {
        state.voiceListening = false;
        speechRecognitionInstance = null;
        if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
      };

      speechRecognitionInstance = recognition;
      recognition.start();
    } catch (err) {
      state.voiceListening = false;
      speechRecognitionInstance = null;
      if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
      if (CIPHER.triggerToast) CIPHER.triggerToast('Unable to initialize speech recognition.');
    }
  }

  CIPHER.stripMarkdownForSpeech = stripMarkdownForSpeech;
  CIPHER.stopVoiceReadout = stopVoiceReadout;
  CIPHER.speakMessageText = speakMessageText;
  CIPHER.toggleJarvisVoiceListener = toggleJarvisVoiceListener;
})(window);
