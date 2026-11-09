// Model a real asynchronous connection: maximize before ready does not display chat.
export const mockTawkWidget = `
window.chatCalls = [];
const api = window.Tawk_API;
let ready = false;
let timer;
const panel = document.createElement('section');
panel.setAttribute('role', 'dialog');
panel.setAttribute('aria-label', 'BelivrHQ support chat');
panel.textContent = 'Leave a message for BelivrHQ support';
panel.hidden = true;
panel.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:100;width:280px;height:220px;background:white;color:black;padding:20px;border:1px solid black';
document.body.appendChild(panel);
const bubble = document.createElement('button');
bubble.textContent = 'Tawk.to';
bubble.setAttribute('aria-label', 'Open Tawk.to chat');
bubble.hidden = true;
bubble.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:100';
bubble.onclick = () => api.maximize();
document.body.appendChild(bubble);
const record = (name, args = []) => window.chatCalls.push({ name, args });
const connect = () => {
  ready = true;
  bubble.hidden = false;
  api.onStatusChange?.('offline');
  api.onLoad?.();
};
api.start = (options) => { record('start', [options]); ready = false; timer = setTimeout(connect, 100); };
api.hideWidget = () => { record('hideWidget'); panel.hidden = true; bubble.hidden = true; };
api.showWidget = () => { record('showWidget'); if (ready) bubble.hidden = false; };
api.maximize = () => { record('maximize'); if (ready) panel.hidden = false; };
api.endChat = () => record('endChat');
api.shutdown = () => { record('shutdown'); ready = false; clearTimeout(timer); panel.hidden = true; bubble.hidden = true; };
// Anonymous opening must never depend on the authenticated-user logout callback.
api.logout = () => { record('logout'); };
api.onBeforeLoad?.();
if (api.autoStart !== false) timer = setTimeout(connect, 100);
else api.onLoad?.();
`;
