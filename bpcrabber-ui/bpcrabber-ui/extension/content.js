console.log('BeatportDL content script loaded.'); 

// Only run on Beatport track/release pages
(function() {
  // Helper: find a good place to inject the button (near title)
  function findTitleElement() {
    // Try common selectors for Beatport titles
    return document.querySelector('h1, .interior-release-chart-title, .interior-track-title');
  }

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

  function injectButton() {
    if (document.getElementById('bpdl-send-btn')) return; // Prevent duplicates
    const titleEl = findTitleElement();
    if (!titleEl) return;
    const btn = document.createElement('button');
    btn.id = 'bpdl-send-btn';
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none" style="vertical-align:middle;margin-right:6px;"><path d="M10 2v10m0 0l-4-4m4 4l4-4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="16" width="12" height="2" rx="1" fill="#fff"/></svg>Send to BeatportDL';
    btn.title = 'Send this release/track to BeatportDL backend';
    btn.style.marginLeft = '12px';
    btn.style.padding = '6px 12px';
    btn.style.background = '#1db954';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const origText = btn.textContent;
      btn.textContent = 'Sending...';
      getBackendUrl(async (backendUrl) => {
        try {
          const resp = await fetch(backendUrl + '/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: [window.location.href] })
          });
          if (resp.ok) {
            btn.textContent = 'Sent!';
          } else {
            btn.textContent = 'Error!';
          }
        } catch (e) {
          btn.textContent = 'Network error';
        }
        setTimeout(() => {
          btn.textContent = origText;
          btn.disabled = false;
        }, 2000);
      });
    });
    titleEl.parentNode.insertBefore(btn, titleEl.nextSibling);
  }

  // --- Track List Checkbox Injection ---
  async function injectTrackCheckboxesAndStatus() {
    // Fetch download queue from backend
    let downloadStatusMap = {};
    await new Promise((resolve) => {
      getBackendUrl(async (backendUrl) => {
        try {
          const resp = await fetch(backendUrl + '/downloads');
          if (resp.ok) {
            const data = await resp.json();
            const downloads = Array.isArray(data.downloads) ? data.downloads : data;
            downloads.forEach(d => {
              if (d.request && Array.isArray(d.request.urls)) {
                d.request.urls.forEach(url => {
                  downloadStatusMap[url] = d.status;
                });
              }
            });
          }
        } catch (e) {
          // Ignore errors, just don't show status
        }
        resolve();
      });
    });
    // Try to find track tables or lists (Beatport uses tables for charts/releases)
    const tables = document.querySelectorAll('table, .bucket-items, .track-list, .chart-tracklist');
    tables.forEach(table => {
      // Find track rows (tr or .bucket-item or .track)
      let rows = table.querySelectorAll('tr, .bucket-item, .track');
      if (rows.length === 0) return;
      // Only inject once
      if (table.dataset.bpdlCheckboxesInjected) return;
      table.dataset.bpdlCheckboxesInjected = 'true';

      rows.forEach(row => {
        // Only inject if not already present
        if (!row.querySelector('.bpdl-checkbox')) {
          // Find the track link (should be a link to /track/)
          const link = row.querySelector('a[href*="/track/"]');
          if (!link) return;
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'bpdl-checkbox';
          checkbox.style.marginRight = '8px';
          checkbox.title = 'Select this track for download';
          // Insert checkbox at the start of the row
          if (row.firstElementChild) {
            row.insertBefore(checkbox, row.firstElementChild);
          } else {
            row.appendChild(checkbox);
          }
        }
        // Status badge logic
        let statusBadge = row.querySelector('.bpdl-status-badge');
        if (!statusBadge) {
          statusBadge = document.createElement('span');
          statusBadge.className = 'bpdl-status-badge';
          statusBadge.style.marginLeft = '8px';
          statusBadge.style.fontSize = '0.9em';
          statusBadge.style.padding = '2px 6px';
          statusBadge.style.borderRadius = '4px';
          statusBadge.style.background = '#eee';
          statusBadge.style.color = '#333';
          // Insert after checkbox
          const cb = row.querySelector('.bpdl-checkbox');
          if (cb) cb.parentNode.insertBefore(statusBadge, cb.nextSibling);
        }
        // Set status
        const link = row.querySelector('a[href*="/track/"]');
        if (link && downloadStatusMap[link.href]) {
          const status = downloadStatusMap[link.href];
          statusBadge.textContent = status;
          // Color code
          if (status === 'completed') {
            statusBadge.style.background = '#1db954';
            statusBadge.style.color = '#fff';
          } else if (status === 'downloading') {
            statusBadge.style.background = '#ffb300';
            statusBadge.style.color = '#222';
          } else if (status === 'queued') {
            statusBadge.style.background = '#1976d2';
            statusBadge.style.color = '#fff';
          } else if (status === 'error') {
            statusBadge.style.background = '#d32f2f';
            statusBadge.style.color = '#fff';
          } else {
            statusBadge.style.background = '#eee';
            statusBadge.style.color = '#333';
          }
        } else {
          statusBadge.textContent = '';
          statusBadge.style.background = '#eee';
          statusBadge.style.color = '#333';
        }
      });

      // Add Download Selected button if not present
      if (!table.parentNode.querySelector('#bpdl-download-selected')) {
        const btn = document.createElement('button');
        btn.id = 'bpdl-download-selected';
        btn.textContent = 'Download Selected';
        btn.title = 'Send all selected tracks to BeatportDL backend';
        btn.style.margin = '8px 0';
        btn.style.padding = '6px 12px';
        btn.style.background = '#1db954';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const origText = btn.textContent;
          btn.innerHTML = '<span class="bpdl-spinner" style="display:inline-block;width:16px;height:16px;vertical-align:middle;margin-right:6px;border:2px solid #fff;border-top:2px solid #1db954;border-radius:50%;animation:bpdlspin 0.7s linear infinite;"></span>Sending...';
          const checkboxes = table.querySelectorAll('.bpdl-checkbox:checked');
          getBackendUrl(async (backendUrl) => {
            const urls = [];
            for (const cb of checkboxes) {
              const row = cb.closest('tr, .bucket-item, .track');
              const link = row && row.querySelector('a[href*="/track/"]');
              if (link) urls.push(link.href);
            }
            if (urls.length === 0) {
              btn.textContent = 'No tracks selected';
              setTimeout(() => {
                btn.textContent = origText;
                btn.disabled = false;
              }, 1500);
              return;
            }
            try {
              const resp = await fetch(backendUrl + '/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls })
              });
              if (resp.ok) {
                btn.textContent = `Done (${urls.length} sent)`;
              } else {
                btn.textContent = 'Error sending batch';
              }
            } catch (e) {
              btn.textContent = 'Network error';
            }
            setTimeout(() => {
              btn.textContent = origText;
              btn.disabled = false;
            }, 2000);
            // Refresh statuses after sending
            injectTrackCheckboxesAndStatus();
          });
        });
        table.parentNode.insertBefore(btn, table);
      }
    });
  }

  // Wait for DOMContentLoaded, then try to inject
  function runAll() {
    injectButton();
    injectTrackCheckboxesAndStatus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAll);
  } else {
    runAll();
  }

  // Also observe for SPA navigation (Beatport is a SPA)
  const observer = new MutationObserver(() => {
    runAll();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // At the end of the file, add the spinner animation CSS if not present:
  if (!document.getElementById('bpdl-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'bpdl-spinner-style';
    style.textContent = `@keyframes bpdlspin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
})(); 