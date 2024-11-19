'use strict';

chrome.storage.onChanged.addListener(prefs => {
  if (prefs.index) {
    chrome.action.setBadgeText({
      text: prefs.index.newValue.trim()[0]
    });
  }
});
{
  const onStartup = () => {
    if (onStartup.done) {
      return;
    }
    onStartup.done = true;

    chrome.storage.local.get({
      index: 'Default',
      color: '#666'
    }, prefs => {
      chrome.action.setBadgeBackgroundColor({
        color: prefs.color
      });
      chrome.action.setBadgeText({
        text: prefs.index[0]
      });
    });
  };
  chrome.runtime.onStartup.addListener(onStartup);
  chrome.runtime.onInstalled.addListener(onStartup);
}

// Save the default profile on first run
chrome.runtime.onInstalled.addListener(chrome.management.getAll(apps => chrome.storage.local.set({
  'profile-Default': JSON.stringify(apps.reduce((p, {id, enabled}) => {
    p[id] = enabled;
    return p;
  }, {}))
})));

chrome.commands.onCommand.addListener(async command => {
  if (command.startsWith('switch-to-profile-') === false) {
    return;
  }
  const n = Number(command.split('-').slice(-1)[0]) - 1;
  const prefs = await chrome.storage.local.get({
    profiles: ['Default', 'A - Profile', 'B - Profile', 'C - Profile']
  });
  const profile = prefs.profiles[n];

  if (profile) {
    const apps = await chrome.management.getAll();
    const name = 'profile-' + profile;

    const prefs = await chrome.storage.local.get({
      [name]: '{}'
    });

    chrome.storage.local.set({
      index: profile
    });

    const rule = JSON.parse(prefs[name]);
    for (const app of apps) {
      if (rule[app.id] === false && app.enabled) {
        chrome.management.setEnabled(app.id, false);
      }
      if (rule[app.id] === true && app.enabled === false) {
        chrome.management.setEnabled(app.id, true);
      }
    }
  }
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const {homepage_url: page, name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
