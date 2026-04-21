// Ping the service worker every 20 seconds to keep it alive
setInterval(() => {
  chrome.runtime.sendMessage({ type: 'keepalive' });
}, 20000);
