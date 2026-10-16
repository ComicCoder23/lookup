const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Astronomy = require('./vendor/astronomy.browser.min.js');

class Element {
  constructor() {
    this.children = [];
    this.classList = {add() {}, remove() {}};
    this.listeners = {};
    this.style = {};
    this.textContent = '';
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  after() {}
  setAttribute() {}
  addEventListener(type, fn) { this.listeners[type] = fn; }
}

function load({stored = null, legacy = null, fetchResult = null} = {}) {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const storage = new Map();
  if (stored) storage.set('sky-calendar-place', stored);
  if (legacy) storage.set('spot', legacy);
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : ['2026-10-15T12:00:00Z'])); }
    static now() { return RealDate.parse('2026-10-15T12:00:00Z'); }
  }
  const context = {
    window: {Astronomy}, Date:FixedDate, Intl, Number, JSON, console,
    document: {getElementById:get, createElement:() => new Element()},
    localStorage: {getItem:key => storage.get(key) || null, setItem:(key,val) => storage.set(key,val)},
    navigator: {},
    fetch: async url => ({ok:true, json:async () => fetchResult || {status:200,result:null}})
  };
  vm.runInNewContext(fs.readFileSync('calendar.js', 'utf8'), context);
  return {get, storage};
}

test('Kirkintilloch default renders future events and 2027 eclipse', () => {
  const {get} = load();
  assert.equal(get('place').textContent, 'Kirkintilloch · G66');
  assert.equal(get('moon-list').children.length, 8);
  assert.equal(get('meteor-list').children.length, 9);
  assert.match(get('meteor-list').children[0].children[0].children[0].textContent, /Orionids/);
  assert.equal(get('planet-list').children.length, 1);
  assert.equal(get('planet-list').children[0].children[0].children[0].textContent, 'Saturn');
  assert.match(get('eclipse-event').children[0].textContent, /2 Aug 2027 · partial eclipse/);
  assert.match(get('eclipse-event').children[1].textContent, /27%/);
});

test('town search uses postcodes.io and saves the selected spot', async () => {
  const {get, storage} = load({fetchResult:{status:200,result:[{
    name_1:'Glasgow', county_unitary:'Glasgow City', latitude:55.86, longitude:-4.25
  }]}});
  get('location-input').value = 'Glasgow';
  await get('location-form').listeners.submit({preventDefault() {}});
  assert.match(get('place').textContent, /Glasgow/);
  assert.equal(JSON.parse(storage.get('sky-calendar-place')).lat, 55.86);
});

test('bad saved location falls back to Kirkintilloch', () => {
  const {get} = load({stored:'{bad json'});
  assert.equal(get('place').textContent, 'Kirkintilloch · G66');
});

test('upgrade retains a valid eclipse-page spot without changing legacy data', () => {
  const legacy = JSON.stringify({lat:55.8651, lon:-4.2576, name:'Glasgow', elev:20});
  const {get, storage} = load({legacy});
  assert.equal(get('place').textContent, 'Glasgow');
  assert.equal(storage.get('spot'), legacy);
});

test('a calendar selection takes precedence over the old eclipse spot', () => {
  const {get} = load({
    stored:JSON.stringify({lat:55.95, lon:-3.19, name:'Edinburgh'}),
    legacy:JSON.stringify({lat:55.86, lon:-4.25, name:'Glasgow'})
  });
  assert.equal(get('place').textContent, 'Edinburgh');
});

test('malformed calendar storage does not hide a valid legacy spot', () => {
  const {get} = load({stored:'{bad json',
    legacy:JSON.stringify({lat:55.86, lon:-4.25, name:'Glasgow'})});
  assert.equal(get('place').textContent, 'Glasgow');
});

test('invalid or malformed legacy spots still use the offline default', () => {
  for (const legacy of ['{bad json', JSON.stringify({lat:999, lon:0, name:'Invalid'})]) {
    assert.equal(load({legacy}).get('place').textContent, 'Kirkintilloch · G66');
  }
});
