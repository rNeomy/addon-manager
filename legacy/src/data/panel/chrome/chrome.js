/* globals chrome */
'use strict';

var background = { // jshint ignore:line
  send: (id, data) => chrome.runtime.sendMessage({
    method: id + '@pn',
    data
  }),
  receive: (id, callback) => {
    if (id === 'show') {
      window.addEventListener('load', callback);
    }
    else {
      chrome.runtime.onMessage.addListener(function (request, sender) {
        if (request.method === id + '@pn' && (!sender.url || sender.url.indexOf('background') !== -1)) {
          callback(request.data);
        }
      });
    }
  }
};

background.receive('resize', function (o) {
  document.body.style.width = o.width + 'px';
  document.body.style.height = (o.height - 20) + 'px';
  document.querySelector('html').style.height = (o.height - 20) + 'px';
});
background.send('resize');
