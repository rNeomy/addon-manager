'use strict';

if (typeof require !== 'undefined') {
  var app = require('./firefox/firefox');
  var config = exports;
}
else {
  config = {};
}

config.profiles = {
  get index () {
    return app.storage.read('current-profile') || 'Default';
  },
  set index (val) {
    return app.storage.write('current-profile', val);
  },
  get current () {
    let index = config.profiles.index;
    return JSON.parse(app.storage.read(`profile-${index}`) || '{}');
  },
  set current (obj) {
    let index = config.profiles.index;
    app.storage.write(`profile-${index}`, JSON.stringify(obj));
  },
  get list () {
    return (app.storage.read('profiles') || 'Default, A - Profile, B - Profile, C - Profile').split(', ');
  },
  set list (arr) {
    app.storage.write('profiles', arr.join(', '));
  }
};

config.options = {
  get profiles () {
    return config.profiles.list.join(', ');
  },
  set profiles (val) {
    config.profiles.list = val.split(/\s*\,\s*/).filter((n, i, l) => l.indexOf(n) === i).filter(n => n.trim());
  }
};

config.popup = {
  get width () {
    return +app.storage.read('width') || 500;
  },
  set width (val) {
    val = +val;
    val = Math.min(val, 800);
    val = Math.max(val, 400);
    app.storage.write('width', val);
  },
  get height () {
    return +app.storage.read('height') || 600;
  },
  set height (val) {
    val = +val;
    val = Math.min(val, 600);
    val = Math.max(val, 300);
    app.storage.write('height', val);
  }
};

config.welcome = {
  get version () {
    return app.storage.read('version');
  },
  set version (val) {
    app.storage.write('version', val);
  },
  timeout: 3,
  get show () {
    return app.storage.read('show') === 'false' ? false : true; // default is true
  },
  set show (val) {
    app.storage.write('show', val);
  }
};

// Complex get and set
config.get = function (name) {
  return name.split('.').reduce(function (p, c) {
    return p[c];
  }, config);
};
config.set = function (name, value) {
  function set(name, value, scope) {
    name = name.split('.');
    if (name.length > 1) {
      set.call((scope || this)[name.shift()], name.join('.'), value)
    }
    else {
      this[name[0]] = value;
    }
  }
  set(name, value, config);
};
