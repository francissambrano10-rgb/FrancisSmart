const form = document.getElementById('chatForm');
const promptBox = document.getElementById('prompt');
const messagesEl = document.getElementById('messages');
const welcome = document.getElementById('welcome');
const sendButton = document.getElementById('sendButton');
const toast = document.getElementById('toast');
const historyEl = document.getElementById('history');
const sidebar = document.getElementById('sidebar');
let messages = [];
let chatTitles = [];

function showToast(text) {
  toast.textContent = text; toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function formatText(text) {
  // Escape HTML first, then render fenced code and simple inline Markdown.
  let safe = escapeHTML(text);
  const blocks = [];
  safe = safe.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const id = blocks.length; blocks.push(code);
    return `@@CODE${id}@@`;
  });
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safe = safe.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  blocks.forEach((code, i) => {
    const html = `<pre><button class="copy-code" data-code="${i}">Copy code</button><code>${code.replace(/\n$/,'')}</code></pre>`;
    safe = safe.replace(`@@CODE${i}@@`, html);
  });
  return safe;
}
function addMessage(role, text='') {
  welcome.style.display = 'none';
  const row = document.createElement('div');
  row.className = `message ${role === 'user' ? 'user' : 'assistant'}`;
  const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = role === 'user' ? 'Y' : 'F';
  const bubble = document.createElement('div'); bubble.className = 'bubble';
  bubble.innerHTML = formatText(text);
  row.append(avatar, bubble); messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return bubble;
}
function renderHistory() {
  historyEl.innerHTML = chatTitles.length ? '' : '<div class="history-empty">Your recent chats will appear here.</div>';
  chatTitles.slice().reverse().forEach(title => {
    const item = document.createElement('div');
    item.textContent = title; item.style.cssText = 'padding:9px;border-radius:8px;color:#aeb5c5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    historyEl.appendChild(item);
  });
}
async function sendMessage(text) {
  text = text.trim(); if (!text || sendButton.disabled) return;
  if (!messages.length) { chatTitles.push(text.slice(0, 32)); renderHistory(); }
  messages.push({role:'user', text});
  addMessage('user', text);
  const answerBubble = addMessage('model', '');
  answerBubble.innerHTML = '<span class="typing">FRANCIS AI is thinking…</span>';
  sendButton.disabled = true;
  let answer = '';
  try {
    const response = await fetch('/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({messages})
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Could not connect to the AI server.');
    }
    answerBubble.textContent = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, {stream:true});
      const events = buffer.split('\n\n'); buffer = events.pop() || '';
      for (const event of events) {
        const line = event.split('\n').find(x => x.startsWith('data: '));
        if (!line) continue;
        const data = JSON.parse(line.slice(6));
        if (data.text) {
          answer += data.text;
          answerBubble.innerHTML = formatText(answer);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
        if (data.error) throw new Error(data.error);
      }
    }
    if (!answer) answer = 'I did not receive a response. Please try again.';
    messages.push({role:'model', text:answer});
    answerBubble.innerHTML = formatText(answer);
  } catch (err) {
    answerBubble.textContent = err.message;
    answerBubble.style.color = '#ff9caa';
  } finally {
    sendButton.disabled = false; promptBox.focus();
  }
}
form.addEventListener('submit', e => {
  e.preventDefault(); const value = promptBox.value; promptBox.value = ''; promptBox.style.height = 'auto'; sendMessage(value);
});
promptBox.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
});
promptBox.addEventListener('input', () => { promptBox.style.height='auto'; promptBox.style.height=Math.min(promptBox.scrollHeight,160)+'px'; });
document.getElementById('newChat').addEventListener('click', () => {
  messages = []; messagesEl.innerHTML = ''; welcome.style.display = 'block'; sidebar.classList.remove('open'); promptBox.focus();
});
document.getElementById('mobileMenu').addEventListener('click', () => sidebar.classList.toggle('open'));
document.querySelectorAll('.suggestion').forEach(btn => btn.addEventListener('click', () => sendMessage(btn.dataset.prompt)));
messagesEl.addEventListener('click', async e => {
  const btn = e.target.closest('.copy-code'); if (!btn) return;
  const code = btn.parentElement.querySelector('code').textContent;
  try { await navigator.clipboard.writeText(code); showToast('Code copied!'); }
  catch { showToast('Copy is unavailable in this browser.'); }
});
