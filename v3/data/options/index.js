'use strict';

const toast = document.getElementById('toast');

const init = () => chrome.storage.local.get({
  profiles: ['Default', 'A - Profile', 'B - Profile', 'C - Profile'],
  sync: false
}, prefs => {
  document.getElementById('profiles').value = prefs.profiles.join(', ');
  document.getElementById('sync').checked = prefs.sync;
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
      index: profiles.indexOf(prefs.index) === -1 ? 'Default' : prefs.index,
      sync: document.getElementById('sync').checked
    }, () => {
      toast.textContent = 'Options Saved';
      setTimeout(() => toast.textContent = '', 750);
      init();
    });
  });
});

// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    toast.textContent = 'Double-click to reset!';
    setTimeout(() => toast.textContent = '', 750);
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
// export
document.getElementById('export').addEventListener('click', () => {
  chrome.storage.local.get(null, prefs => {
    const text = JSON.stringify(prefs, null, '  ');
    const blob = new Blob([text], {type: 'application/json'});
    const objectURL = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), {
      href: objectURL,
      type: 'application/json',
      download: 'extension-manager-preferences.json'
    }).dispatchEvent(new MouseEvent('click'));
    setTimeout(() => URL.revokeObjectURL(objectURL));
  });
});
// import
document.getElementById('import').addEventListener('click', () => {
  const input = document.createElement('input');
  input.style.display = 'none';
  input.type = 'file';
  input.accept = '.json';
  input.acceptCharset = 'utf-8';

  document.body.appendChild(input);
  input.initialValue = input.value;
  input.onchange = function() {
    if (input.value !== input.initialValue) {
      const file = input.files[0];
      if (file.size > 100e6) {
        return console.warn('The file is too large!');
      }
      const fReader = new FileReader();
      fReader.onloadend = event => {
        input.remove();
        const json = JSON.parse(event.target.result);
        chrome.storage.local.set(json, () => {
          const refresh = profile => {
            chrome.management.getAll(apps => {
              const name = 'profile-' + profile;
              chrome.storage.local.get({
                [name]: '{}'
              }, prefs => {
                const rule = JSON.parse(prefs[name]);

                for (const app of apps) {
                  const e = document.querySelector(`[data-id="${app.id}"]`);
                  if (e) {
                    e.dataset.enabled = app.enabled;
                  }
                  if (rule[app.id] === false && app.enabled) {
                    chrome.management.setEnabled(app.id, false);
                  }
                  if (rule[app.id] === true && app.enabled === false) {
                    chrome.management.setEnabled(app.id, true);
                  }
                }
              });
            });
          };
          const index = json.index || 'Default';
          if (json['profile-' + index]) {
            refresh(index);
            chrome.storage.local.set({
              index
            });
          }
        });
      };
      fReader.readAsText(file, 'utf-8');
    }
  };
  input.click();
});
