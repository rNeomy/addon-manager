'use strict';

const toast = document.getElementById('toast');

const init = () => chrome.storage.local.get({
  profiles: ['Default', 'A - Profile', 'B - Profile', 'C - Profile']
}, prefs => {
  document.getElementById('profiles').value = prefs.profiles.join(', ');
});
init();

document.getElementById('save').addEventListener('click', () => {
  const profiles = [
    'Default',
    ...document.getElementById('profiles').value.split(/\s*,\s*/).map(s => s.trim())
  ].filter((s, i, l) => s && l.indexOf(s) === i);
  chrome.storage.local.get({
    profiles: ['Default', 'A - Profile', 'B - Profile', 'C - Profile'],
    index: 'Default'
  }, prefs => {
    for (const name of prefs.profiles) {
      if (profiles.indexOf(name) === -1) {
        chrome.storage.local.remove('profile-' + name);
      }
    }
    chrome.storage.local.set({
      profiles,
      index: profiles.indexOf(prefs.index) === -1 ? 'Default' : prefs.index
    }, () => {
      toast.textContent = 'Options Saved';
      window.setTimeout(() => toast.textContent = '', 750);
      init();
    });
  });
});

// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    toast.textContent = 'Double-click to reset!';
    window.setTimeout(() => toast.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});
// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));
