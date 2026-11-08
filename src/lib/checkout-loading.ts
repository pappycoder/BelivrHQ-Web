/** Reserve a reviewable payment-page layout while the checkout URL is prepared. */
export function showCheckoutLoading(popup: Window) {
  const doc = popup.document;
  doc.title = "Opening Flutterwave checkout";
  doc.documentElement.lang = "en";
  const style = doc.createElement("style");
  style.textContent = `body{margin:0;padding:32px;background:#f8f7f3;font:16px system-ui;color:#19231c}.checkout-placeholder{max-width:480px;margin:auto;padding:28px;border:1px solid #e1dfd7;border-radius:24px;background:white;display:grid;gap:20px}.bar{height:16px;border-radius:8px;background:#e8e7e1;animation:pulse 1.5s ease-in-out infinite}.title{height:32px;width:70%}.panel{height:180px}.button{height:44px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}@keyframes pulse{50%{opacity:.45}}@media(prefers-reduced-motion:reduce){.bar{animation:none}}`;
  doc.head.append(style);
  const shell = doc.createElement("main");
  shell.className = "checkout-placeholder";
  shell.setAttribute("role", "status");
  shell.setAttribute("aria-label", "Preparing secure checkout");
  shell.setAttribute("aria-busy", "true");
  const label = doc.createElement("span");
  label.className = "sr-only";
  label.textContent = "Preparing secure checkout";
  shell.append(label);
  for (const shape of ["title", "", "panel", "button"]) {
    const bar = doc.createElement("div");
    bar.className = `bar ${shape}`;
    bar.setAttribute("aria-hidden", "true");
    bar.dataset.slot = "skeleton";
    shell.append(bar);
  }
  doc.body.replaceChildren(shell);
}
