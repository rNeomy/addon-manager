/* globals config */
'use strict';

var app = {};

app.Promise = Promise;
app.timer = window;

app.button = {
  set badge (text) {
    chrome.browserAction.setBadgeText({text});
  },
  set label (title) {
    chrome.browserAction.setTitle({title});
  }
};

app.tab = (function () {
  function close (url, callback) {
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach(function (tab) {
        if (tab.url === url) {
          chrome.tabs.remove(tab.id);
        }
      });
      callback();
    });
  }
  return {
    open: (url) => chrome.tabs.create({
      url,
      active: true
    }),
    openAddons: function () {
      close('chrome://extensions/', () => chrome.tabs.create({
        url: 'chrome://extensions/',
        active: true
      }));
    },
    openOptions: function () {
      close(chrome.extension.getURL('data/options/index.html'), () => chrome.tabs.create({
        url: chrome.extension.getURL('data/options/index.html'),
        active: true
      }));
    }
  };
})();

app.runtime = {
  copy: function (text) {
    let input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('Copy');
    document.body.removeChild(input);
  }
};

app.version = () => chrome[chrome.runtime && chrome.runtime.getManifest ? 'runtime' : 'extension'].getManifest().version;

app.panel = (function () {
  chrome.runtime.onMessage.addListener(function (message, sender) {
    if ('resize@pn' === message.method && sender.url !== document.location.href) {
      chrome.runtime.sendMessage({
        method: 'resize@pn',
        data: {
          width: config.popup.width,
          height: config.popup.height
        }
      });
    }
  });

  return {
    send: (id, data) => chrome.runtime.sendMessage({
      method: id + '@pn',
      data
    }),
    receive: (id, callback) => chrome.runtime.onMessage.addListener(function (message, sender) {
      if (id + '@pn' === message.method && sender.url !== document.location.href) {
        callback.call(sender.tab, message.data);
      }
    })
  };
})();

app.options = (function () {
  return {
    send: (id, data) => chrome.runtime.sendMessage({
      method: id + '@op',
      data
    }),
    receive: (id, callback) => chrome.runtime.onMessage.addListener(function (message, sender) {
      if (id + '@op' === message.method && sender.url !== document.location.href) {
        callback.call(sender.tab, message.data);
      }
    })
  };
})();

app.storage = (function () {
  var objs = {};
  chrome.storage.local.get(null, function (o) {
    objs = o;
    let script = document.createElement('script');
    document.body.appendChild(script);
    script.src = './lib/background.js';
  });
  return {
    read: function (id) {
      return (objs[id] || !isNaN(objs[id])) ? objs[id] + '' : objs[id];
    },
    write: function (id, data) {
      objs[id] = data;
      var tmp = {};
      tmp[id] = data;
      chrome.storage.local.set(tmp, function () {});
    }
  };
})();

app.management = {
  get: chrome.management.get,
  getAll: chrome.management.getAll,
  setEnabled: chrome.management.setEnabled
};

app.startup = (function () {
  let loadReason, callback;
  function check () {
    if (loadReason === 'startup' || loadReason === 'install') {
      if (callback) {
        callback();
      }
    }
  }
  chrome.runtime.onInstalled.addListener(function (details) {
    loadReason = details.reason;
    check();
  });
  chrome.runtime.onStartup.addListener(function () {
    loadReason = 'startup';
    check();
  });
  return function (c) {
    callback = c;
    check();
  };
})();
