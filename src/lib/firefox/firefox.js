'use strict';

var {ToggleButton} = require('sdk/ui/button/toggle');
var panels = require('sdk/panel');
var self = require('sdk/self');
var {Ci, Cu} = require('chrome');
var sp = require('sdk/simple-prefs');
var prefs = sp.prefs;
var pageMod = require('sdk/page-mod');
var array = require('sdk/util/array');
var unload = require('sdk/system/unload');
var tabs = require('sdk/tabs');
var timers = require('sdk/timers');
var clipboard = require('sdk/clipboard');
var {all, defer, resolve}  = require('sdk/core/promise');

var config = require('../config');

var {AddonManager} = Cu.import('resource://gre/modules/AddonManager.jsm');
var {Services} = Cu.import('resource://gre/modules/Services.jsm');

exports.timer = timers;
exports.Promise = function (callback) {
  let d = defer();

  callback(d.resolve, d.reject);

  return d.promise;
};
exports.Promise.all = all;
exports.Promise.defer = defer;
exports.Promise.resolve = resolve;

var button = new ToggleButton({
  id: self.name,
  label: 'Addon Manager',
  icon: {
    '18': './icons/18.png',
    '36': './icons/36.png',
    '64': './icons/64.png'
  },
  onChange: function (state) {
    if (state.checked) {
      panel.show({
        width: config.popup.width,
        height: config.popup.height,
        position: button
      });
    }
  }
});

exports.button = {
  set badge (val) {
    button.badge = val;
  },
  set label (val) {
    button.label = val;
  }
};

var panel = panels.Panel({
  contentURL: self.data.url('./panel/index.html'),
  contentScriptFile: [
    self.data.url('panel/firefox/firefox.js'),
    self.data.url('panel/index.js')
  ]
});
panel.on('show', () => panel.port.emit('show'));
panel.on('hide', () => {
  button.state('window', {checked: false});
  panel.port.emit('hide');
});

exports.panel = {
  send: (id, data) => panel.port.emit(id, data),
  receive: (id, callback) => panel.port.on(id, callback),
  hide: () => panel.hide()
};

exports.storage = {
  read: function (id) {
    return (prefs[id] || prefs[id] + '' === 'false' || !isNaN(prefs[id])) ? (prefs[id] + '') : null;
  },
  write: function (id, data) {
    data = data + '';
    if (data === 'true' || data === 'false') {
      prefs[id] = data === 'true' ? true : false;
    }
    else if (parseInt(data) + '' === data) {
      prefs[id] = parseInt(data);
    }
    else {
      prefs[id] = data + '';
    }
  }
};

exports.tab = (function () {
  function close (url) {
    for each (let tab in tabs) {
      if (tab.url === url) {
        tab.close();
      }
    }
  }
  return {
    open: tabs.open,
    openAddons: function () {
      close('about:addons');
      tabs.open('about:addons');
    },
    openOptions: function () {
      let url = self.data.url('options/index.html');
      close(url);
      tabs.open(url);
    }
  };
})();

var toResource = (function () {
  let cache = {};
  let i = 0;
  return function (path) {
    if (!cache[path]) {
      let res = Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler);
      let name = `${self.name}-${++i}`;
      res.setSubstitution(name, Services.io.newURI(path, null, null));
      cache[path] = 'resource://' + name;
    }
    return cache[path];
  };
})();

function toObj (addon) {
  let icons = [];
  let url = addon.icon64URL || addon.iconURL;
  if (url) {
    if (
      url.indexOf('http') === 0 ||
      url.indexOf('chrome') === 0 ||
      url.indexOf('resource') === 0 ||
      url.indexOf('jar') === 0
    ) {
      icons.push({
        size: 32,
        url
      });
    }
    else {
      icons.push({
        size: 32,
        url: addon.getResourceURI(url).spec
      });
    }
  }
  icons = icons.map(function (obj) {
    if (obj.url.indexOf('jar') === 0) {
      return {
        size: obj.size,
        url: toResource(obj.url)
      };
    }
    else {
      return obj;
    }
  });

  return {
    'enabled': addon.isActive,
    'mayDisable': addon.isCompatible,
    'name': addon.name,
    'id': addon.id,
    'version': addon.version,
    'description': addon.description,
    icons
  };
}

exports.management = {
  get: function (id, callback) {
    AddonManager.getAddonByID(id, function (addon) {
      callback(toObj(addon));
    });
  },
  getAll: function (callback) {
    AddonManager.getAllAddons(function (addons) {
      callback(
        addons
          .filter(a => a.type === 'extension')
          .filter(a => a.operationsRequiringRestart === AddonManager.OP_NEEDS_RESTART_NONE)
          .map(toObj)
      );
    });
  },
  setEnabled: function (id, status, callback) {
    AddonManager.getAddonByID(id, function (addon) {
      addon.userDisabled = !status;
      if (callback) {
        callback();
      }
    });
  }
};

exports.runtime = {
  copy: clipboard.set
};

exports.version = () => self.version;

exports.options = (function () {
  var workers = [], callbacks = [];
  pageMod.PageMod({
    include: self.data.url('options/index.html'),
    contentScriptFile: [
      self.data.url('options/firefox/firefox.js'),
      self.data.url('options/index.js')
    ],
    onAttach: function (worker) {
      array.add(workers, worker);
      worker.on('pageshow', function () { array.add(workers, this); });
      worker.on('pagehide', function () { array.remove(workers, this); });
      worker.on('detach', function () { array.remove(workers, this); });

      callbacks.forEach(function (arr) {
        worker.port.on(arr[0], arr[1]);
      });
    }
  });
  sp.on('openOptions', () => exports.tab.open(self.data.url('options/index.html')));

  return {
    send: function (id, data) {
      workers.forEach(function (worker) {
        if (!worker || !worker.url) {
          return;
        }
        worker.port.emit(id, data);
      });
    },
    receive: (id, callback) => callbacks.push([id, callback])
  };
})();
unload.when(function () {
  for each (let tab in tabs) {
    if (tab.url.indexOf(self.data.url('')) === 0) {
      tab.close();
    }
  }
});

//startup
exports.startup = function (callback) {
  if (self.loadReason === 'install' || self.loadReason === 'startup') {
    callback();
  }
};
