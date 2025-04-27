// Helper to get backend URL from storage
function getBackendUrl(cb) {
  if (chrome && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get({ backendUrl: 'http://localhost:8080' }, (items) => {
      cb(items.backendUrl || 'http://localhost:8080');
    });
  } else {
    cb('http://localhost:8080');
  }
}

async function fetchAndRenderDownloads() {
  const downloadsDiv = document.getElementById('downloads');
  downloadsDiv.textContent = 'Loading downloads...';
  getBackendUrl(async (backendUrl) => {
    try {
      const resp = await fetch(backendUrl + '/downloads');
      if (!resp.ok) throw new Error('Failed to fetch');
      const data = await resp.json();
      const downloads = Array.isArray(data.downloads) ? data.downloads : data;
      if (!Array.isArray(downloads) || downloads.length === 0) {
        downloadsDiv.textContent = 'No downloads yet.';
        return;
      }
      downloadsDiv.innerHTML = '<b>Download Queue:</b><ul style="padding-left:18px;">' +
        downloads.map(d => `<li style='margin-bottom:4px;'><span style='font-weight:bold;'>${d.url ? d.url : d.id}</span><br><span style='color:#888;'>${d.status}</span></li>`).join('') + '</ul>';
    } catch (e) {
      downloadsDiv.textContent = 'Error loading downloads.';
    }
  });
}

document.getElementById('send').addEventListener('click', () => {
  const url = document.getElementById('url').value.trim();
  const statusDiv = document.getElementById('status');
  if (!url) {
    statusDiv.textContent = 'Please enter a Beatport URL.';
    return;
  }
  statusDiv.textContent = 'Sending...';
  getBackendUrl(async (backendUrl) => {
    try {
      const resp = await fetch(backendUrl + '/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (resp.ok) {
        statusDiv.textContent = 'Sent! Check dashboard for status.';
        await fetchAndRenderDownloads();
      } else {
        const err = await resp.text();
        statusDiv.textContent = 'Error: ' + err;
      }
    } catch (e) {
      statusDiv.textContent = 'Network error: ' + e.message;
    }
  });
});

document.addEventListener('DOMContentLoaded', fetchAndRenderDownloads); 