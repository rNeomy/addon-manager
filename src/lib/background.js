'use strict';

if (typeof require !== 'undefined') {
  var app = require('./firefox/firefox');
  var config = require('./config');
}

function getAll (callback) {
  app.management.getAll(function (arr) {
    callback(arr.sort((a, b) => a.name > b.name));
  });
}

function save () {
  getAll(function (arr) {
    let tmp = {};
    arr.forEach(function (addon) {
      tmp[addon.id] = addon.enabled;
    });
    config.profiles.current = tmp;
  });
}

function enabling (id, value) {
  return new app.Promise(function (resolve) {
    app.management.setEnabled(id, value, () => resolve(id));
  });
}

function restore (callback) {
  let profile = config.profiles.current;
  getAll(function (arr) {
    let ids = arr.map(a => a.id);
    return app.Promise.all(
      Object.keys(profile)
        .filter(id => ids.indexOf(id) !== -1)
        .map(id => enabling(id, profile[id]).then(id => app.panel.send('update', {
          id,
          enabled: profile[id]
        })))
    ).then(callback);
  });
}

app.panel.receive('init', function () {
  getAll(function (arr) {
    app.panel.send('init', {
      arr,
      profiles: config.profiles.list,
      index: config.profiles.index
    });
    save();
  });
});

app.panel.receive('toggle', function (id) {
  app.management.get(id, function (info) {
    enabling(id, !info.enabled).then(() => {
      app.panel.send('update', {id, enabled: !info.enabled});
      save();
    });
  });
});

function badge () {
  let name = config.profiles.list.filter(n => n === config.profiles.index).pop();
  app.button.label = `Addon Manager - ${name}`;
  app.button.badge = name[0];
}

app.panel.receive('profile', function (index) {
  config.profiles.index = index;
  restore(() => {
    save();
    badge();
  });
});
badge();

app.panel.receive('open', function (id) {
  if (id === 'open-faq') {
    app.tab.open('http://add0n.com/addon-manager.html');
  }
  if (id === 'open-support') {
    app.tab.open('https://github.com/rNeomy/addon-manager/issues');
  }
  if (id === 'open-options') {
    app.tab.openOptions();
  }
  if (id === 'open-addons') {
    app.tab.openAddons();
  }
  if (id === 'cmd-copy') {
    getAll(function (arr) {
      app.runtime.copy(arr.map(addon => `name: ${addon.name},\nid: ${addon.id},\nstatus: ${addon.enabled}`).join('\n\n'));
    });
  }

  app.panel.hide();
});

/* options */
app.options.receive('changed', function (o) {
  config.set(o.pref, o.value);
  app.options.send('set', {
    pref: o.pref,
    value: config.get(o.pref)
  });
});
app.options.receive('get', function (pref) {
  app.options.send('set', {
    pref: pref,
    value: config.get(pref)
  });
});

app.startup(function () {
  let version = config.welcome.version;
  if (app.version() !== version && config.welcome.show) {
    app.timer.setTimeout(function () {
      app.tab.open(
        'http://add0n.com/addon-manager.html?v=' + app.version() +
        (version ? '&p=' + version + '&type=upgrade' : '&type=install')
      );
      config.welcome.version = app.version();
    }, config.welcome.timeout);
  }
});
