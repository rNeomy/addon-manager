'use strict';

chrome.storage.onChanged.addListener(prefs => {
  if (prefs.index) {
    chrome.action.setBadgeText({
      text: prefs.index.newValue[0]
    });
  }
});
{
  const onStartup = () => chrome.storage.local.get({
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
  chrome.runtime.onStartup.addListener(onStartup);
  chrome.runtime.onInstalled.addListener(onStartup);
}
// Save the default profile
chrome.runtime.onInstalled.addListener(chrome.management.getAll(apps => chrome.storage.local.set({
  'profile-Default': JSON.stringify(apps.reduce((p, {id, enabled}) => {
    p[id] = enabled;
    return p;
  }, {}))
})));

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
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
