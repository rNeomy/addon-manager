'use strict';

const select = document.querySelector('select');

const copy = value => {
  const input = document.createElement('textarea');
  input.value = value;
  document.body.appendChild(input);
  input.select();
  document.execCommand('Copy');
  document.body.removeChild(input);
};

const save = () => new Promise(resolve => chrome.management.getAll(apps => chrome.storage.local.set({
  ['profile-' + select.value]: JSON.stringify(apps.reduce((p, {id, enabled}) => {
    p[id] = enabled;
    return p;
  }, {}))
}, resolve)));

const update = (id, enabled) => {
  const parent = document.querySelector(`[data-id="${id}"]`);
  if (parent) {
    parent.dataset.enabled = enabled;
  }
};
document.addEventListener('click', ({target}) => {
  if (target.classList.contains('button')) {
    const parent = target.closest('[data-id]');
    const id = parent.dataset.id;
    chrome.management.get(id, info => {
      chrome.management.setEnabled(id, !info.enabled, () => {
        save();
        update(id, info.enabled === false);
      });
    });
  }
});

document.addEventListener('click', ({target}) => {
  const link = target.dataset.link;
  if (link) {
    if (link === 'open-faq') {
      chrome.tabs.create({
        url: chrome.runtime.getManifest().homepage_url
      });
    }
    else if (link === 'open-options') {
      chrome.runtime.openOptionsPage();
    }
    else if (link === 'open-addons') {
      chrome.tabs.create({
        url: 'chrome://extensions/'
      });
    }
    else if (link === 'cmd-copy') {
      chrome.management.getAll(apps => {
        const value = apps.map(addon => `name: ${addon.name},\nid: ${addon.id},\nstatus: ${addon.enabled}`).join('\n\n');
        copy(value);
        window.close();
      });
    }
    else if (link === 'disable-all' || link === 'enable-all') {
      const one = (id, enabled) => new Promise(resolve => chrome.management.setEnabled(id, enabled, resolve));
      chrome.management.getAll(async apps => {
        const name = chrome.runtime.getManifest().name;
        for (const app of apps) {
          if (app.name !== name) {
            await one(app.id, link === 'enable-all');
          }
        }
        await save();
        refresh();
      });
    }
  }
});

const refresh = (profile = select.value) => {
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
          chrome.management.setEnabled(app.id, false, () => {
            update(app.id, false);
          });
        }
        if (rule[app.id] === true && app.enabled === false) {
          chrome.management.setEnabled(app.id, true, () => {
            update(app.id, true);
          });
        }
      }
    });
  });
};

select.addEventListener('change', e => {
  const index = e.target.value;
  refresh(index);
  chrome.storage.local.set({
    index
  });
});

// init
chrome.management.getAll(apps => chrome.storage.local.get({
  index: 'Default',
  profiles: ['Default', 'A - Profile', 'B - Profile', 'C - Profile']
}, prefs => {
  document.body.dataset.status = 'loaded';
  for (const profile of prefs.profiles) {
    const option = document.createElement('option');
    option.textContent = profile;
    option.value = profile;
    option.selected = profile === prefs.index;
    select.appendChild(option);
  }

  const name = chrome.runtime.getManifest().name;
  for (const app of apps.sort((a, b) => a.name.localeCompare(b.name))) {
    if (app.name === name) {
      continue;
    }
    const tr = document.querySelector('#addons tr').cloneNode(true);
    tr.querySelector('[data-type=name]').textContent = app.name;
    tr.querySelector('[data-type=version]').textContent = app.version;
    tr.querySelector('[data-type=description]').textContent = app.description;
    tr.dataset.enabled = app.enabled;
    tr.dataset.locked = !app.mayDisable;
    tr.dataset.id = app.id;
    (app.icons || []).sort((a, b) => b.size - a.size).slice(0, 1).forEach(o => {
      tr.querySelector('td').style['background-image'] = 'url("' + o.url + '")';
    });
    document.querySelector('#addons tbody').appendChild(tr);
  }
  refresh(prefs.index);
}));
