(function (global) {
  'use strict';

  var CIPHER = global.CIPHER;
  var toastTimer = null;
  var purgeArmTimer = null;

  function cacheElements() {
    var dom = CIPHER.dom;
    dom.introGate = document.getElementById('intro-gate');
    dom.introStatusPill = document.getElementById('intro-status-pill');
    dom.introStatusDot = document.getElementById('intro-status-dot');
    dom.introStatusText = document.getElementById('intro-status-text');
    dom.introUserPill = document.getElementById('intro-user-pill');
    dom.introAudioToggleBtn = document.getElementById('intro-audio-toggle-btn');
    dom.introAudioLabel = document.getElementById('intro-audio-label');
    dom.introSettingsBtn = document.getElementById('intro-settings-btn');
    dom.introHelpBtn = document.getElementById('intro-help-btn');
    dom.introReactorWrap = document.getElementById('intro-reactor-wrap');
    dom.introEnterBtn = document.getElementById('intro-enter-btn');
    dom.introVoiceBtn = document.getElementById('intro-voice-btn');
    dom.introEnterHint = document.getElementById('intro-enter-hint');
    dom.workspaceShell = document.getElementById('workspace-shell');
    dom.sidebarBrandBtn = document.getElementById('sidebar-brand-btn');

    dom.chatSidebar = document.getElementById('chat-sidebar');
    dom.cipherSidebarBackdrop = document.getElementById('cipher-sidebar-backdrop');
    dom.toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    dom.closeSidebarMobileBtn = document.getElementById('close-sidebar-mobile-btn');

    dom.newSessionBtn = document.getElementById('new-session-btn');
    dom.navExploreBtn = document.getElementById('nav-explore-btn');
    dom.navModelsBtn = document.getElementById('nav-models-btn');
    dom.navToolsBtn = document.getElementById('nav-tools-btn');
    dom.sessionFilterInput = document.getElementById('session-filter-input');
    dom.sessionList = document.getElementById('session-list');
    dom.sidebarSessionCount = document.getElementById('sidebar-session-count');
    dom.purgeHistoryBtn = document.getElementById('purge-history-btn');

    dom.workspaceRingArc = document.getElementById('workspace-ring-arc');
    dom.workspaceQuotaLabel = document.getElementById('workspace-quota-label');
    dom.workspaceQuotaPct = document.getElementById('workspace-quota-pct');
    dom.sidebarSettingsBtn = document.getElementById('sidebar-settings-btn');
    dom.sidebarHelpBtn = document.getElementById('sidebar-help-btn');
    dom.sidebarStorageBtn = document.getElementById('sidebar-storage-btn');

    dom.apiKeyBtn = document.getElementById('api-key-btn');
    dom.statusDot = document.getElementById('status-dot');
    dom.statusPillText = document.getElementById('status-pill-text');
    dom.modelSelect = document.getElementById('model-select');
    dom.voiceJarvisBtn = document.getElementById('voice-jarvis-btn');
    dom.voiceBtnLabel = document.getElementById('voice-btn-label');
    dom.voiceReadoutBtn = document.getElementById('voice-readout-btn');
    dom.speakBtnLabel = document.getElementById('speak-btn-label');
    dom.bgmToggleBtn = document.getElementById('bgm-toggle-btn');
    dom.bgmBtnLabel = document.getElementById('bgm-btn-label');
    dom.hudMotionBtn = document.getElementById('hud-motion-btn');
    dom.hudSwitchTrack = document.getElementById('hud-switch-track');
    dom.fullscreenBtn = document.getElementById('fullscreen-btn');
    dom.avatarProfileBtn = document.getElementById('avatar-profile-btn');

    dom.chatStream = document.getElementById('chat-stream');
    dom.chatForm = document.getElementById('chat-form');
    dom.dockPlusBtn = document.getElementById('dock-plus-btn');
    dom.dockExploreBtn = document.getElementById('dock-explore-btn');
    dom.dockVibeBtn = document.getElementById('dock-vibe-btn');
    dom.dockMicBtn = document.getElementById('dock-mic-btn');
    dom.promptTextarea = document.getElementById('prompt-textarea');
    dom.transmitBtn = document.getElementById('transmit-btn');

    dom.apiConfigModal = document.getElementById('api-config-modal');
    dom.closeModalBtn = document.getElementById('close-modal-btn');
    dom.modalGroqKeyInput = document.getElementById('modal-groq-key-input');
    dom.modalToggleGroqVisBtn = document.getElementById('modal-toggle-groq-vis-btn');
    dom.modalModelSelect = document.getElementById('modal-model-select');
    dom.modalVibeSelect = document.getElementById('modal-vibe-select');
    dom.modalDemoCheckbox = document.getElementById('modal-demo-checkbox');
    dom.modalClearKeyBtn = document.getElementById('modal-clear-key-btn');
    dom.modalSaveBtn = document.getElementById('modal-save-btn');

    dom.utilityModal = document.getElementById('utility-modal');
    dom.utilityModalTitle = document.getElementById('utility-modal-title');
    dom.utilityModalBody = document.getElementById('utility-modal-body');
    dom.closeUtilityModalBtn = document.getElementById('close-utility-modal-btn');

    dom.cipherToast = document.getElementById('cipher-toast');
    dom.waveCanvas3d = document.getElementById('cipher-wave-3d');
    dom.waveCanvas2d = document.getElementById('cipher-wave-2d');
  }

  function triggerToast(message) {
    var dom = CIPHER.dom;
    if (!dom.cipherToast) return;
    dom.cipherToast.textContent = message;
    dom.cipherToast.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      dom.cipherToast.classList.add('hidden');
    }, 2500);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatAgeCompact(timestamp) {
    var sec = Math.max(0, Math.floor((Date.now() - (timestamp || Date.now())) / 1000));
    if (sec < 60) return 'now';
    var min = Math.floor(sec / 60);
    if (min < 60) return min + 'm';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h';
    var day = Math.floor(hr / 24);
    return day + 'd';
  }

  function getTimeGreeting() {
    var hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function findSessionById(id) {
    var sessions = CIPHER.state.sessions;
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === id) return sessions[i];
    }
    return null;
  }

  function getActiveSession() {
    var state = CIPHER.state;
    var found = findSessionById(state.activeSessionId);
    if (found) return found;
    if (state.sessions.length > 0) {
      state.activeSessionId = state.sessions[0].id;
      return state.sessions[0];
    }
    return createSession(true);
  }

  function createSession(skipRender) {
    var state = CIPHER.state;
    state.editingMessageId = null;
    if (CIPHER.stopVoiceReadout) CIPHER.stopVoiceReadout();
    var fresh = {
      id: 'cipher_sess_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      title: 'New Session',
      updatedAt: Date.now(),
      messages: []
    };
    state.sessions.unshift(fresh);
    state.activeSessionId = fresh.id;
    CIPHER.saveSessions();
    if (!skipRender) {
      renderSessionList();
      renderChatStream();
      syncQuotaCard();
    }
    return fresh;
  }

  function renameSessionById(sessionId, nextTitle) {
    var sess = findSessionById(sessionId);
    if (!sess) return;
    var clean = String(nextTitle || '').trim();
    sess.title = clean || 'New Session';
    sess.updatedAt = Date.now();
    CIPHER.saveSessions();
    renderSessionList();
    triggerToast('Session renamed');
  }

  function deleteSessionById(sessionId) {
    var state = CIPHER.state;
    var index = -1;
    for (var i = 0; i < state.sessions.length; i++) {
      if (state.sessions[i].id === sessionId) {
        index = i;
        break;
      }
    }
    if (index === -1) return;

    state.sessions.splice(index, 1);
    state.editingMessageId = null;
    if (CIPHER.stopVoiceReadout) CIPHER.stopVoiceReadout();
    if (state.sessions.length === 0) {
      createSession(true);
    } else if (state.activeSessionId === sessionId) {
      state.activeSessionId = state.sessions[0].id;
    }
    CIPHER.saveSessions();
    renderSessionList();
    renderChatStream();
    syncQuotaCard();
    triggerToast('Session deleted');
  }

  function disarmPurgeButton() {
    CIPHER.state.purgeArmed = false;
    if (purgeArmTimer) {
      clearTimeout(purgeArmTimer);
      purgeArmTimer = null;
    }
    if (CIPHER.dom.purgeHistoryBtn) {
      CIPHER.dom.purgeHistoryBtn.classList.remove('border-starkGold', 'text-starkGold');
    }
  }

  function handlePurgeHistory() {
    var state = CIPHER.state;
    if (!state.purgeArmed) {
      state.purgeArmed = true;
      if (CIPHER.dom.purgeHistoryBtn) {
        CIPHER.dom.purgeHistoryBtn.classList.add('border-starkGold', 'text-starkGold');
      }
      triggerToast('Click filter/purge icon again within 4s to clear all sessions');
      purgeArmTimer = setTimeout(disarmPurgeButton, 4000);
      return;
    }
    disarmPurgeButton();
    state.editingMessageId = null;
    if (CIPHER.stopVoiceReadout) CIPHER.stopVoiceReadout();
    state.sessions = [];
    createSession(true);
    CIPHER.saveSessions();
    renderSessionList();
    renderChatStream();
    syncQuotaCard();
    triggerToast('Session history purged');
  }

  function openSidebarDrawer() {
    if (CIPHER.dom.chatSidebar) CIPHER.dom.chatSidebar.classList.remove('-translate-x-full');
    if (CIPHER.dom.cipherSidebarBackdrop) CIPHER.dom.cipherSidebarBackdrop.classList.remove('hidden');
  }

  function closeSidebarDrawer() {
    if (CIPHER.dom.chatSidebar) CIPHER.dom.chatSidebar.classList.add('-translate-x-full');
    if (CIPHER.dom.cipherSidebarBackdrop) CIPHER.dom.cipherSidebarBackdrop.classList.add('hidden');
  }

  function enterWorkspace(armVoice) {
    var state = CIPHER.state;
    var dom = CIPHER.dom;
    if (state.screen === 'chat') return;
    state.screen = 'chat';
    if (CIPHER.unlockGesture) CIPHER.unlockGesture();
    if (CIPHER.stopIntroAudio) CIPHER.stopIntroAudio();
    if (CIPHER.startYouTubeBgm) CIPHER.startYouTubeBgm();
    if (dom.introGate) {
      dom.introGate.classList.add('cipher-intro-hidden');
      dom.introGate.setAttribute('aria-hidden', 'true');
    }
    if (dom.workspaceShell) {
      dom.workspaceShell.classList.remove('cipher-workspace-hidden');
      dom.workspaceShell.setAttribute('aria-hidden', 'false');
    }
    setTimeout(function () {
      if (armVoice && CIPHER.toggleJarvisVoiceListener) {
        CIPHER.toggleJarvisVoiceListener();
      } else if (dom.promptTextarea) {
        dom.promptTextarea.focus();
      }
    }, 520);
  }

  function returnToIntro() {
    var state = CIPHER.state;
    var dom = CIPHER.dom;
    if (state.screen === 'intro') return;
    state.screen = 'intro';
    closeSidebarDrawer();
    if (CIPHER.stopYouTubeBgm) CIPHER.stopYouTubeBgm();
    if (state.introAudioEnabled && CIPHER.isGestureUnlocked && CIPHER.isGestureUnlocked() && CIPHER.startIntroAudio) {
      CIPHER.startIntroAudio();
    }
    if (dom.workspaceShell) {
      dom.workspaceShell.classList.add('cipher-workspace-hidden');
      dom.workspaceShell.setAttribute('aria-hidden', 'true');
    }
    if (dom.introGate) {
      dom.introGate.classList.remove('cipher-intro-hidden');
      dom.introGate.setAttribute('aria-hidden', 'false');
    }
  }

  function syncQuotaCard() {
    var dom = CIPHER.dom;
    var count = CIPHER.state.sessions.length;
    var maxChats = 100;
    var pct = Math.min(100, Math.max(1, Math.round((count / maxChats) * 100)));
    if (dom.sidebarSessionCount) dom.sidebarSessionCount.textContent = String(count);
    if (dom.workspaceQuotaLabel) dom.workspaceQuotaLabel.textContent = count + '/' + maxChats + ' chats';
    if (dom.workspaceQuotaPct) dom.workspaceQuotaPct.textContent = pct + '%';
    if (dom.workspaceRingArc) {
      var circumference = 88;
      dom.workspaceRingArc.setAttribute('stroke-dashoffset', String(circumference - (circumference * pct) / 100));
    }
  }

  function syncHudStatus() {
    var state = CIPHER.state;
    var dom = CIPHER.dom;
    var activeModel = CIPHER.getActiveModel();
    var activeKey = CIPHER.getActiveApiKey();
    var isLive = !state.demoMode && Boolean(activeKey);

    if (dom.statusDot) {
      dom.statusDot.className = isLive
        ? 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]'
        : 'w-2 h-2 rounded-full bg-emerald-400/80 shadow-[0_0_8px_#34d399]';
    }
    if (dom.statusPillText) {
      dom.statusPillText.textContent = isLive ? 'CIPHER Online' : 'CIPHER Online (Demo)';
    }
    if (dom.introStatusDot) {
      dom.introStatusDot.className = isLive
        ? 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]'
        : 'w-2 h-2 rounded-full bg-emerald-400/80 shadow-[0_0_8px_#34d399]';
    }
    if (dom.introStatusText) {
      dom.introStatusText.textContent = isLive ? 'CIPHER Online' : 'CIPHER Online (Demo)';
    }

    CIPHER.populateModelSelect(dom.modelSelect, activeModel);

    if (dom.voiceJarvisBtn && dom.voiceBtnLabel) {
      dom.voiceBtnLabel.textContent = state.voiceListening ? 'Listening...' : 'Voice';
      dom.voiceJarvisBtn.className =
        'cipher-btn-pill px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs cursor-pointer ' +
        (state.voiceListening ? 'cipher-btn-pill-active' : 'text-slate-200');
    }

    if (dom.voiceReadoutBtn && dom.speakBtnLabel) {
      dom.speakBtnLabel.textContent = state.voiceReadoutEnabled ? 'Speak: On' : 'Speak';
      dom.voiceReadoutBtn.className =
        'cipher-btn-pill px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs cursor-pointer ' +
        (state.voiceReadoutEnabled ? 'cipher-btn-pill-active' : 'text-slate-200');
    }

    if (dom.bgmToggleBtn && dom.bgmBtnLabel) {
      var bgmActive = state.bgmEnabled && state.bgmPlaying;
      dom.bgmBtnLabel.textContent = !state.bgmEnabled ? 'Music: Off' : bgmActive ? 'Music: On' : 'Music';
      dom.bgmToggleBtn.className =
        'cipher-btn-pill px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs cursor-pointer ' +
        (bgmActive ? 'cipher-btn-pill-active' : state.bgmEnabled ? 'text-slate-200' : 'text-slate-500');
    }

    if (dom.introAudioToggleBtn && dom.introAudioLabel) {
      dom.introAudioToggleBtn.setAttribute('aria-pressed', String(state.introAudioEnabled));
      dom.introAudioLabel.textContent = state.introAudioEnabled ? 'Intro Audio: ON' : 'Intro Audio: OFF';
      dom.introAudioToggleBtn.className =
        'cipher-btn-pill px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs cursor-pointer ' +
        (state.introAudioEnabled ? 'cipher-btn-pill-active' : 'text-slate-500');
    }

    if (dom.hudSwitchTrack) {
      dom.hudSwitchTrack.className =
        'w-7 h-4 rounded-full p-0.5 flex items-center transition-all ' +
        (state.hudWaveEnabled ? 'bg-iceBlue/90 justify-end' : 'bg-slate-700 justify-start');
    }
    document.body.classList.toggle('hud-static', !state.hudWaveEnabled);
  }

  function renderSessionList() {
    var dom = CIPHER.dom;
    var state = CIPHER.state;
    if (!dom.sessionList) return;
    dom.sessionList.innerHTML = '';

    var q = state.filterQuery.trim().toLowerCase();
    var items = state.sessions.filter(function (sess) {
      if (!q) return true;
      if (String(sess.title || '').toLowerCase().indexOf(q) !== -1) return true;
      var msgs = Array.isArray(sess.messages) ? sess.messages : [];
      for (var i = 0; i < msgs.length; i++) {
        if (String(msgs[i].text || '').toLowerCase().indexOf(q) !== -1) return true;
      }
      return false;
    });

    if (items.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'px-3 py-5 text-center font-mono text-[11px] text-slate-500';
      empty.textContent = q ? 'No matching sessions' : 'No saved sessions';
      dom.sessionList.appendChild(empty);
      syncQuotaCard();
      return;
    }

    items.forEach(function (sess) {
      var active = sess.id === state.activeSessionId;
      var row = document.createElement('div');
      row.setAttribute('role', 'listitem');
      row.className =
        'group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg transition cursor-pointer ' +
        (active
          ? 'bg-white/[0.08] text-white border border-cyan-400/25'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent');

      var left = document.createElement('div');
      left.className = 'flex items-center gap-2 min-w-0 flex-1';

      var icon = document.createElement('span');
      icon.className = 'shrink-0 ' + (active ? 'text-arcCyan' : 'text-slate-500');
      icon.innerHTML =
        '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

      var titleEl = document.createElement('span');
      titleEl.className = 'text-xs truncate';
      titleEl.textContent = sess.title || 'New Session';

      left.appendChild(icon);
      left.appendChild(titleEl);

      var right = document.createElement('div');
      right.className = 'flex items-center gap-1 shrink-0';

      var ageEl = document.createElement('span');
      ageEl.className = 'font-mono text-[10px] text-slate-500 group-hover:hidden';
      ageEl.textContent = formatAgeCompact(sess.updatedAt);

      var renBtn = document.createElement('button');
      renBtn.type = 'button';
      renBtn.className =
        'hidden group-hover:inline-block px-1 py-0.5 rounded text-[9px] font-mono text-slate-400 hover:text-arcCyan cursor-pointer';
      renBtn.textContent = 'REN';
      renBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        beginInlineRename(row, sess);
      });

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className =
        'hidden group-hover:inline-block px-1 py-0.5 rounded text-[9px] font-mono text-slate-400 hover:text-starkGold cursor-pointer';
      delBtn.textContent = 'DEL';
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteSessionById(sess.id);
      });

      right.appendChild(ageEl);
      right.appendChild(renBtn);
      right.appendChild(delBtn);

      row.appendChild(left);
      row.appendChild(right);

      row.addEventListener('click', function () {
        if (state.isGenerating) return;
        state.activeSessionId = sess.id;
        state.editingMessageId = null;
        if (CIPHER.stopVoiceReadout) CIPHER.stopVoiceReadout();
        closeSidebarDrawer();
        renderSessionList();
        renderChatStream();
      });

      dom.sessionList.appendChild(row);
    });

    syncQuotaCard();
  }

  function beginInlineRename(rowEl, sess) {
    var input = document.createElement('input');
    input.type = 'text';
    input.value = sess.title || 'New Session';
    input.className =
      'w-full px-2 py-1 rounded bg-[#03070c] border border-arcCyan font-mono text-xs text-white focus:outline-none';

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      renameSessionById(sess.id, input.value);
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        finish();
      } else if (e.key === 'Escape') {
        done = true;
        renderSessionList();
      }
    });
    input.addEventListener('blur', finish);

    rowEl.innerHTML = '';
    rowEl.appendChild(input);
    input.focus();
    input.select();
  }

  function createDirectiveCardEl(card) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'group cipher-directive-card w-full p-4 rounded-2xl flex items-center justify-between gap-3 text-left cursor-pointer';

    var left = document.createElement('div');
    left.className = 'flex items-start gap-3 min-w-0';

    var iconBox = document.createElement('div');
    iconBox.className = 'w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/25 flex items-center justify-center shrink-0 mt-0.5';
    iconBox.innerHTML = card.icon;

    var copy = document.createElement('div');
    copy.className = 'min-w-0';

    var title = document.createElement('div');
    title.className = 'text-sm font-semibold text-white';
    title.textContent = card.title;

    var desc = document.createElement('div');
    desc.className = 'text-xs text-slate-400 mt-0.5 leading-snug';
    desc.textContent = card.desc;

    copy.appendChild(title);
    copy.appendChild(desc);
    left.appendChild(iconBox);
    left.appendChild(copy);

    var arrow = document.createElement('span');
    arrow.className = 'text-arcCyan/80 group-hover:text-iceBlue text-sm shrink-0 transition-transform duration-200 group-hover:translate-x-1';
    arrow.innerHTML = '&rarr;';

    btn.appendChild(left);
    btn.appendChild(arrow);

    btn.addEventListener('click', function () {
      if (CIPHER.state.isGenerating) return;
      sendPromptMessage(card.prompt);
    });

    return btn;
  }

  function renderEmptyState() {
    var container = document.createElement('div');
    container.className = 'max-w-6xl mx-auto min-h-full flex flex-col items-center justify-center py-3 space-y-5';

    var hero = document.createElement('div');
    hero.className = 'text-center space-y-1.5';

    var overline = document.createElement('p');
    overline.className = 'font-mono text-[11px] tracking-[0.28em] text-slate-400 uppercase';
    overline.textContent = 'C.I.P.H.E.R. // CIPHER';

    var h1 = document.createElement('h1');
    h1.className = 'text-3xl sm:text-5xl font-bold tracking-tight text-white';
    h1.innerHTML = getTimeGreeting() + ', <span class="text-arcCyan">Lalit.</span>';

    var sub = document.createElement('p');
    sub.className = 'text-xs sm:text-sm text-slate-400';
    sub.textContent = 'All systems online. Awaiting your directive.';

    hero.appendChild(overline);
    hero.appendChild(h1);
    hero.appendChild(sub);

    var middleGrid = document.createElement('div');
    middleGrid.className = 'w-full grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-center';

    var leftCol = document.createElement('div');
    leftCol.className = 'space-y-3.5';
    CIPHER.STARTER_CARDS.filter(function (c) { return c.side === 'left'; }).forEach(function (card) {
      leftCol.appendChild(createDirectiveCardEl(card));
    });

    var centerCol = CIPHER.buildCenterReactorSvg();

    var rightCol = document.createElement('div');
    rightCol.className = 'space-y-3.5';
    CIPHER.STARTER_CARDS.filter(function (c) { return c.side === 'right'; }).forEach(function (card) {
      rightCol.appendChild(createDirectiveCardEl(card));
    });

    middleGrid.appendChild(leftCol);
    middleGrid.appendChild(centerCol);
    middleGrid.appendChild(rightCol);

    var quickWrap = document.createElement('div');
    quickWrap.className = 'text-center space-y-2.5 pt-1';

    var quickLabel = document.createElement('div');
    quickLabel.className = 'font-mono text-[10px] tracking-[0.22em] text-slate-500 uppercase';
    quickLabel.textContent = 'QUICK ACTIONS';

    var quickRow = document.createElement('div');
    quickRow.className = 'flex items-center justify-center gap-2 flex-wrap';

    CIPHER.QUICK_ACTIONS.forEach(function (act) {
      var pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'cipher-quick-pill px-3.5 py-1.5 rounded-full inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer';
      pill.innerHTML = act.icon + '<span>' + escapeHtml(act.label) + '</span>';
      pill.addEventListener('click', function () {
        if (!CIPHER.dom.promptTextarea) return;
        CIPHER.dom.promptTextarea.value = act.prefix;
        autoResizePrompt();
        CIPHER.dom.promptTextarea.focus();
      });
      quickRow.appendChild(pill);
    });

    quickWrap.appendChild(quickLabel);
    quickWrap.appendChild(quickRow);

    container.appendChild(hero);
    container.appendChild(middleGrid);
    container.appendChild(quickWrap);
    return container;
  }

  function highlightCodeSnippet(rawCode) {
    var escaped = escapeHtml(rawCode);
    var tokenRegex =
      /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|async|await|return|if|else|for|while|try|catch|finally|throw|new|import|export|from|class|switch|case|break|default|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b)/g;

    return escaped.replace(tokenRegex, function (match) {
      if (match.indexOf('//') === 0 || match.indexOf('/*') === 0) return '<span class="tok-cmt">' + match + '</span>';
      if (
        (match.charAt(0) === '"' && match.charAt(match.length - 1) === '"') ||
        (match.charAt(0) === "'" && match.charAt(match.length - 1) === "'") ||
        (match.charAt(0) === '`' && match.charAt(match.length - 1) === '`')
      ) {
        return '<span class="tok-str">' + match + '</span>';
      }
      if (/^\d/.test(match)) return '<span class="tok-num">' + match + '</span>';
      return '<span class="tok-kw">' + match + '</span>';
    });
  }

  function renderInlineMarkdown(raw) {
    var tokens = String(raw).split(/(`[^`\n]+`)/g);
    var out = '';
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      if (!tok) continue;
      if (tok.charAt(0) === '`' && tok.charAt(tok.length - 1) === '`' && tok.length > 2) {
        out +=
          '<code class="px-1.5 py-0.5 rounded bg-cipherVoid border border-cipherLine text-arcCyan text-xs font-mono">' +
          escapeHtml(tok.slice(1, -1)) +
          '</code>';
      } else {
        var safe = escapeHtml(tok);
        safe = safe.replace(/&lt;br\s*\/?&gt;/gi, '<br />');
        safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
        safe = safe.replace(/\*([^*\n]+)\*/g, '<em class="italic text-slate-200">$1</em>');
        out += safe;
      }
    }
    return out;
  }

  function isMarkdownTableSeparator(line) {
    var clean = String(line || '').trim();
    if (clean.indexOf('|') === -1) return false;
    return /^\|?(?:\s*:?-{2,}:?\s*\|)+\s*(?::?-{2,}:?\s*\|?)?$/.test(clean);
  }

  function parseMarkdownTableRow(line) {
    var clean = String(line || '').trim();
    if (clean.charAt(0) === '|') clean = clean.slice(1);
    if (clean.charAt(clean.length - 1) === '|') clean = clean.slice(0, -1);
    return clean.split('|').map(function (cell) {
      return cell.trim();
    });
  }

  function buildRichMessageContent(markdownText) {
    var fragment = document.createDocumentFragment();
    var parts = String(markdownText || '').split(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g);

    for (var i = 0; i < parts.length; i += 3) {
      var prose = parts[i] || '';
      var lang = (parts[i + 1] || 'code').trim() || 'code';
      var codeBlock = parts[i + 2];

      if (prose.trim().length > 0) {
        var lines = prose.split('\n');
        var activeList = null;

        for (var l = 0; l < lines.length; l++) {
          var line = lines[l];
          var trimmed = line.trim();

          if (!trimmed) {
            activeList = null;
            continue;
          }

          if (trimmed.indexOf('|') !== -1 && l + 1 < lines.length && isMarkdownTableSeparator(lines[l + 1])) {
            activeList = null;
            var headers = parseMarkdownTableRow(trimmed);
            var tableWrap = document.createElement('div');
            tableWrap.className = 'my-2.5 overflow-x-auto rounded-xl border border-cipherLine/70 bg-black/45';

            var table = document.createElement('table');
            table.className = 'w-full text-left border-collapse text-xs sm:text-sm';

            var thead = document.createElement('thead');
            thead.className = 'bg-[#071320] border-b border-cipherLine/70';
            var headTr = document.createElement('tr');
            for (var h = 0; h < headers.length; h++) {
              var th = document.createElement('th');
              th.className = 'px-3 py-2 font-mono text-[11px] font-semibold text-arcCyan tracking-wide whitespace-nowrap';
              th.innerHTML = renderInlineMarkdown(headers[h]);
              headTr.appendChild(th);
            }
            thead.appendChild(headTr);
            table.appendChild(thead);

            var tbody = document.createElement('tbody');
            l += 2;
            while (l < lines.length) {
              var rowTrimmed = lines[l].trim();
              if (!rowTrimmed || rowTrimmed.indexOf('|') === -1) {
                l -= 1;
                break;
              }
              var cells = parseMarkdownTableRow(rowTrimmed);
              var bodyTr = document.createElement('tr');
              bodyTr.className = 'border-b border-cipherLine/40 last:border-b-0 hover:bg-white/[0.03] transition';
              var colCount = Math.max(headers.length, cells.length);
              for (var c = 0; c < colCount; c++) {
                var td = document.createElement('td');
                td.className = 'px-3 py-2 text-slate-300 align-top';
                td.innerHTML = renderInlineMarkdown(cells[c] || '');
                bodyTr.appendChild(td);
              }
              tbody.appendChild(bodyTr);
              l += 1;
            }
            table.appendChild(tbody);
            tableWrap.appendChild(table);
            fragment.appendChild(tableWrap);
            continue;
          }

          if (/^###\s+/.test(trimmed)) {
            activeList = null;
            var h3 = document.createElement('h3');
            h3.className = 'font-hud text-xs sm:text-sm font-semibold text-arcCyan tracking-wide pt-1';
            h3.innerHTML = renderInlineMarkdown(trimmed.replace(/^###\s+/, ''));
            fragment.appendChild(h3);
          } else if (/^##\s+/.test(trimmed)) {
            activeList = null;
            var h2 = document.createElement('h2');
            h2.className = 'font-hud text-sm sm:text-base font-bold text-white tracking-wide pt-1';
            h2.innerHTML = renderInlineMarkdown(trimmed.replace(/^##\s+/, ''));
            fragment.appendChild(h2);
          } else if (/^>\s+/.test(trimmed)) {
            activeList = null;
            var bq = document.createElement('blockquote');
            bq.className = 'pl-3 py-1 border-l-2 border-starkGold bg-black/35 rounded-r text-xs sm:text-sm text-slate-300';
            bq.innerHTML = renderInlineMarkdown(trimmed.replace(/^>\s+/, ''));
            fragment.appendChild(bq);
          } else if (/^[-*]\s+/.test(trimmed)) {
            if (!activeList) {
              activeList = document.createElement('ul');
              activeList.className = 'list-disc list-inside space-y-1 text-xs sm:text-sm text-slate-300 pl-1';
              fragment.appendChild(activeList);
            }
            var li = document.createElement('li');
            li.innerHTML = renderInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''));
            activeList.appendChild(li);
          } else {
            activeList = null;
            var p = document.createElement('p');
            p.className = 'text-xs sm:text-sm leading-relaxed text-slate-200';
            p.innerHTML = renderInlineMarkdown(line);
            fragment.appendChild(p);
          }
        }
      }

      if (typeof codeBlock === 'string') {
        var cleanCode = codeBlock.replace(/\n$/, '');
        var codeCard = document.createElement('div');
        codeCard.className = 'my-2.5 rounded-xl overflow-hidden border border-cipherLine bg-[#02060b]';

        var header = document.createElement('div');
        header.className =
          'px-3 py-1.5 bg-[#06101c] border-b border-cipherLine/70 flex items-center justify-between gap-2 font-mono text-[11px]';

        var langTag = document.createElement('span');
        langTag.className = 'text-starkGold uppercase tracking-wider';
        langTag.textContent = lang;

        var copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className =
          'px-2 py-0.5 rounded border border-cipherLine hover:border-arcCyan text-slate-300 hover:text-arcCyan text-[10px] cursor-pointer transition';
        copyBtn.textContent = 'COPY';
        copyBtn.addEventListener('click', (function (snippet, buttonEl) {
          return function () {
            copyToClipboard(snippet, function () {
              buttonEl.textContent = 'COPIED';
              setTimeout(function () {
                buttonEl.textContent = 'COPY';
              }, 1500);
            });
          };
        })(cleanCode, copyBtn));

        header.appendChild(langTag);
        header.appendChild(copyBtn);

        var pre = document.createElement('pre');
        pre.className = 'p-3 overflow-x-auto text-xs font-mono text-slate-100 leading-relaxed';

        var codeEl = document.createElement('code');
        codeEl.innerHTML = highlightCodeSnippet(cleanCode);

        pre.appendChild(codeEl);
        codeCard.appendChild(header);
        codeCard.appendChild(pre);
        fragment.appendChild(codeCard);
      }
    }

    return fragment;
  }

  function copyToClipboard(text, onDone) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          triggerToast('Copied to clipboard');
          if (typeof onDone === 'function') onDone();
        })
        .catch(function () {
          copyFallback(text, onDone);
        });
    } else {
      copyFallback(text, onDone);
    }
  }

  function copyFallback(text, onDone) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      triggerToast('Copied to clipboard');
      if (typeof onDone === 'function') onDone();
    } catch (err) {
      triggerToast('Copy failed');
    }
  }

  function renderChatStream() {
    var dom = CIPHER.dom;
    var state = CIPHER.state;
    if (!dom.chatStream) return;
    dom.chatStream.innerHTML = '';

    var session = getActiveSession();
    var messages = session && Array.isArray(session.messages) ? session.messages : [];

    if (messages.length === 0 && !state.isGenerating) {
      dom.chatStream.appendChild(renderEmptyState());
      return;
    }

    var threadWrap = document.createElement('div');
    threadWrap.className = 'max-w-4xl mx-auto space-y-4 py-2';

    var activeModel = CIPHER.getActiveModel() || CIPHER.DEFAULT_GROQ_MODEL;
    var lastUserMsgIndex = -1;
    for (var idx = messages.length - 1; idx >= 0; idx--) {
      if (messages[idx] && messages[idx].role === 'user') {
        lastUserMsgIndex = idx;
        break;
      }
    }

    messages.forEach(function (msg, msgIndex) {
      var isUser = msg.role === 'user';
      var isEditing = isUser && state.editingMessageId === msg.id;
      var wrapper = document.createElement('div');
      wrapper.className = 'flex flex-col ' + (isUser ? 'items-end' : 'items-start');

      var headerRow = document.createElement('div');
      headerRow.className =
        'flex items-center gap-2 mb-1 px-1 flex-wrap ' + (isUser ? 'justify-end' : 'justify-start');

      var callsign = document.createElement('span');
      callsign.className = 'font-mono text-[10px] ' + (isUser ? 'text-starkGold' : 'text-arcCyan');
      var rawModel = msg && typeof msg.model === 'string' ? msg.model.trim() : '';
      var safeModel =
        rawModel && rawModel !== 'undefined' && rawModel !== 'null'
          ? rawModel
          : (activeModel || 'GROQ');
      callsign.textContent = isUser ? 'OPERATOR // LALIT' : 'CIPHER // ' + safeModel;
      headerRow.appendChild(callsign);

      var actionGroup = document.createElement('div');
      actionGroup.className = 'flex items-center gap-1';

      var msgCopyBtn = document.createElement('button');
      msgCopyBtn.type = 'button';
      msgCopyBtn.className =
        'px-1.5 py-0.5 rounded border border-white/10 hover:border-arcCyan font-mono text-[9px] text-slate-400 hover:text-arcCyan transition cursor-pointer';
      msgCopyBtn.textContent = 'COPY';
      msgCopyBtn.addEventListener('click', (function (textToCopy, btnEl) {
        return function () {
          copyToClipboard(textToCopy, function () {
            btnEl.textContent = 'COPIED';
            setTimeout(function () {
              btnEl.textContent = 'COPY';
            }, 1500);
          });
        };
      })(String(msg.text || ''), msgCopyBtn));
      actionGroup.appendChild(msgCopyBtn);

      if (isUser && !isEditing) {
        var editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className =
          'px-1.5 py-0.5 rounded border border-white/10 hover:border-starkGold font-mono text-[9px] text-slate-400 hover:text-starkGold transition cursor-pointer';
        editBtn.textContent = 'EDIT';
        editBtn.addEventListener('click', (function (targetId) {
          return function () {
            if (state.isGenerating) return;
            state.editingMessageId = targetId;
            renderChatStream();
          };
        })(msg.id));
        actionGroup.appendChild(editBtn);
      }

      if (!isUser && !msg.isError) {
        var isSpeakingThis = state.speakingMessageId === msg.id;
        var speakBtn = document.createElement('button');
        speakBtn.type = 'button';
        speakBtn.className =
          'px-1.5 py-0.5 rounded border font-mono text-[9px] transition cursor-pointer ' +
          (isSpeakingThis
            ? 'border-starkGold text-starkGold'
            : 'border-white/10 hover:border-arcCyan text-slate-400 hover:text-arcCyan');
        speakBtn.textContent = isSpeakingThis ? 'MUTE' : 'SPEAK';
        speakBtn.addEventListener('click', (function (textToSpeak, targetMsgId) {
          return function () {
            if (state.speakingMessageId === targetMsgId) {
              CIPHER.stopVoiceReadout();
            } else {
              CIPHER.speakMessageText(textToSpeak, targetMsgId);
            }
          };
        })(String(msg.text || ''), msg.id));
        actionGroup.appendChild(speakBtn);
      }

      headerRow.appendChild(actionGroup);

      var bubble = document.createElement('div');
      if (isEditing) {
        bubble.className =
          'w-full max-w-[92%] sm:max-w-[78%] p-3 rounded-2xl rounded-tr-sm cipher-user-glass space-y-2';

        var editArea = document.createElement('textarea');
        editArea.rows = 3;
        editArea.value = String(msg.text || '');
        editArea.className =
          'w-full px-3 py-2 rounded-lg bg-[#02070d] border border-cyan-400/30 focus:border-arcCyan focus:outline-none font-mono text-xs sm:text-sm text-white leading-relaxed resize-y';

        var editControls = document.createElement('div');
        editControls.className = 'flex items-center justify-end gap-1.5 flex-wrap';

        var cancelEditBtn = document.createElement('button');
        cancelEditBtn.type = 'button';
        cancelEditBtn.className =
          'px-2.5 py-1 rounded-lg bg-black/50 border border-white/15 hover:border-starkGold font-mono text-[10px] text-slate-300 cursor-pointer';
        cancelEditBtn.textContent = 'CANCEL';
        cancelEditBtn.addEventListener('click', function () {
          state.editingMessageId = null;
          renderChatStream();
        });

        var saveEditBtn = document.createElement('button');
        saveEditBtn.type = 'button';
        saveEditBtn.className =
          'cipher-btn-primary px-2.5 py-1 rounded-lg text-cipherBlack font-hud font-bold text-[10px] tracking-wider cursor-pointer';
        saveEditBtn.textContent = 'SAVE';
        saveEditBtn.addEventListener('click', function () {
          saveEditedMessage(session, msgIndex, editArea.value, false);
        });

        editControls.appendChild(cancelEditBtn);
        editControls.appendChild(saveEditBtn);

        if (msgIndex === lastUserMsgIndex) {
          var rerunEditBtn = document.createElement('button');
          rerunEditBtn.type = 'button';
          rerunEditBtn.className =
            'px-2.5 py-1 rounded-lg bg-black/60 border border-starkGold text-starkGold hover:bg-starkGold hover:text-cipherBlack font-hud font-bold text-[10px] tracking-wider transition cursor-pointer';
          rerunEditBtn.textContent = 'SAVE & RE-RUN';
          rerunEditBtn.addEventListener('click', function () {
            saveEditedMessage(session, msgIndex, editArea.value, true);
          });
          editControls.appendChild(rerunEditBtn);
        }

        editArea.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveEditedMessage(session, msgIndex, editArea.value, false);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            state.editingMessageId = null;
            renderChatStream();
          }
        });

        bubble.appendChild(editArea);
        bubble.appendChild(editControls);
        setTimeout(function () {
          editArea.focus();
          editArea.setSelectionRange(editArea.value.length, editArea.value.length);
        }, 20);
      } else if (isUser) {
        bubble.className =
          'max-w-[88%] sm:max-w-[74%] px-4 py-2.5 rounded-2xl rounded-tr-sm cipher-user-glass text-white text-xs sm:text-sm leading-relaxed whitespace-pre-wrap';
        bubble.textContent = msg.text;
      } else if (msg.isError) {
        bubble.className =
          'max-w-[92%] sm:max-w-[82%] px-4 py-3 rounded-2xl rounded-tl-sm cipher-error-glass text-starkGold font-mono text-xs sm:text-sm';
        bubble.textContent = msg.text;
      } else {
        bubble.className =
          'max-w-[95%] sm:max-w-[86%] px-4 py-3 rounded-2xl rounded-tl-sm cipher-hud-box text-slate-200 space-y-2';
        bubble.appendChild(buildRichMessageContent(msg.text));
      }

      wrapper.appendChild(headerRow);
      wrapper.appendChild(bubble);
      threadWrap.appendChild(wrapper);
    });

    if (state.isGenerating) {
      var waitWrap = document.createElement('div');
      waitWrap.className = 'flex flex-col items-start';

      var waitLabel = document.createElement('div');
      waitLabel.className = 'font-mono text-[10px] text-arcCyan mb-1 px-1';
      waitLabel.textContent = 'CIPHER // PROCESSING (' + state.vibe + ')';

      var waitBubble = document.createElement('div');
      waitBubble.className = 'px-4 py-3 rounded-2xl rounded-tl-sm cipher-hud-box inline-flex items-center gap-1.5';
      waitBubble.innerHTML = '<span class="cipher-dot"></span><span class="cipher-dot"></span><span class="cipher-dot"></span>';

      waitWrap.appendChild(waitLabel);
      waitWrap.appendChild(waitBubble);
      threadWrap.appendChild(waitWrap);
    }

    dom.chatStream.appendChild(threadWrap);
    dom.chatStream.scrollTop = dom.chatStream.scrollHeight;
  }

  function dispatchSessionCompletion(session, promptText) {
    var state = CIPHER.state;
    var dom = CIPHER.dom;
    state.isGenerating = true;
    if (dom.transmitBtn) dom.transmitBtn.disabled = true;

    CIPHER.saveSessions();
    renderSessionList();
    renderChatStream();

    var activeKey = CIPHER.getActiveApiKey();
    var activeModel = CIPHER.getActiveModel() || CIPHER.DEFAULT_GROQ_MODEL;
    var useDemo = state.demoMode || !activeKey;

    if (useDemo) {
      setTimeout(function () {
        var reply = CIPHER.generateDemoReply(promptText);
        var msgObj = {
          id: 'm_' + Date.now(),
          role: 'model',
          text: reply,
          model: activeModel || 'GROQ',
          timestamp: Date.now()
        };
        session.messages.push(msgObj);
        session.updatedAt = Date.now();
        state.isGenerating = false;
        if (dom.transmitBtn) dom.transmitBtn.disabled = false;
        CIPHER.saveSessions();
        renderSessionList();
        renderChatStream();
        if (state.voiceReadoutEnabled && CIPHER.speakMessageText) CIPHER.speakMessageText(reply, msgObj.id);
      }, 380);
      return;
    }

    CIPHER.requestActiveProviderCompletion(session)
      .then(function (result) {
        var replyText = result && result.text ? result.text : '';
        var replyModel = (result && result.model) || CIPHER.getActiveModel() || activeModel || 'GROQ';
        var msgObj = {
          id: 'm_' + Date.now(),
          role: 'model',
          text: replyText,
          model: replyModel,
          timestamp: Date.now()
        };
        session.messages.push(msgObj);
        session.updatedAt = Date.now();
        if (state.voiceReadoutEnabled && replyText && CIPHER.speakMessageText) {
          CIPHER.speakMessageText(replyText, msgObj.id);
        }
      })
      .catch(function (err) {
        var errModel = (err && err.model) || CIPHER.getActiveModel() || activeModel || 'GROQ';
        session.messages.push({
          id: 'e_' + Date.now(),
          role: 'model',
          text: 'UPLINK ERROR: ' + (err && err.message ? err.message : 'Unable to reach Groq API'),
          model: errModel,
          isError: true,
          timestamp: Date.now()
        });
        session.updatedAt = Date.now();
      })
      .finally(function () {
        state.isGenerating = false;
        if (dom.transmitBtn) dom.transmitBtn.disabled = false;
        CIPHER.saveSessions();
        renderSessionList();
        renderChatStream();
      });
  }

  function saveEditedMessage(session, msgIndex, nextText, shouldRerun) {
    var state = CIPHER.state;
    if (!session || !Array.isArray(session.messages) || !session.messages[msgIndex]) return;
    var clean = String(nextText || '').trim();
    if (!clean) {
      triggerToast('Message cannot be empty');
      return;
    }
    session.messages[msgIndex].text = clean;
    session.updatedAt = Date.now();
    state.editingMessageId = null;

    if (msgIndex === 0) {
      session.title = clean.length > 34 ? clean.slice(0, 34).trim() + '...' : clean;
    }

    if (shouldRerun && !state.isGenerating) {
      session.messages.splice(msgIndex + 1);
      if (CIPHER.stopVoiceReadout) CIPHER.stopVoiceReadout();
      triggerToast('Directive updated · Re-running CIPHER');
      dispatchSessionCompletion(session, clean);
      return;
    }

    CIPHER.saveSessions();
    renderSessionList();
    renderChatStream();
    triggerToast('Message updated');
  }

  function sendPromptMessage(rawText) {
    var state = CIPHER.state;
    var dom = CIPHER.dom;
    if (state.isGenerating) return;
    var text = String(rawText || '').trim();
    if (!text) return;

    var session = getActiveSession();
    if (!Array.isArray(session.messages)) session.messages = [];

    if (session.messages.length === 0 && (!session.title || session.title === 'New Session')) {
      session.title = text.length > 34 ? text.slice(0, 34).trim() + '...' : text;
    }

    state.editingMessageId = null;
    if (CIPHER.stopVoiceReadout) CIPHER.stopVoiceReadout();

    session.messages.push({
      id: 'u_' + Date.now(),
      role: 'user',
      text: text,
      timestamp: Date.now()
    });
    session.updatedAt = Date.now();

    if (dom.promptTextarea) {
      dom.promptTextarea.value = '';
      autoResizePrompt();
    }

    dispatchSessionCompletion(session, text);
  }

  function autoResizePrompt() {
    var dom = CIPHER.dom;
    if (!dom.promptTextarea) return;
    dom.promptTextarea.style.height = 'auto';
    dom.promptTextarea.style.height = Math.min(dom.promptTextarea.scrollHeight, 128) + 'px';
  }

  function openConfigModal() {
    var dom = CIPHER.dom;
    var state = CIPHER.state;
    if (!dom.apiConfigModal) return;
    if (dom.modalGroqKeyInput) {
      dom.modalGroqKeyInput.value = state.groqKey;
      dom.modalGroqKeyInput.type = 'password';
    }
    if (dom.modalToggleGroqVisBtn) dom.modalToggleGroqVisBtn.textContent = 'SHOW';
    if (dom.modalVibeSelect) dom.modalVibeSelect.value = state.vibe;
    CIPHER.populateModelSelect(dom.modalModelSelect, CIPHER.getActiveModel());

    var draftKey = dom.modalGroqKeyInput ? dom.modalGroqKeyInput.value.trim() : state.groqKey;
    if (dom.modalDemoCheckbox) dom.modalDemoCheckbox.checked = state.demoMode || !draftKey;

    dom.apiConfigModal.classList.remove('hidden');
    dom.apiConfigModal.classList.add('flex');
    if (state.groqKey) CIPHER.fetchGroqAvailableModels(state.groqKey, false);
    setTimeout(function () {
      if (dom.modalGroqKeyInput) dom.modalGroqKeyInput.focus();
    }, 40);
  }

  function closeConfigModal() {
    if (!CIPHER.dom.apiConfigModal) return;
    CIPHER.dom.apiConfigModal.classList.add('hidden');
    CIPHER.dom.apiConfigModal.classList.remove('flex');
  }

  function openUtilityModal(mode) {
    var dom = CIPHER.dom;
    var state = CIPHER.state;
    if (!dom.utilityModal || !dom.utilityModalTitle || !dom.utilityModalBody) return;
    if (mode === 'explore') {
      dom.utilityModalTitle.textContent = 'CIPHER // EXPLORE DIRECTIVES';
      dom.utilityModalBody.innerHTML =
        '<p class="text-slate-400">Select a starter directive to launch immediately:</p>' +
        '<div class="space-y-2">' +
        CIPHER.STARTER_CARDS.map(function (c, i) {
          return (
            '<button type="button" data-explore-idx="' +
            i +
            '" class="w-full p-3 rounded-xl bg-[#040a12] border border-white/10 hover:border-arcCyan text-left transition cursor-pointer">' +
            '<div class="font-semibold text-white">' +
            escapeHtml(c.title) +
            '</div><div class="text-slate-400 mt-0.5">' +
            escapeHtml(c.prompt) +
            '</div></button>'
          );
        }).join('') +
        '</div>';
      dom.utilityModalBody.querySelectorAll('[data-explore-idx]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = Number(btn.getAttribute('data-explore-idx'));
          closeUtilityModal();
          if (CIPHER.STARTER_CARDS[idx]) sendPromptMessage(CIPHER.STARTER_CARDS[idx].prompt);
        });
      });
    } else if (mode === 'tools') {
      dom.utilityModalTitle.textContent = 'CIPHER // WORKSPACE TOOLS';
      dom.utilityModalBody.innerHTML =
        '<div class="space-y-2.5">' +
        '<div class="p-3 rounded-xl bg-[#040a12] border border-white/10 flex items-center justify-between"><div><div class="font-semibold text-white">Response Profile</div><div class="text-slate-400">Current: ' +
        escapeHtml(state.vibe) +
        '</div></div><button id="util-toggle-vibe" type="button" class="cipher-btn-pill px-3 py-1.5 rounded-lg text-arcCyan font-mono text-[11px] cursor-pointer">SWITCH</button></div>' +
        '<div class="p-3 rounded-xl bg-[#040a12] border border-white/10 flex items-center justify-between"><div><div class="font-semibold text-white">Voice Readout</div><div class="text-slate-400">Auto-speak CIPHER replies</div></div><button id="util-toggle-speak" type="button" class="cipher-btn-pill px-3 py-1.5 rounded-lg text-arcCyan font-mono text-[11px] cursor-pointer">' +
        (state.voiceReadoutEnabled ? 'TURN OFF' : 'TURN ON') +
        '</button></div>' +
        '<div class="p-3 rounded-xl bg-[#040a12] border border-white/10 flex items-center justify-between"><div><div class="font-semibold text-white">Groq Uplink</div><div class="text-slate-400">Manage API key &amp; models</div></div><button id="util-open-api" type="button" class="cipher-btn-pill px-3 py-1.5 rounded-lg text-arcCyan font-mono text-[11px] cursor-pointer">OPEN</button></div>' +
        '</div>';
      var vBtn = document.getElementById('util-toggle-vibe');
      if (vBtn) {
        vBtn.addEventListener('click', function () {
          state.vibe = state.vibe === 'GEN-Z TECH' ? 'TACTICAL HUD' : 'GEN-Z TECH';
          CIPHER.saveConfig();
          triggerToast('Profile: ' + state.vibe);
          openUtilityModal('tools');
        });
      }
      var sBtn = document.getElementById('util-toggle-speak');
      if (sBtn) {
        sBtn.addEventListener('click', function () {
          state.voiceReadoutEnabled = !state.voiceReadoutEnabled;
          if (!state.voiceReadoutEnabled && CIPHER.stopVoiceReadout) CIPHER.stopVoiceReadout();
          CIPHER.saveConfig();
          syncHudStatus();
          openUtilityModal('tools');
        });
      }
      var aBtn = document.getElementById('util-open-api');
      if (aBtn) {
        aBtn.addEventListener('click', function () {
          closeUtilityModal();
          openConfigModal();
        });
      }
    } else {
      dom.utilityModalTitle.textContent = 'CIPHER // SHORTCUTS & VOICE';
      dom.utilityModalBody.innerHTML =
        '<div class="space-y-2 font-mono text-[11px]">' +
        '<div class="flex justify-between p-2.5 rounded-lg bg-[#040a12] border border-white/10"><span>New Chat</span><span class="text-arcCyan">&#8984; / Ctrl + N</span></div>' +
        '<div class="flex justify-between p-2.5 rounded-lg bg-[#040a12] border border-white/10"><span>Send Directive</span><span class="text-arcCyan">Enter</span></div>' +
        '<div class="flex justify-between p-2.5 rounded-lg bg-[#040a12] border border-white/10"><span>New Line</span><span class="text-arcCyan">Shift + Enter</span></div>' +
        '<div class="flex justify-between p-2.5 rounded-lg bg-[#040a12] border border-white/10"><span>Voice Wake / Stop</span><span class="text-arcCyan">"Cipher, ..." / "Mute"</span></div>' +
        '</div>';
    }
    dom.utilityModal.classList.remove('hidden');
    dom.utilityModal.classList.add('flex');
  }

  function closeUtilityModal() {
    if (!CIPHER.dom.utilityModal) return;
    CIPHER.dom.utilityModal.classList.add('hidden');
    CIPHER.dom.utilityModal.classList.remove('flex');
  }

  function attachListeners() {
    var dom = CIPHER.dom;
    var state = CIPHER.state;

    if (dom.introEnterBtn) {
      dom.introEnterBtn.addEventListener('click', function () {
        enterWorkspace(false);
      });
    }
    if (dom.introEnterHint) {
      dom.introEnterHint.addEventListener('click', function () {
        enterWorkspace(false);
      });
    }
    if (dom.introVoiceBtn) {
      dom.introVoiceBtn.addEventListener('click', function () {
        enterWorkspace(true);
      });
    }
    if (dom.introStatusPill) dom.introStatusPill.addEventListener('click', openConfigModal);
    if (dom.introAudioToggleBtn) dom.introAudioToggleBtn.addEventListener('click', CIPHER.toggleIntroAudio);
    if (dom.introSettingsBtn) dom.introSettingsBtn.addEventListener('click', openConfigModal);
    if (dom.introUserPill) {
      dom.introUserPill.addEventListener('click', function () {
        openUtilityModal('tools');
      });
    }
    if (dom.introHelpBtn) {
      dom.introHelpBtn.addEventListener('click', function () {
        openUtilityModal('help');
      });
    }
    if (dom.sidebarBrandBtn) {
      dom.sidebarBrandBtn.addEventListener('click', returnToIntro);
    }

    if (CIPHER.bindReactorTilt) CIPHER.bindReactorTilt();

    if (dom.toggleSidebarBtn) {
      dom.toggleSidebarBtn.addEventListener('click', function () {
        if (!dom.chatSidebar) return;
        if (dom.chatSidebar.classList.contains('-translate-x-full')) openSidebarDrawer();
        else closeSidebarDrawer();
      });
    }
    if (dom.closeSidebarMobileBtn) dom.closeSidebarMobileBtn.addEventListener('click', closeSidebarDrawer);
    if (dom.cipherSidebarBackdrop) dom.cipherSidebarBackdrop.addEventListener('click', closeSidebarDrawer);

    function handleNewChat() {
      if (state.isGenerating) return;
      createSession(false);
      closeSidebarDrawer();
      if (dom.promptTextarea) dom.promptTextarea.focus();
    }
    if (dom.newSessionBtn) dom.newSessionBtn.addEventListener('click', handleNewChat);
    if (dom.dockPlusBtn) dom.dockPlusBtn.addEventListener('click', handleNewChat);

    if (dom.navExploreBtn) {
      dom.navExploreBtn.addEventListener('click', function () {
        closeSidebarDrawer();
        openUtilityModal('explore');
      });
    }
    if (dom.dockExploreBtn) {
      dom.dockExploreBtn.addEventListener('click', function () {
        openUtilityModal('explore');
      });
    }
    if (dom.navModelsBtn) {
      dom.navModelsBtn.addEventListener('click', function () {
        closeSidebarDrawer();
        openConfigModal();
      });
    }
    if (dom.navToolsBtn) {
      dom.navToolsBtn.addEventListener('click', function () {
        closeSidebarDrawer();
        openUtilityModal('tools');
      });
    }
    if (dom.sidebarSettingsBtn) dom.sidebarSettingsBtn.addEventListener('click', openConfigModal);
    if (dom.sidebarHelpBtn) {
      dom.sidebarHelpBtn.addEventListener('click', function () {
        openUtilityModal('help');
      });
    }
    if (dom.sidebarStorageBtn) {
      dom.sidebarStorageBtn.addEventListener('click', function () {
        var isLive = !state.demoMode && Boolean(state.groqKey);
        triggerToast(isLive ? 'Groq Uplink Live · LocalStorage synced' : 'Demo Sandbox · LocalStorage synced');
      });
    }

    if (dom.sessionFilterInput) {
      dom.sessionFilterInput.addEventListener('input', function () {
        state.filterQuery = dom.sessionFilterInput.value || '';
        renderSessionList();
      });
    }
    if (dom.purgeHistoryBtn) dom.purgeHistoryBtn.addEventListener('click', handlePurgeHistory);

    if (dom.apiKeyBtn) dom.apiKeyBtn.addEventListener('click', openConfigModal);

    if (dom.modelSelect) {
      dom.modelSelect.addEventListener('change', function () {
        CIPHER.setActiveModel(dom.modelSelect.value);
        CIPHER.saveConfig();
        syncHudStatus();
        triggerToast('Model: ' + CIPHER.getActiveModel());
      });
    }

    if (dom.voiceJarvisBtn) dom.voiceJarvisBtn.addEventListener('click', CIPHER.toggleJarvisVoiceListener);
    if (dom.dockMicBtn) dom.dockMicBtn.addEventListener('click', CIPHER.toggleJarvisVoiceListener);

    if (dom.voiceReadoutBtn) {
      dom.voiceReadoutBtn.addEventListener('click', function () {
        state.voiceReadoutEnabled = !state.voiceReadoutEnabled;
        if (!state.voiceReadoutEnabled && CIPHER.stopVoiceReadout) CIPHER.stopVoiceReadout();
        CIPHER.saveConfig();
        syncHudStatus();
        triggerToast(state.voiceReadoutEnabled ? 'Voice readout ON' : 'Voice readout OFF');
      });
    }

    if (dom.bgmToggleBtn) {
      dom.bgmToggleBtn.addEventListener('click', CIPHER.toggleBgm);
    }

    if (dom.hudMotionBtn) {
      dom.hudMotionBtn.addEventListener('click', function () {
        state.hudWaveEnabled = !state.hudWaveEnabled;
        syncHudStatus();
        triggerToast(state.hudWaveEnabled ? 'HUD wave active' : 'HUD wave paused');
      });
    }

    if (dom.fullscreenBtn) {
      dom.fullscreenBtn.addEventListener('click', function () {
        try {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        } catch (err) {
          triggerToast('Fullscreen unavailable');
        }
      });
    }

    function cycleVibeProfile() {
      state.vibe = state.vibe === 'GEN-Z TECH' ? 'TACTICAL HUD' : 'GEN-Z TECH';
      CIPHER.saveConfig();
      triggerToast('Profile: ' + state.vibe);
    }
    if (dom.avatarProfileBtn) dom.avatarProfileBtn.addEventListener('click', cycleVibeProfile);
    if (dom.dockVibeBtn) dom.dockVibeBtn.addEventListener('click', cycleVibeProfile);

    if (dom.chatForm) {
      dom.chatForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (dom.promptTextarea) sendPromptMessage(dom.promptTextarea.value);
      });
    }

    if (dom.promptTextarea) {
      dom.promptTextarea.addEventListener('input', autoResizePrompt);
      dom.promptTextarea.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendPromptMessage(dom.promptTextarea.value);
        }
      });
    }

    if (dom.closeModalBtn) dom.closeModalBtn.addEventListener('click', closeConfigModal);
    if (dom.apiConfigModal) {
      dom.apiConfigModal.addEventListener('click', function (e) {
        if (e.target === dom.apiConfigModal) closeConfigModal();
      });
    }

    if (dom.closeUtilityModalBtn) dom.closeUtilityModalBtn.addEventListener('click', closeUtilityModal);
    if (dom.utilityModal) {
      dom.utilityModal.addEventListener('click', function (e) {
        if (e.target === dom.utilityModal) closeUtilityModal();
      });
    }

    if (dom.modalToggleGroqVisBtn && dom.modalGroqKeyInput) {
      dom.modalToggleGroqVisBtn.addEventListener('click', function () {
        var isPw = dom.modalGroqKeyInput.type === 'password';
        dom.modalGroqKeyInput.type = isPw ? 'text' : 'password';
        dom.modalToggleGroqVisBtn.textContent = isPw ? 'HIDE' : 'SHOW';
      });
    }

    if (dom.modalClearKeyBtn) {
      dom.modalClearKeyBtn.addEventListener('click', function () {
        if (dom.modalGroqKeyInput) dom.modalGroqKeyInput.value = '';
        state.groqKey = '';
        state.demoMode = true;
        if (dom.modalDemoCheckbox) dom.modalDemoCheckbox.checked = true;
        CIPHER.saveConfig();
        syncHudStatus();
        triggerToast('Groq key cleared');
      });
    }

    if (dom.modalSaveBtn) {
      dom.modalSaveBtn.addEventListener('click', function () {
        var enteredGroq = dom.modalGroqKeyInput ? dom.modalGroqKeyInput.value.trim() : '';
        var demoChecked = dom.modalDemoCheckbox ? dom.modalDemoCheckbox.checked : false;
        var chosenModel = dom.modalModelSelect ? dom.modalModelSelect.value : '';
        var chosenVibe = dom.modalVibeSelect ? dom.modalVibeSelect.value : state.vibe;

        state.groqKey = enteredGroq;
        if (chosenModel) CIPHER.setActiveModel(chosenModel);
        if (chosenVibe === 'GEN-Z TECH' || chosenVibe === 'TACTICAL HUD') state.vibe = chosenVibe;
        state.demoMode = !state.groqKey ? true : demoChecked;

        CIPHER.saveConfig();
        syncHudStatus();
        closeConfigModal();
        if (state.groqKey) CIPHER.fetchGroqAvailableModels(state.groqKey, true);
        triggerToast(state.demoMode ? 'Saved · Demo Mode' : 'Saved · Groq Live');
      });
    }

    document.addEventListener('keydown', function (e) {
      var modalOpen =
        (dom.apiConfigModal && !dom.apiConfigModal.classList.contains('hidden')) ||
        (dom.utilityModal && !dom.utilityModal.classList.contains('hidden'));

      if (
        state.screen === 'intro' &&
        !modalOpen &&
        e.key === 'Enter' &&
        !e.shiftKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        var activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT' && activeTag !== 'BUTTON') {
          e.preventDefault();
          enterWorkspace(false);
          return;
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (state.screen === 'intro') enterWorkspace(false);
        handleNewChat();
      } else if (e.key === 'Escape') {
        if (dom.apiConfigModal && !dom.apiConfigModal.classList.contains('hidden')) {
          closeConfigModal();
        } else if (dom.utilityModal && !dom.utilityModal.classList.contains('hidden')) {
          closeUtilityModal();
        } else {
          closeSidebarDrawer();
        }
      }
    });
  }

  CIPHER.triggerToast = triggerToast;
  CIPHER.findSessionById = findSessionById;
  CIPHER.syncHudStatus = syncHudStatus;
  CIPHER.renderChatStream = renderChatStream;
  CIPHER.autoResizePrompt = autoResizePrompt;
  CIPHER.sendPromptMessage = sendPromptMessage;

  document.addEventListener('DOMContentLoaded', function () {
    cacheElements();
    if (CIPHER.dom.introReactorWrap && CIPHER.buildMark6ReactorSvg) {
      CIPHER.dom.introReactorWrap.innerHTML = CIPHER.buildMark6ReactorSvg('intro');
    }
    CIPHER.loadState();
    attachListeners();
    syncHudStatus();
    if (CIPHER.state.groqKey) CIPHER.fetchGroqAvailableModels(CIPHER.state.groqKey, false);
    renderSessionList();
    renderChatStream();
    syncQuotaCard();
    if (CIPHER.initWaveBackdrop) CIPHER.initWaveBackdrop();
    if (CIPHER.initIntroAudio) CIPHER.initIntroAudio();
    if (CIPHER.loadYouTubeBgmApi) CIPHER.loadYouTubeBgmApi();
    if (CIPHER.setupAudioGestureUnlock) CIPHER.setupAudioGestureUnlock();
  });
})(window);
