(function () {
  'use strict';

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var clinicId = script.getAttribute('data-clinic-id');
  if (!clinicId) return console.error('[HuellaBot] Falta data-clinic-id');

  var API_BASE = script.src.replace('/widget.js', '');
  var sessionId = 'hb-' + Math.random().toString(36).substr(2, 9);
  var messages = [];
  var config = { botName: 'Asistente', welcomeMessage: '¡Hola! ¿En qué puedo ayudarte?', primaryColor: '#2D6A4F', clinicName: '' };

  // ── Styles ──────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#hb-root *{box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif}',
    '#hb-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.2);transition:transform .2s,box-shadow .2s;z-index:99998}',
    '#hb-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,0,0,.25)}',
    '#hb-btn svg{width:26px;height:26px;fill:white}',
    '#hb-panel{position:fixed;bottom:92px;right:24px;width:360px;max-height:520px;border-radius:20px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.18);display:none;flex-direction:column;z-index:99999;background:#fff}',
    '#hb-panel.open{display:flex}',
    '#hb-header{padding:14px 16px;display:flex;align-items:center;gap:10px}',
    '#hb-header-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px}',
    '#hb-header-info{}',
    '#hb-header-name{color:#fff;font-weight:700;font-size:14px;margin:0}',
    '#hb-header-sub{color:rgba(255,255,255,.75);font-size:11px;margin:0}',
    '#hb-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f8fafc;min-height:0}',
    '.hb-msg{max-width:82%;padding:10px 14px;border-radius:18px;font-size:13.5px;line-height:1.5;word-break:break-word}',
    '.hb-msg.bot{background:#fff;color:#1a1a1a;border-radius:18px 18px 18px 4px;box-shadow:0 1px 4px rgba(0,0,0,.08);align-self:flex-start}',
    '.hb-msg.user{color:#fff;border-radius:18px 18px 4px 18px;align-self:flex-end}',
    '.hb-typing{display:flex;gap:4px;padding:10px 14px;background:#fff;border-radius:18px 18px 18px 4px;align-self:flex-start;box-shadow:0 1px 4px rgba(0,0,0,.08)}',
    '.hb-dot{width:7px;height:7px;border-radius:50%;background:#aaa;animation:hb-bounce 1.2s infinite}',
    '.hb-dot:nth-child(2){animation-delay:.2s}',
    '.hb-dot:nth-child(3){animation-delay:.4s}',
    '@keyframes hb-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}',
    '#hb-form{display:flex;gap:8px;padding:12px;border-top:1px solid #e8ecf0;background:#fff}',
    '#hb-input{flex:1;border:1.5px solid #e0e5eb;border-radius:12px;padding:9px 14px;font-size:13.5px;outline:none;resize:none;transition:border-color .2s;line-height:1.4}',
    '#hb-input:focus{border-color:var(--hb-color)}',
    '#hb-send{width:38px;height:38px;border-radius:10px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s}',
    '#hb-send:hover{opacity:.85}',
    '#hb-send svg{width:17px;height:17px;fill:white}',
    '@media(max-width:420px){#hb-panel{width:calc(100vw - 20px);right:10px;bottom:82px}}',
  ].join('');
  document.head.appendChild(style);

  // ── DOM ──────────────────────────────────────────────────────────────────────
  var root = document.createElement('div');
  root.id = 'hb-root';
  document.body.appendChild(root);

  root.innerHTML = [
    '<button id="hb-btn" aria-label="Abrir chat">',
      '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
    '</button>',
    '<div id="hb-panel" role="dialog" aria-label="Chat de soporte">',
      '<div id="hb-header">',
        '<div id="hb-header-avatar">🐾</div>',
        '<div id="hb-header-info">',
          '<p id="hb-header-name">Cargando...</p>',
          '<p id="hb-header-sub">En línea</p>',
        '</div>',
      '</div>',
      '<div id="hb-messages"></div>',
      '<form id="hb-form">',
        '<textarea id="hb-input" placeholder="Escribe tu pregunta..." rows="1" maxlength="500"></textarea>',
        '<button id="hb-send" type="submit" aria-label="Enviar">',
          '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
        '</button>',
      '</form>',
    '</div>',
  ].join('');

  var btn = document.getElementById('hb-btn');
  var panel = document.getElementById('hb-panel');
  var messagesEl = document.getElementById('hb-messages');
  var form = document.getElementById('hb-form');
  var input = document.getElementById('hb-input');
  var sendBtn = document.getElementById('hb-send');
  var headerName = document.getElementById('hb-header-name');

  // ── Load config ───────────────────────────────────────────────────────────
  fetch(API_BASE + '/api/config/' + clinicId)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      config = Object.assign(config, data);
      applyColor(config.primaryColor);
      headerName.textContent = config.botName;
      document.getElementById('hb-header-sub').textContent = config.clinicName || 'Asistente virtual';
      appendMessage('bot', config.welcomeMessage);
    })
    .catch(function () {
      applyColor(config.primaryColor);
      appendMessage('bot', config.welcomeMessage);
    });

  function applyColor(color) {
    document.documentElement.style.setProperty('--hb-color', color);
    btn.style.background = color;
    document.getElementById('hb-header').style.background = color;
    sendBtn.style.background = color;
  }

  // ── Toggle ────────────────────────────────────────────────────────────────
  btn.addEventListener('click', function () {
    var isOpen = panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
    if (isOpen) { input.focus(); scrollMessages(); }
  });

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  input.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitMessage();
  });

  // ── Send message ──────────────────────────────────────────────────────────
  function submitMessage() {
    var text = input.value.trim();
    if (!text) return;

    appendMessage('user', text);
    messages.push({ role: 'user', content: text });
    input.value = '';
    input.style.height = 'auto';

    var typing = appendTyping();

    fetch(API_BASE + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicId: clinicId, messages: messages, sessionId: sessionId }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        typing.remove();
        var reply = data.reply || 'Lo siento, no pude procesar tu mensaje.';
        appendMessage('bot', reply);
        messages.push({ role: 'assistant', content: reply });
      })
      .catch(function () {
        typing.remove();
        appendMessage('bot', 'Ocurrió un error. Por favor intenta de nuevo.');
      });
  }

  function appendMessage(role, text) {
    var el = document.createElement('div');
    el.className = 'hb-msg ' + role;
    if (role === 'user') el.style.background = config.primaryColor || '#2D6A4F';
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollMessages();
    return el;
  }

  function appendTyping() {
    var el = document.createElement('div');
    el.className = 'hb-typing';
    el.innerHTML = '<div class="hb-dot"></div><div class="hb-dot"></div><div class="hb-dot"></div>';
    messagesEl.appendChild(el);
    scrollMessages();
    return el;
  }

  function scrollMessages() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
})();
