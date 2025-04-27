// Load backend URL from storage and populate input
const backendUrlInput = document.getElementById('backendUrl');
const statusDiv = document.getElementById('status');
const saveBtn = document.getElementById('saveBtn');

function loadOptions() {
  chrome.storage.sync.get({ backendUrl: 'http://localhost:8080' }, (items) => {
    backendUrlInput.value = items.backendUrl;
  });
}

function saveOptions() {
  const url = backendUrlInput.value.trim();
  chrome.storage.sync.set({ backendUrl: url || 'http://localhost:8080' }, () => {
    statusDiv.textContent = 'Saved!';
    setTimeout(() => { statusDiv.textContent = ''; }, 1500);
  });
}

saveBtn.addEventListener('click', saveOptions);
document.addEventListener('DOMContentLoaded', loadOptions); 