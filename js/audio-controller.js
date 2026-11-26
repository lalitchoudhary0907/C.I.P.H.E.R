(function (global) {
  'use strict';

  var CIPHER = global.CIPHER;

  var bgmPlayer = null;
  var bgmPlayerReady = false;
  var bgmGestureUnlocked = false;
  var pendingBgmAutoStart = false;
  var introMusicAudio = null;
  var introVoiceAudio = null;

  function initIntroAudio() {
    var state = CIPHER.state;
    try {
      if (!introMusicAudio && typeof Audio !== 'undefined') {
        introMusicAudio = new Audio('./audio/intro-music.mp3');
        introMusicAudio.loop = true;
        introMusicAudio.volume = 0.28;
        introMusicAudio.preload = 'auto';
        introMusicAudio.addEventListener('error', function () {
          state.introAudioPlaying = false;
          if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
        });
      }
      if (!introVoiceAudio && typeof Audio !== 'undefined') {
        introVoiceAudio = new Audio('./audio/intro-voice.mp3');
        introVoiceAudio.loop = false;
        introVoiceAudio.volume = 0.85;
        introVoiceAudio.preload = 'auto';
        introVoiceAudio.addEventListener('error', function () {});
      }
    } catch (err) {}
  }

  function startIntroAudio() {
    var state = CIPHER.state;
    if (state.screen !== 'intro' || !state.introAudioEnabled) return;
    initIntroAudio();
    try {
      if (introMusicAudio) {
        introMusicAudio.currentTime = 0;
        var p1 = introMusicAudio.play();
        if (p1 && typeof p1.catch === 'function') p1.catch(function () {});
      }
      if (introVoiceAudio) {
        introVoiceAudio.currentTime = 0;
        var p2 = introVoiceAudio.play();
        if (p2 && typeof p2.catch === 'function') p2.catch(function () {});
      }
      state.introAudioPlaying = true;
      if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
    } catch (err) {
      state.introAudioPlaying = false;
    }
  }

  function stopIntroAudio() {
    var state = CIPHER.state;
    try {
      if (introMusicAudio) {
        introMusicAudio.pause();
        introMusicAudio.currentTime = 0;
      }
      if (introVoiceAudio) {
        introVoiceAudio.pause();
        introVoiceAudio.currentTime = 0;
      }
    } catch (err) {}
    state.introAudioPlaying = false;
    if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
  }

  function createBgmPlayer() {
    var state = CIPHER.state;
    try {
      if (bgmPlayer || typeof global.YT === 'undefined' || !global.YT.Player) return;
      var targetEl = document.getElementById('cipher-bgm-player');
      if (!targetEl) return;

      bgmPlayer = new global.YT.Player('cipher-bgm-player', {
        height: '1',
        width: '1',
        videoId: 'tK3JHA2fTiI',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          loop: 1,
          modestbranding: 1,
          playlist: 'tK3JHA2fTiI',
          playsinline: 1,
          rel: 0
        },
        events: {
          onReady: function (e) {
            try {
              bgmPlayerReady = true;
              if (e && e.target && typeof e.target.setVolume === 'function') {
                e.target.setVolume(22);
              }
              if (state.screen === 'chat' && (bgmGestureUnlocked || pendingBgmAutoStart) && state.bgmEnabled) {
                pendingBgmAutoStart = false;
                if (e && e.target && typeof e.target.playVideo === 'function') {
                  e.target.playVideo();
                }
              }
            } catch (err) {}
          },
          onStateChange: function (e) {
            try {
              if (typeof global.YT !== 'undefined' && global.YT.PlayerState && e) {
                if (state.screen !== 'chat' && e.data === global.YT.PlayerState.PLAYING) {
                  if (bgmPlayer && typeof bgmPlayer.pauseVideo === 'function') {
                    bgmPlayer.pauseVideo();
                  }
                  state.bgmPlaying = false;
                  if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
                  return;
                }
                state.bgmPlaying = e.data === global.YT.PlayerState.PLAYING;
                if (
                  e.data === global.YT.PlayerState.ENDED &&
                  state.screen === 'chat' &&
                  state.bgmEnabled &&
                  bgmPlayer &&
                  typeof bgmPlayer.playVideo === 'function'
                ) {
                  bgmPlayer.playVideo();
                }
                if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
              }
            } catch (err) {}
          },
          onError: function () {
            state.bgmPlaying = false;
            if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
          }
        }
      });
    } catch (err) {
      bgmPlayerReady = false;
    }
  }

  function loadYouTubeBgmApi() {
    try {
      if (typeof global.YT !== 'undefined' && global.YT.Player) {
        createBgmPlayer();
        return;
      }
      var prevReady = global.onYouTubeIframeAPIReady;
      global.onYouTubeIframeAPIReady = function () {
        try {
          if (typeof prevReady === 'function') prevReady();
        } catch (e) {}
        createBgmPlayer();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        tag.onerror = function () {};
        document.head.appendChild(tag);
      }
    } catch (err) {}
  }

  function startYouTubeBgm() {
    var state = CIPHER.state;
    if (state.screen !== 'chat' || !state.bgmEnabled) return;
    try {
      if (bgmPlayerReady && bgmPlayer && typeof bgmPlayer.playVideo === 'function') {
        if (typeof bgmPlayer.setVolume === 'function') bgmPlayer.setVolume(22);
        if (typeof bgmPlayer.unMute === 'function') bgmPlayer.unMute();
        bgmPlayer.playVideo();
      } else {
        pendingBgmAutoStart = true;
        loadYouTubeBgmApi();
      }
    } catch (err) {}
  }

  function stopYouTubeBgm() {
    var state = CIPHER.state;
    pendingBgmAutoStart = false;
    try {
      if (bgmPlayerReady && bgmPlayer && typeof bgmPlayer.pauseVideo === 'function') {
        bgmPlayer.pauseVideo();
      }
    } catch (err) {}
    state.bgmPlaying = false;
    if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
  }

  function toggleIntroAudio() {
    var state = CIPHER.state;
    bgmGestureUnlocked = true;
    state.introAudioEnabled = !state.introAudioEnabled;
    if (CIPHER.saveConfig) CIPHER.saveConfig();
    try {
      if (state.introAudioEnabled) {
        if (state.screen === 'intro') startIntroAudio();
        if (CIPHER.triggerToast) CIPHER.triggerToast('Intro audio ON');
      } else {
        stopIntroAudio();
        if (CIPHER.triggerToast) CIPHER.triggerToast('Intro audio OFF');
      }
    } catch (err) {
      state.introAudioPlaying = false;
    }
    if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
  }

  function toggleBgm() {
    var state = CIPHER.state;
    bgmGestureUnlocked = true;
    state.bgmEnabled = !state.bgmEnabled;
    if (CIPHER.saveConfig) CIPHER.saveConfig();
    try {
      if (state.bgmEnabled) {
        if (state.screen === 'intro') {
          stopYouTubeBgm();
          startIntroAudio();
        } else {
          stopIntroAudio();
          startYouTubeBgm();
        }
        if (CIPHER.triggerToast) CIPHER.triggerToast('Background music ON');
      } else {
        stopIntroAudio();
        stopYouTubeBgm();
        if (CIPHER.triggerToast) CIPHER.triggerToast('Background music OFF');
      }
    } catch (err) {
      state.bgmPlaying = false;
      state.introAudioPlaying = false;
    }
    if (CIPHER.syncHudStatus) CIPHER.syncHudStatus();
  }

  function setupAudioGestureUnlock() {
    function unlockAudioOnce() {
      var state = CIPHER.state;
      bgmGestureUnlocked = true;
      if (state.screen === 'intro') {
        if (state.introAudioEnabled) startIntroAudio();
      } else if (state.bgmEnabled) {
        startYouTubeBgm();
      }
      document.removeEventListener('pointerdown', unlockAudioOnce);
      document.removeEventListener('keydown', unlockAudioOnce);
    }
    document.addEventListener('pointerdown', unlockAudioOnce, { passive: true });
    document.addEventListener('keydown', unlockAudioOnce, { passive: true });
  }

  CIPHER.isGestureUnlocked = function () { return bgmGestureUnlocked; };
  CIPHER.unlockGesture = function () { bgmGestureUnlocked = true; };
  CIPHER.initIntroAudio = initIntroAudio;
  CIPHER.startIntroAudio = startIntroAudio;
  CIPHER.stopIntroAudio = stopIntroAudio;
  CIPHER.loadYouTubeBgmApi = loadYouTubeBgmApi;
  CIPHER.startYouTubeBgm = startYouTubeBgm;
  CIPHER.stopYouTubeBgm = stopYouTubeBgm;
  CIPHER.toggleIntroAudio = toggleIntroAudio;
  CIPHER.toggleBgm = toggleBgm;
  CIPHER.setupAudioGestureUnlock = setupAudioGestureUnlock;
})(window);
