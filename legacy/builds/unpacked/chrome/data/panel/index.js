/* globals background */
'use strict';

var select = document.querySelector('select');

document.addEventListener('click', function (e) {
  let target = e.target;
  if (target.classList.contains('button')) {
    background.send('toggle', target.parentNode.parentNode.dataset.id);
  }
});

document.addEventListener('click', function (e) {
  let target = e.target;
  let link = target.dataset.link;
  if (link) {
    background.send('open', target.dataset.link);
  }
});

select.addEventListener('change', (e) => background.send('profile', e.target.value));

background.receive('update', function (obj) {
  let item = document.querySelector('[data-id="' + obj.id + '"]');
  if (item) {
    if (obj.url) {
      item.querySelector('td').style['background-image'] = 'url("' + obj.url + '")';
    }
    if ('enabled' in obj) {
      item.dataset.enabled = obj.enabled;
    }
  }
});

background.receive('init', function (obj) {
  document.body.dataset.status = 'loaded';
  obj.profiles.forEach(function (name) {
    let option = document.createElement('option');
    option.textContent = name;
    option.value = name;
    option.selected = name === obj.index;
    select.appendChild(option);
  });
  obj.arr.forEach(function (obj) {
    let tr = document.querySelector('#addons tr').cloneNode(true);
    tr.querySelector('[data-type=name]').textContent = obj.name;
    tr.querySelector('[data-type=version]').textContent = obj.version;
    tr.querySelector('[data-type=description]').textContent = obj.description;
    tr.dataset.enabled = obj.enabled;
    tr.dataset.locked = !obj.mayDisable;
    tr.dataset.id = obj.id;
    obj.icons.sort((a, b) => a.size < b.size).slice(0, 1).forEach(function (o) {
      tr.querySelector('td').style['background-image'] = 'url("' + o.url + '")';
    });
    document.querySelector('#addons tbody').appendChild(tr);
  });
});
background.receive('show', () => background.send('init'));
background.receive('hide', function () {
  Array.from(document.querySelectorAll('#addons tr')).slice(1)
    .forEach((tr) => tr.parentNode.removeChild(tr));
  select.innerHTML = '';
});
