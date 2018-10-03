(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

module.exports = argsArray;

function argsArray(fun) {
  return function () {
    var len = arguments.length;
    if (len) {
      var args = [];
      var i = -1;
      while (++i < len) {
        args[i] = arguments[i];
      }
      return fun.call(this, args);
    } else {
      return fun.call(this, []);
    }
  };
}
},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
(function (global){
'use strict';
var Mutation = global.MutationObserver || global.WebKitMutationObserver;

var scheduleDrain;

{
  if (Mutation) {
    var called = 0;
    var observer = new Mutation(nextTick);
    var element = global.document.createTextNode('');
    observer.observe(element, {
      characterData: true
    });
    scheduleDrain = function () {
      element.data = (called = ++called % 2);
    };
  } else if (!global.setImmediate && typeof global.MessageChannel !== 'undefined') {
    var channel = new global.MessageChannel();
    channel.port1.onmessage = nextTick;
    scheduleDrain = function () {
      channel.port2.postMessage(0);
    };
  } else if ('document' in global && 'onreadystatechange' in global.document.createElement('script')) {
    scheduleDrain = function () {

      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
      var scriptEl = global.document.createElement('script');
      scriptEl.onreadystatechange = function () {
        nextTick();

        scriptEl.onreadystatechange = null;
        scriptEl.parentNode.removeChild(scriptEl);
        scriptEl = null;
      };
      global.document.documentElement.appendChild(scriptEl);
    };
  } else {
    scheduleDrain = function () {
      setTimeout(nextTick, 0);
    };
  }
}

var draining;
var queue = [];
//named nextTick for less confusing stack traces
function nextTick() {
  draining = true;
  var i, oldQueue;
  var len = queue.length;
  while (len) {
    oldQueue = queue;
    queue = [];
    i = -1;
    while (++i < len) {
      oldQueue[i]();
    }
    len = queue.length;
  }
  draining = false;
}

module.exports = immediate;
function immediate(task) {
  if (queue.push(task) === 1 && !draining) {
    scheduleDrain();
  }
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],6:[function(require,module,exports){
(function (process,global){
'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var getArguments = _interopDefault(require('argsarray'));
var nextTick = _interopDefault(require('immediate'));
var events = require('events');
var inherits = _interopDefault(require('inherits'));
var Md5 = _interopDefault(require('spark-md5'));
var uuidV4 = _interopDefault(require('uuid'));
var vuvuzela = _interopDefault(require('vuvuzela'));

function isBinaryObject(object) {
  return (typeof ArrayBuffer !== 'undefined' && object instanceof ArrayBuffer) ||
    (typeof Blob !== 'undefined' && object instanceof Blob);
}

function cloneArrayBuffer(buff) {
  if (typeof buff.slice === 'function') {
    return buff.slice(0);
  }
  // IE10-11 slice() polyfill
  var target = new ArrayBuffer(buff.byteLength);
  var targetArray = new Uint8Array(target);
  var sourceArray = new Uint8Array(buff);
  targetArray.set(sourceArray);
  return target;
}

function cloneBinaryObject(object) {
  if (object instanceof ArrayBuffer) {
    return cloneArrayBuffer(object);
  }
  var size = object.size;
  var type = object.type;
  // Blob
  if (typeof object.slice === 'function') {
    return object.slice(0, size, type);
  }
  // PhantomJS slice() replacement
  return object.webkitSlice(0, size, type);
}

// most of this is borrowed from lodash.isPlainObject:
// https://github.com/fis-components/lodash.isplainobject/
// blob/29c358140a74f252aeb08c9eb28bef86f2217d4a/index.js

var funcToString = Function.prototype.toString;
var objectCtorString = funcToString.call(Object);

function isPlainObject(value) {
  var proto = Object.getPrototypeOf(value);
  /* istanbul ignore if */
  if (proto === null) { // not sure when this happens, but I guess it can
    return true;
  }
  var Ctor = proto.constructor;
  return (typeof Ctor == 'function' &&
    Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString);
}

function clone(object) {
  var newObject;
  var i;
  var len;

  if (!object || typeof object !== 'object') {
    return object;
  }

  if (Array.isArray(object)) {
    newObject = [];
    for (i = 0, len = object.length; i < len; i++) {
      newObject[i] = clone(object[i]);
    }
    return newObject;
  }

  // special case: to avoid inconsistencies between IndexedDB
  // and other backends, we automatically stringify Dates
  if (object instanceof Date) {
    return object.toISOString();
  }

  if (isBinaryObject(object)) {
    return cloneBinaryObject(object);
  }

  if (!isPlainObject(object)) {
    return object; // don't clone objects like Workers
  }

  newObject = {};
  for (i in object) {
    /* istanbul ignore else */
    if (Object.prototype.hasOwnProperty.call(object, i)) {
      var value = clone(object[i]);
      if (typeof value !== 'undefined') {
        newObject[i] = value;
      }
    }
  }
  return newObject;
}

function once(fun) {
  var called = false;
  return getArguments(function (args) {
    /* istanbul ignore if */
    if (called) {
      // this is a smoke test and should never actually happen
      throw new Error('once called more than once');
    } else {
      called = true;
      fun.apply(this, args);
    }
  });
}

function toPromise(func) {
  //create the function we will be returning
  return getArguments(function (args) {
    // Clone arguments
    args = clone(args);
    var self = this;
    // if the last argument is a function, assume its a callback
    var usedCB = (typeof args[args.length - 1] === 'function') ? args.pop() : false;
    var promise = new Promise(function (fulfill, reject) {
      var resp;
      try {
        var callback = once(function (err, mesg) {
          if (err) {
            reject(err);
          } else {
            fulfill(mesg);
          }
        });
        // create a callback for this invocation
        // apply the function in the orig context
        args.push(callback);
        resp = func.apply(self, args);
        if (resp && typeof resp.then === 'function') {
          fulfill(resp);
        }
      } catch (e) {
        reject(e);
      }
    });
    // if there is a callback, call it back
    if (usedCB) {
      promise.then(function (result) {
        usedCB(null, result);
      }, usedCB);
    }
    return promise;
  });
}

function logApiCall(self, name, args) {
  /* istanbul ignore if */
  if (self.constructor.listeners('debug').length) {
    var logArgs = ['api', self.name, name];
    for (var i = 0; i < args.length - 1; i++) {
      logArgs.push(args[i]);
    }
    self.constructor.emit('debug', logArgs);

    // override the callback itself to log the response
    var origCallback = args[args.length - 1];
    args[args.length - 1] = function (err, res) {
      var responseArgs = ['api', self.name, name];
      responseArgs = responseArgs.concat(
        err ? ['error', err] : ['success', res]
      );
      self.constructor.emit('debug', responseArgs);
      origCallback(err, res);
    };
  }
}

function adapterFun(name, callback) {
  return toPromise(getArguments(function (args) {
    if (this._closed) {
      return Promise.reject(new Error('database is closed'));
    }
    if (this._destroyed) {
      return Promise.reject(new Error('database is destroyed'));
    }
    var self = this;
    logApiCall(self, name, args);
    if (!this.taskqueue.isReady) {
      return new Promise(function (fulfill, reject) {
        self.taskqueue.addTask(function (failed) {
          if (failed) {
            reject(failed);
          } else {
            fulfill(self[name].apply(self, args));
          }
        });
      });
    }
    return callback.apply(this, args);
  }));
}

function mangle(key) {
  return '$' + key;
}
function unmangle(key) {
  return key.substring(1);
}
function Map$1() {
  this._store = {};
}
Map$1.prototype.get = function (key) {
  var mangled = mangle(key);
  return this._store[mangled];
};
Map$1.prototype.set = function (key, value) {
  var mangled = mangle(key);
  this._store[mangled] = value;
  return true;
};
Map$1.prototype.has = function (key) {
  var mangled = mangle(key);
  return mangled in this._store;
};
Map$1.prototype.delete = function (key) {
  var mangled = mangle(key);
  var res = mangled in this._store;
  delete this._store[mangled];
  return res;
};
Map$1.prototype.forEach = function (cb) {
  var keys = Object.keys(this._store);
  for (var i = 0, len = keys.length; i < len; i++) {
    var key = keys[i];
    var value = this._store[key];
    key = unmangle(key);
    cb(value, key);
  }
};
Object.defineProperty(Map$1.prototype, 'size', {
  get: function () {
    return Object.keys(this._store).length;
  }
});

function Set$1(array) {
  this._store = new Map$1();

  // init with an array
  if (array && Array.isArray(array)) {
    for (var i = 0, len = array.length; i < len; i++) {
      this.add(array[i]);
    }
  }
}
Set$1.prototype.add = function (key) {
  return this._store.set(key, true);
};
Set$1.prototype.has = function (key) {
  return this._store.has(key);
};
Set$1.prototype.forEach = function (cb) {
  this._store.forEach(function (value, key) {
    cb(key);
  });
};
Object.defineProperty(Set$1.prototype, 'size', {
  get: function () {
    return this._store.size;
  }
});

/* global Map,Set,Symbol */
// Based on https://kangax.github.io/compat-table/es6/ we can sniff out
// incomplete Map/Set implementations which would otherwise cause our tests to fail.
// Notably they fail in IE11 and iOS 8.4, which this prevents.
function supportsMapAndSet() {
  if (typeof Symbol === 'undefined' || typeof Map === 'undefined' || typeof Set === 'undefined') {
    return false;
  }
  var prop = Object.getOwnPropertyDescriptor(Map, Symbol.species);
  return prop && 'get' in prop && Map[Symbol.species] === Map;
}

// based on https://github.com/montagejs/collections

var ExportedSet;
var ExportedMap;

{
  if (supportsMapAndSet()) { // prefer built-in Map/Set
    ExportedSet = Set;
    ExportedMap = Map;
  } else { // fall back to our polyfill
    ExportedSet = Set$1;
    ExportedMap = Map$1;
  }
}

// like underscore/lodash _.pick()
function pick(obj, arr) {
  var res = {};
  for (var i = 0, len = arr.length; i < len; i++) {
    var prop = arr[i];
    if (prop in obj) {
      res[prop] = obj[prop];
    }
  }
  return res;
}

// Most browsers throttle concurrent requests at 6, so it's silly
// to shim _bulk_get by trying to launch potentially hundreds of requests
// and then letting the majority time out. We can handle this ourselves.
var MAX_NUM_CONCURRENT_REQUESTS = 6;

function identityFunction(x) {
  return x;
}

function formatResultForOpenRevsGet(result) {
  return [{
    ok: result
  }];
}

// shim for P/CouchDB adapters that don't directly implement _bulk_get
function bulkGet(db, opts, callback) {
  var requests = opts.docs;

  // consolidate into one request per doc if possible
  var requestsById = new ExportedMap();
  requests.forEach(function (request) {
    if (requestsById.has(request.id)) {
      requestsById.get(request.id).push(request);
    } else {
      requestsById.set(request.id, [request]);
    }
  });

  var numDocs = requestsById.size;
  var numDone = 0;
  var perDocResults = new Array(numDocs);

  function collapseResultsAndFinish() {
    var results = [];
    perDocResults.forEach(function (res) {
      res.docs.forEach(function (info) {
        results.push({
          id: res.id,
          docs: [info]
        });
      });
    });
    callback(null, {results: results});
  }

  function checkDone() {
    if (++numDone === numDocs) {
      collapseResultsAndFinish();
    }
  }

  function gotResult(docIndex, id, docs) {
    perDocResults[docIndex] = {id: id, docs: docs};
    checkDone();
  }

  var allRequests = [];
  requestsById.forEach(function (value, key) {
    allRequests.push(key);
  });

  var i = 0;

  function nextBatch() {

    if (i >= allRequests.length) {
      return;
    }

    var upTo = Math.min(i + MAX_NUM_CONCURRENT_REQUESTS, allRequests.length);
    var batch = allRequests.slice(i, upTo);
    processBatch(batch, i);
    i += batch.length;
  }

  function processBatch(batch, offset) {
    batch.forEach(function (docId, j) {
      var docIdx = offset + j;
      var docRequests = requestsById.get(docId);

      // just use the first request as the "template"
      // TODO: The _bulk_get API allows for more subtle use cases than this,
      // but for now it is unlikely that there will be a mix of different
      // "atts_since" or "attachments" in the same request, since it's just
      // replicate.js that is using this for the moment.
      // Also, atts_since is aspirational, since we don't support it yet.
      var docOpts = pick(docRequests[0], ['atts_since', 'attachments']);
      docOpts.open_revs = docRequests.map(function (request) {
        // rev is optional, open_revs disallowed
        return request.rev;
      });

      // remove falsey / undefined revisions
      docOpts.open_revs = docOpts.open_revs.filter(identityFunction);

      var formatResult = identityFunction;

      if (docOpts.open_revs.length === 0) {
        delete docOpts.open_revs;

        // when fetching only the "winning" leaf,
        // transform the result so it looks like an open_revs
        // request
        formatResult = formatResultForOpenRevsGet;
      }

      // globally-supplied options
      ['revs', 'attachments', 'binary', 'ajax', 'latest'].forEach(function (param) {
        if (param in opts) {
          docOpts[param] = opts[param];
        }
      });
      db.get(docId, docOpts, function (err, res) {
        var result;
        /* istanbul ignore if */
        if (err) {
          result = [{error: err}];
        } else {
          result = formatResult(res);
        }
        gotResult(docIdx, docId, result);
        nextBatch();
      });
    });
  }

  nextBatch();

}

var hasLocal;

try {
  localStorage.setItem('_pouch_check_localstorage', 1);
  hasLocal = !!localStorage.getItem('_pouch_check_localstorage');
} catch (e) {
  hasLocal = false;
}

function hasLocalStorage() {
  return hasLocal;
}

// Custom nextTick() shim for browsers. In node, this will just be process.nextTick(). We

inherits(Changes, events.EventEmitter);

/* istanbul ignore next */
function attachBrowserEvents(self) {
  if (hasLocalStorage()) {
    addEventListener("storage", function (e) {
      self.emit(e.key);
    });
  }
}

function Changes() {
  events.EventEmitter.call(this);
  this._listeners = {};

  attachBrowserEvents(this);
}
Changes.prototype.addListener = function (dbName, id, db, opts) {
  /* istanbul ignore if */
  if (this._listeners[id]) {
    return;
  }
  var self = this;
  var inprogress = false;
  function eventFunction() {
    /* istanbul ignore if */
    if (!self._listeners[id]) {
      return;
    }
    if (inprogress) {
      inprogress = 'waiting';
      return;
    }
    inprogress = true;
    var changesOpts = pick(opts, [
      'style', 'include_docs', 'attachments', 'conflicts', 'filter',
      'doc_ids', 'view', 'since', 'query_params', 'binary', 'return_docs'
    ]);

    /* istanbul ignore next */
    function onError() {
      inprogress = false;
    }

    db.changes(changesOpts).on('change', function (c) {
      if (c.seq > opts.since && !opts.cancelled) {
        opts.since = c.seq;
        opts.onChange(c);
      }
    }).on('complete', function () {
      if (inprogress === 'waiting') {
        nextTick(eventFunction);
      }
      inprogress = false;
    }).on('error', onError);
  }
  this._listeners[id] = eventFunction;
  this.on(dbName, eventFunction);
};

Changes.prototype.removeListener = function (dbName, id) {
  /* istanbul ignore if */
  if (!(id in this._listeners)) {
    return;
  }
  events.EventEmitter.prototype.removeListener.call(this, dbName,
    this._listeners[id]);
  delete this._listeners[id];
};


/* istanbul ignore next */
Changes.prototype.notifyLocalWindows = function (dbName) {
  //do a useless change on a storage thing
  //in order to get other windows's listeners to activate
  if (hasLocalStorage()) {
    localStorage[dbName] = (localStorage[dbName] === "a") ? "b" : "a";
  }
};

Changes.prototype.notify = function (dbName) {
  this.emit(dbName);
  this.notifyLocalWindows(dbName);
};

function guardedConsole(method) {
  /* istanbul ignore else */
  if (typeof console !== 'undefined' && typeof console[method] === 'function') {
    var args = Array.prototype.slice.call(arguments, 1);
    console[method].apply(console, args);
  }
}

function randomNumber(min, max) {
  var maxTimeout = 600000; // Hard-coded default of 10 minutes
  min = parseInt(min, 10) || 0;
  max = parseInt(max, 10);
  if (max !== max || max <= min) {
    max = (min || 1) << 1; //doubling
  } else {
    max = max + 1;
  }
  // In order to not exceed maxTimeout, pick a random value between half of maxTimeout and maxTimeout
  if (max > maxTimeout) {
    min = maxTimeout >> 1; // divide by two
    max = maxTimeout;
  }
  var ratio = Math.random();
  var range = max - min;

  return ~~(range * ratio + min); // ~~ coerces to an int, but fast.
}

function defaultBackOff(min) {
  var max = 0;
  if (!min) {
    max = 2000;
  }
  return randomNumber(min, max);
}

// designed to give info to browser users, who are disturbed
// when they see http errors in the console
function explainError(status, str) {
  guardedConsole('info', 'The above ' + status + ' is totally normal. ' + str);
}

var assign;
{
  if (typeof Object.assign === 'function') {
    assign = Object.assign;
  } else {
    // lite Object.assign polyfill based on
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
    assign = function (target) {
      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) { // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    };
  }
}

var $inject_Object_assign = assign;

inherits(PouchError, Error);

function PouchError(status, error, reason) {
  Error.call(this, reason);
  this.status = status;
  this.name = error;
  this.message = reason;
  this.error = true;
}

PouchError.prototype.toString = function () {
  return JSON.stringify({
    status: this.status,
    name: this.name,
    message: this.message,
    reason: this.reason
  });
};

var UNAUTHORIZED = new PouchError(401, 'unauthorized', "Name or password is incorrect.");
var MISSING_BULK_DOCS = new PouchError(400, 'bad_request', "Missing JSON list of 'docs'");
var MISSING_DOC = new PouchError(404, 'not_found', 'missing');
var REV_CONFLICT = new PouchError(409, 'conflict', 'Document update conflict');
var INVALID_ID = new PouchError(400, 'bad_request', '_id field must contain a string');
var MISSING_ID = new PouchError(412, 'missing_id', '_id is required for puts');
var RESERVED_ID = new PouchError(400, 'bad_request', 'Only reserved document ids may start with underscore.');
var NOT_OPEN = new PouchError(412, 'precondition_failed', 'Database not open');
var UNKNOWN_ERROR = new PouchError(500, 'unknown_error', 'Database encountered an unknown error');
var BAD_ARG = new PouchError(500, 'badarg', 'Some query argument is invalid');
var INVALID_REQUEST = new PouchError(400, 'invalid_request', 'Request was invalid');
var QUERY_PARSE_ERROR = new PouchError(400, 'query_parse_error', 'Some query parameter is invalid');
var DOC_VALIDATION = new PouchError(500, 'doc_validation', 'Bad special document member');
var BAD_REQUEST = new PouchError(400, 'bad_request', 'Something wrong with the request');
var NOT_AN_OBJECT = new PouchError(400, 'bad_request', 'Document must be a JSON object');
var DB_MISSING = new PouchError(404, 'not_found', 'Database not found');
var IDB_ERROR = new PouchError(500, 'indexed_db_went_bad', 'unknown');
var WSQ_ERROR = new PouchError(500, 'web_sql_went_bad', 'unknown');
var LDB_ERROR = new PouchError(500, 'levelDB_went_went_bad', 'unknown');
var FORBIDDEN = new PouchError(403, 'forbidden', 'Forbidden by design doc validate_doc_update function');
var INVALID_REV = new PouchError(400, 'bad_request', 'Invalid rev format');
var FILE_EXISTS = new PouchError(412, 'file_exists', 'The database could not be created, the file already exists.');
var MISSING_STUB = new PouchError(412, 'missing_stub', 'A pre-existing attachment stub wasn\'t found');
var INVALID_URL = new PouchError(413, 'invalid_url', 'Provided URL is invalid');

function createError(error, reason) {
  function CustomPouchError(reason) {
    // inherit error properties from our parent error manually
    // so as to allow proper JSON parsing.
    /* jshint ignore:start */
    for (var p in error) {
      if (typeof error[p] !== 'function') {
        this[p] = error[p];
      }
    }
    /* jshint ignore:end */
    if (reason !== undefined) {
      this.reason = reason;
    }
  }
  CustomPouchError.prototype = PouchError.prototype;
  return new CustomPouchError(reason);
}

function generateErrorFromResponse(err) {

  if (typeof err !== 'object') {
    var data = err;
    err = UNKNOWN_ERROR;
    err.data = data;
  }

  if ('error' in err && err.error === 'conflict') {
    err.name = 'conflict';
    err.status = 409;
  }

  if (!('name' in err)) {
    err.name = err.error || 'unknown';
  }

  if (!('status' in err)) {
    err.status = 500;
  }

  if (!('message' in err)) {
    err.message = err.message || err.reason;
  }

  return err;
}

function tryFilter(filter, doc, req) {
  try {
    return !filter(doc, req);
  } catch (err) {
    var msg = 'Filter function threw: ' + err.toString();
    return createError(BAD_REQUEST, msg);
  }
}

function filterChange(opts) {
  var req = {};
  var hasFilter = opts.filter && typeof opts.filter === 'function';
  req.query = opts.query_params;

  return function filter(change) {
    if (!change.doc) {
      // CSG sends events on the changes feed that don't have documents,
      // this hack makes a whole lot of existing code robust.
      change.doc = {};
    }

    var filterReturn = hasFilter && tryFilter(opts.filter, change.doc, req);

    if (typeof filterReturn === 'object') {
      return filterReturn;
    }

    if (filterReturn) {
      return false;
    }

    if (!opts.include_docs) {
      delete change.doc;
    } else if (!opts.attachments) {
      for (var att in change.doc._attachments) {
        /* istanbul ignore else */
        if (change.doc._attachments.hasOwnProperty(att)) {
          change.doc._attachments[att].stub = true;
        }
      }
    }
    return true;
  };
}

function flatten(arrs) {
  var res = [];
  for (var i = 0, len = arrs.length; i < len; i++) {
    res = res.concat(arrs[i]);
  }
  return res;
}

// shim for Function.prototype.name,

// Determine id an ID is valid
//   - invalid IDs begin with an underescore that does not begin '_design' or
//     '_local'
//   - any other string value is a valid id
// Returns the specific error object for each case
function invalidIdError(id) {
  var err;
  if (!id) {
    err = createError(MISSING_ID);
  } else if (typeof id !== 'string') {
    err = createError(INVALID_ID);
  } else if (/^_/.test(id) && !(/^_(design|local)/).test(id)) {
    err = createError(RESERVED_ID);
  }
  if (err) {
    throw err;
  }
}

// Checks if a PouchDB object is "remote" or not. This is

function isRemote(db) {
  if (typeof db._remote === 'boolean') {
    return db._remote;
  }
  /* istanbul ignore next */
  if (typeof db.type === 'function') {
    guardedConsole('warn',
      'db.type() is deprecated and will be removed in ' +
      'a future version of PouchDB');
    return db.type() === 'http';
  }
  /* istanbul ignore next */
  return false;
}

function listenerCount(ee, type) {
  return 'listenerCount' in ee ? ee.listenerCount(type) :
                                 events.EventEmitter.listenerCount(ee, type);
}

function parseDesignDocFunctionName(s) {
  if (!s) {
    return null;
  }
  var parts = s.split('/');
  if (parts.length === 2) {
    return parts;
  }
  if (parts.length === 1) {
    return [s, s];
  }
  return null;
}

function normalizeDesignDocFunctionName(s) {
  var normalized = parseDesignDocFunctionName(s);
  return normalized ? normalized.join('/') : null;
}

// originally parseUri 1.2.2, now patched by us
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
var keys = ["source", "protocol", "authority", "userInfo", "user", "password",
    "host", "port", "relative", "path", "directory", "file", "query", "anchor"];
var qName ="queryKey";
var qParser = /(?:^|&)([^&=]*)=?([^&]*)/g;

// use the "loose" parser
/* eslint maxlen: 0, no-useless-escape: 0 */
var parser = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

function parseUri(str) {
  var m = parser.exec(str);
  var uri = {};
  var i = 14;

  while (i--) {
    var key = keys[i];
    var value = m[i] || "";
    var encoded = ['user', 'password'].indexOf(key) !== -1;
    uri[key] = encoded ? decodeURIComponent(value) : value;
  }

  uri[qName] = {};
  uri[keys[12]].replace(qParser, function ($0, $1, $2) {
    if ($1) {
      uri[qName][$1] = $2;
    }
  });

  return uri;
}

// Based on https://github.com/alexdavid/scope-eval v0.0.3
// (source: https://unpkg.com/scope-eval@0.0.3/scope_eval.js)
// This is basically just a wrapper around new Function()

function scopeEval(source, scope) {
  var keys = [];
  var values = [];
  for (var key in scope) {
    if (scope.hasOwnProperty(key)) {
      keys.push(key);
      values.push(scope[key]);
    }
  }
  keys.push(source);
  return Function.apply(null, keys).apply(null, values);
}

// this is essentially the "update sugar" function from daleharvey/pouchdb#1388
// the diffFun tells us what delta to apply to the doc.  it either returns
// the doc, or false if it doesn't need to do an update after all
function upsert(db, docId, diffFun) {
  return new Promise(function (fulfill, reject) {
    db.get(docId, function (err, doc) {
      if (err) {
        /* istanbul ignore next */
        if (err.status !== 404) {
          return reject(err);
        }
        doc = {};
      }

      // the user might change the _rev, so save it for posterity
      var docRev = doc._rev;
      var newDoc = diffFun(doc);

      if (!newDoc) {
        // if the diffFun returns falsy, we short-circuit as
        // an optimization
        return fulfill({updated: false, rev: docRev});
      }

      // users aren't allowed to modify these values,
      // so reset them here
      newDoc._id = docId;
      newDoc._rev = docRev;
      fulfill(tryAndPut(db, newDoc, diffFun));
    });
  });
}

function tryAndPut(db, doc, diffFun) {
  return db.put(doc).then(function (res) {
    return {
      updated: true,
      rev: res.rev
    };
  }, function (err) {
    /* istanbul ignore next */
    if (err.status !== 409) {
      throw err;
    }
    return upsert(db, doc._id, diffFun);
  });
}

var thisAtob = function (str) {
  return atob(str);
};

var thisBtoa = function (str) {
  return btoa(str);
};

// Abstracts constructing a Blob object, so it also works in older
// browsers that don't support the native Blob constructor (e.g.
// old QtWebKit versions, Android < 4.4).
function createBlob(parts, properties) {
  /* global BlobBuilder,MSBlobBuilder,MozBlobBuilder,WebKitBlobBuilder */
  parts = parts || [];
  properties = properties || {};
  try {
    return new Blob(parts, properties);
  } catch (e) {
    if (e.name !== "TypeError") {
      throw e;
    }
    var Builder = typeof BlobBuilder !== 'undefined' ? BlobBuilder :
                  typeof MSBlobBuilder !== 'undefined' ? MSBlobBuilder :
                  typeof MozBlobBuilder !== 'undefined' ? MozBlobBuilder :
                  WebKitBlobBuilder;
    var builder = new Builder();
    for (var i = 0; i < parts.length; i += 1) {
      builder.append(parts[i]);
    }
    return builder.getBlob(properties.type);
  }
}

// From http://stackoverflow.com/questions/14967647/ (continues on next line)
// encode-decode-image-with-base64-breaks-image (2013-04-21)
function binaryStringToArrayBuffer(bin) {
  var length = bin.length;
  var buf = new ArrayBuffer(length);
  var arr = new Uint8Array(buf);
  for (var i = 0; i < length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return buf;
}

function binStringToBluffer(binString, type) {
  return createBlob([binaryStringToArrayBuffer(binString)], {type: type});
}

function b64ToBluffer(b64, type) {
  return binStringToBluffer(thisAtob(b64), type);
}

//Can't find original post, but this is close
//http://stackoverflow.com/questions/6965107/ (continues on next line)
//converting-between-strings-and-arraybuffers
function arrayBufferToBinaryString(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var length = bytes.byteLength;
  for (var i = 0; i < length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

// shim for browsers that don't support it
function readAsBinaryString(blob, callback) {
  var reader = new FileReader();
  var hasBinaryString = typeof reader.readAsBinaryString === 'function';
  reader.onloadend = function (e) {
    var result = e.target.result || '';
    if (hasBinaryString) {
      return callback(result);
    }
    callback(arrayBufferToBinaryString(result));
  };
  if (hasBinaryString) {
    reader.readAsBinaryString(blob);
  } else {
    reader.readAsArrayBuffer(blob);
  }
}

function blobToBinaryString(blobOrBuffer, callback) {
  readAsBinaryString(blobOrBuffer, function (bin) {
    callback(bin);
  });
}

function blobToBase64(blobOrBuffer, callback) {
  blobToBinaryString(blobOrBuffer, function (base64) {
    callback(thisBtoa(base64));
  });
}

// simplified API. universal browser support is assumed
function readAsArrayBuffer(blob, callback) {
  var reader = new FileReader();
  reader.onloadend = function (e) {
    var result = e.target.result || new ArrayBuffer(0);
    callback(result);
  };
  reader.readAsArrayBuffer(blob);
}

// this is not used in the browser

var setImmediateShim = global.setImmediate || global.setTimeout;
var MD5_CHUNK_SIZE = 32768;

function rawToBase64(raw) {
  return thisBtoa(raw);
}

function sliceBlob(blob, start, end) {
  if (blob.webkitSlice) {
    return blob.webkitSlice(start, end);
  }
  return blob.slice(start, end);
}

function appendBlob(buffer, blob, start, end, callback) {
  if (start > 0 || end < blob.size) {
    // only slice blob if we really need to
    blob = sliceBlob(blob, start, end);
  }
  readAsArrayBuffer(blob, function (arrayBuffer) {
    buffer.append(arrayBuffer);
    callback();
  });
}

function appendString(buffer, string, start, end, callback) {
  if (start > 0 || end < string.length) {
    // only create a substring if we really need to
    string = string.substring(start, end);
  }
  buffer.appendBinary(string);
  callback();
}

function binaryMd5(data, callback) {
  var inputIsString = typeof data === 'string';
  var len = inputIsString ? data.length : data.size;
  var chunkSize = Math.min(MD5_CHUNK_SIZE, len);
  var chunks = Math.ceil(len / chunkSize);
  var currentChunk = 0;
  var buffer = inputIsString ? new Md5() : new Md5.ArrayBuffer();

  var append = inputIsString ? appendString : appendBlob;

  function next() {
    setImmediateShim(loadNextChunk);
  }

  function done() {
    var raw = buffer.end(true);
    var base64 = rawToBase64(raw);
    callback(base64);
    buffer.destroy();
  }

  function loadNextChunk() {
    var start = currentChunk * chunkSize;
    var end = start + chunkSize;
    currentChunk++;
    if (currentChunk < chunks) {
      append(buffer, data, start, end, next);
    } else {
      append(buffer, data, start, end, done);
    }
  }
  loadNextChunk();
}

function stringMd5(string) {
  return Md5.hash(string);
}

function rev$$1(doc, deterministic_revs) {
  var clonedDoc = clone(doc);
  if (!deterministic_revs) {
    return uuidV4.v4().replace(/-/g, '').toLowerCase();
  }

  delete clonedDoc._rev_tree;
  return stringMd5(JSON.stringify(clonedDoc));
}

var uuid = uuidV4.v4;

// We fetch all leafs of the revision tree, and sort them based on tree length
// and whether they were deleted, undeleted documents with the longest revision
// tree (most edits) win
// The final sort algorithm is slightly documented in a sidebar here:
// http://guide.couchdb.org/draft/conflicts.html
function winningRev(metadata) {
  var winningId;
  var winningPos;
  var winningDeleted;
  var toVisit = metadata.rev_tree.slice();
  var node;
  while ((node = toVisit.pop())) {
    var tree = node.ids;
    var branches = tree[2];
    var pos = node.pos;
    if (branches.length) { // non-leaf
      for (var i = 0, len = branches.length; i < len; i++) {
        toVisit.push({pos: pos + 1, ids: branches[i]});
      }
      continue;
    }
    var deleted = !!tree[1].deleted;
    var id = tree[0];
    // sort by deleted, then pos, then id
    if (!winningId || (winningDeleted !== deleted ? winningDeleted :
        winningPos !== pos ? winningPos < pos : winningId < id)) {
      winningId = id;
      winningPos = pos;
      winningDeleted = deleted;
    }
  }

  return winningPos + '-' + winningId;
}

// Pretty much all below can be combined into a higher order function to
// traverse revisions
// The return value from the callback will be passed as context to all
// children of that node
function traverseRevTree(revs, callback) {
  var toVisit = revs.slice();

  var node;
  while ((node = toVisit.pop())) {
    var pos = node.pos;
    var tree = node.ids;
    var branches = tree[2];
    var newCtx =
      callback(branches.length === 0, pos, tree[0], node.ctx, tree[1]);
    for (var i = 0, len = branches.length; i < len; i++) {
      toVisit.push({pos: pos + 1, ids: branches[i], ctx: newCtx});
    }
  }
}

function sortByPos(a, b) {
  return a.pos - b.pos;
}

function collectLeaves(revs) {
  var leaves = [];
  traverseRevTree(revs, function (isLeaf, pos, id, acc, opts) {
    if (isLeaf) {
      leaves.push({rev: pos + "-" + id, pos: pos, opts: opts});
    }
  });
  leaves.sort(sortByPos).reverse();
  for (var i = 0, len = leaves.length; i < len; i++) {
    delete leaves[i].pos;
  }
  return leaves;
}

// returns revs of all conflicts that is leaves such that
// 1. are not deleted and
// 2. are different than winning revision
function collectConflicts(metadata) {
  var win = winningRev(metadata);
  var leaves = collectLeaves(metadata.rev_tree);
  var conflicts = [];
  for (var i = 0, len = leaves.length; i < len; i++) {
    var leaf = leaves[i];
    if (leaf.rev !== win && !leaf.opts.deleted) {
      conflicts.push(leaf.rev);
    }
  }
  return conflicts;
}

// compact a tree by marking its non-leafs as missing,
// and return a list of revs to delete
function compactTree(metadata) {
  var revs = [];
  traverseRevTree(metadata.rev_tree, function (isLeaf, pos,
                                               revHash, ctx, opts) {
    if (opts.status === 'available' && !isLeaf) {
      revs.push(pos + '-' + revHash);
      opts.status = 'missing';
    }
  });
  return revs;
}

// build up a list of all the paths to the leafs in this revision tree
function rootToLeaf(revs) {
  var paths = [];
  var toVisit = revs.slice();
  var node;
  while ((node = toVisit.pop())) {
    var pos = node.pos;
    var tree = node.ids;
    var id = tree[0];
    var opts = tree[1];
    var branches = tree[2];
    var isLeaf = branches.length === 0;

    var history = node.history ? node.history.slice() : [];
    history.push({id: id, opts: opts});
    if (isLeaf) {
      paths.push({pos: (pos + 1 - history.length), ids: history});
    }
    for (var i = 0, len = branches.length; i < len; i++) {
      toVisit.push({pos: pos + 1, ids: branches[i], history: history});
    }
  }
  return paths.reverse();
}

// for a better overview of what this is doing, read:

function sortByPos$1(a, b) {
  return a.pos - b.pos;
}

// classic binary search
function binarySearch(arr, item, comparator) {
  var low = 0;
  var high = arr.length;
  var mid;
  while (low < high) {
    mid = (low + high) >>> 1;
    if (comparator(arr[mid], item) < 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

// assuming the arr is sorted, insert the item in the proper place
function insertSorted(arr, item, comparator) {
  var idx = binarySearch(arr, item, comparator);
  arr.splice(idx, 0, item);
}

// Turn a path as a flat array into a tree with a single branch.
// If any should be stemmed from the beginning of the array, that's passed
// in as the second argument
function pathToTree(path, numStemmed) {
  var root;
  var leaf;
  for (var i = numStemmed, len = path.length; i < len; i++) {
    var node = path[i];
    var currentLeaf = [node.id, node.opts, []];
    if (leaf) {
      leaf[2].push(currentLeaf);
      leaf = currentLeaf;
    } else {
      root = leaf = currentLeaf;
    }
  }
  return root;
}

// compare the IDs of two trees
function compareTree(a, b) {
  return a[0] < b[0] ? -1 : 1;
}

// Merge two trees together
// The roots of tree1 and tree2 must be the same revision
function mergeTree(in_tree1, in_tree2) {
  var queue = [{tree1: in_tree1, tree2: in_tree2}];
  var conflicts = false;
  while (queue.length > 0) {
    var item = queue.pop();
    var tree1 = item.tree1;
    var tree2 = item.tree2;

    if (tree1[1].status || tree2[1].status) {
      tree1[1].status =
        (tree1[1].status ===  'available' ||
        tree2[1].status === 'available') ? 'available' : 'missing';
    }

    for (var i = 0; i < tree2[2].length; i++) {
      if (!tree1[2][0]) {
        conflicts = 'new_leaf';
        tree1[2][0] = tree2[2][i];
        continue;
      }

      var merged = false;
      for (var j = 0; j < tree1[2].length; j++) {
        if (tree1[2][j][0] === tree2[2][i][0]) {
          queue.push({tree1: tree1[2][j], tree2: tree2[2][i]});
          merged = true;
        }
      }
      if (!merged) {
        conflicts = 'new_branch';
        insertSorted(tree1[2], tree2[2][i], compareTree);
      }
    }
  }
  return {conflicts: conflicts, tree: in_tree1};
}

function doMerge(tree, path, dontExpand) {
  var restree = [];
  var conflicts = false;
  var merged = false;
  var res;

  if (!tree.length) {
    return {tree: [path], conflicts: 'new_leaf'};
  }

  for (var i = 0, len = tree.length; i < len; i++) {
    var branch = tree[i];
    if (branch.pos === path.pos && branch.ids[0] === path.ids[0]) {
      // Paths start at the same position and have the same root, so they need
      // merged
      res = mergeTree(branch.ids, path.ids);
      restree.push({pos: branch.pos, ids: res.tree});
      conflicts = conflicts || res.conflicts;
      merged = true;
    } else if (dontExpand !== true) {
      // The paths start at a different position, take the earliest path and
      // traverse up until it as at the same point from root as the path we
      // want to merge.  If the keys match we return the longer path with the
      // other merged After stemming we dont want to expand the trees

      var t1 = branch.pos < path.pos ? branch : path;
      var t2 = branch.pos < path.pos ? path : branch;
      var diff = t2.pos - t1.pos;

      var candidateParents = [];

      var trees = [];
      trees.push({ids: t1.ids, diff: diff, parent: null, parentIdx: null});
      while (trees.length > 0) {
        var item = trees.pop();
        if (item.diff === 0) {
          if (item.ids[0] === t2.ids[0]) {
            candidateParents.push(item);
          }
          continue;
        }
        var elements = item.ids[2];
        for (var j = 0, elementsLen = elements.length; j < elementsLen; j++) {
          trees.push({
            ids: elements[j],
            diff: item.diff - 1,
            parent: item.ids,
            parentIdx: j
          });
        }
      }

      var el = candidateParents[0];

      if (!el) {
        restree.push(branch);
      } else {
        res = mergeTree(el.ids, t2.ids);
        el.parent[2][el.parentIdx] = res.tree;
        restree.push({pos: t1.pos, ids: t1.ids});
        conflicts = conflicts || res.conflicts;
        merged = true;
      }
    } else {
      restree.push(branch);
    }
  }

  // We didnt find
  if (!merged) {
    restree.push(path);
  }

  restree.sort(sortByPos$1);

  return {
    tree: restree,
    conflicts: conflicts || 'internal_node'
  };
}

// To ensure we dont grow the revision tree infinitely, we stem old revisions
function stem(tree, depth) {
  // First we break out the tree into a complete list of root to leaf paths
  var paths = rootToLeaf(tree);
  var stemmedRevs;

  var result;
  for (var i = 0, len = paths.length; i < len; i++) {
    // Then for each path, we cut off the start of the path based on the
    // `depth` to stem to, and generate a new set of flat trees
    var path = paths[i];
    var stemmed = path.ids;
    var node;
    if (stemmed.length > depth) {
      // only do the stemming work if we actually need to stem
      if (!stemmedRevs) {
        stemmedRevs = {}; // avoid allocating this object unnecessarily
      }
      var numStemmed = stemmed.length - depth;
      node = {
        pos: path.pos + numStemmed,
        ids: pathToTree(stemmed, numStemmed)
      };

      for (var s = 0; s < numStemmed; s++) {
        var rev = (path.pos + s) + '-' + stemmed[s].id;
        stemmedRevs[rev] = true;
      }
    } else { // no need to actually stem
      node = {
        pos: path.pos,
        ids: pathToTree(stemmed, 0)
      };
    }

    // Then we remerge all those flat trees together, ensuring that we dont
    // connect trees that would go beyond the depth limit
    if (result) {
      result = doMerge(result, node, true).tree;
    } else {
      result = [node];
    }
  }

  // this is memory-heavy per Chrome profiler, avoid unless we actually stemmed
  if (stemmedRevs) {
    traverseRevTree(result, function (isLeaf, pos, revHash) {
      // some revisions may have been removed in a branch but not in another
      delete stemmedRevs[pos + '-' + revHash];
    });
  }

  return {
    tree: result,
    revs: stemmedRevs ? Object.keys(stemmedRevs) : []
  };
}

function merge(tree, path, depth) {
  var newTree = doMerge(tree, path);
  var stemmed = stem(newTree.tree, depth);
  return {
    tree: stemmed.tree,
    stemmedRevs: stemmed.revs,
    conflicts: newTree.conflicts
  };
}

// return true if a rev exists in the rev tree, false otherwise
function revExists(revs, rev) {
  var toVisit = revs.slice();
  var splitRev = rev.split('-');
  var targetPos = parseInt(splitRev[0], 10);
  var targetId = splitRev[1];

  var node;
  while ((node = toVisit.pop())) {
    if (node.pos === targetPos && node.ids[0] === targetId) {
      return true;
    }
    var branches = node.ids[2];
    for (var i = 0, len = branches.length; i < len; i++) {
      toVisit.push({pos: node.pos + 1, ids: branches[i]});
    }
  }
  return false;
}

function getTrees(node) {
  return node.ids;
}

// check if a specific revision of a doc has been deleted
//  - metadata: the metadata object from the doc store
//  - rev: (optional) the revision to check. defaults to winning revision
function isDeleted(metadata, rev) {
  if (!rev) {
    rev = winningRev(metadata);
  }
  var id = rev.substring(rev.indexOf('-') + 1);
  var toVisit = metadata.rev_tree.map(getTrees);

  var tree;
  while ((tree = toVisit.pop())) {
    if (tree[0] === id) {
      return !!tree[1].deleted;
    }
    toVisit = toVisit.concat(tree[2]);
  }
}

function isLocalId(id) {
  return (/^_local/).test(id);
}

// returns the current leaf node for a given revision
function latest(rev, metadata) {
  var toVisit = metadata.rev_tree.slice();
  var node;
  while ((node = toVisit.pop())) {
    var pos = node.pos;
    var tree = node.ids;
    var id = tree[0];
    var opts = tree[1];
    var branches = tree[2];
    var isLeaf = branches.length === 0;

    var history = node.history ? node.history.slice() : [];
    history.push({id: id, pos: pos, opts: opts});

    if (isLeaf) {
      for (var i = 0, len = history.length; i < len; i++) {
        var historyNode = history[i];
        var historyRev = historyNode.pos + '-' + historyNode.id;

        if (historyRev === rev) {
          // return the rev of this leaf
          return pos + '-' + id;
        }
      }
    }

    for (var j = 0, l = branches.length; j < l; j++) {
      toVisit.push({pos: pos + 1, ids: branches[j], history: history});
    }
  }

  /* istanbul ignore next */
  throw new Error('Unable to resolve latest revision for id ' + metadata.id + ', rev ' + rev);
}

inherits(Changes$1, events.EventEmitter);

function tryCatchInChangeListener(self, change, pending, lastSeq) {
  // isolate try/catches to avoid V8 deoptimizations
  try {
    self.emit('change', change, pending, lastSeq);
  } catch (e) {
    guardedConsole('error', 'Error in .on("change", function):', e);
  }
}

function Changes$1(db, opts, callback) {
  events.EventEmitter.call(this);
  var self = this;
  this.db = db;
  opts = opts ? clone(opts) : {};
  var complete = opts.complete = once(function (err, resp) {
    if (err) {
      if (listenerCount(self, 'error') > 0) {
        self.emit('error', err);
      }
    } else {
      self.emit('complete', resp);
    }
    self.removeAllListeners();
    db.removeListener('destroyed', onDestroy);
  });
  if (callback) {
    self.on('complete', function (resp) {
      callback(null, resp);
    });
    self.on('error', callback);
  }
  function onDestroy() {
    self.cancel();
  }
  db.once('destroyed', onDestroy);

  opts.onChange = function (change, pending, lastSeq) {
    /* istanbul ignore if */
    if (self.isCancelled) {
      return;
    }
    tryCatchInChangeListener(self, change, pending, lastSeq);
  };

  var promise = new Promise(function (fulfill, reject) {
    opts.complete = function (err, res) {
      if (err) {
        reject(err);
      } else {
        fulfill(res);
      }
    };
  });
  self.once('cancel', function () {
    db.removeListener('destroyed', onDestroy);
    opts.complete(null, {status: 'cancelled'});
  });
  this.then = promise.then.bind(promise);
  this['catch'] = promise['catch'].bind(promise);
  this.then(function (result) {
    complete(null, result);
  }, complete);



  if (!db.taskqueue.isReady) {
    db.taskqueue.addTask(function (failed) {
      if (failed) {
        opts.complete(failed);
      } else if (self.isCancelled) {
        self.emit('cancel');
      } else {
        self.validateChanges(opts);
      }
    });
  } else {
    self.validateChanges(opts);
  }
}
Changes$1.prototype.cancel = function () {
  this.isCancelled = true;
  if (this.db.taskqueue.isReady) {
    this.emit('cancel');
  }
};
function processChange(doc, metadata, opts) {
  var changeList = [{rev: doc._rev}];
  if (opts.style === 'all_docs') {
    changeList = collectLeaves(metadata.rev_tree)
    .map(function (x) { return {rev: x.rev}; });
  }
  var change = {
    id: metadata.id,
    changes: changeList,
    doc: doc
  };

  if (isDeleted(metadata, doc._rev)) {
    change.deleted = true;
  }
  if (opts.conflicts) {
    change.doc._conflicts = collectConflicts(metadata);
    if (!change.doc._conflicts.length) {
      delete change.doc._conflicts;
    }
  }
  return change;
}

Changes$1.prototype.validateChanges = function (opts) {
  var callback = opts.complete;
  var self = this;

  /* istanbul ignore else */
  if (PouchDB._changesFilterPlugin) {
    PouchDB._changesFilterPlugin.validate(opts, function (err) {
      if (err) {
        return callback(err);
      }
      self.doChanges(opts);
    });
  } else {
    self.doChanges(opts);
  }
};

Changes$1.prototype.doChanges = function (opts) {
  var self = this;
  var callback = opts.complete;

  opts = clone(opts);
  if ('live' in opts && !('continuous' in opts)) {
    opts.continuous = opts.live;
  }
  opts.processChange = processChange;

  if (opts.since === 'latest') {
    opts.since = 'now';
  }
  if (!opts.since) {
    opts.since = 0;
  }
  if (opts.since === 'now') {
    this.db.info().then(function (info) {
      /* istanbul ignore if */
      if (self.isCancelled) {
        callback(null, {status: 'cancelled'});
        return;
      }
      opts.since = info.update_seq;
      self.doChanges(opts);
    }, callback);
    return;
  }

  /* istanbul ignore else */
  if (PouchDB._changesFilterPlugin) {
    PouchDB._changesFilterPlugin.normalize(opts);
    if (PouchDB._changesFilterPlugin.shouldFilter(this, opts)) {
      return PouchDB._changesFilterPlugin.filter(this, opts);
    }
  } else {
    ['doc_ids', 'filter', 'selector', 'view'].forEach(function (key) {
      if (key in opts) {
        guardedConsole('warn',
          'The "' + key + '" option was passed in to changes/replicate, ' +
          'but pouchdb-changes-filter plugin is not installed, so it ' +
          'was ignored. Please install the plugin to enable filtering.'
        );
      }
    });
  }

  if (!('descending' in opts)) {
    opts.descending = false;
  }

  // 0 and 1 should return 1 document
  opts.limit = opts.limit === 0 ? 1 : opts.limit;
  opts.complete = callback;
  var newPromise = this.db._changes(opts);
  /* istanbul ignore else */
  if (newPromise && typeof newPromise.cancel === 'function') {
    var cancel = self.cancel;
    self.cancel = getArguments(function (args) {
      newPromise.cancel();
      cancel.apply(this, args);
    });
  }
};

/*
 * A generic pouch adapter
 */

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

// Wrapper for functions that call the bulkdocs api with a single doc,
// if the first result is an error, return an error
function yankError(callback, docId) {
  return function (err, results) {
    if (err || (results[0] && results[0].error)) {
      err = err || results[0];
      err.docId = docId;
      callback(err);
    } else {
      callback(null, results.length ? results[0]  : results);
    }
  };
}

// clean docs given to us by the user
function cleanDocs(docs) {
  for (var i = 0; i < docs.length; i++) {
    var doc = docs[i];
    if (doc._deleted) {
      delete doc._attachments; // ignore atts for deleted docs
    } else if (doc._attachments) {
      // filter out extraneous keys from _attachments
      var atts = Object.keys(doc._attachments);
      for (var j = 0; j < atts.length; j++) {
        var att = atts[j];
        doc._attachments[att] = pick(doc._attachments[att],
          ['data', 'digest', 'content_type', 'length', 'revpos', 'stub']);
      }
    }
  }
}

// compare two docs, first by _id then by _rev
function compareByIdThenRev(a, b) {
  var idCompare = compare(a._id, b._id);
  if (idCompare !== 0) {
    return idCompare;
  }
  var aStart = a._revisions ? a._revisions.start : 0;
  var bStart = b._revisions ? b._revisions.start : 0;
  return compare(aStart, bStart);
}

// for every node in a revision tree computes its distance from the closest
// leaf
function computeHeight(revs) {
  var height = {};
  var edges = [];
  traverseRevTree(revs, function (isLeaf, pos, id, prnt) {
    var rev = pos + "-" + id;
    if (isLeaf) {
      height[rev] = 0;
    }
    if (prnt !== undefined) {
      edges.push({from: prnt, to: rev});
    }
    return rev;
  });

  edges.reverse();
  edges.forEach(function (edge) {
    if (height[edge.from] === undefined) {
      height[edge.from] = 1 + height[edge.to];
    } else {
      height[edge.from] = Math.min(height[edge.from], 1 + height[edge.to]);
    }
  });
  return height;
}

function allDocsKeysParse(opts) {
  var keys =  ('limit' in opts) ?
    opts.keys.slice(opts.skip, opts.limit + opts.skip) :
    (opts.skip > 0) ? opts.keys.slice(opts.skip) : opts.keys;
  opts.keys = keys;
  opts.skip = 0;
  delete opts.limit;
  if (opts.descending) {
    keys.reverse();
    opts.descending = false;
  }
}

// all compaction is done in a queue, to avoid attaching
// too many listeners at once
function doNextCompaction(self) {
  var task = self._compactionQueue[0];
  var opts = task.opts;
  var callback = task.callback;
  self.get('_local/compaction').catch(function () {
    return false;
  }).then(function (doc) {
    if (doc && doc.last_seq) {
      opts.last_seq = doc.last_seq;
    }
    self._compact(opts, function (err, res) {
      /* istanbul ignore if */
      if (err) {
        callback(err);
      } else {
        callback(null, res);
      }
      nextTick(function () {
        self._compactionQueue.shift();
        if (self._compactionQueue.length) {
          doNextCompaction(self);
        }
      });
    });
  });
}

function attachmentNameError(name) {
  if (name.charAt(0) === '_') {
    return name + ' is not a valid attachment name, attachment ' +
      'names cannot start with \'_\'';
  }
  return false;
}

inherits(AbstractPouchDB, events.EventEmitter);

function AbstractPouchDB() {
  events.EventEmitter.call(this);

  // re-bind prototyped methods
  for (var p in AbstractPouchDB.prototype) {
    if (typeof this[p] === 'function') {
      this[p] = this[p].bind(this);
    }
  }
}

AbstractPouchDB.prototype.post =
  adapterFun('post', function (doc, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  if (typeof doc !== 'object' || Array.isArray(doc)) {
    return callback(createError(NOT_AN_OBJECT));
  }
  this.bulkDocs({docs: [doc]}, opts, yankError(callback, doc._id));
});

AbstractPouchDB.prototype.put = adapterFun('put', function (doc, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  if (typeof doc !== 'object' || Array.isArray(doc)) {
    return cb(createError(NOT_AN_OBJECT));
  }
  invalidIdError(doc._id);
  if (isLocalId(doc._id) && typeof this._putLocal === 'function') {
    if (doc._deleted) {
      return this._removeLocal(doc, cb);
    } else {
      return this._putLocal(doc, cb);
    }
  }
  var self = this;
  if (opts.force && doc._rev) {
    transformForceOptionToNewEditsOption();
    putDoc(function (err) {
      var result = err ? null : {ok: true, id: doc._id, rev: doc._rev};
      cb(err, result);
    });
  } else {
    putDoc(cb);
  }

  function transformForceOptionToNewEditsOption() {
    var parts = doc._rev.split('-');
    var oldRevId = parts[1];
    var oldRevNum = parseInt(parts[0], 10);

    var newRevNum = oldRevNum + 1;
    var newRevId = rev$$1();

    doc._revisions = {
      start: newRevNum,
      ids: [newRevId, oldRevId]
    };
    doc._rev = newRevNum + '-' + newRevId;
    opts.new_edits = false;
  }
  function putDoc(next) {
    if (typeof self._put === 'function' && opts.new_edits !== false) {
      self._put(doc, opts, next);
    } else {
      self.bulkDocs({docs: [doc]}, opts, yankError(next, doc._id));
    }
  }
});

AbstractPouchDB.prototype.putAttachment =
  adapterFun('putAttachment', function (docId, attachmentId, rev,
                                              blob, type) {
  var api = this;
  if (typeof type === 'function') {
    type = blob;
    blob = rev;
    rev = null;
  }
  // Lets fix in https://github.com/pouchdb/pouchdb/issues/3267
  /* istanbul ignore if */
  if (typeof type === 'undefined') {
    type = blob;
    blob = rev;
    rev = null;
  }
  if (!type) {
    guardedConsole('warn', 'Attachment', attachmentId, 'on document', docId, 'is missing content_type');
  }

  function createAttachment(doc) {
    var prevrevpos = '_rev' in doc ? parseInt(doc._rev, 10) : 0;
    doc._attachments = doc._attachments || {};
    doc._attachments[attachmentId] = {
      content_type: type,
      data: blob,
      revpos: ++prevrevpos
    };
    return api.put(doc);
  }

  return api.get(docId).then(function (doc) {
    if (doc._rev !== rev) {
      throw createError(REV_CONFLICT);
    }

    return createAttachment(doc);
  }, function (err) {
     // create new doc
    /* istanbul ignore else */
    if (err.reason === MISSING_DOC.message) {
      return createAttachment({_id: docId});
    } else {
      throw err;
    }
  });
});

AbstractPouchDB.prototype.removeAttachment =
  adapterFun('removeAttachment', function (docId, attachmentId, rev,
                                                 callback) {
  var self = this;
  self.get(docId, function (err, obj) {
    /* istanbul ignore if */
    if (err) {
      callback(err);
      return;
    }
    if (obj._rev !== rev) {
      callback(createError(REV_CONFLICT));
      return;
    }
    /* istanbul ignore if */
    if (!obj._attachments) {
      return callback();
    }
    delete obj._attachments[attachmentId];
    if (Object.keys(obj._attachments).length === 0) {
      delete obj._attachments;
    }
    self.put(obj, callback);
  });
});

AbstractPouchDB.prototype.remove =
  adapterFun('remove', function (docOrId, optsOrRev, opts, callback) {
  var doc;
  if (typeof optsOrRev === 'string') {
    // id, rev, opts, callback style
    doc = {
      _id: docOrId,
      _rev: optsOrRev
    };
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
  } else {
    // doc, opts, callback style
    doc = docOrId;
    if (typeof optsOrRev === 'function') {
      callback = optsOrRev;
      opts = {};
    } else {
      callback = opts;
      opts = optsOrRev;
    }
  }
  opts = opts || {};
  opts.was_delete = true;
  var newDoc = {_id: doc._id, _rev: (doc._rev || opts.rev)};
  newDoc._deleted = true;
  if (isLocalId(newDoc._id) && typeof this._removeLocal === 'function') {
    return this._removeLocal(doc, callback);
  }
  this.bulkDocs({docs: [newDoc]}, opts, yankError(callback, newDoc._id));
});

AbstractPouchDB.prototype.revsDiff =
  adapterFun('revsDiff', function (req, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  var ids = Object.keys(req);

  if (!ids.length) {
    return callback(null, {});
  }

  var count = 0;
  var missing = new ExportedMap();

  function addToMissing(id, revId) {
    if (!missing.has(id)) {
      missing.set(id, {missing: []});
    }
    missing.get(id).missing.push(revId);
  }

  function processDoc(id, rev_tree) {
    // Is this fast enough? Maybe we should switch to a set simulated by a map
    var missingForId = req[id].slice(0);
    traverseRevTree(rev_tree, function (isLeaf, pos, revHash, ctx,
      opts) {
        var rev = pos + '-' + revHash;
        var idx = missingForId.indexOf(rev);
        if (idx === -1) {
          return;
        }

        missingForId.splice(idx, 1);
        /* istanbul ignore if */
        if (opts.status !== 'available') {
          addToMissing(id, rev);
        }
      });

    // Traversing the tree is synchronous, so now `missingForId` contains
    // revisions that were not found in the tree
    missingForId.forEach(function (rev) {
      addToMissing(id, rev);
    });
  }

  ids.map(function (id) {
    this._getRevisionTree(id, function (err, rev_tree) {
      if (err && err.status === 404 && err.message === 'missing') {
        missing.set(id, {missing: req[id]});
      } else if (err) {
        /* istanbul ignore next */
        return callback(err);
      } else {
        processDoc(id, rev_tree);
      }

      if (++count === ids.length) {
        // convert LazyMap to object
        var missingObj = {};
        missing.forEach(function (value, key) {
          missingObj[key] = value;
        });
        return callback(null, missingObj);
      }
    });
  }, this);
});

// _bulk_get API for faster replication, as described in
// https://github.com/apache/couchdb-chttpd/pull/33
// At the "abstract" level, it will just run multiple get()s in
// parallel, because this isn't much of a performance cost
// for local databases (except the cost of multiple transactions, which is
// small). The http adapter overrides this in order
// to do a more efficient single HTTP request.
AbstractPouchDB.prototype.bulkGet =
  adapterFun('bulkGet', function (opts, callback) {
  bulkGet(this, opts, callback);
});

// compact one document and fire callback
// by compacting we mean removing all revisions which
// are further from the leaf in revision tree than max_height
AbstractPouchDB.prototype.compactDocument =
  adapterFun('compactDocument', function (docId, maxHeight, callback) {
  var self = this;
  this._getRevisionTree(docId, function (err, revTree) {
    /* istanbul ignore if */
    if (err) {
      return callback(err);
    }
    var height = computeHeight(revTree);
    var candidates = [];
    var revs = [];
    Object.keys(height).forEach(function (rev) {
      if (height[rev] > maxHeight) {
        candidates.push(rev);
      }
    });

    traverseRevTree(revTree, function (isLeaf, pos, revHash, ctx, opts) {
      var rev = pos + '-' + revHash;
      if (opts.status === 'available' && candidates.indexOf(rev) !== -1) {
        revs.push(rev);
      }
    });
    self._doCompaction(docId, revs, callback);
  });
});

// compact the whole database using single document
// compaction
AbstractPouchDB.prototype.compact =
  adapterFun('compact', function (opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  var self = this;
  opts = opts || {};

  self._compactionQueue = self._compactionQueue || [];
  self._compactionQueue.push({opts: opts, callback: callback});
  if (self._compactionQueue.length === 1) {
    doNextCompaction(self);
  }
});
AbstractPouchDB.prototype._compact = function (opts, callback) {
  var self = this;
  var changesOpts = {
    return_docs: false,
    last_seq: opts.last_seq || 0
  };
  var promises = [];

  function onChange(row) {
    promises.push(self.compactDocument(row.id, 0));
  }
  function onComplete(resp) {
    var lastSeq = resp.last_seq;
    Promise.all(promises).then(function () {
      return upsert(self, '_local/compaction', function deltaFunc(doc) {
        if (!doc.last_seq || doc.last_seq < lastSeq) {
          doc.last_seq = lastSeq;
          return doc;
        }
        return false; // somebody else got here first, don't update
      });
    }).then(function () {
      callback(null, {ok: true});
    }).catch(callback);
  }
  self.changes(changesOpts)
    .on('change', onChange)
    .on('complete', onComplete)
    .on('error', callback);
};

/* Begin api wrappers. Specific functionality to storage belongs in the
   _[method] */
AbstractPouchDB.prototype.get = adapterFun('get', function (id, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  if (typeof id !== 'string') {
    return cb(createError(INVALID_ID));
  }
  if (isLocalId(id) && typeof this._getLocal === 'function') {
    return this._getLocal(id, cb);
  }
  var leaves = [], self = this;

  function finishOpenRevs() {
    var result = [];
    var count = leaves.length;
    /* istanbul ignore if */
    if (!count) {
      return cb(null, result);
    }

    // order with open_revs is unspecified
    leaves.forEach(function (leaf) {
      self.get(id, {
        rev: leaf,
        revs: opts.revs,
        latest: opts.latest,
        attachments: opts.attachments,
        binary: opts.binary
      }, function (err, doc) {
        if (!err) {
          // using latest=true can produce duplicates
          var existing;
          for (var i = 0, l = result.length; i < l; i++) {
            if (result[i].ok && result[i].ok._rev === doc._rev) {
              existing = true;
              break;
            }
          }
          if (!existing) {
            result.push({ok: doc});
          }
        } else {
          result.push({missing: leaf});
        }
        count--;
        if (!count) {
          cb(null, result);
        }
      });
    });
  }

  if (opts.open_revs) {
    if (opts.open_revs === "all") {
      this._getRevisionTree(id, function (err, rev_tree) {
        /* istanbul ignore if */
        if (err) {
          return cb(err);
        }
        leaves = collectLeaves(rev_tree).map(function (leaf) {
          return leaf.rev;
        });
        finishOpenRevs();
      });
    } else {
      if (Array.isArray(opts.open_revs)) {
        leaves = opts.open_revs;
        for (var i = 0; i < leaves.length; i++) {
          var l = leaves[i];
          // looks like it's the only thing couchdb checks
          if (!(typeof (l) === "string" && /^\d+-/.test(l))) {
            return cb(createError(INVALID_REV));
          }
        }
        finishOpenRevs();
      } else {
        return cb(createError(UNKNOWN_ERROR, 'function_clause'));
      }
    }
    return; // open_revs does not like other options
  }

  return this._get(id, opts, function (err, result) {
    if (err) {
      err.docId = id;
      return cb(err);
    }

    var doc = result.doc;
    var metadata = result.metadata;
    var ctx = result.ctx;

    if (opts.conflicts) {
      var conflicts = collectConflicts(metadata);
      if (conflicts.length) {
        doc._conflicts = conflicts;
      }
    }

    if (isDeleted(metadata, doc._rev)) {
      doc._deleted = true;
    }

    if (opts.revs || opts.revs_info) {
      var splittedRev = doc._rev.split('-');
      var revNo       = parseInt(splittedRev[0], 10);
      var revHash     = splittedRev[1];

      var paths = rootToLeaf(metadata.rev_tree);
      var path = null;

      for (var i = 0; i < paths.length; i++) {
        var currentPath = paths[i];
        var hashIndex = currentPath.ids.map(function (x) { return x.id; })
          .indexOf(revHash);
        var hashFoundAtRevPos = hashIndex === (revNo - 1);

        if (hashFoundAtRevPos || (!path && hashIndex !== -1)) {
          path = currentPath;
        }
      }

      var indexOfRev = path.ids.map(function (x) { return x.id; })
        .indexOf(doc._rev.split('-')[1]) + 1;
      var howMany = path.ids.length - indexOfRev;
      path.ids.splice(indexOfRev, howMany);
      path.ids.reverse();

      if (opts.revs) {
        doc._revisions = {
          start: (path.pos + path.ids.length) - 1,
          ids: path.ids.map(function (rev) {
            return rev.id;
          })
        };
      }
      if (opts.revs_info) {
        var pos =  path.pos + path.ids.length;
        doc._revs_info = path.ids.map(function (rev) {
          pos--;
          return {
            rev: pos + '-' + rev.id,
            status: rev.opts.status
          };
        });
      }
    }

    if (opts.attachments && doc._attachments) {
      var attachments = doc._attachments;
      var count = Object.keys(attachments).length;
      if (count === 0) {
        return cb(null, doc);
      }
      Object.keys(attachments).forEach(function (key) {
        this._getAttachment(doc._id, key, attachments[key], {
          // Previously the revision handling was done in adapter.js
          // getAttachment, however since idb-next doesnt we need to
          // pass the rev through
          rev: doc._rev,
          binary: opts.binary,
          ctx: ctx
        }, function (err, data) {
          var att = doc._attachments[key];
          att.data = data;
          delete att.stub;
          delete att.length;
          if (!--count) {
            cb(null, doc);
          }
        });
      }, self);
    } else {
      if (doc._attachments) {
        for (var key in doc._attachments) {
          /* istanbul ignore else */
          if (doc._attachments.hasOwnProperty(key)) {
            doc._attachments[key].stub = true;
          }
        }
      }
      cb(null, doc);
    }
  });
});

// TODO: I dont like this, it forces an extra read for every
// attachment read and enforces a confusing api between
// adapter.js and the adapter implementation
AbstractPouchDB.prototype.getAttachment =
  adapterFun('getAttachment', function (docId, attachmentId, opts, callback) {
  var self = this;
  if (opts instanceof Function) {
    callback = opts;
    opts = {};
  }
  this._get(docId, opts, function (err, res) {
    if (err) {
      return callback(err);
    }
    if (res.doc._attachments && res.doc._attachments[attachmentId]) {
      opts.ctx = res.ctx;
      opts.binary = true;
      self._getAttachment(docId, attachmentId,
                          res.doc._attachments[attachmentId], opts, callback);
    } else {
      return callback(createError(MISSING_DOC));
    }
  });
});

AbstractPouchDB.prototype.allDocs =
  adapterFun('allDocs', function (opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  opts.skip = typeof opts.skip !== 'undefined' ? opts.skip : 0;
  if (opts.start_key) {
    opts.startkey = opts.start_key;
  }
  if (opts.end_key) {
    opts.endkey = opts.end_key;
  }
  if ('keys' in opts) {
    if (!Array.isArray(opts.keys)) {
      return callback(new TypeError('options.keys must be an array'));
    }
    var incompatibleOpt =
      ['startkey', 'endkey', 'key'].filter(function (incompatibleOpt) {
      return incompatibleOpt in opts;
    })[0];
    if (incompatibleOpt) {
      callback(createError(QUERY_PARSE_ERROR,
        'Query parameter `' + incompatibleOpt +
        '` is not compatible with multi-get'
      ));
      return;
    }
    if (!isRemote(this)) {
      allDocsKeysParse(opts);
      if (opts.keys.length === 0) {
        return this._allDocs({limit: 0}, callback);
      }
    }
  }

  return this._allDocs(opts, callback);
});

AbstractPouchDB.prototype.changes = function (opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  opts = opts || {};

  // By default set return_docs to false if the caller has opts.live = true,
  // this will prevent us from collecting the set of changes indefinitely
  // resulting in growing memory
  opts.return_docs = ('return_docs' in opts) ? opts.return_docs : !opts.live;

  return new Changes$1(this, opts, callback);
};

AbstractPouchDB.prototype.close = adapterFun('close', function (callback) {
  this._closed = true;
  this.emit('closed');
  return this._close(callback);
});

AbstractPouchDB.prototype.info = adapterFun('info', function (callback) {
  var self = this;
  this._info(function (err, info) {
    if (err) {
      return callback(err);
    }
    // assume we know better than the adapter, unless it informs us
    info.db_name = info.db_name || self.name;
    info.auto_compaction = !!(self.auto_compaction && !isRemote(self));
    info.adapter = self.adapter;
    callback(null, info);
  });
});

AbstractPouchDB.prototype.id = adapterFun('id', function (callback) {
  return this._id(callback);
});

/* istanbul ignore next */
AbstractPouchDB.prototype.type = function () {
  return (typeof this._type === 'function') ? this._type() : this.adapter;
};

AbstractPouchDB.prototype.bulkDocs =
  adapterFun('bulkDocs', function (req, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  opts = opts || {};

  if (Array.isArray(req)) {
    req = {
      docs: req
    };
  }

  if (!req || !req.docs || !Array.isArray(req.docs)) {
    return callback(createError(MISSING_BULK_DOCS));
  }

  for (var i = 0; i < req.docs.length; ++i) {
    if (typeof req.docs[i] !== 'object' || Array.isArray(req.docs[i])) {
      return callback(createError(NOT_AN_OBJECT));
    }
  }

  var attachmentError;
  req.docs.forEach(function (doc) {
    if (doc._attachments) {
      Object.keys(doc._attachments).forEach(function (name) {
        attachmentError = attachmentError || attachmentNameError(name);
        if (!doc._attachments[name].content_type) {
          guardedConsole('warn', 'Attachment', name, 'on document', doc._id, 'is missing content_type');
        }
      });
    }
  });

  if (attachmentError) {
    return callback(createError(BAD_REQUEST, attachmentError));
  }

  if (!('new_edits' in opts)) {
    if ('new_edits' in req) {
      opts.new_edits = req.new_edits;
    } else {
      opts.new_edits = true;
    }
  }

  var adapter = this;
  if (!opts.new_edits && !isRemote(adapter)) {
    // ensure revisions of the same doc are sorted, so that
    // the local adapter processes them correctly (#2935)
    req.docs.sort(compareByIdThenRev);
  }

  cleanDocs(req.docs);

  // in the case of conflicts, we want to return the _ids to the user
  // however, the underlying adapter may destroy the docs array, so
  // create a copy here
  var ids = req.docs.map(function (doc) {
    return doc._id;
  });

  return this._bulkDocs(req, opts, function (err, res) {
    if (err) {
      return callback(err);
    }
    if (!opts.new_edits) {
      // this is what couch does when new_edits is false
      res = res.filter(function (x) {
        return x.error;
      });
    }
    // add ids for error/conflict responses (not required for CouchDB)
    if (!isRemote(adapter)) {
      for (var i = 0, l = res.length; i < l; i++) {
        res[i].id = res[i].id || ids[i];
      }
    }

    callback(null, res);
  });
});

AbstractPouchDB.prototype.registerDependentDatabase =
  adapterFun('registerDependentDatabase', function (dependentDb,
                                                          callback) {
  var depDB = new this.constructor(dependentDb, this.__opts);

  function diffFun(doc) {
    doc.dependentDbs = doc.dependentDbs || {};
    if (doc.dependentDbs[dependentDb]) {
      return false; // no update required
    }
    doc.dependentDbs[dependentDb] = true;
    return doc;
  }
  upsert(this, '_local/_pouch_dependentDbs', diffFun)
    .then(function () {
      callback(null, {db: depDB});
    }).catch(callback);
});

AbstractPouchDB.prototype.destroy =
  adapterFun('destroy', function (opts, callback) {

  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  var self = this;
  var usePrefix = 'use_prefix' in self ? self.use_prefix : true;

  function destroyDb() {
    // call destroy method of the particular adaptor
    self._destroy(opts, function (err, resp) {
      if (err) {
        return callback(err);
      }
      self._destroyed = true;
      self.emit('destroyed');
      callback(null, resp || { 'ok': true });
    });
  }

  if (isRemote(self)) {
    // no need to check for dependent DBs if it's a remote DB
    return destroyDb();
  }

  self.get('_local/_pouch_dependentDbs', function (err, localDoc) {
    if (err) {
      /* istanbul ignore if */
      if (err.status !== 404) {
        return callback(err);
      } else { // no dependencies
        return destroyDb();
      }
    }
    var dependentDbs = localDoc.dependentDbs;
    var PouchDB = self.constructor;
    var deletedMap = Object.keys(dependentDbs).map(function (name) {
      // use_prefix is only false in the browser
      /* istanbul ignore next */
      var trueName = usePrefix ?
        name.replace(new RegExp('^' + PouchDB.prefix), '') : name;
      return new PouchDB(trueName, self.__opts).destroy();
    });
    Promise.all(deletedMap).then(destroyDb, callback);
  });
});

function TaskQueue() {
  this.isReady = false;
  this.failed = false;
  this.queue = [];
}

TaskQueue.prototype.execute = function () {
  var fun;
  if (this.failed) {
    while ((fun = this.queue.shift())) {
      fun(this.failed);
    }
  } else {
    while ((fun = this.queue.shift())) {
      fun();
    }
  }
};

TaskQueue.prototype.fail = function (err) {
  this.failed = err;
  this.execute();
};

TaskQueue.prototype.ready = function (db) {
  this.isReady = true;
  this.db = db;
  this.execute();
};

TaskQueue.prototype.addTask = function (fun) {
  this.queue.push(fun);
  if (this.failed) {
    this.execute();
  }
};

function parseAdapter(name, opts) {
  var match = name.match(/([a-z-]*):\/\/(.*)/);
  if (match) {
    // the http adapter expects the fully qualified name
    return {
      name: /https?/.test(match[1]) ? match[1] + '://' + match[2] : match[2],
      adapter: match[1]
    };
  }

  var adapters = PouchDB.adapters;
  var preferredAdapters = PouchDB.preferredAdapters;
  var prefix = PouchDB.prefix;
  var adapterName = opts.adapter;

  if (!adapterName) { // automatically determine adapter
    for (var i = 0; i < preferredAdapters.length; ++i) {
      adapterName = preferredAdapters[i];
      // check for browsers that have been upgraded from websql-only to websql+idb
      /* istanbul ignore if */
      if (adapterName === 'idb' && 'websql' in adapters &&
          hasLocalStorage() && localStorage['_pouch__websqldb_' + prefix + name]) {
        // log it, because this can be confusing during development
        guardedConsole('log', 'PouchDB is downgrading "' + name + '" to WebSQL to' +
          ' avoid data loss, because it was already opened with WebSQL.');
        continue; // keep using websql to avoid user data loss
      }
      break;
    }
  }

  var adapter = adapters[adapterName];

  // if adapter is invalid, then an error will be thrown later
  var usePrefix = (adapter && 'use_prefix' in adapter) ?
    adapter.use_prefix : true;

  return {
    name: usePrefix ? (prefix + name) : name,
    adapter: adapterName
  };
}

// OK, so here's the deal. Consider this code:
//     var db1 = new PouchDB('foo');
//     var db2 = new PouchDB('foo');
//     db1.destroy();
// ^ these two both need to emit 'destroyed' events,
// as well as the PouchDB constructor itself.
// So we have one db object (whichever one got destroy() called on it)
// responsible for emitting the initial event, which then gets emitted
// by the constructor, which then broadcasts it to any other dbs
// that may have been created with the same name.
function prepareForDestruction(self) {

  function onDestroyed(from_constructor) {
    self.removeListener('closed', onClosed);
    if (!from_constructor) {
      self.constructor.emit('destroyed', self.name);
    }
  }

  function onClosed() {
    self.removeListener('destroyed', onDestroyed);
    self.constructor.emit('unref', self);
  }

  self.once('destroyed', onDestroyed);
  self.once('closed', onClosed);
  self.constructor.emit('ref', self);
}

inherits(PouchDB, AbstractPouchDB);
function PouchDB(name, opts) {
  // In Node our test suite only tests this for PouchAlt unfortunately
  /* istanbul ignore if */
  if (!(this instanceof PouchDB)) {
    return new PouchDB(name, opts);
  }

  var self = this;
  opts = opts || {};

  if (name && typeof name === 'object') {
    opts = name;
    name = opts.name;
    delete opts.name;
  }

  if (opts.deterministic_revs === undefined) {
    opts.deterministic_revs = true;
  }

  this.__opts = opts = clone(opts);

  self.auto_compaction = opts.auto_compaction;
  self.prefix = PouchDB.prefix;

  if (typeof name !== 'string') {
    throw new Error('Missing/invalid DB name');
  }

  var prefixedName = (opts.prefix || '') + name;
  var backend = parseAdapter(prefixedName, opts);

  opts.name = backend.name;
  opts.adapter = opts.adapter || backend.adapter;

  self.name = name;
  self._adapter = opts.adapter;
  PouchDB.emit('debug', ['adapter', 'Picked adapter: ', opts.adapter]);

  if (!PouchDB.adapters[opts.adapter] ||
      !PouchDB.adapters[opts.adapter].valid()) {
    throw new Error('Invalid Adapter: ' + opts.adapter);
  }

  AbstractPouchDB.call(self);
  self.taskqueue = new TaskQueue();

  self.adapter = opts.adapter;

  PouchDB.adapters[opts.adapter].call(self, opts, function (err) {
    if (err) {
      return self.taskqueue.fail(err);
    }
    prepareForDestruction(self);

    self.emit('created', self);
    PouchDB.emit('created', self.name);
    self.taskqueue.ready(self);
  });

}

// AbortController was introduced quite a while after fetch and
// isnt required for PouchDB to function so polyfill if needed
var a = (typeof AbortController !== 'undefined')
    ? AbortController
    : function () { return {abort: function () {}}; };

var f$1 = fetch;
var h = Headers;

PouchDB.adapters = {};
PouchDB.preferredAdapters = [];

PouchDB.prefix = '_pouch_';

var eventEmitter = new events.EventEmitter();

function setUpEventEmitter(Pouch) {
  Object.keys(events.EventEmitter.prototype).forEach(function (key) {
    if (typeof events.EventEmitter.prototype[key] === 'function') {
      Pouch[key] = eventEmitter[key].bind(eventEmitter);
    }
  });

  // these are created in constructor.js, and allow us to notify each DB with
  // the same name that it was destroyed, via the constructor object
  var destructListeners = Pouch._destructionListeners = new ExportedMap();

  Pouch.on('ref', function onConstructorRef(db) {
    if (!destructListeners.has(db.name)) {
      destructListeners.set(db.name, []);
    }
    destructListeners.get(db.name).push(db);
  });

  Pouch.on('unref', function onConstructorUnref(db) {
    if (!destructListeners.has(db.name)) {
      return;
    }
    var dbList = destructListeners.get(db.name);
    var pos = dbList.indexOf(db);
    if (pos < 0) {
      /* istanbul ignore next */
      return;
    }
    dbList.splice(pos, 1);
    if (dbList.length > 1) {
      /* istanbul ignore next */
      destructListeners.set(db.name, dbList);
    } else {
      destructListeners.delete(db.name);
    }
  });

  Pouch.on('destroyed', function onConstructorDestroyed(name) {
    if (!destructListeners.has(name)) {
      return;
    }
    var dbList = destructListeners.get(name);
    destructListeners.delete(name);
    dbList.forEach(function (db) {
      db.emit('destroyed',true);
    });
  });
}

setUpEventEmitter(PouchDB);

PouchDB.adapter = function (id, obj, addToPreferredAdapters) {
  /* istanbul ignore else */
  if (obj.valid()) {
    PouchDB.adapters[id] = obj;
    if (addToPreferredAdapters) {
      PouchDB.preferredAdapters.push(id);
    }
  }
};

PouchDB.plugin = function (obj) {
  if (typeof obj === 'function') { // function style for plugins
    obj(PouchDB);
  } else if (typeof obj !== 'object' || Object.keys(obj).length === 0) {
    throw new Error('Invalid plugin: got "' + obj + '", expected an object or a function');
  } else {
    Object.keys(obj).forEach(function (id) { // object style for plugins
      PouchDB.prototype[id] = obj[id];
    });
  }
  if (this.__defaults) {
    PouchDB.__defaults = $inject_Object_assign({}, this.__defaults);
  }
  return PouchDB;
};

PouchDB.defaults = function (defaultOpts) {
  function PouchAlt(name, opts) {
    if (!(this instanceof PouchAlt)) {
      return new PouchAlt(name, opts);
    }

    opts = opts || {};

    if (name && typeof name === 'object') {
      opts = name;
      name = opts.name;
      delete opts.name;
    }

    opts = $inject_Object_assign({}, PouchAlt.__defaults, opts);
    PouchDB.call(this, name, opts);
  }

  inherits(PouchAlt, PouchDB);

  PouchAlt.preferredAdapters = PouchDB.preferredAdapters.slice();
  Object.keys(PouchDB).forEach(function (key) {
    if (!(key in PouchAlt)) {
      PouchAlt[key] = PouchDB[key];
    }
  });

  // make default options transitive
  // https://github.com/pouchdb/pouchdb/issues/5922
  PouchAlt.__defaults = $inject_Object_assign({}, this.__defaults, defaultOpts);

  return PouchAlt;
};

PouchDB.fetch = function (url, opts) {
  return f$1(url, opts);
};

// managed automatically by set-version.js
var version = "7.0.0";

// this would just be "return doc[field]", but fields
// can be "deep" due to dot notation
function getFieldFromDoc(doc, parsedField) {
  var value = doc;
  for (var i = 0, len = parsedField.length; i < len; i++) {
    var key = parsedField[i];
    value = value[key];
    if (!value) {
      break;
    }
  }
  return value;
}

function compare$1(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

// Converts a string in dot notation to an array of its components, with backslash escaping
function parseField(fieldName) {
  // fields may be deep (e.g. "foo.bar.baz"), so parse
  var fields = [];
  var current = '';
  for (var i = 0, len = fieldName.length; i < len; i++) {
    var ch = fieldName[i];
    if (ch === '.') {
      if (i > 0 && fieldName[i - 1] === '\\') { // escaped delimiter
        current = current.substring(0, current.length - 1) + '.';
      } else { // not escaped, so delimiter
        fields.push(current);
        current = '';
      }
    } else { // normal character
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

var combinationFields = ['$or', '$nor', '$not'];
function isCombinationalField(field) {
  return combinationFields.indexOf(field) > -1;
}

function getKey(obj) {
  return Object.keys(obj)[0];
}

function getValue(obj) {
  return obj[getKey(obj)];
}


// flatten an array of selectors joined by an $and operator
function mergeAndedSelectors(selectors) {

  // sort to ensure that e.g. if the user specified
  // $and: [{$gt: 'a'}, {$gt: 'b'}], then it's collapsed into
  // just {$gt: 'b'}
  var res = {};

  selectors.forEach(function (selector) {
    Object.keys(selector).forEach(function (field) {
      var matcher = selector[field];
      if (typeof matcher !== 'object') {
        matcher = {$eq: matcher};
      }

      if (isCombinationalField(field)) {
        if (matcher instanceof Array) {
          res[field] = matcher.map(function (m) {
            return mergeAndedSelectors([m]);
          });
        } else {
          res[field] = mergeAndedSelectors([matcher]);
        }
      } else {
        var fieldMatchers = res[field] = res[field] || {};
        Object.keys(matcher).forEach(function (operator) {
          var value = matcher[operator];

          if (operator === '$gt' || operator === '$gte') {
            return mergeGtGte(operator, value, fieldMatchers);
          } else if (operator === '$lt' || operator === '$lte') {
            return mergeLtLte(operator, value, fieldMatchers);
          } else if (operator === '$ne') {
            return mergeNe(value, fieldMatchers);
          } else if (operator === '$eq') {
            return mergeEq(value, fieldMatchers);
          }
          fieldMatchers[operator] = value;
        });
      }
    });
  });

  return res;
}



// collapse logically equivalent gt/gte values
function mergeGtGte(operator, value, fieldMatchers) {
  if (typeof fieldMatchers.$eq !== 'undefined') {
    return; // do nothing
  }
  if (typeof fieldMatchers.$gte !== 'undefined') {
    if (operator === '$gte') {
      if (value > fieldMatchers.$gte) { // more specificity
        fieldMatchers.$gte = value;
      }
    } else { // operator === '$gt'
      if (value >= fieldMatchers.$gte) { // more specificity
        delete fieldMatchers.$gte;
        fieldMatchers.$gt = value;
      }
    }
  } else if (typeof fieldMatchers.$gt !== 'undefined') {
    if (operator === '$gte') {
      if (value > fieldMatchers.$gt) { // more specificity
        delete fieldMatchers.$gt;
        fieldMatchers.$gte = value;
      }
    } else { // operator === '$gt'
      if (value > fieldMatchers.$gt) { // more specificity
        fieldMatchers.$gt = value;
      }
    }
  } else {
    fieldMatchers[operator] = value;
  }
}

// collapse logically equivalent lt/lte values
function mergeLtLte(operator, value, fieldMatchers) {
  if (typeof fieldMatchers.$eq !== 'undefined') {
    return; // do nothing
  }
  if (typeof fieldMatchers.$lte !== 'undefined') {
    if (operator === '$lte') {
      if (value < fieldMatchers.$lte) { // more specificity
        fieldMatchers.$lte = value;
      }
    } else { // operator === '$gt'
      if (value <= fieldMatchers.$lte) { // more specificity
        delete fieldMatchers.$lte;
        fieldMatchers.$lt = value;
      }
    }
  } else if (typeof fieldMatchers.$lt !== 'undefined') {
    if (operator === '$lte') {
      if (value < fieldMatchers.$lt) { // more specificity
        delete fieldMatchers.$lt;
        fieldMatchers.$lte = value;
      }
    } else { // operator === '$gt'
      if (value < fieldMatchers.$lt) { // more specificity
        fieldMatchers.$lt = value;
      }
    }
  } else {
    fieldMatchers[operator] = value;
  }
}

// combine $ne values into one array
function mergeNe(value, fieldMatchers) {
  if ('$ne' in fieldMatchers) {
    // there are many things this could "not" be
    fieldMatchers.$ne.push(value);
  } else { // doesn't exist yet
    fieldMatchers.$ne = [value];
  }
}

// add $eq into the mix
function mergeEq(value, fieldMatchers) {
  // these all have less specificity than the $eq
  // TODO: check for user errors here
  delete fieldMatchers.$gt;
  delete fieldMatchers.$gte;
  delete fieldMatchers.$lt;
  delete fieldMatchers.$lte;
  delete fieldMatchers.$ne;
  fieldMatchers.$eq = value;
}


//
// normalize the selector
//
function massageSelector(input) {
  var result = clone(input);
  var wasAnded = false;
  if ('$and' in result) {
    result = mergeAndedSelectors(result['$and']);
    wasAnded = true;
  }

  ['$or', '$nor'].forEach(function (orOrNor) {
    if (orOrNor in result) {
      // message each individual selector
      // e.g. {foo: 'bar'} becomes {foo: {$eq: 'bar'}}
      result[orOrNor].forEach(function (subSelector) {
        var fields = Object.keys(subSelector);
        for (var i = 0; i < fields.length; i++) {
          var field = fields[i];
          var matcher = subSelector[field];
          if (typeof matcher !== 'object' || matcher === null) {
            subSelector[field] = {$eq: matcher};
          }
        }
      });
    }
  });

  if ('$not' in result) {
    //This feels a little like forcing, but it will work for now,
    //I would like to come back to this and make the merging of selectors a little more generic
    result['$not'] = mergeAndedSelectors([result['$not']]);
  }

  var fields = Object.keys(result);

  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var matcher = result[field];

    if (typeof matcher !== 'object' || matcher === null) {
      matcher = {$eq: matcher};
    } else if ('$ne' in matcher && !wasAnded) {
      // I put these in an array, since there may be more than one
      // but in the "mergeAnded" operation, I already take care of that
      matcher.$ne = [matcher.$ne];
    }
    result[field] = matcher;
  }

  return result;
}

function pad(str, padWith, upToLength) {
  var padding = '';
  var targetLength = upToLength - str.length;
  /* istanbul ignore next */
  while (padding.length < targetLength) {
    padding += padWith;
  }
  return padding;
}

function padLeft(str, padWith, upToLength) {
  var padding = pad(str, padWith, upToLength);
  return padding + str;
}

var MIN_MAGNITUDE = -324; // verified by -Number.MIN_VALUE
var MAGNITUDE_DIGITS = 3; // ditto
var SEP = ''; // set to '_' for easier debugging 

function collate(a, b) {

  if (a === b) {
    return 0;
  }

  a = normalizeKey(a);
  b = normalizeKey(b);

  var ai = collationIndex(a);
  var bi = collationIndex(b);
  if ((ai - bi) !== 0) {
    return ai - bi;
  }
  switch (typeof a) {
    case 'number':
      return a - b;
    case 'boolean':
      return a < b ? -1 : 1;
    case 'string':
      return stringCollate(a, b);
  }
  return Array.isArray(a) ? arrayCollate(a, b) : objectCollate(a, b);
}

// couch considers null/NaN/Infinity/-Infinity === undefined,
// for the purposes of mapreduce indexes. also, dates get stringified.
function normalizeKey(key) {
  switch (typeof key) {
    case 'undefined':
      return null;
    case 'number':
      if (key === Infinity || key === -Infinity || isNaN(key)) {
        return null;
      }
      return key;
    case 'object':
      var origKey = key;
      if (Array.isArray(key)) {
        var len = key.length;
        key = new Array(len);
        for (var i = 0; i < len; i++) {
          key[i] = normalizeKey(origKey[i]);
        }
      /* istanbul ignore next */
      } else if (key instanceof Date) {
        return key.toJSON();
      } else if (key !== null) { // generic object
        key = {};
        for (var k in origKey) {
          if (origKey.hasOwnProperty(k)) {
            var val = origKey[k];
            if (typeof val !== 'undefined') {
              key[k] = normalizeKey(val);
            }
          }
        }
      }
  }
  return key;
}

function indexify(key) {
  if (key !== null) {
    switch (typeof key) {
      case 'boolean':
        return key ? 1 : 0;
      case 'number':
        return numToIndexableString(key);
      case 'string':
        // We've to be sure that key does not contain \u0000
        // Do order-preserving replacements:
        // 0 -> 1, 1
        // 1 -> 1, 2
        // 2 -> 2, 2
        /* eslint-disable no-control-regex */
        return key
          .replace(/\u0002/g, '\u0002\u0002')
          .replace(/\u0001/g, '\u0001\u0002')
          .replace(/\u0000/g, '\u0001\u0001');
        /* eslint-enable no-control-regex */
      case 'object':
        var isArray = Array.isArray(key);
        var arr = isArray ? key : Object.keys(key);
        var i = -1;
        var len = arr.length;
        var result = '';
        if (isArray) {
          while (++i < len) {
            result += toIndexableString(arr[i]);
          }
        } else {
          while (++i < len) {
            var objKey = arr[i];
            result += toIndexableString(objKey) +
                toIndexableString(key[objKey]);
          }
        }
        return result;
    }
  }
  return '';
}

// convert the given key to a string that would be appropriate
// for lexical sorting, e.g. within a database, where the
// sorting is the same given by the collate() function.
function toIndexableString(key) {
  var zero = '\u0000';
  key = normalizeKey(key);
  return collationIndex(key) + SEP + indexify(key) + zero;
}

function parseNumber(str, i) {
  var originalIdx = i;
  var num;
  var zero = str[i] === '1';
  if (zero) {
    num = 0;
    i++;
  } else {
    var neg = str[i] === '0';
    i++;
    var numAsString = '';
    var magAsString = str.substring(i, i + MAGNITUDE_DIGITS);
    var magnitude = parseInt(magAsString, 10) + MIN_MAGNITUDE;
    /* istanbul ignore next */
    if (neg) {
      magnitude = -magnitude;
    }
    i += MAGNITUDE_DIGITS;
    while (true) {
      var ch = str[i];
      if (ch === '\u0000') {
        break;
      } else {
        numAsString += ch;
      }
      i++;
    }
    numAsString = numAsString.split('.');
    if (numAsString.length === 1) {
      num = parseInt(numAsString, 10);
    } else {
      /* istanbul ignore next */
      num = parseFloat(numAsString[0] + '.' + numAsString[1]);
    }
    /* istanbul ignore next */
    if (neg) {
      num = num - 10;
    }
    /* istanbul ignore next */
    if (magnitude !== 0) {
      // parseFloat is more reliable than pow due to rounding errors
      // e.g. Number.MAX_VALUE would return Infinity if we did
      // num * Math.pow(10, magnitude);
      num = parseFloat(num + 'e' + magnitude);
    }
  }
  return {num: num, length : i - originalIdx};
}

// move up the stack while parsing
// this function moved outside of parseIndexableString for performance
function pop(stack, metaStack) {
  var obj = stack.pop();

  if (metaStack.length) {
    var lastMetaElement = metaStack[metaStack.length - 1];
    if (obj === lastMetaElement.element) {
      // popping a meta-element, e.g. an object whose value is another object
      metaStack.pop();
      lastMetaElement = metaStack[metaStack.length - 1];
    }
    var element = lastMetaElement.element;
    var lastElementIndex = lastMetaElement.index;
    if (Array.isArray(element)) {
      element.push(obj);
    } else if (lastElementIndex === stack.length - 2) { // obj with key+value
      var key = stack.pop();
      element[key] = obj;
    } else {
      stack.push(obj); // obj with key only
    }
  }
}

function parseIndexableString(str) {
  var stack = [];
  var metaStack = []; // stack for arrays and objects
  var i = 0;

  /*eslint no-constant-condition: ["error", { "checkLoops": false }]*/
  while (true) {
    var collationIndex = str[i++];
    if (collationIndex === '\u0000') {
      if (stack.length === 1) {
        return stack.pop();
      } else {
        pop(stack, metaStack);
        continue;
      }
    }
    switch (collationIndex) {
      case '1':
        stack.push(null);
        break;
      case '2':
        stack.push(str[i] === '1');
        i++;
        break;
      case '3':
        var parsedNum = parseNumber(str, i);
        stack.push(parsedNum.num);
        i += parsedNum.length;
        break;
      case '4':
        var parsedStr = '';
        /*eslint no-constant-condition: ["error", { "checkLoops": false }]*/
        while (true) {
          var ch = str[i];
          if (ch === '\u0000') {
            break;
          }
          parsedStr += ch;
          i++;
        }
        // perform the reverse of the order-preserving replacement
        // algorithm (see above)
        /* eslint-disable no-control-regex */
        parsedStr = parsedStr.replace(/\u0001\u0001/g, '\u0000')
          .replace(/\u0001\u0002/g, '\u0001')
          .replace(/\u0002\u0002/g, '\u0002');
        /* eslint-enable no-control-regex */
        stack.push(parsedStr);
        break;
      case '5':
        var arrayElement = { element: [], index: stack.length };
        stack.push(arrayElement.element);
        metaStack.push(arrayElement);
        break;
      case '6':
        var objElement = { element: {}, index: stack.length };
        stack.push(objElement.element);
        metaStack.push(objElement);
        break;
      /* istanbul ignore next */
      default:
        throw new Error(
          'bad collationIndex or unexpectedly reached end of input: ' +
            collationIndex);
    }
  }
}

function arrayCollate(a, b) {
  var len = Math.min(a.length, b.length);
  for (var i = 0; i < len; i++) {
    var sort = collate(a[i], b[i]);
    if (sort !== 0) {
      return sort;
    }
  }
  return (a.length === b.length) ? 0 :
    (a.length > b.length) ? 1 : -1;
}
function stringCollate(a, b) {
  // See: https://github.com/daleharvey/pouchdb/issues/40
  // This is incompatible with the CouchDB implementation, but its the
  // best we can do for now
  return (a === b) ? 0 : ((a > b) ? 1 : -1);
}
function objectCollate(a, b) {
  var ak = Object.keys(a), bk = Object.keys(b);
  var len = Math.min(ak.length, bk.length);
  for (var i = 0; i < len; i++) {
    // First sort the keys
    var sort = collate(ak[i], bk[i]);
    if (sort !== 0) {
      return sort;
    }
    // if the keys are equal sort the values
    sort = collate(a[ak[i]], b[bk[i]]);
    if (sort !== 0) {
      return sort;
    }

  }
  return (ak.length === bk.length) ? 0 :
    (ak.length > bk.length) ? 1 : -1;
}
// The collation is defined by erlangs ordered terms
// the atoms null, true, false come first, then numbers, strings,
// arrays, then objects
// null/undefined/NaN/Infinity/-Infinity are all considered null
function collationIndex(x) {
  var id = ['boolean', 'number', 'string', 'object'];
  var idx = id.indexOf(typeof x);
  //false if -1 otherwise true, but fast!!!!1
  if (~idx) {
    if (x === null) {
      return 1;
    }
    if (Array.isArray(x)) {
      return 5;
    }
    return idx < 3 ? (idx + 2) : (idx + 3);
  }
  /* istanbul ignore next */
  if (Array.isArray(x)) {
    return 5;
  }
}

// conversion:
// x yyy zz...zz
// x = 0 for negative, 1 for 0, 2 for positive
// y = exponent (for negative numbers negated) moved so that it's >= 0
// z = mantisse
function numToIndexableString(num) {

  if (num === 0) {
    return '1';
  }

  // convert number to exponential format for easier and
  // more succinct string sorting
  var expFormat = num.toExponential().split(/e\+?/);
  var magnitude = parseInt(expFormat[1], 10);

  var neg = num < 0;

  var result = neg ? '0' : '2';

  // first sort by magnitude
  // it's easier if all magnitudes are positive
  var magForComparison = ((neg ? -magnitude : magnitude) - MIN_MAGNITUDE);
  var magString = padLeft((magForComparison).toString(), '0', MAGNITUDE_DIGITS);

  result += SEP + magString;

  // then sort by the factor
  var factor = Math.abs(parseFloat(expFormat[0])); // [1..10)
  /* istanbul ignore next */
  if (neg) { // for negative reverse ordering
    factor = 10 - factor;
  }

  var factorStr = factor.toFixed(20);

  // strip zeros from the end
  factorStr = factorStr.replace(/\.?0+$/, '');

  result += SEP + factorStr;

  return result;
}

// create a comparator based on the sort object
function createFieldSorter(sort) {

  function getFieldValuesAsArray(doc) {
    return sort.map(function (sorting) {
      var fieldName = getKey(sorting);
      var parsedField = parseField(fieldName);
      var docFieldValue = getFieldFromDoc(doc, parsedField);
      return docFieldValue;
    });
  }

  return function (aRow, bRow) {
    var aFieldValues = getFieldValuesAsArray(aRow.doc);
    var bFieldValues = getFieldValuesAsArray(bRow.doc);
    var collation = collate(aFieldValues, bFieldValues);
    if (collation !== 0) {
      return collation;
    }
    // this is what mango seems to do
    return compare$1(aRow.doc._id, bRow.doc._id);
  };
}

function filterInMemoryFields(rows, requestDef, inMemoryFields) {
  rows = rows.filter(function (row) {
    return rowFilter(row.doc, requestDef.selector, inMemoryFields);
  });

  if (requestDef.sort) {
    // in-memory sort
    var fieldSorter = createFieldSorter(requestDef.sort);
    rows = rows.sort(fieldSorter);
    if (typeof requestDef.sort[0] !== 'string' &&
        getValue(requestDef.sort[0]) === 'desc') {
      rows = rows.reverse();
    }
  }

  if ('limit' in requestDef || 'skip' in requestDef) {
    // have to do the limit in-memory
    var skip = requestDef.skip || 0;
    var limit = ('limit' in requestDef ? requestDef.limit : rows.length) + skip;
    rows = rows.slice(skip, limit);
  }
  return rows;
}

function rowFilter(doc, selector, inMemoryFields) {
  return inMemoryFields.every(function (field) {
    var matcher = selector[field];
    var parsedField = parseField(field);
    var docFieldValue = getFieldFromDoc(doc, parsedField);
    if (isCombinationalField(field)) {
      return matchCominationalSelector(field, matcher, doc);
    }

    return matchSelector(matcher, doc, parsedField, docFieldValue);
  });
}

function matchSelector(matcher, doc, parsedField, docFieldValue) {
  if (!matcher) {
    // no filtering necessary; this field is just needed for sorting
    return true;
  }

  return Object.keys(matcher).every(function (userOperator) {
    var userValue = matcher[userOperator];
    return match(userOperator, doc, userValue, parsedField, docFieldValue);
  });
}

function matchCominationalSelector(field, matcher, doc) {

  if (field === '$or') {
    return matcher.some(function (orMatchers) {
      return rowFilter(doc, orMatchers, Object.keys(orMatchers));
    });
  }

  if (field === '$not') {
    return !rowFilter(doc, matcher, Object.keys(matcher));
  }

  //`$nor`
  return !matcher.find(function (orMatchers) {
    return rowFilter(doc, orMatchers, Object.keys(orMatchers));
  });

}

function match(userOperator, doc, userValue, parsedField, docFieldValue) {
  if (!matchers[userOperator]) {
    throw new Error('unknown operator "' + userOperator +
      '" - should be one of $eq, $lte, $lt, $gt, $gte, $exists, $ne, $in, ' +
      '$nin, $size, $mod, $regex, $elemMatch, $type, $allMatch or $all');
  }
  return matchers[userOperator](doc, userValue, parsedField, docFieldValue);
}

function fieldExists(docFieldValue) {
  return typeof docFieldValue !== 'undefined' && docFieldValue !== null;
}

function fieldIsNotUndefined(docFieldValue) {
  return typeof docFieldValue !== 'undefined';
}

function modField(docFieldValue, userValue) {
  var divisor = userValue[0];
  var mod = userValue[1];
  if (divisor === 0) {
    throw new Error('Bad divisor, cannot divide by zero');
  }

  if (parseInt(divisor, 10) !== divisor ) {
    throw new Error('Divisor is not an integer');
  }

  if (parseInt(mod, 10) !== mod ) {
    throw new Error('Modulus is not an integer');
  }

  if (parseInt(docFieldValue, 10) !== docFieldValue) {
    return false;
  }

  return docFieldValue % divisor === mod;
}

function arrayContainsValue(docFieldValue, userValue) {
  return userValue.some(function (val) {
    if (docFieldValue instanceof Array) {
      return docFieldValue.indexOf(val) > -1;
    }

    return docFieldValue === val;
  });
}

function arrayContainsAllValues(docFieldValue, userValue) {
  return userValue.every(function (val) {
    return docFieldValue.indexOf(val) > -1;
  });
}

function arraySize(docFieldValue, userValue) {
  return docFieldValue.length === userValue;
}

function regexMatch(docFieldValue, userValue) {
  var re = new RegExp(userValue);

  return re.test(docFieldValue);
}

function typeMatch(docFieldValue, userValue) {

  switch (userValue) {
    case 'null':
      return docFieldValue === null;
    case 'boolean':
      return typeof (docFieldValue) === 'boolean';
    case 'number':
      return typeof (docFieldValue) === 'number';
    case 'string':
      return typeof (docFieldValue) === 'string';
    case 'array':
      return docFieldValue instanceof Array;
    case 'object':
      return ({}).toString.call(docFieldValue) === '[object Object]';
  }

  throw new Error(userValue + ' not supported as a type.' +
                  'Please use one of object, string, array, number, boolean or null.');

}

var matchers = {

  '$elemMatch': function (doc, userValue, parsedField, docFieldValue) {
    if (!Array.isArray(docFieldValue)) {
      return false;
    }

    if (docFieldValue.length === 0) {
      return false;
    }

    if (typeof docFieldValue[0] === 'object') {
      return docFieldValue.some(function (val) {
        return rowFilter(val, userValue, Object.keys(userValue));
      });
    }

    return docFieldValue.some(function (val) {
      return matchSelector(userValue, doc, parsedField, val);
    });
  },

  '$allMatch': function (doc, userValue, parsedField, docFieldValue) {
    if (!Array.isArray(docFieldValue)) {
      return false;
    }

    /* istanbul ignore next */
    if (docFieldValue.length === 0) {
      return false;
    }

    if (typeof docFieldValue[0] === 'object') {
      return docFieldValue.every(function (val) {
        return rowFilter(val, userValue, Object.keys(userValue));
      });
    }

    return docFieldValue.every(function (val) {
      return matchSelector(userValue, doc, parsedField, val);
    });
  },

  '$eq': function (doc, userValue, parsedField, docFieldValue) {
    return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) === 0;
  },

  '$gte': function (doc, userValue, parsedField, docFieldValue) {
    return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) >= 0;
  },

  '$gt': function (doc, userValue, parsedField, docFieldValue) {
    return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) > 0;
  },

  '$lte': function (doc, userValue, parsedField, docFieldValue) {
    return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) <= 0;
  },

  '$lt': function (doc, userValue, parsedField, docFieldValue) {
    return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) < 0;
  },

  '$exists': function (doc, userValue, parsedField, docFieldValue) {
    //a field that is null is still considered to exist
    if (userValue) {
      return fieldIsNotUndefined(docFieldValue);
    }

    return !fieldIsNotUndefined(docFieldValue);
  },

  '$mod': function (doc, userValue, parsedField, docFieldValue) {
    return fieldExists(docFieldValue) && modField(docFieldValue, userValue);
  },

  '$ne': function (doc, userValue, parsedField, docFieldValue) {
    return userValue.every(function (neValue) {
      return collate(docFieldValue, neValue) !== 0;
    });
  },
  '$in': function (doc, userValue, parsedField, docFieldValue) {
    return fieldExists(docFieldValue) && arrayContainsValue(docFieldValue, userValue);
  },

  '$nin': function (doc, userValue, parsedField, docFieldValue) {
    return fieldExists(docFieldValue) && !arrayContainsValue(docFieldValue, userValue);
  },

  '$size': function (doc, userValue, parsedField, docFieldValue) {
    return fieldExists(docFieldValue) && arraySize(docFieldValue, userValue);
  },

  '$all': function (doc, userValue, parsedField, docFieldValue) {
    return Array.isArray(docFieldValue) && arrayContainsAllValues(docFieldValue, userValue);
  },

  '$regex': function (doc, userValue, parsedField, docFieldValue) {
    return fieldExists(docFieldValue) && regexMatch(docFieldValue, userValue);
  },

  '$type': function (doc, userValue, parsedField, docFieldValue) {
    return typeMatch(docFieldValue, userValue);
  }
};

// return true if the given doc matches the supplied selector
function matchesSelector(doc, selector) {
  /* istanbul ignore if */
  if (typeof selector !== 'object') {
    // match the CouchDB error message
    throw new Error('Selector error: expected a JSON object');
  }

  selector = massageSelector(selector);
  var row = {
    'doc': doc
  };

  var rowsMatched = filterInMemoryFields([row], { 'selector': selector }, Object.keys(selector));
  return rowsMatched && rowsMatched.length === 1;
}

function evalFilter(input) {
  return scopeEval('"use strict";\nreturn ' + input + ';', {});
}

function evalView(input) {
  var code = [
    'return function(doc) {',
    '  "use strict";',
    '  var emitted = false;',
    '  var emit = function (a, b) {',
    '    emitted = true;',
    '  };',
    '  var view = ' + input + ';',
    '  view(doc);',
    '  if (emitted) {',
    '    return true;',
    '  }',
    '};'
  ].join('\n');

  return scopeEval(code, {});
}

function validate(opts, callback) {
  if (opts.selector) {
    if (opts.filter && opts.filter !== '_selector') {
      var filterName = typeof opts.filter === 'string' ?
        opts.filter : 'function';
      return callback(new Error('selector invalid for filter "' + filterName + '"'));
    }
  }
  callback();
}

function normalize(opts) {
  if (opts.view && !opts.filter) {
    opts.filter = '_view';
  }

  if (opts.selector && !opts.filter) {
    opts.filter = '_selector';
  }

  if (opts.filter && typeof opts.filter === 'string') {
    if (opts.filter === '_view') {
      opts.view = normalizeDesignDocFunctionName(opts.view);
    } else {
      opts.filter = normalizeDesignDocFunctionName(opts.filter);
    }
  }
}

function shouldFilter(changesHandler, opts) {
  return opts.filter && typeof opts.filter === 'string' &&
    !opts.doc_ids && !isRemote(changesHandler.db);
}

function filter(changesHandler, opts) {
  var callback = opts.complete;
  if (opts.filter === '_view') {
    if (!opts.view || typeof opts.view !== 'string') {
      var err = createError(BAD_REQUEST,
        '`view` filter parameter not found or invalid.');
      return callback(err);
    }
    // fetch a view from a design doc, make it behave like a filter
    var viewName = parseDesignDocFunctionName(opts.view);
    changesHandler.db.get('_design/' + viewName[0], function (err, ddoc) {
      /* istanbul ignore if */
      if (changesHandler.isCancelled) {
        return callback(null, {status: 'cancelled'});
      }
      /* istanbul ignore next */
      if (err) {
        return callback(generateErrorFromResponse(err));
      }
      var mapFun = ddoc && ddoc.views && ddoc.views[viewName[1]] &&
        ddoc.views[viewName[1]].map;
      if (!mapFun) {
        return callback(createError(MISSING_DOC,
          (ddoc.views ? 'missing json key: ' + viewName[1] :
            'missing json key: views')));
      }
      opts.filter = evalView(mapFun);
      changesHandler.doChanges(opts);
    });
  } else if (opts.selector) {
    opts.filter = function (doc) {
      return matchesSelector(doc, opts.selector);
    };
    changesHandler.doChanges(opts);
  } else {
    // fetch a filter from a design doc
    var filterName = parseDesignDocFunctionName(opts.filter);
    changesHandler.db.get('_design/' + filterName[0], function (err, ddoc) {
      /* istanbul ignore if */
      if (changesHandler.isCancelled) {
        return callback(null, {status: 'cancelled'});
      }
      /* istanbul ignore next */
      if (err) {
        return callback(generateErrorFromResponse(err));
      }
      var filterFun = ddoc && ddoc.filters && ddoc.filters[filterName[1]];
      if (!filterFun) {
        return callback(createError(MISSING_DOC,
          ((ddoc && ddoc.filters) ? 'missing json key: ' + filterName[1]
            : 'missing json key: filters')));
      }
      opts.filter = evalFilter(filterFun);
      changesHandler.doChanges(opts);
    });
  }
}

function applyChangesFilterPlugin(PouchDB) {
  PouchDB._changesFilterPlugin = {
    validate: validate,
    normalize: normalize,
    shouldFilter: shouldFilter,
    filter: filter
  };
}

// TODO: remove from pouchdb-core (breaking)
PouchDB.plugin(applyChangesFilterPlugin);

PouchDB.version = version;

function toObject(array) {
  return array.reduce(function (obj, item) {
    obj[item] = true;
    return obj;
  }, {});
}
// List of top level reserved words for doc
var reservedWords = toObject([
  '_id',
  '_rev',
  '_attachments',
  '_deleted',
  '_revisions',
  '_revs_info',
  '_conflicts',
  '_deleted_conflicts',
  '_local_seq',
  '_rev_tree',
  //replication documents
  '_replication_id',
  '_replication_state',
  '_replication_state_time',
  '_replication_state_reason',
  '_replication_stats',
  // Specific to Couchbase Sync Gateway
  '_removed'
]);

// List of reserved words that should end up the document
var dataWords = toObject([
  '_attachments',
  //replication documents
  '_replication_id',
  '_replication_state',
  '_replication_state_time',
  '_replication_state_reason',
  '_replication_stats'
]);

function parseRevisionInfo(rev) {
  if (!/^\d+-./.test(rev)) {
    return createError(INVALID_REV);
  }
  var idx = rev.indexOf('-');
  var left = rev.substring(0, idx);
  var right = rev.substring(idx + 1);
  return {
    prefix: parseInt(left, 10),
    id: right
  };
}

function makeRevTreeFromRevisions(revisions, opts) {
  var pos = revisions.start - revisions.ids.length + 1;

  var revisionIds = revisions.ids;
  var ids = [revisionIds[0], opts, []];

  for (var i = 1, len = revisionIds.length; i < len; i++) {
    ids = [revisionIds[i], {status: 'missing'}, [ids]];
  }

  return [{
    pos: pos,
    ids: ids
  }];
}

// Preprocess documents, parse their revisions, assign an id and a
// revision for new writes that are missing them, etc
function parseDoc(doc, newEdits, dbOpts) {
  if (!dbOpts) {
    dbOpts = {
      deterministic_revs: true
    };
  }

  var nRevNum;
  var newRevId;
  var revInfo;
  var opts = {status: 'available'};
  if (doc._deleted) {
    opts.deleted = true;
  }

  if (newEdits) {
    if (!doc._id) {
      doc._id = uuid();
    }
    newRevId = rev$$1(doc, dbOpts.deterministic_revs);
    if (doc._rev) {
      revInfo = parseRevisionInfo(doc._rev);
      if (revInfo.error) {
        return revInfo;
      }
      doc._rev_tree = [{
        pos: revInfo.prefix,
        ids: [revInfo.id, {status: 'missing'}, [[newRevId, opts, []]]]
      }];
      nRevNum = revInfo.prefix + 1;
    } else {
      doc._rev_tree = [{
        pos: 1,
        ids : [newRevId, opts, []]
      }];
      nRevNum = 1;
    }
  } else {
    if (doc._revisions) {
      doc._rev_tree = makeRevTreeFromRevisions(doc._revisions, opts);
      nRevNum = doc._revisions.start;
      newRevId = doc._revisions.ids[0];
    }
    if (!doc._rev_tree) {
      revInfo = parseRevisionInfo(doc._rev);
      if (revInfo.error) {
        return revInfo;
      }
      nRevNum = revInfo.prefix;
      newRevId = revInfo.id;
      doc._rev_tree = [{
        pos: nRevNum,
        ids: [newRevId, opts, []]
      }];
    }
  }

  invalidIdError(doc._id);

  doc._rev = nRevNum + '-' + newRevId;

  var result = {metadata : {}, data : {}};
  for (var key in doc) {
    /* istanbul ignore else */
    if (Object.prototype.hasOwnProperty.call(doc, key)) {
      var specialKey = key[0] === '_';
      if (specialKey && !reservedWords[key]) {
        var error = createError(DOC_VALIDATION, key);
        error.message = DOC_VALIDATION.message + ': ' + key;
        throw error;
      } else if (specialKey && !dataWords[key]) {
        result.metadata[key.slice(1)] = doc[key];
      } else {
        result.data[key] = doc[key];
      }
    }
  }
  return result;
}

function parseBase64(data) {
  try {
    return thisAtob(data);
  } catch (e) {
    var err = createError(BAD_ARG,
      'Attachment is not a valid base64 string');
    return {error: err};
  }
}

function preprocessString(att, blobType, callback) {
  var asBinary = parseBase64(att.data);
  if (asBinary.error) {
    return callback(asBinary.error);
  }

  att.length = asBinary.length;
  if (blobType === 'blob') {
    att.data = binStringToBluffer(asBinary, att.content_type);
  } else if (blobType === 'base64') {
    att.data = thisBtoa(asBinary);
  } else { // binary
    att.data = asBinary;
  }
  binaryMd5(asBinary, function (result) {
    att.digest = 'md5-' + result;
    callback();
  });
}

function preprocessBlob(att, blobType, callback) {
  binaryMd5(att.data, function (md5) {
    att.digest = 'md5-' + md5;
    // size is for blobs (browser), length is for buffers (node)
    att.length = att.data.size || att.data.length || 0;
    if (blobType === 'binary') {
      blobToBinaryString(att.data, function (binString) {
        att.data = binString;
        callback();
      });
    } else if (blobType === 'base64') {
      blobToBase64(att.data, function (b64) {
        att.data = b64;
        callback();
      });
    } else {
      callback();
    }
  });
}

function preprocessAttachment(att, blobType, callback) {
  if (att.stub) {
    return callback();
  }
  if (typeof att.data === 'string') { // input is a base64 string
    preprocessString(att, blobType, callback);
  } else { // input is a blob
    preprocessBlob(att, blobType, callback);
  }
}

function preprocessAttachments(docInfos, blobType, callback) {

  if (!docInfos.length) {
    return callback();
  }

  var docv = 0;
  var overallErr;

  docInfos.forEach(function (docInfo) {
    var attachments = docInfo.data && docInfo.data._attachments ?
      Object.keys(docInfo.data._attachments) : [];
    var recv = 0;

    if (!attachments.length) {
      return done();
    }

    function processedAttachment(err) {
      overallErr = err;
      recv++;
      if (recv === attachments.length) {
        done();
      }
    }

    for (var key in docInfo.data._attachments) {
      if (docInfo.data._attachments.hasOwnProperty(key)) {
        preprocessAttachment(docInfo.data._attachments[key],
          blobType, processedAttachment);
      }
    }
  });

  function done() {
    docv++;
    if (docInfos.length === docv) {
      if (overallErr) {
        callback(overallErr);
      } else {
        callback();
      }
    }
  }
}

function updateDoc(revLimit, prev, docInfo, results,
                   i, cb, writeDoc, newEdits) {

  if (revExists(prev.rev_tree, docInfo.metadata.rev) && !newEdits) {
    results[i] = docInfo;
    return cb();
  }

  // sometimes this is pre-calculated. historically not always
  var previousWinningRev = prev.winningRev || winningRev(prev);
  var previouslyDeleted = 'deleted' in prev ? prev.deleted :
    isDeleted(prev, previousWinningRev);
  var deleted = 'deleted' in docInfo.metadata ? docInfo.metadata.deleted :
    isDeleted(docInfo.metadata);
  var isRoot = /^1-/.test(docInfo.metadata.rev);

  if (previouslyDeleted && !deleted && newEdits && isRoot) {
    var newDoc = docInfo.data;
    newDoc._rev = previousWinningRev;
    newDoc._id = docInfo.metadata.id;
    docInfo = parseDoc(newDoc, newEdits);
  }

  var merged = merge(prev.rev_tree, docInfo.metadata.rev_tree[0], revLimit);

  var inConflict = newEdits && ((
    (previouslyDeleted && deleted && merged.conflicts !== 'new_leaf') ||
    (!previouslyDeleted && merged.conflicts !== 'new_leaf') ||
    (previouslyDeleted && !deleted && merged.conflicts === 'new_branch')));

  if (inConflict) {
    var err = createError(REV_CONFLICT);
    results[i] = err;
    return cb();
  }

  var newRev = docInfo.metadata.rev;
  docInfo.metadata.rev_tree = merged.tree;
  docInfo.stemmedRevs = merged.stemmedRevs || [];
  /* istanbul ignore else */
  if (prev.rev_map) {
    docInfo.metadata.rev_map = prev.rev_map; // used only by leveldb
  }

  // recalculate
  var winningRev$$1 = winningRev(docInfo.metadata);
  var winningRevIsDeleted = isDeleted(docInfo.metadata, winningRev$$1);

  // calculate the total number of documents that were added/removed,
  // from the perspective of total_rows/doc_count
  var delta = (previouslyDeleted === winningRevIsDeleted) ? 0 :
    previouslyDeleted < winningRevIsDeleted ? -1 : 1;

  var newRevIsDeleted;
  if (newRev === winningRev$$1) {
    // if the new rev is the same as the winning rev, we can reuse that value
    newRevIsDeleted = winningRevIsDeleted;
  } else {
    // if they're not the same, then we need to recalculate
    newRevIsDeleted = isDeleted(docInfo.metadata, newRev);
  }

  writeDoc(docInfo, winningRev$$1, winningRevIsDeleted, newRevIsDeleted,
    true, delta, i, cb);
}

function rootIsMissing(docInfo) {
  return docInfo.metadata.rev_tree[0].ids[1].status === 'missing';
}

function processDocs(revLimit, docInfos, api, fetchedDocs, tx, results,
                     writeDoc, opts, overallCallback) {

  // Default to 1000 locally
  revLimit = revLimit || 1000;

  function insertDoc(docInfo, resultsIdx, callback) {
    // Cant insert new deleted documents
    var winningRev$$1 = winningRev(docInfo.metadata);
    var deleted = isDeleted(docInfo.metadata, winningRev$$1);
    if ('was_delete' in opts && deleted) {
      results[resultsIdx] = createError(MISSING_DOC, 'deleted');
      return callback();
    }

    // 4712 - detect whether a new document was inserted with a _rev
    var inConflict = newEdits && rootIsMissing(docInfo);

    if (inConflict) {
      var err = createError(REV_CONFLICT);
      results[resultsIdx] = err;
      return callback();
    }

    var delta = deleted ? 0 : 1;

    writeDoc(docInfo, winningRev$$1, deleted, deleted, false,
      delta, resultsIdx, callback);
  }

  var newEdits = opts.new_edits;
  var idsToDocs = new ExportedMap();

  var docsDone = 0;
  var docsToDo = docInfos.length;

  function checkAllDocsDone() {
    if (++docsDone === docsToDo && overallCallback) {
      overallCallback();
    }
  }

  docInfos.forEach(function (currentDoc, resultsIdx) {

    if (currentDoc._id && isLocalId(currentDoc._id)) {
      var fun = currentDoc._deleted ? '_removeLocal' : '_putLocal';
      api[fun](currentDoc, {ctx: tx}, function (err, res) {
        results[resultsIdx] = err || res;
        checkAllDocsDone();
      });
      return;
    }

    var id = currentDoc.metadata.id;
    if (idsToDocs.has(id)) {
      docsToDo--; // duplicate
      idsToDocs.get(id).push([currentDoc, resultsIdx]);
    } else {
      idsToDocs.set(id, [[currentDoc, resultsIdx]]);
    }
  });

  // in the case of new_edits, the user can provide multiple docs
  // with the same id. these need to be processed sequentially
  idsToDocs.forEach(function (docs, id) {
    var numDone = 0;

    function docWritten() {
      if (++numDone < docs.length) {
        nextDoc();
      } else {
        checkAllDocsDone();
      }
    }
    function nextDoc() {
      var value = docs[numDone];
      var currentDoc = value[0];
      var resultsIdx = value[1];

      if (fetchedDocs.has(id)) {
        updateDoc(revLimit, fetchedDocs.get(id), currentDoc, results,
          resultsIdx, docWritten, writeDoc, newEdits);
      } else {
        // Ensure stemming applies to new writes as well
        var merged = merge([], currentDoc.metadata.rev_tree[0], revLimit);
        currentDoc.metadata.rev_tree = merged.tree;
        currentDoc.stemmedRevs = merged.stemmedRevs || [];
        insertDoc(currentDoc, resultsIdx, docWritten);
      }
    }
    nextDoc();
  });
}

// IndexedDB requires a versioned database structure, so we use the
// version here to manage migrations.
var ADAPTER_VERSION = 5;

// The object stores created for each database
// DOC_STORE stores the document meta data, its revision history and state
// Keyed by document id
var DOC_STORE = 'document-store';
// BY_SEQ_STORE stores a particular version of a document, keyed by its
// sequence id
var BY_SEQ_STORE = 'by-sequence';
// Where we store attachments
var ATTACH_STORE = 'attach-store';
// Where we store many-to-many relations
// between attachment digests and seqs
var ATTACH_AND_SEQ_STORE = 'attach-seq-store';

// Where we store database-wide meta data in a single record
// keyed by id: META_STORE
var META_STORE = 'meta-store';
// Where we store local documents
var LOCAL_STORE = 'local-store';
// Where we detect blob support
var DETECT_BLOB_SUPPORT_STORE = 'detect-blob-support';

function safeJsonParse(str) {
  // This try/catch guards against stack overflow errors.
  // JSON.parse() is faster than vuvuzela.parse() but vuvuzela
  // cannot overflow.
  try {
    return JSON.parse(str);
  } catch (e) {
    /* istanbul ignore next */
    return vuvuzela.parse(str);
  }
}

function safeJsonStringify(json) {
  try {
    return JSON.stringify(json);
  } catch (e) {
    /* istanbul ignore next */
    return vuvuzela.stringify(json);
  }
}

function idbError(callback) {
  return function (evt) {
    var message = 'unknown_error';
    if (evt.target && evt.target.error) {
      message = evt.target.error.name || evt.target.error.message;
    }
    callback(createError(IDB_ERROR, message, evt.type));
  };
}

// Unfortunately, the metadata has to be stringified
// when it is put into the database, because otherwise
// IndexedDB can throw errors for deeply-nested objects.
// Originally we just used JSON.parse/JSON.stringify; now
// we use this custom vuvuzela library that avoids recursion.
// If we could do it all over again, we'd probably use a
// format for the revision trees other than JSON.
function encodeMetadata(metadata, winningRev, deleted) {
  return {
    data: safeJsonStringify(metadata),
    winningRev: winningRev,
    deletedOrLocal: deleted ? '1' : '0',
    seq: metadata.seq, // highest seq for this doc
    id: metadata.id
  };
}

function decodeMetadata(storedObject) {
  if (!storedObject) {
    return null;
  }
  var metadata = safeJsonParse(storedObject.data);
  metadata.winningRev = storedObject.winningRev;
  metadata.deleted = storedObject.deletedOrLocal === '1';
  metadata.seq = storedObject.seq;
  return metadata;
}

// read the doc back out from the database. we don't store the
// _id or _rev because we already have _doc_id_rev.
function decodeDoc(doc) {
  if (!doc) {
    return doc;
  }
  var idx = doc._doc_id_rev.lastIndexOf(':');
  doc._id = doc._doc_id_rev.substring(0, idx - 1);
  doc._rev = doc._doc_id_rev.substring(idx + 1);
  delete doc._doc_id_rev;
  return doc;
}

// Read a blob from the database, encoding as necessary
// and translating from base64 if the IDB doesn't support
// native Blobs
function readBlobData(body, type, asBlob, callback) {
  if (asBlob) {
    if (!body) {
      callback(createBlob([''], {type: type}));
    } else if (typeof body !== 'string') { // we have blob support
      callback(body);
    } else { // no blob support
      callback(b64ToBluffer(body, type));
    }
  } else { // as base64 string
    if (!body) {
      callback('');
    } else if (typeof body !== 'string') { // we have blob support
      readAsBinaryString(body, function (binary) {
        callback(thisBtoa(binary));
      });
    } else { // no blob support
      callback(body);
    }
  }
}

function fetchAttachmentsIfNecessary(doc, opts, txn, cb) {
  var attachments = Object.keys(doc._attachments || {});
  if (!attachments.length) {
    return cb && cb();
  }
  var numDone = 0;

  function checkDone() {
    if (++numDone === attachments.length && cb) {
      cb();
    }
  }

  function fetchAttachment(doc, att) {
    var attObj = doc._attachments[att];
    var digest = attObj.digest;
    var req = txn.objectStore(ATTACH_STORE).get(digest);
    req.onsuccess = function (e) {
      attObj.body = e.target.result.body;
      checkDone();
    };
  }

  attachments.forEach(function (att) {
    if (opts.attachments && opts.include_docs) {
      fetchAttachment(doc, att);
    } else {
      doc._attachments[att].stub = true;
      checkDone();
    }
  });
}

// IDB-specific postprocessing necessary because
// we don't know whether we stored a true Blob or
// a base64-encoded string, and if it's a Blob it
// needs to be read outside of the transaction context
function postProcessAttachments(results, asBlob) {
  return Promise.all(results.map(function (row) {
    if (row.doc && row.doc._attachments) {
      var attNames = Object.keys(row.doc._attachments);
      return Promise.all(attNames.map(function (att) {
        var attObj = row.doc._attachments[att];
        if (!('body' in attObj)) { // already processed
          return;
        }
        var body = attObj.body;
        var type = attObj.content_type;
        return new Promise(function (resolve) {
          readBlobData(body, type, asBlob, function (data) {
            row.doc._attachments[att] = $inject_Object_assign(
              pick(attObj, ['digest', 'content_type']),
              {data: data}
            );
            resolve();
          });
        });
      }));
    }
  }));
}

function compactRevs(revs, docId, txn) {

  var possiblyOrphanedDigests = [];
  var seqStore = txn.objectStore(BY_SEQ_STORE);
  var attStore = txn.objectStore(ATTACH_STORE);
  var attAndSeqStore = txn.objectStore(ATTACH_AND_SEQ_STORE);
  var count = revs.length;

  function checkDone() {
    count--;
    if (!count) { // done processing all revs
      deleteOrphanedAttachments();
    }
  }

  function deleteOrphanedAttachments() {
    if (!possiblyOrphanedDigests.length) {
      return;
    }
    possiblyOrphanedDigests.forEach(function (digest) {
      var countReq = attAndSeqStore.index('digestSeq').count(
        IDBKeyRange.bound(
          digest + '::', digest + '::\uffff', false, false));
      countReq.onsuccess = function (e) {
        var count = e.target.result;
        if (!count) {
          // orphaned
          attStore.delete(digest);
        }
      };
    });
  }

  revs.forEach(function (rev) {
    var index = seqStore.index('_doc_id_rev');
    var key = docId + "::" + rev;
    index.getKey(key).onsuccess = function (e) {
      var seq = e.target.result;
      if (typeof seq !== 'number') {
        return checkDone();
      }
      seqStore.delete(seq);

      var cursor = attAndSeqStore.index('seq')
        .openCursor(IDBKeyRange.only(seq));

      cursor.onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
          var digest = cursor.value.digestSeq.split('::')[0];
          possiblyOrphanedDigests.push(digest);
          attAndSeqStore.delete(cursor.primaryKey);
          cursor.continue();
        } else { // done
          checkDone();
        }
      };
    };
  });
}

function openTransactionSafely(idb, stores, mode) {
  try {
    return {
      txn: idb.transaction(stores, mode)
    };
  } catch (err) {
    return {
      error: err
    };
  }
}

var changesHandler = new Changes();

function idbBulkDocs(dbOpts, req, opts, api, idb, callback) {
  var docInfos = req.docs;
  var txn;
  var docStore;
  var bySeqStore;
  var attachStore;
  var attachAndSeqStore;
  var metaStore;
  var docInfoError;
  var metaDoc;

  for (var i = 0, len = docInfos.length; i < len; i++) {
    var doc = docInfos[i];
    if (doc._id && isLocalId(doc._id)) {
      continue;
    }
    doc = docInfos[i] = parseDoc(doc, opts.new_edits, dbOpts);
    if (doc.error && !docInfoError) {
      docInfoError = doc;
    }
  }

  if (docInfoError) {
    return callback(docInfoError);
  }

  var allDocsProcessed = false;
  var docCountDelta = 0;
  var results = new Array(docInfos.length);
  var fetchedDocs = new ExportedMap();
  var preconditionErrored = false;
  var blobType = api._meta.blobSupport ? 'blob' : 'base64';

  preprocessAttachments(docInfos, blobType, function (err) {
    if (err) {
      return callback(err);
    }
    startTransaction();
  });

  function startTransaction() {

    var stores = [
      DOC_STORE, BY_SEQ_STORE,
      ATTACH_STORE,
      LOCAL_STORE, ATTACH_AND_SEQ_STORE,
      META_STORE
    ];
    var txnResult = openTransactionSafely(idb, stores, 'readwrite');
    if (txnResult.error) {
      return callback(txnResult.error);
    }
    txn = txnResult.txn;
    txn.onabort = idbError(callback);
    txn.ontimeout = idbError(callback);
    txn.oncomplete = complete;
    docStore = txn.objectStore(DOC_STORE);
    bySeqStore = txn.objectStore(BY_SEQ_STORE);
    attachStore = txn.objectStore(ATTACH_STORE);
    attachAndSeqStore = txn.objectStore(ATTACH_AND_SEQ_STORE);
    metaStore = txn.objectStore(META_STORE);

    metaStore.get(META_STORE).onsuccess = function (e) {
      metaDoc = e.target.result;
      updateDocCountIfReady();
    };

    verifyAttachments(function (err) {
      if (err) {
        preconditionErrored = true;
        return callback(err);
      }
      fetchExistingDocs();
    });
  }

  function onAllDocsProcessed() {
    allDocsProcessed = true;
    updateDocCountIfReady();
  }

  function idbProcessDocs() {
    processDocs(dbOpts.revs_limit, docInfos, api, fetchedDocs,
                txn, results, writeDoc, opts, onAllDocsProcessed);
  }

  function updateDocCountIfReady() {
    if (!metaDoc || !allDocsProcessed) {
      return;
    }
    // caching the docCount saves a lot of time in allDocs() and
    // info(), which is why we go to all the trouble of doing this
    metaDoc.docCount += docCountDelta;
    metaStore.put(metaDoc);
  }

  function fetchExistingDocs() {

    if (!docInfos.length) {
      return;
    }

    var numFetched = 0;

    function checkDone() {
      if (++numFetched === docInfos.length) {
        idbProcessDocs();
      }
    }

    function readMetadata(event) {
      var metadata = decodeMetadata(event.target.result);

      if (metadata) {
        fetchedDocs.set(metadata.id, metadata);
      }
      checkDone();
    }

    for (var i = 0, len = docInfos.length; i < len; i++) {
      var docInfo = docInfos[i];
      if (docInfo._id && isLocalId(docInfo._id)) {
        checkDone(); // skip local docs
        continue;
      }
      var req = docStore.get(docInfo.metadata.id);
      req.onsuccess = readMetadata;
    }
  }

  function complete() {
    if (preconditionErrored) {
      return;
    }

    changesHandler.notify(api._meta.name);
    callback(null, results);
  }

  function verifyAttachment(digest, callback) {

    var req = attachStore.get(digest);
    req.onsuccess = function (e) {
      if (!e.target.result) {
        var err = createError(MISSING_STUB,
          'unknown stub attachment with digest ' +
          digest);
        err.status = 412;
        callback(err);
      } else {
        callback();
      }
    };
  }

  function verifyAttachments(finish) {


    var digests = [];
    docInfos.forEach(function (docInfo) {
      if (docInfo.data && docInfo.data._attachments) {
        Object.keys(docInfo.data._attachments).forEach(function (filename) {
          var att = docInfo.data._attachments[filename];
          if (att.stub) {
            digests.push(att.digest);
          }
        });
      }
    });
    if (!digests.length) {
      return finish();
    }
    var numDone = 0;
    var err;

    function checkDone() {
      if (++numDone === digests.length) {
        finish(err);
      }
    }
    digests.forEach(function (digest) {
      verifyAttachment(digest, function (attErr) {
        if (attErr && !err) {
          err = attErr;
        }
        checkDone();
      });
    });
  }

  function writeDoc(docInfo, winningRev$$1, winningRevIsDeleted, newRevIsDeleted,
                    isUpdate, delta, resultsIdx, callback) {

    docInfo.metadata.winningRev = winningRev$$1;
    docInfo.metadata.deleted = winningRevIsDeleted;

    var doc = docInfo.data;
    doc._id = docInfo.metadata.id;
    doc._rev = docInfo.metadata.rev;

    if (newRevIsDeleted) {
      doc._deleted = true;
    }

    var hasAttachments = doc._attachments &&
      Object.keys(doc._attachments).length;
    if (hasAttachments) {
      return writeAttachments(docInfo, winningRev$$1, winningRevIsDeleted,
        isUpdate, resultsIdx, callback);
    }

    docCountDelta += delta;
    updateDocCountIfReady();

    finishDoc(docInfo, winningRev$$1, winningRevIsDeleted,
      isUpdate, resultsIdx, callback);
  }

  function finishDoc(docInfo, winningRev$$1, winningRevIsDeleted,
                     isUpdate, resultsIdx, callback) {

    var doc = docInfo.data;
    var metadata = docInfo.metadata;

    doc._doc_id_rev = metadata.id + '::' + metadata.rev;
    delete doc._id;
    delete doc._rev;

    function afterPutDoc(e) {
      var revsToDelete = docInfo.stemmedRevs || [];

      if (isUpdate && api.auto_compaction) {
        revsToDelete = revsToDelete.concat(compactTree(docInfo.metadata));
      }

      if (revsToDelete && revsToDelete.length) {
        compactRevs(revsToDelete, docInfo.metadata.id, txn);
      }

      metadata.seq = e.target.result;
      // Current _rev is calculated from _rev_tree on read
      // delete metadata.rev;
      var metadataToStore = encodeMetadata(metadata, winningRev$$1,
        winningRevIsDeleted);
      var metaDataReq = docStore.put(metadataToStore);
      metaDataReq.onsuccess = afterPutMetadata;
    }

    function afterPutDocError(e) {
      // ConstraintError, need to update, not put (see #1638 for details)
      e.preventDefault(); // avoid transaction abort
      e.stopPropagation(); // avoid transaction onerror
      var index = bySeqStore.index('_doc_id_rev');
      var getKeyReq = index.getKey(doc._doc_id_rev);
      getKeyReq.onsuccess = function (e) {
        var putReq = bySeqStore.put(doc, e.target.result);
        putReq.onsuccess = afterPutDoc;
      };
    }

    function afterPutMetadata() {
      results[resultsIdx] = {
        ok: true,
        id: metadata.id,
        rev: metadata.rev
      };
      fetchedDocs.set(docInfo.metadata.id, docInfo.metadata);
      insertAttachmentMappings(docInfo, metadata.seq, callback);
    }

    var putReq = bySeqStore.put(doc);

    putReq.onsuccess = afterPutDoc;
    putReq.onerror = afterPutDocError;
  }

  function writeAttachments(docInfo, winningRev$$1, winningRevIsDeleted,
                            isUpdate, resultsIdx, callback) {


    var doc = docInfo.data;

    var numDone = 0;
    var attachments = Object.keys(doc._attachments);

    function collectResults() {
      if (numDone === attachments.length) {
        finishDoc(docInfo, winningRev$$1, winningRevIsDeleted,
          isUpdate, resultsIdx, callback);
      }
    }

    function attachmentSaved() {
      numDone++;
      collectResults();
    }

    attachments.forEach(function (key) {
      var att = docInfo.data._attachments[key];
      if (!att.stub) {
        var data = att.data;
        delete att.data;
        att.revpos = parseInt(winningRev$$1, 10);
        var digest = att.digest;
        saveAttachment(digest, data, attachmentSaved);
      } else {
        numDone++;
        collectResults();
      }
    });
  }

  // map seqs to attachment digests, which
  // we will need later during compaction
  function insertAttachmentMappings(docInfo, seq, callback) {

    var attsAdded = 0;
    var attsToAdd = Object.keys(docInfo.data._attachments || {});

    if (!attsToAdd.length) {
      return callback();
    }

    function checkDone() {
      if (++attsAdded === attsToAdd.length) {
        callback();
      }
    }

    function add(att) {
      var digest = docInfo.data._attachments[att].digest;
      var req = attachAndSeqStore.put({
        seq: seq,
        digestSeq: digest + '::' + seq
      });

      req.onsuccess = checkDone;
      req.onerror = function (e) {
        // this callback is for a constaint error, which we ignore
        // because this docid/rev has already been associated with
        // the digest (e.g. when new_edits == false)
        e.preventDefault(); // avoid transaction abort
        e.stopPropagation(); // avoid transaction onerror
        checkDone();
      };
    }
    for (var i = 0; i < attsToAdd.length; i++) {
      add(attsToAdd[i]); // do in parallel
    }
  }

  function saveAttachment(digest, data, callback) {


    var getKeyReq = attachStore.count(digest);
    getKeyReq.onsuccess = function (e) {
      var count = e.target.result;
      if (count) {
        return callback(); // already exists
      }
      var newAtt = {
        digest: digest,
        body: data
      };
      var putReq = attachStore.put(newAtt);
      putReq.onsuccess = callback;
    };
  }
}

// Abstraction over IDBCursor and getAll()/getAllKeys() that allows us to batch our operations
// while falling back to a normal IDBCursor operation on browsers that don't support getAll() or
// getAllKeys(). This allows for a much faster implementation than just straight-up cursors, because
// we're not processing each document one-at-a-time.
function runBatchedCursor(objectStore, keyRange, descending, batchSize, onBatch) {

  if (batchSize === -1) {
    batchSize = 1000;
  }

  // Bail out of getAll()/getAllKeys() in the following cases:
  // 1) either method is unsupported - we need both
  // 2) batchSize is 1 (might as well use IDBCursor)
  // 3) descending – no real way to do this via getAll()/getAllKeys()

  var useGetAll = typeof objectStore.getAll === 'function' &&
    typeof objectStore.getAllKeys === 'function' &&
    batchSize > 1 && !descending;

  var keysBatch;
  var valuesBatch;
  var pseudoCursor;

  function onGetAll(e) {
    valuesBatch = e.target.result;
    if (keysBatch) {
      onBatch(keysBatch, valuesBatch, pseudoCursor);
    }
  }

  function onGetAllKeys(e) {
    keysBatch = e.target.result;
    if (valuesBatch) {
      onBatch(keysBatch, valuesBatch, pseudoCursor);
    }
  }

  function continuePseudoCursor() {
    if (!keysBatch.length) { // no more results
      return onBatch();
    }
    // fetch next batch, exclusive start
    var lastKey = keysBatch[keysBatch.length - 1];
    var newKeyRange;
    if (keyRange && keyRange.upper) {
      try {
        newKeyRange = IDBKeyRange.bound(lastKey, keyRange.upper,
          true, keyRange.upperOpen);
      } catch (e) {
        if (e.name === "DataError" && e.code === 0) {
          return onBatch(); // we're done, startkey and endkey are equal
        }
      }
    } else {
      newKeyRange = IDBKeyRange.lowerBound(lastKey, true);
    }
    keyRange = newKeyRange;
    keysBatch = null;
    valuesBatch = null;
    objectStore.getAll(keyRange, batchSize).onsuccess = onGetAll;
    objectStore.getAllKeys(keyRange, batchSize).onsuccess = onGetAllKeys;
  }

  function onCursor(e) {
    var cursor = e.target.result;
    if (!cursor) { // done
      return onBatch();
    }
    // regular IDBCursor acts like a batch where batch size is always 1
    onBatch([cursor.key], [cursor.value], cursor);
  }

  if (useGetAll) {
    pseudoCursor = {"continue": continuePseudoCursor};
    objectStore.getAll(keyRange, batchSize).onsuccess = onGetAll;
    objectStore.getAllKeys(keyRange, batchSize).onsuccess = onGetAllKeys;
  } else if (descending) {
    objectStore.openCursor(keyRange, 'prev').onsuccess = onCursor;
  } else {
    objectStore.openCursor(keyRange).onsuccess = onCursor;
  }
}

// simple shim for objectStore.getAll(), falling back to IDBCursor
function getAll(objectStore, keyRange, onSuccess) {
  if (typeof objectStore.getAll === 'function') {
    // use native getAll
    objectStore.getAll(keyRange).onsuccess = onSuccess;
    return;
  }
  // fall back to cursors
  var values = [];

  function onCursor(e) {
    var cursor = e.target.result;
    if (cursor) {
      values.push(cursor.value);
      cursor.continue();
    } else {
      onSuccess({
        target: {
          result: values
        }
      });
    }
  }

  objectStore.openCursor(keyRange).onsuccess = onCursor;
}

function allDocsKeys(keys, docStore, onBatch) {
  // It's not guaranted to be returned in right order  
  var valuesBatch = new Array(keys.length);
  var count = 0;
  keys.forEach(function (key, index) {
    docStore.get(key).onsuccess = function (event) {
      if (event.target.result) {
        valuesBatch[index] = event.target.result;
      } else {
        valuesBatch[index] = {key: key, error: 'not_found'};
      }
      count++;
      if (count === keys.length) {
        onBatch(keys, valuesBatch, {});
      }
    };
  });
}

function createKeyRange(start, end, inclusiveEnd, key, descending) {
  try {
    if (start && end) {
      if (descending) {
        return IDBKeyRange.bound(end, start, !inclusiveEnd, false);
      } else {
        return IDBKeyRange.bound(start, end, false, !inclusiveEnd);
      }
    } else if (start) {
      if (descending) {
        return IDBKeyRange.upperBound(start);
      } else {
        return IDBKeyRange.lowerBound(start);
      }
    } else if (end) {
      if (descending) {
        return IDBKeyRange.lowerBound(end, !inclusiveEnd);
      } else {
        return IDBKeyRange.upperBound(end, !inclusiveEnd);
      }
    } else if (key) {
      return IDBKeyRange.only(key);
    }
  } catch (e) {
    return {error: e};
  }
  return null;
}

function idbAllDocs(opts, idb, callback) {
  var start = 'startkey' in opts ? opts.startkey : false;
  var end = 'endkey' in opts ? opts.endkey : false;
  var key = 'key' in opts ? opts.key : false;
  var keys = 'keys' in opts ? opts.keys : false; 
  var skip = opts.skip || 0;
  var limit = typeof opts.limit === 'number' ? opts.limit : -1;
  var inclusiveEnd = opts.inclusive_end !== false;

  var keyRange ; 
  var keyRangeError;
  if (!keys) {
    keyRange = createKeyRange(start, end, inclusiveEnd, key, opts.descending);
    keyRangeError = keyRange && keyRange.error;
    if (keyRangeError && 
      !(keyRangeError.name === "DataError" && keyRangeError.code === 0)) {
      // DataError with error code 0 indicates start is less than end, so
      // can just do an empty query. Else need to throw
      return callback(createError(IDB_ERROR,
        keyRangeError.name, keyRangeError.message));
    }
  }

  var stores = [DOC_STORE, BY_SEQ_STORE, META_STORE];

  if (opts.attachments) {
    stores.push(ATTACH_STORE);
  }
  var txnResult = openTransactionSafely(idb, stores, 'readonly');
  if (txnResult.error) {
    return callback(txnResult.error);
  }
  var txn = txnResult.txn;
  txn.oncomplete = onTxnComplete;
  txn.onabort = idbError(callback);
  var docStore = txn.objectStore(DOC_STORE);
  var seqStore = txn.objectStore(BY_SEQ_STORE);
  var metaStore = txn.objectStore(META_STORE);
  var docIdRevIndex = seqStore.index('_doc_id_rev');
  var results = [];
  var docCount;
  var updateSeq;

  metaStore.get(META_STORE).onsuccess = function (e) {
    docCount = e.target.result.docCount;
  };

  /* istanbul ignore if */
  if (opts.update_seq) {
    getMaxUpdateSeq(seqStore, function (e) { 
      if (e.target.result && e.target.result.length > 0) {
        updateSeq = e.target.result[0];
      }
    });
  }

  function getMaxUpdateSeq(objectStore, onSuccess) {
    function onCursor(e) {
      var cursor = e.target.result;
      var maxKey = undefined;
      if (cursor && cursor.key) {
        maxKey = cursor.key;
      } 
      return onSuccess({
        target: {
          result: [maxKey]
        }
      });
    }
    objectStore.openCursor(null, 'prev').onsuccess = onCursor;
  }

  // if the user specifies include_docs=true, then we don't
  // want to block the main cursor while we're fetching the doc
  function fetchDocAsynchronously(metadata, row, winningRev$$1) {
    var key = metadata.id + "::" + winningRev$$1;
    docIdRevIndex.get(key).onsuccess =  function onGetDoc(e) {
      row.doc = decodeDoc(e.target.result) || {};
      if (opts.conflicts) {
        var conflicts = collectConflicts(metadata);
        if (conflicts.length) {
          row.doc._conflicts = conflicts;
        }
      }
      fetchAttachmentsIfNecessary(row.doc, opts, txn);
    };
  }

  function allDocsInner(winningRev$$1, metadata) {
    var row = {
      id: metadata.id,
      key: metadata.id,
      value: {
        rev: winningRev$$1
      }
    };
    var deleted = metadata.deleted;
    if (deleted) {
      if (keys) {
        results.push(row);
        // deleted docs are okay with "keys" requests
        row.value.deleted = true;
        row.doc = null;
      }
    } else if (skip-- <= 0) {
      results.push(row);
      if (opts.include_docs) {
        fetchDocAsynchronously(metadata, row, winningRev$$1);
      }
    }
  }

  function processBatch(batchValues) {
    for (var i = 0, len = batchValues.length; i < len; i++) {
      if (results.length === limit) {
        break;
      }
      var batchValue = batchValues[i];
      if (batchValue.error && keys) {
        // key was not found with "keys" requests
        results.push(batchValue);
        continue;
      }
      var metadata = decodeMetadata(batchValue);
      var winningRev$$1 = metadata.winningRev;
      allDocsInner(winningRev$$1, metadata);
    }
  }

  function onBatch(batchKeys, batchValues, cursor) {
    if (!cursor) {
      return;
    }
    processBatch(batchValues);
    if (results.length < limit) {
      cursor.continue();
    }
  }

  function onGetAll(e) {
    var values = e.target.result;
    if (opts.descending) {
      values = values.reverse();
    }
    processBatch(values);
  }

  function onResultsReady() {
    var returnVal = {
      total_rows: docCount,
      offset: opts.skip,
      rows: results
    };
    
    /* istanbul ignore if */
    if (opts.update_seq && updateSeq !== undefined) {
      returnVal.update_seq = updateSeq;
    }
    callback(null, returnVal);
  }

  function onTxnComplete() {
    if (opts.attachments) {
      postProcessAttachments(results, opts.binary).then(onResultsReady);
    } else {
      onResultsReady();
    }
  }

  // don't bother doing any requests if start > end or limit === 0
  if (keyRangeError || limit === 0) {
    return;
  }
  if (keys) {
    return allDocsKeys(opts.keys, docStore, onBatch);
  }
  if (limit === -1) { // just fetch everything
    return getAll(docStore, keyRange, onGetAll);
  }
  // else do a cursor
  // choose a batch size based on the skip, since we'll need to skip that many
  runBatchedCursor(docStore, keyRange, opts.descending, limit + skip, onBatch);
}

//
// Blobs are not supported in all versions of IndexedDB, notably
// Chrome <37 and Android <5. In those versions, storing a blob will throw.
//
// Various other blob bugs exist in Chrome v37-42 (inclusive).
// Detecting them is expensive and confusing to users, and Chrome 37-42
// is at very low usage worldwide, so we do a hacky userAgent check instead.
//
// content-type bug: https://code.google.com/p/chromium/issues/detail?id=408120
// 404 bug: https://code.google.com/p/chromium/issues/detail?id=447916
// FileReader bug: https://code.google.com/p/chromium/issues/detail?id=447836
//
function checkBlobSupport(txn) {
  return new Promise(function (resolve) {
    var blob$$1 = createBlob(['']);
    var req = txn.objectStore(DETECT_BLOB_SUPPORT_STORE).put(blob$$1, 'key');

    req.onsuccess = function () {
      var matchedChrome = navigator.userAgent.match(/Chrome\/(\d+)/);
      var matchedEdge = navigator.userAgent.match(/Edge\//);
      // MS Edge pretends to be Chrome 42:
      // https://msdn.microsoft.com/en-us/library/hh869301%28v=vs.85%29.aspx
      resolve(matchedEdge || !matchedChrome ||
        parseInt(matchedChrome[1], 10) >= 43);
    };

    req.onerror = txn.onabort = function (e) {
      // If the transaction aborts now its due to not being able to
      // write to the database, likely due to the disk being full
      e.preventDefault();
      e.stopPropagation();
      resolve(false);
    };
  }).catch(function () {
    return false; // error, so assume unsupported
  });
}

function countDocs(txn, cb) {
  var index = txn.objectStore(DOC_STORE).index('deletedOrLocal');
  index.count(IDBKeyRange.only('0')).onsuccess = function (e) {
    cb(e.target.result);
  };
}

// This task queue ensures that IDB open calls are done in their own tick

var running = false;
var queue = [];

function tryCode(fun, err, res, PouchDB) {
  try {
    fun(err, res);
  } catch (err) {
    // Shouldn't happen, but in some odd cases
    // IndexedDB implementations might throw a sync
    // error, in which case this will at least log it.
    PouchDB.emit('error', err);
  }
}

function applyNext() {
  if (running || !queue.length) {
    return;
  }
  running = true;
  queue.shift()();
}

function enqueueTask(action, callback, PouchDB) {
  queue.push(function runAction() {
    action(function runCallback(err, res) {
      tryCode(callback, err, res, PouchDB);
      running = false;
      nextTick(function runNext() {
        applyNext(PouchDB);
      });
    });
  });
  applyNext();
}

function changes(opts, api, dbName, idb) {
  opts = clone(opts);

  if (opts.continuous) {
    var id = dbName + ':' + uuid();
    changesHandler.addListener(dbName, id, api, opts);
    changesHandler.notify(dbName);
    return {
      cancel: function () {
        changesHandler.removeListener(dbName, id);
      }
    };
  }

  var docIds = opts.doc_ids && new ExportedSet(opts.doc_ids);

  opts.since = opts.since || 0;
  var lastSeq = opts.since;

  var limit = 'limit' in opts ? opts.limit : -1;
  if (limit === 0) {
    limit = 1; // per CouchDB _changes spec
  }

  var results = [];
  var numResults = 0;
  var filter = filterChange(opts);
  var docIdsToMetadata = new ExportedMap();

  var txn;
  var bySeqStore;
  var docStore;
  var docIdRevIndex;

  function onBatch(batchKeys, batchValues, cursor) {
    if (!cursor || !batchKeys.length) { // done
      return;
    }

    var winningDocs = new Array(batchKeys.length);
    var metadatas = new Array(batchKeys.length);

    function processMetadataAndWinningDoc(metadata, winningDoc) {
      var change = opts.processChange(winningDoc, metadata, opts);
      lastSeq = change.seq = metadata.seq;

      var filtered = filter(change);
      if (typeof filtered === 'object') { // anything but true/false indicates error
        return Promise.reject(filtered);
      }

      if (!filtered) {
        return Promise.resolve();
      }
      numResults++;
      if (opts.return_docs) {
        results.push(change);
      }
      // process the attachment immediately
      // for the benefit of live listeners
      if (opts.attachments && opts.include_docs) {
        return new Promise(function (resolve) {
          fetchAttachmentsIfNecessary(winningDoc, opts, txn, function () {
            postProcessAttachments([change], opts.binary).then(function () {
              resolve(change);
            });
          });
        });
      } else {
        return Promise.resolve(change);
      }
    }

    function onBatchDone() {
      var promises = [];
      for (var i = 0, len = winningDocs.length; i < len; i++) {
        if (numResults === limit) {
          break;
        }
        var winningDoc = winningDocs[i];
        if (!winningDoc) {
          continue;
        }
        var metadata = metadatas[i];
        promises.push(processMetadataAndWinningDoc(metadata, winningDoc));
      }

      Promise.all(promises).then(function (changes) {
        for (var i = 0, len = changes.length; i < len; i++) {
          if (changes[i]) {
            opts.onChange(changes[i]);
          }
        }
      }).catch(opts.complete);

      if (numResults !== limit) {
        cursor.continue();
      }
    }

    // Fetch all metadatas/winningdocs from this batch in parallel, then process
    // them all only once all data has been collected. This is done in parallel
    // because it's faster than doing it one-at-a-time.
    var numDone = 0;
    batchValues.forEach(function (value, i) {
      var doc = decodeDoc(value);
      var seq = batchKeys[i];
      fetchWinningDocAndMetadata(doc, seq, function (metadata, winningDoc) {
        metadatas[i] = metadata;
        winningDocs[i] = winningDoc;
        if (++numDone === batchKeys.length) {
          onBatchDone();
        }
      });
    });
  }

  function onGetMetadata(doc, seq, metadata, cb) {
    if (metadata.seq !== seq) {
      // some other seq is later
      return cb();
    }

    if (metadata.winningRev === doc._rev) {
      // this is the winning doc
      return cb(metadata, doc);
    }

    // fetch winning doc in separate request
    var docIdRev = doc._id + '::' + metadata.winningRev;
    var req = docIdRevIndex.get(docIdRev);
    req.onsuccess = function (e) {
      cb(metadata, decodeDoc(e.target.result));
    };
  }

  function fetchWinningDocAndMetadata(doc, seq, cb) {
    if (docIds && !docIds.has(doc._id)) {
      return cb();
    }

    var metadata = docIdsToMetadata.get(doc._id);
    if (metadata) { // cached
      return onGetMetadata(doc, seq, metadata, cb);
    }
    // metadata not cached, have to go fetch it
    docStore.get(doc._id).onsuccess = function (e) {
      metadata = decodeMetadata(e.target.result);
      docIdsToMetadata.set(doc._id, metadata);
      onGetMetadata(doc, seq, metadata, cb);
    };
  }

  function finish() {
    opts.complete(null, {
      results: results,
      last_seq: lastSeq
    });
  }

  function onTxnComplete() {
    if (!opts.continuous && opts.attachments) {
      // cannot guarantee that postProcessing was already done,
      // so do it again
      postProcessAttachments(results).then(finish);
    } else {
      finish();
    }
  }

  var objectStores = [DOC_STORE, BY_SEQ_STORE];
  if (opts.attachments) {
    objectStores.push(ATTACH_STORE);
  }
  var txnResult = openTransactionSafely(idb, objectStores, 'readonly');
  if (txnResult.error) {
    return opts.complete(txnResult.error);
  }
  txn = txnResult.txn;
  txn.onabort = idbError(opts.complete);
  txn.oncomplete = onTxnComplete;

  bySeqStore = txn.objectStore(BY_SEQ_STORE);
  docStore = txn.objectStore(DOC_STORE);
  docIdRevIndex = bySeqStore.index('_doc_id_rev');

  var keyRange = (opts.since && !opts.descending) ?
    IDBKeyRange.lowerBound(opts.since, true) : null;

  runBatchedCursor(bySeqStore, keyRange, opts.descending, limit, onBatch);
}

var cachedDBs = new ExportedMap();
var blobSupportPromise;
var openReqList = new ExportedMap();

function IdbPouch(opts, callback) {
  var api = this;

  enqueueTask(function (thisCallback) {
    init(api, opts, thisCallback);
  }, callback, api.constructor);
}

function init(api, opts, callback) {

  var dbName = opts.name;

  var idb = null;
  api._meta = null;

  // called when creating a fresh new database
  function createSchema(db) {
    var docStore = db.createObjectStore(DOC_STORE, {keyPath : 'id'});
    db.createObjectStore(BY_SEQ_STORE, {autoIncrement: true})
      .createIndex('_doc_id_rev', '_doc_id_rev', {unique: true});
    db.createObjectStore(ATTACH_STORE, {keyPath: 'digest'});
    db.createObjectStore(META_STORE, {keyPath: 'id', autoIncrement: false});
    db.createObjectStore(DETECT_BLOB_SUPPORT_STORE);

    // added in v2
    docStore.createIndex('deletedOrLocal', 'deletedOrLocal', {unique : false});

    // added in v3
    db.createObjectStore(LOCAL_STORE, {keyPath: '_id'});

    // added in v4
    var attAndSeqStore = db.createObjectStore(ATTACH_AND_SEQ_STORE,
      {autoIncrement: true});
    attAndSeqStore.createIndex('seq', 'seq');
    attAndSeqStore.createIndex('digestSeq', 'digestSeq', {unique: true});
  }

  // migration to version 2
  // unfortunately "deletedOrLocal" is a misnomer now that we no longer
  // store local docs in the main doc-store, but whaddyagonnado
  function addDeletedOrLocalIndex(txn, callback) {
    var docStore = txn.objectStore(DOC_STORE);
    docStore.createIndex('deletedOrLocal', 'deletedOrLocal', {unique : false});

    docStore.openCursor().onsuccess = function (event) {
      var cursor = event.target.result;
      if (cursor) {
        var metadata = cursor.value;
        var deleted = isDeleted(metadata);
        metadata.deletedOrLocal = deleted ? "1" : "0";
        docStore.put(metadata);
        cursor.continue();
      } else {
        callback();
      }
    };
  }

  // migration to version 3 (part 1)
  function createLocalStoreSchema(db) {
    db.createObjectStore(LOCAL_STORE, {keyPath: '_id'})
      .createIndex('_doc_id_rev', '_doc_id_rev', {unique: true});
  }

  // migration to version 3 (part 2)
  function migrateLocalStore(txn, cb) {
    var localStore = txn.objectStore(LOCAL_STORE);
    var docStore = txn.objectStore(DOC_STORE);
    var seqStore = txn.objectStore(BY_SEQ_STORE);

    var cursor = docStore.openCursor();
    cursor.onsuccess = function (event) {
      var cursor = event.target.result;
      if (cursor) {
        var metadata = cursor.value;
        var docId = metadata.id;
        var local = isLocalId(docId);
        var rev = winningRev(metadata);
        if (local) {
          var docIdRev = docId + "::" + rev;
          // remove all seq entries
          // associated with this docId
          var start = docId + "::";
          var end = docId + "::~";
          var index = seqStore.index('_doc_id_rev');
          var range = IDBKeyRange.bound(start, end, false, false);
          var seqCursor = index.openCursor(range);
          seqCursor.onsuccess = function (e) {
            seqCursor = e.target.result;
            if (!seqCursor) {
              // done
              docStore.delete(cursor.primaryKey);
              cursor.continue();
            } else {
              var data = seqCursor.value;
              if (data._doc_id_rev === docIdRev) {
                localStore.put(data);
              }
              seqStore.delete(seqCursor.primaryKey);
              seqCursor.continue();
            }
          };
        } else {
          cursor.continue();
        }
      } else if (cb) {
        cb();
      }
    };
  }

  // migration to version 4 (part 1)
  function addAttachAndSeqStore(db) {
    var attAndSeqStore = db.createObjectStore(ATTACH_AND_SEQ_STORE,
      {autoIncrement: true});
    attAndSeqStore.createIndex('seq', 'seq');
    attAndSeqStore.createIndex('digestSeq', 'digestSeq', {unique: true});
  }

  // migration to version 4 (part 2)
  function migrateAttsAndSeqs(txn, callback) {
    var seqStore = txn.objectStore(BY_SEQ_STORE);
    var attStore = txn.objectStore(ATTACH_STORE);
    var attAndSeqStore = txn.objectStore(ATTACH_AND_SEQ_STORE);

    // need to actually populate the table. this is the expensive part,
    // so as an optimization, check first that this database even
    // contains attachments
    var req = attStore.count();
    req.onsuccess = function (e) {
      var count = e.target.result;
      if (!count) {
        return callback(); // done
      }

      seqStore.openCursor().onsuccess = function (e) {
        var cursor = e.target.result;
        if (!cursor) {
          return callback(); // done
        }
        var doc = cursor.value;
        var seq = cursor.primaryKey;
        var atts = Object.keys(doc._attachments || {});
        var digestMap = {};
        for (var j = 0; j < atts.length; j++) {
          var att = doc._attachments[atts[j]];
          digestMap[att.digest] = true; // uniq digests, just in case
        }
        var digests = Object.keys(digestMap);
        for (j = 0; j < digests.length; j++) {
          var digest = digests[j];
          attAndSeqStore.put({
            seq: seq,
            digestSeq: digest + '::' + seq
          });
        }
        cursor.continue();
      };
    };
  }

  // migration to version 5
  // Instead of relying on on-the-fly migration of metadata,
  // this brings the doc-store to its modern form:
  // - metadata.winningrev
  // - metadata.seq
  // - stringify the metadata when storing it
  function migrateMetadata(txn) {

    function decodeMetadataCompat(storedObject) {
      if (!storedObject.data) {
        // old format, when we didn't store it stringified
        storedObject.deleted = storedObject.deletedOrLocal === '1';
        return storedObject;
      }
      return decodeMetadata(storedObject);
    }

    // ensure that every metadata has a winningRev and seq,
    // which was previously created on-the-fly but better to migrate
    var bySeqStore = txn.objectStore(BY_SEQ_STORE);
    var docStore = txn.objectStore(DOC_STORE);
    var cursor = docStore.openCursor();
    cursor.onsuccess = function (e) {
      var cursor = e.target.result;
      if (!cursor) {
        return; // done
      }
      var metadata = decodeMetadataCompat(cursor.value);

      metadata.winningRev = metadata.winningRev ||
        winningRev(metadata);

      function fetchMetadataSeq() {
        // metadata.seq was added post-3.2.0, so if it's missing,
        // we need to fetch it manually
        var start = metadata.id + '::';
        var end = metadata.id + '::\uffff';
        var req = bySeqStore.index('_doc_id_rev').openCursor(
          IDBKeyRange.bound(start, end));

        var metadataSeq = 0;
        req.onsuccess = function (e) {
          var cursor = e.target.result;
          if (!cursor) {
            metadata.seq = metadataSeq;
            return onGetMetadataSeq();
          }
          var seq = cursor.primaryKey;
          if (seq > metadataSeq) {
            metadataSeq = seq;
          }
          cursor.continue();
        };
      }

      function onGetMetadataSeq() {
        var metadataToStore = encodeMetadata(metadata,
          metadata.winningRev, metadata.deleted);

        var req = docStore.put(metadataToStore);
        req.onsuccess = function () {
          cursor.continue();
        };
      }

      if (metadata.seq) {
        return onGetMetadataSeq();
      }

      fetchMetadataSeq();
    };

  }

  api._remote = false;
  api.type = function () {
    return 'idb';
  };

  api._id = toPromise(function (callback) {
    callback(null, api._meta.instanceId);
  });

  api._bulkDocs = function idb_bulkDocs(req, reqOpts, callback) {
    idbBulkDocs(opts, req, reqOpts, api, idb, callback);
  };

  // First we look up the metadata in the ids database, then we fetch the
  // current revision(s) from the by sequence store
  api._get = function idb_get(id, opts, callback) {
    var doc;
    var metadata;
    var err;
    var txn = opts.ctx;
    if (!txn) {
      var txnResult = openTransactionSafely(idb,
        [DOC_STORE, BY_SEQ_STORE, ATTACH_STORE], 'readonly');
      if (txnResult.error) {
        return callback(txnResult.error);
      }
      txn = txnResult.txn;
    }

    function finish() {
      callback(err, {doc: doc, metadata: metadata, ctx: txn});
    }

    txn.objectStore(DOC_STORE).get(id).onsuccess = function (e) {
      metadata = decodeMetadata(e.target.result);
      // we can determine the result here if:
      // 1. there is no such document
      // 2. the document is deleted and we don't ask about specific rev
      // When we ask with opts.rev we expect the answer to be either
      // doc (possibly with _deleted=true) or missing error
      if (!metadata) {
        err = createError(MISSING_DOC, 'missing');
        return finish();
      }

      var rev;
      if (!opts.rev) {
        rev = metadata.winningRev;
        var deleted = isDeleted(metadata);
        if (deleted) {
          err = createError(MISSING_DOC, "deleted");
          return finish();
        }
      } else {
        rev = opts.latest ? latest(opts.rev, metadata) : opts.rev;
      }

      var objectStore = txn.objectStore(BY_SEQ_STORE);
      var key = metadata.id + '::' + rev;

      objectStore.index('_doc_id_rev').get(key).onsuccess = function (e) {
        doc = e.target.result;
        if (doc) {
          doc = decodeDoc(doc);
        }
        if (!doc) {
          err = createError(MISSING_DOC, 'missing');
          return finish();
        }
        finish();
      };
    };
  };

  api._getAttachment = function (docId, attachId, attachment, opts, callback) {
    var txn;
    if (opts.ctx) {
      txn = opts.ctx;
    } else {
      var txnResult = openTransactionSafely(idb,
        [DOC_STORE, BY_SEQ_STORE, ATTACH_STORE], 'readonly');
      if (txnResult.error) {
        return callback(txnResult.error);
      }
      txn = txnResult.txn;
    }
    var digest = attachment.digest;
    var type = attachment.content_type;

    txn.objectStore(ATTACH_STORE).get(digest).onsuccess = function (e) {
      var body = e.target.result.body;
      readBlobData(body, type, opts.binary, function (blobData) {
        callback(null, blobData);
      });
    };
  };

  api._info = function idb_info(callback) {
    var updateSeq;
    var docCount;

    var txnResult = openTransactionSafely(idb, [META_STORE, BY_SEQ_STORE], 'readonly');
    if (txnResult.error) {
      return callback(txnResult.error);
    }
    var txn = txnResult.txn;
    txn.objectStore(META_STORE).get(META_STORE).onsuccess = function (e) {
      docCount = e.target.result.docCount;
    };
    txn.objectStore(BY_SEQ_STORE).openCursor(null, 'prev').onsuccess = function (e) {
      var cursor = e.target.result;
      updateSeq = cursor ? cursor.key : 0;
    };

    txn.oncomplete = function () {
      callback(null, {
        doc_count: docCount,
        update_seq: updateSeq,
        // for debugging
        idb_attachment_format: (api._meta.blobSupport ? 'binary' : 'base64')
      });
    };
  };

  api._allDocs = function idb_allDocs(opts, callback) {
    idbAllDocs(opts, idb, callback);
  };

  api._changes = function idbChanges(opts) {
    return changes(opts, api, dbName, idb);
  };

  api._close = function (callback) {
    // https://developer.mozilla.org/en-US/docs/IndexedDB/IDBDatabase#close
    // "Returns immediately and closes the connection in a separate thread..."
    idb.close();
    cachedDBs.delete(dbName);
    callback();
  };

  api._getRevisionTree = function (docId, callback) {
    var txnResult = openTransactionSafely(idb, [DOC_STORE], 'readonly');
    if (txnResult.error) {
      return callback(txnResult.error);
    }
    var txn = txnResult.txn;
    var req = txn.objectStore(DOC_STORE).get(docId);
    req.onsuccess = function (event) {
      var doc = decodeMetadata(event.target.result);
      if (!doc) {
        callback(createError(MISSING_DOC));
      } else {
        callback(null, doc.rev_tree);
      }
    };
  };

  // This function removes revisions of document docId
  // which are listed in revs and sets this document
  // revision to to rev_tree
  api._doCompaction = function (docId, revs, callback) {
    var stores = [
      DOC_STORE,
      BY_SEQ_STORE,
      ATTACH_STORE,
      ATTACH_AND_SEQ_STORE
    ];
    var txnResult = openTransactionSafely(idb, stores, 'readwrite');
    if (txnResult.error) {
      return callback(txnResult.error);
    }
    var txn = txnResult.txn;

    var docStore = txn.objectStore(DOC_STORE);

    docStore.get(docId).onsuccess = function (event) {
      var metadata = decodeMetadata(event.target.result);
      traverseRevTree(metadata.rev_tree, function (isLeaf, pos,
                                                         revHash, ctx, opts) {
        var rev = pos + '-' + revHash;
        if (revs.indexOf(rev) !== -1) {
          opts.status = 'missing';
        }
      });
      compactRevs(revs, docId, txn);
      var winningRev$$1 = metadata.winningRev;
      var deleted = metadata.deleted;
      txn.objectStore(DOC_STORE).put(
        encodeMetadata(metadata, winningRev$$1, deleted));
    };
    txn.onabort = idbError(callback);
    txn.oncomplete = function () {
      callback();
    };
  };


  api._getLocal = function (id, callback) {
    var txnResult = openTransactionSafely(idb, [LOCAL_STORE], 'readonly');
    if (txnResult.error) {
      return callback(txnResult.error);
    }
    var tx = txnResult.txn;
    var req = tx.objectStore(LOCAL_STORE).get(id);

    req.onerror = idbError(callback);
    req.onsuccess = function (e) {
      var doc = e.target.result;
      if (!doc) {
        callback(createError(MISSING_DOC));
      } else {
        delete doc['_doc_id_rev']; // for backwards compat
        callback(null, doc);
      }
    };
  };

  api._putLocal = function (doc, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    delete doc._revisions; // ignore this, trust the rev
    var oldRev = doc._rev;
    var id = doc._id;
    if (!oldRev) {
      doc._rev = '0-1';
    } else {
      doc._rev = '0-' + (parseInt(oldRev.split('-')[1], 10) + 1);
    }

    var tx = opts.ctx;
    var ret;
    if (!tx) {
      var txnResult = openTransactionSafely(idb, [LOCAL_STORE], 'readwrite');
      if (txnResult.error) {
        return callback(txnResult.error);
      }
      tx = txnResult.txn;
      tx.onerror = idbError(callback);
      tx.oncomplete = function () {
        if (ret) {
          callback(null, ret);
        }
      };
    }

    var oStore = tx.objectStore(LOCAL_STORE);
    var req;
    if (oldRev) {
      req = oStore.get(id);
      req.onsuccess = function (e) {
        var oldDoc = e.target.result;
        if (!oldDoc || oldDoc._rev !== oldRev) {
          callback(createError(REV_CONFLICT));
        } else { // update
          var req = oStore.put(doc);
          req.onsuccess = function () {
            ret = {ok: true, id: doc._id, rev: doc._rev};
            if (opts.ctx) { // return immediately
              callback(null, ret);
            }
          };
        }
      };
    } else { // new doc
      req = oStore.add(doc);
      req.onerror = function (e) {
        // constraint error, already exists
        callback(createError(REV_CONFLICT));
        e.preventDefault(); // avoid transaction abort
        e.stopPropagation(); // avoid transaction onerror
      };
      req.onsuccess = function () {
        ret = {ok: true, id: doc._id, rev: doc._rev};
        if (opts.ctx) { // return immediately
          callback(null, ret);
        }
      };
    }
  };

  api._removeLocal = function (doc, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    var tx = opts.ctx;
    if (!tx) {
      var txnResult = openTransactionSafely(idb, [LOCAL_STORE], 'readwrite');
      if (txnResult.error) {
        return callback(txnResult.error);
      }
      tx = txnResult.txn;
      tx.oncomplete = function () {
        if (ret) {
          callback(null, ret);
        }
      };
    }
    var ret;
    var id = doc._id;
    var oStore = tx.objectStore(LOCAL_STORE);
    var req = oStore.get(id);

    req.onerror = idbError(callback);
    req.onsuccess = function (e) {
      var oldDoc = e.target.result;
      if (!oldDoc || oldDoc._rev !== doc._rev) {
        callback(createError(MISSING_DOC));
      } else {
        oStore.delete(id);
        ret = {ok: true, id: id, rev: '0-0'};
        if (opts.ctx) { // return immediately
          callback(null, ret);
        }
      }
    };
  };

  api._destroy = function (opts, callback) {
    changesHandler.removeAllListeners(dbName);

    //Close open request for "dbName" database to fix ie delay.
    var openReq = openReqList.get(dbName);
    if (openReq && openReq.result) {
      openReq.result.close();
      cachedDBs.delete(dbName);
    }
    var req = indexedDB.deleteDatabase(dbName);

    req.onsuccess = function () {
      //Remove open request from the list.
      openReqList.delete(dbName);
      if (hasLocalStorage() && (dbName in localStorage)) {
        delete localStorage[dbName];
      }
      callback(null, { 'ok': true });
    };

    req.onerror = idbError(callback);
  };

  var cached = cachedDBs.get(dbName);

  if (cached) {
    idb = cached.idb;
    api._meta = cached.global;
    return nextTick(function () {
      callback(null, api);
    });
  }

  var req = indexedDB.open(dbName, ADAPTER_VERSION);
  openReqList.set(dbName, req);

  req.onupgradeneeded = function (e) {
    var db = e.target.result;
    if (e.oldVersion < 1) {
      return createSchema(db); // new db, initial schema
    }
    // do migrations

    var txn = e.currentTarget.transaction;
    // these migrations have to be done in this function, before
    // control is returned to the event loop, because IndexedDB

    if (e.oldVersion < 3) {
      createLocalStoreSchema(db); // v2 -> v3
    }
    if (e.oldVersion < 4) {
      addAttachAndSeqStore(db); // v3 -> v4
    }

    var migrations = [
      addDeletedOrLocalIndex, // v1 -> v2
      migrateLocalStore,      // v2 -> v3
      migrateAttsAndSeqs,     // v3 -> v4
      migrateMetadata         // v4 -> v5
    ];

    var i = e.oldVersion;

    function next() {
      var migration = migrations[i - 1];
      i++;
      if (migration) {
        migration(txn, next);
      }
    }

    next();
  };

  req.onsuccess = function (e) {

    idb = e.target.result;

    idb.onversionchange = function () {
      idb.close();
      cachedDBs.delete(dbName);
    };

    idb.onabort = function (e) {
      guardedConsole('error', 'Database has a global failure', e.target.error);
      idb.close();
      cachedDBs.delete(dbName);
    };

    // Do a few setup operations (in parallel as much as possible):
    // 1. Fetch meta doc
    // 2. Check blob support
    // 3. Calculate docCount
    // 4. Generate an instanceId if necessary
    // 5. Store docCount and instanceId on meta doc

    var txn = idb.transaction([
      META_STORE,
      DETECT_BLOB_SUPPORT_STORE,
      DOC_STORE
    ], 'readwrite');

    var storedMetaDoc = false;
    var metaDoc;
    var docCount;
    var blobSupport;
    var instanceId;

    function completeSetup() {
      if (typeof blobSupport === 'undefined' || !storedMetaDoc) {
        return;
      }
      api._meta = {
        name: dbName,
        instanceId: instanceId,
        blobSupport: blobSupport
      };

      cachedDBs.set(dbName, {
        idb: idb,
        global: api._meta
      });
      callback(null, api);
    }

    function storeMetaDocIfReady() {
      if (typeof docCount === 'undefined' || typeof metaDoc === 'undefined') {
        return;
      }
      var instanceKey = dbName + '_id';
      if (instanceKey in metaDoc) {
        instanceId = metaDoc[instanceKey];
      } else {
        metaDoc[instanceKey] = instanceId = uuid();
      }
      metaDoc.docCount = docCount;
      txn.objectStore(META_STORE).put(metaDoc);
    }

    //
    // fetch or generate the instanceId
    //
    txn.objectStore(META_STORE).get(META_STORE).onsuccess = function (e) {
      metaDoc = e.target.result || { id: META_STORE };
      storeMetaDocIfReady();
    };

    //
    // countDocs
    //
    countDocs(txn, function (count) {
      docCount = count;
      storeMetaDocIfReady();
    });

    //
    // check blob support
    //
    if (!blobSupportPromise) {
      // make sure blob support is only checked once
      blobSupportPromise = checkBlobSupport(txn);
    }

    blobSupportPromise.then(function (val) {
      blobSupport = val;
      completeSetup();
    });

    // only when the metadata put transaction has completed,
    // consider the setup done
    txn.oncomplete = function () {
      storedMetaDoc = true;
      completeSetup();
    };
    txn.onabort = idbError(callback);
  };

  req.onerror = function () {
    var msg = 'Failed to open indexedDB, are you in private browsing mode?';
    guardedConsole('error', msg);
    callback(createError(IDB_ERROR, msg));
  };
}

IdbPouch.valid = function () {
  // Following #7085 buggy idb versions (typically Safari < 10.1) are
  // considered valid.

  // On Firefox SecurityError is thrown while referencing indexedDB if cookies
  // are not allowed. `typeof indexedDB` also triggers the error.
  try {
    // some outdated implementations of IDB that appear on Samsung
    // and HTC Android devices <4.4 are missing IDBKeyRange
    return typeof indexedDB !== 'undefined' && typeof IDBKeyRange !== 'undefined';
  } catch (e) {
    return false;
  }
};

function IDBPouch (PouchDB) {
  PouchDB.adapter('idb', IdbPouch, true);
}

// dead simple promise pool, inspired by https://github.com/timdp/es6-promise-pool
// but much smaller in code size. limits the number of concurrent promises that are executed


function pool(promiseFactories, limit) {
  return new Promise(function (resolve, reject) {
    var running = 0;
    var current = 0;
    var done = 0;
    var len = promiseFactories.length;
    var err;

    function runNext() {
      running++;
      promiseFactories[current++]().then(onSuccess, onError);
    }

    function doNext() {
      if (++done === len) {
        /* istanbul ignore if */
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      } else {
        runNextBatch();
      }
    }

    function onSuccess() {
      running--;
      doNext();
    }

    /* istanbul ignore next */
    function onError(thisErr) {
      running--;
      err = err || thisErr;
      doNext();
    }

    function runNextBatch() {
      while (running < limit && current < len) {
        runNext();
      }
    }

    runNextBatch();
  });
}

var CHANGES_BATCH_SIZE = 25;
var MAX_SIMULTANEOUS_REVS = 50;
var CHANGES_TIMEOUT_BUFFER = 5000;
var DEFAULT_HEARTBEAT = 10000;

var supportsBulkGetMap = {};

function readAttachmentsAsBlobOrBuffer(row) {
  var doc = row.doc || row.ok;
  var atts = doc._attachments;
  if (!atts) {
    return;
  }
  Object.keys(atts).forEach(function (filename) {
    var att = atts[filename];
    att.data = b64ToBluffer(att.data, att.content_type);
  });
}

function encodeDocId(id) {
  if (/^_design/.test(id)) {
    return '_design/' + encodeURIComponent(id.slice(8));
  }
  if (/^_local/.test(id)) {
    return '_local/' + encodeURIComponent(id.slice(7));
  }
  return encodeURIComponent(id);
}

function preprocessAttachments$1(doc) {
  if (!doc._attachments || !Object.keys(doc._attachments)) {
    return Promise.resolve();
  }

  return Promise.all(Object.keys(doc._attachments).map(function (key) {
    var attachment = doc._attachments[key];
    if (attachment.data && typeof attachment.data !== 'string') {
      return new Promise(function (resolve) {
        blobToBase64(attachment.data, resolve);
      }).then(function (b64) {
        attachment.data = b64;
      });
    }
  }));
}

function hasUrlPrefix(opts) {
  if (!opts.prefix) {
    return false;
  }
  var protocol = parseUri(opts.prefix).protocol;
  return protocol === 'http' || protocol === 'https';
}

// Get all the information you possibly can about the URI given by name and
// return it as a suitable object.
function getHost(name, opts) {
  // encode db name if opts.prefix is a url (#5574)
  if (hasUrlPrefix(opts)) {
    var dbName = opts.name.substr(opts.prefix.length);
    // Ensure prefix has a trailing slash
    var prefix = opts.prefix.replace(/\/?$/, '/');
    name = prefix + encodeURIComponent(dbName);
  }

  var uri = parseUri(name);
  if (uri.user || uri.password) {
    uri.auth = {username: uri.user, password: uri.password};
  }

  // Split the path part of the URI into parts using '/' as the delimiter
  // after removing any leading '/' and any trailing '/'
  var parts = uri.path.replace(/(^\/|\/$)/g, '').split('/');

  uri.db = parts.pop();
  // Prevent double encoding of URI component
  if (uri.db.indexOf('%') === -1) {
    uri.db = encodeURIComponent(uri.db);
  }

  uri.path = parts.join('/');

  return uri;
}

// Generate a URL with the host data given by opts and the given path
function genDBUrl(opts, path) {
  return genUrl(opts, opts.db + '/' + path);
}

// Generate a URL with the host data given by opts and the given path
function genUrl(opts, path) {
  // If the host already has a path, then we need to have a path delimiter
  // Otherwise, the path delimiter is the empty string
  var pathDel = !opts.path ? '' : '/';

  // If the host already has a path, then we need to have a path delimiter
  // Otherwise, the path delimiter is the empty string
  return opts.protocol + '://' + opts.host +
         (opts.port ? (':' + opts.port) : '') +
         '/' + opts.path + pathDel + path;
}

function paramsToStr(params) {
  return '?' + Object.keys(params).map(function (k) {
    return k + '=' + encodeURIComponent(params[k]);
  }).join('&');
}

function shouldCacheBust(opts) {
  var ua = (typeof navigator !== 'undefined' && navigator.userAgent) ?
      navigator.userAgent.toLowerCase() : '';
  var isIE = ua.indexOf('msie') !== -1;
  var isTrident = ua.indexOf('trident') !== -1;
  var isEdge = ua.indexOf('edge') !== -1;
  var isGET = !('method' in opts) || opts.method === 'GET';
  return (isIE || isTrident || isEdge) && isGET;
}

// Implements the PouchDB API for dealing with CouchDB instances over HTTP
function HttpPouch(opts, callback) {

  // The functions that will be publicly available for HttpPouch
  var api = this;

  var host = getHost(opts.name, opts);
  var dbUrl = genDBUrl(host, '');

  opts = clone(opts);

  var ourFetch = function (url, options) {

    options = options || {};
    options.headers = options.headers || new h();

    if (opts.auth || host.auth) {
      var nAuth = opts.auth || host.auth;
      var str = nAuth.username + ':' + nAuth.password;
      var token = thisBtoa(unescape(encodeURIComponent(str)));
      options.headers.set('Authorization', 'Basic ' + token);
    }

    var headers = opts.headers || {};
    Object.keys(headers).forEach(function (key) {
      options.headers.append(key, headers[key]);
    });

    /* istanbul ignore if */
    if (shouldCacheBust(options)) {
      url += (url.indexOf('?') === -1 ? '?' : '&') + '_nonce=' + Date.now();
    }

    var fetchFun = opts.fetch || f$1;
    return fetchFun(url, options);
  };

  function adapterFun$$1(name, fun) {
    return adapterFun(name, getArguments(function (args) {
      setup().then(function () {
        return fun.apply(this, args);
      }).catch(function (e) {
        var callback = args.pop();
        callback(e);
      });
    })).bind(api);
  }

  function fetchJSON(url, options, callback) {

    var result = {};

    options = options || {};
    options.headers = options.headers || new h();

    if (!options.headers.get('Content-Type')) {
      options.headers.set('Content-Type', 'application/json');
    }
    if (!options.headers.get('Accept')) {
      options.headers.set('Accept', 'application/json');
    }

    return ourFetch(url, options).then(function (response) {
      result.ok = response.ok;
      result.status = response.status;
      return response.json();
    }).then(function (json) {
      result.data = json;
      if (!result.ok) {
        result.data.status = result.status;
        var err = generateErrorFromResponse(result.data);
        if (callback) {
          return callback(err);
        } else {
          throw err;
        }
      }

      if (Array.isArray(result.data)) {
        result.data = result.data.map(function (v) {
          if (v.error || v.missing) {
            return generateErrorFromResponse(v);
          } else {
            return v;
          }
        });
      }

      if (callback) {
        callback(null, result.data);
      } else {
        return result;
      }
    });
  }

  var setupPromise;

  function setup() {
    if (opts.skip_setup) {
      return Promise.resolve();
    }

    // If there is a setup in process or previous successful setup
    // done then we will use that
    // If previous setups have been rejected we will try again
    if (setupPromise) {
      return setupPromise;
    }

    setupPromise = fetchJSON(dbUrl).catch(function (err) {
      if (err && err.status && err.status === 404) {
        // Doesnt exist, create it
        explainError(404, 'PouchDB is just detecting if the remote exists.');
        return fetchJSON(dbUrl, {method: 'PUT'});
      } else {
        return Promise.reject(err);
      }
    }).catch(function (err) {
      // If we try to create a database that already exists, skipped in
      // istanbul since its catching a race condition.
      /* istanbul ignore if */
      if (err && err.status && err.status === 412) {
        return true;
      }
      return Promise.reject(err);
    });

    setupPromise.catch(function () {
      setupPromise = null;
    });

    return setupPromise;
  }

  nextTick(function () {
    callback(null, api);
  });

  api._remote = true;

  /* istanbul ignore next */
  api.type = function () {
    return 'http';
  };

  api.id = adapterFun$$1('id', function (callback) {
    ourFetch(genUrl(host, '')).then(function (response) {
      return response.json();
    }).then(function (result) {
      var uuid$$1 = (result && result.uuid) ?
          (result.uuid + host.db) : genDBUrl(host, '');
      callback(null, uuid$$1);
    }).catch(function (err) {
      callback(err);
    });
  });

  // Sends a POST request to the host calling the couchdb _compact function
  //    version: The version of CouchDB it is running
  api.compact = adapterFun$$1('compact', function (opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    opts = clone(opts);

    fetchJSON(genDBUrl(host, '_compact'), {method: 'POST'}).then(function () {
      function ping() {
        api.info(function (err, res) {
          // CouchDB may send a "compact_running:true" if it's
          // already compacting. PouchDB Server doesn't.
          /* istanbul ignore else */
          if (res && !res.compact_running) {
            callback(null, {ok: true});
          } else {
            setTimeout(ping, opts.interval || 200);
          }
        });
      }
      // Ping the http if it's finished compaction
      ping();
    });
  });

  api.bulkGet = adapterFun('bulkGet', function (opts, callback) {
    var self = this;

    function doBulkGet(cb) {
      var params = {};
      if (opts.revs) {
        params.revs = true;
      }
      if (opts.attachments) {
        /* istanbul ignore next */
        params.attachments = true;
      }
      if (opts.latest) {
        params.latest = true;
      }
      fetchJSON(genDBUrl(host, '_bulk_get' + paramsToStr(params)), {
        method: 'POST',
        body: JSON.stringify({ docs: opts.docs})
      }).then(function (result) {
        if (opts.attachments && opts.binary) {
          result.data.results.forEach(function (res) {
            res.docs.forEach(readAttachmentsAsBlobOrBuffer);
          });
        }
        cb(null, result.data);
      }).catch(cb);
    }

    /* istanbul ignore next */
    function doBulkGetShim() {
      // avoid "url too long error" by splitting up into multiple requests
      var batchSize = MAX_SIMULTANEOUS_REVS;
      var numBatches = Math.ceil(opts.docs.length / batchSize);
      var numDone = 0;
      var results = new Array(numBatches);

      function onResult(batchNum) {
        return function (err, res) {
          // err is impossible because shim returns a list of errs in that case
          results[batchNum] = res.results;
          if (++numDone === numBatches) {
            callback(null, {results: flatten(results)});
          }
        };
      }

      for (var i = 0; i < numBatches; i++) {
        var subOpts = pick(opts, ['revs', 'attachments', 'binary', 'latest']);
        subOpts.docs = opts.docs.slice(i * batchSize,
          Math.min(opts.docs.length, (i + 1) * batchSize));
        bulkGet(self, subOpts, onResult(i));
      }
    }

    // mark the whole database as either supporting or not supporting _bulk_get
    var dbUrl = genUrl(host, '');
    var supportsBulkGet = supportsBulkGetMap[dbUrl];

    /* istanbul ignore next */
    if (typeof supportsBulkGet !== 'boolean') {
      // check if this database supports _bulk_get
      doBulkGet(function (err, res) {
        if (err) {
          supportsBulkGetMap[dbUrl] = false;
          explainError(
            err.status,
            'PouchDB is just detecting if the remote ' +
            'supports the _bulk_get API.'
          );
          doBulkGetShim();
        } else {
          supportsBulkGetMap[dbUrl] = true;
          callback(null, res);
        }
      });
    } else if (supportsBulkGet) {
      doBulkGet(callback);
    } else {
      doBulkGetShim();
    }
  });

  // Calls GET on the host, which gets back a JSON string containing
  //    couchdb: A welcome string
  //    version: The version of CouchDB it is running
  api._info = function (callback) {
    setup().then(function () {
      return ourFetch(genDBUrl(host, ''));
    }).then(function (response) {
      return response.json();
    }).then(function (info) {
      info.host = genDBUrl(host, '');
      callback(null, info);
    }).catch(callback);
  };

  api.fetch = function (path, options) {
    return setup().then(function () {
      return ourFetch(genDBUrl(host, path), options);
    });
  };

  // Get the document with the given id from the database given by host.
  // The id could be solely the _id in the database, or it may be a
  // _design/ID or _local/ID path
  api.get = adapterFun$$1('get', function (id, opts, callback) {
    // If no options were given, set the callback to the second parameter
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    opts = clone(opts);

    // List of parameters to add to the GET request
    var params = {};

    if (opts.revs) {
      params.revs = true;
    }

    if (opts.revs_info) {
      params.revs_info = true;
    }

    if (opts.latest) {
      params.latest = true;
    }

    if (opts.open_revs) {
      if (opts.open_revs !== "all") {
        opts.open_revs = JSON.stringify(opts.open_revs);
      }
      params.open_revs = opts.open_revs;
    }

    if (opts.rev) {
      params.rev = opts.rev;
    }

    if (opts.conflicts) {
      params.conflicts = opts.conflicts;
    }

    /* istanbul ignore if */
    if (opts.update_seq) {
      params.update_seq = opts.update_seq;
    }

    id = encodeDocId(id);

    function fetchAttachments(doc) {
      var atts = doc._attachments;
      var filenames = atts && Object.keys(atts);
      if (!atts || !filenames.length) {
        return;
      }
      // we fetch these manually in separate XHRs, because
      // Sync Gateway would normally send it back as multipart/mixed,
      // which we cannot parse. Also, this is more efficient than
      // receiving attachments as base64-encoded strings.
      function fetchData(filename) {
        var att = atts[filename];
        var path = encodeDocId(doc._id) + '/' + encodeAttachmentId(filename) +
            '?rev=' + doc._rev;
        return ourFetch(genDBUrl(host, path)).then(function (response) {
          if (typeof process !== 'undefined' && !process.browser) {
            return response.buffer();
          } else {
            /* istanbul ignore next */
            return response.blob();
          }
        }).then(function (blob) {
          if (opts.binary) {
            // TODO: Can we remove this?
            if (typeof process !== 'undefined' && !process.browser) {
              blob.type = att.content_type;
            }
            return blob;
          }
          return new Promise(function (resolve) {
            blobToBase64(blob, resolve);
          });
        }).then(function (data) {
          delete att.stub;
          delete att.length;
          att.data = data;
        });
      }

      var promiseFactories = filenames.map(function (filename) {
        return function () {
          return fetchData(filename);
        };
      });

      // This limits the number of parallel xhr requests to 5 any time
      // to avoid issues with maximum browser request limits
      return pool(promiseFactories, 5);
    }

    function fetchAllAttachments(docOrDocs) {
      if (Array.isArray(docOrDocs)) {
        return Promise.all(docOrDocs.map(function (doc) {
          if (doc.ok) {
            return fetchAttachments(doc.ok);
          }
        }));
      }
      return fetchAttachments(docOrDocs);
    }

    var url = genDBUrl(host, id + paramsToStr(params));
    fetchJSON(url).then(function (res) {
      return Promise.resolve().then(function () {
        if (opts.attachments) {
          return fetchAllAttachments(res.data);
        }
      }).then(function () {
        callback(null, res.data);
      });
    }).catch(function (e) {
      e.docId = id;
      callback(e);
    });
  });


  // Delete the document given by doc from the database given by host.
  api.remove = adapterFun$$1('remove', function (docOrId, optsOrRev, opts, cb) {
    var doc;
    if (typeof optsOrRev === 'string') {
      // id, rev, opts, callback style
      doc = {
        _id: docOrId,
        _rev: optsOrRev
      };
      if (typeof opts === 'function') {
        cb = opts;
        opts = {};
      }
    } else {
      // doc, opts, callback style
      doc = docOrId;
      if (typeof optsOrRev === 'function') {
        cb = optsOrRev;
        opts = {};
      } else {
        cb = opts;
        opts = optsOrRev;
      }
    }

    var rev = (doc._rev || opts.rev);
    var url = genDBUrl(host, encodeDocId(doc._id)) + '?rev=' + rev;

    fetchJSON(url, {method: 'DELETE'}, cb).catch(cb);
  });

  function encodeAttachmentId(attachmentId) {
    return attachmentId.split("/").map(encodeURIComponent).join("/");
  }

  // Get the attachment
  api.getAttachment = adapterFun$$1('getAttachment', function (docId, attachmentId,
                                                            opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    var params = opts.rev ? ('?rev=' + opts.rev) : '';
    var url = genDBUrl(host, encodeDocId(docId)) + '/' +
        encodeAttachmentId(attachmentId) + params;
    var contentType;
    ourFetch(url, {method: 'GET'}).then(function (response) {
      contentType = response.headers.get('content-type');
      if (!response.ok) {
        throw response;
      } else {
        if (typeof process !== 'undefined' && !process.browser) {
          return response.buffer();
        } else {
          /* istanbul ignore next */
          return response.blob();
        }
      }
    }).then(function (blob) {
      // TODO: also remove
      if (typeof process !== 'undefined' && !process.browser) {
        blob.type = contentType;
      }
      callback(null, blob);
    }).catch(function (err) {
      callback(err);
    });
  });

  // Remove the attachment given by the id and rev
  api.removeAttachment =  adapterFun$$1('removeAttachment', function (docId,
                                                                   attachmentId,
                                                                   rev,
                                                                   callback) {
    var url = genDBUrl(host, encodeDocId(docId) + '/' +
                       encodeAttachmentId(attachmentId)) + '?rev=' + rev;
    fetchJSON(url, {method: 'DELETE'}, callback).catch(callback);
  });

  // Add the attachment given by blob and its contentType property
  // to the document with the given id, the revision given by rev, and
  // add it to the database given by host.
  api.putAttachment = adapterFun$$1('putAttachment', function (docId, attachmentId,
                                                            rev, blob,
                                                            type, callback) {
    if (typeof type === 'function') {
      callback = type;
      type = blob;
      blob = rev;
      rev = null;
    }
    var id = encodeDocId(docId) + '/' + encodeAttachmentId(attachmentId);
    var url = genDBUrl(host, id);
    if (rev) {
      url += '?rev=' + rev;
    }

    if (typeof blob === 'string') {
      // input is assumed to be a base64 string
      var binary;
      try {
        binary = thisAtob(blob);
      } catch (err) {
        return callback(createError(BAD_ARG,
                        'Attachment is not a valid base64 string'));
      }
      blob = binary ? binStringToBluffer(binary, type) : '';
    }

    // Add the attachment
    fetchJSON(url, {
      headers: new h({'Content-Type': type}),
      method: 'PUT',
      body: blob
    }, callback).catch(callback);
  });

  // Update/create multiple documents given by req in the database
  // given by host.
  api._bulkDocs = function (req, opts, callback) {
    // If new_edits=false then it prevents the database from creating
    // new revision numbers for the documents. Instead it just uses
    // the old ones. This is used in database replication.
    req.new_edits = opts.new_edits;

    setup().then(function () {
      return Promise.all(req.docs.map(preprocessAttachments$1));
    }).then(function () {
      // Update/create the documents
      return fetchJSON(genDBUrl(host, '_bulk_docs'), {
        method: 'POST',
        body: JSON.stringify(req)
      }, callback);
    }).catch(callback);
  };


  // Update/create document
  api._put = function (doc, opts, callback) {
    setup().then(function () {
      return preprocessAttachments$1(doc);
    }).then(function () {
      return fetchJSON(genDBUrl(host, encodeDocId(doc._id)), {
        method: 'PUT',
        body: JSON.stringify(doc)
      });
    }).then(function (result) {
      callback(null, result.data);
    }).catch(function (err) {
      err.docId = doc && doc._id;
      callback(err);
    });
  };


  // Get a listing of the documents in the database given
  // by host and ordered by increasing id.
  api.allDocs = adapterFun$$1('allDocs', function (opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    opts = clone(opts);

    // List of parameters to add to the GET request
    var params = {};
    var body;
    var method = 'GET';

    if (opts.conflicts) {
      params.conflicts = true;
    }

    /* istanbul ignore if */
    if (opts.update_seq) {
      params.update_seq = true;
    }

    if (opts.descending) {
      params.descending = true;
    }

    if (opts.include_docs) {
      params.include_docs = true;
    }

    // added in CouchDB 1.6.0
    if (opts.attachments) {
      params.attachments = true;
    }

    if (opts.key) {
      params.key = JSON.stringify(opts.key);
    }

    if (opts.start_key) {
      opts.startkey = opts.start_key;
    }

    if (opts.startkey) {
      params.startkey = JSON.stringify(opts.startkey);
    }

    if (opts.end_key) {
      opts.endkey = opts.end_key;
    }

    if (opts.endkey) {
      params.endkey = JSON.stringify(opts.endkey);
    }

    if (typeof opts.inclusive_end !== 'undefined') {
      params.inclusive_end = !!opts.inclusive_end;
    }

    if (typeof opts.limit !== 'undefined') {
      params.limit = opts.limit;
    }

    if (typeof opts.skip !== 'undefined') {
      params.skip = opts.skip;
    }

    var paramStr = paramsToStr(params);

    if (typeof opts.keys !== 'undefined') {
      method = 'POST';
      body = {keys: opts.keys};
    }

    fetchJSON(genDBUrl(host, '_all_docs' + paramStr), {
       method: method,
      body: JSON.stringify(body)
    }).then(function (result) {
      if (opts.include_docs && opts.attachments && opts.binary) {
        result.data.rows.forEach(readAttachmentsAsBlobOrBuffer);
      }
      callback(null, result.data);
    }).catch(callback);
  });

  // Get a list of changes made to documents in the database given by host.
  // TODO According to the README, there should be two other methods here,
  // api.changes.addListener and api.changes.removeListener.
  api._changes = function (opts) {

    // We internally page the results of a changes request, this means
    // if there is a large set of changes to be returned we can start
    // processing them quicker instead of waiting on the entire
    // set of changes to return and attempting to process them at once
    var batchSize = 'batch_size' in opts ? opts.batch_size : CHANGES_BATCH_SIZE;

    opts = clone(opts);

    if (opts.continuous && !('heartbeat' in opts)) {
      opts.heartbeat = DEFAULT_HEARTBEAT;
    }

    var requestTimeout = ('timeout' in opts) ? opts.timeout : 30 * 1000;

    // ensure CHANGES_TIMEOUT_BUFFER applies
    if ('timeout' in opts && opts.timeout &&
      (requestTimeout - opts.timeout) < CHANGES_TIMEOUT_BUFFER) {
        requestTimeout = opts.timeout + CHANGES_TIMEOUT_BUFFER;
    }

    /* istanbul ignore if */
    if ('heartbeat' in opts && opts.heartbeat &&
       (requestTimeout - opts.heartbeat) < CHANGES_TIMEOUT_BUFFER) {
        requestTimeout = opts.heartbeat + CHANGES_TIMEOUT_BUFFER;
    }

    var params = {};
    if ('timeout' in opts && opts.timeout) {
      params.timeout = opts.timeout;
    }

    var limit = (typeof opts.limit !== 'undefined') ? opts.limit : false;
    var leftToFetch = limit;

    if (opts.style) {
      params.style = opts.style;
    }

    if (opts.include_docs || opts.filter && typeof opts.filter === 'function') {
      params.include_docs = true;
    }

    if (opts.attachments) {
      params.attachments = true;
    }

    if (opts.continuous) {
      params.feed = 'longpoll';
    }

    if (opts.seq_interval) {
      params.seq_interval = opts.seq_interval;
    }

    if (opts.conflicts) {
      params.conflicts = true;
    }

    if (opts.descending) {
      params.descending = true;
    }
    
    /* istanbul ignore if */
    if (opts.update_seq) {
      params.update_seq = true;
    }

    if ('heartbeat' in opts) {
      // If the heartbeat value is false, it disables the default heartbeat
      if (opts.heartbeat) {
        params.heartbeat = opts.heartbeat;
      }
    }

    if (opts.filter && typeof opts.filter === 'string') {
      params.filter = opts.filter;
    }

    if (opts.view && typeof opts.view === 'string') {
      params.filter = '_view';
      params.view = opts.view;
    }

    // If opts.query_params exists, pass it through to the changes request.
    // These parameters may be used by the filter on the source database.
    if (opts.query_params && typeof opts.query_params === 'object') {
      for (var param_name in opts.query_params) {
        /* istanbul ignore else */
        if (opts.query_params.hasOwnProperty(param_name)) {
          params[param_name] = opts.query_params[param_name];
        }
      }
    }

    var method = 'GET';
    var body;

    if (opts.doc_ids) {
      // set this automagically for the user; it's annoying that couchdb
      // requires both a "filter" and a "doc_ids" param.
      params.filter = '_doc_ids';
      method = 'POST';
      body = {doc_ids: opts.doc_ids };
    }
    /* istanbul ignore next */
    else if (opts.selector) {
      // set this automagically for the user, similar to above
      params.filter = '_selector';
      method = 'POST';
      body = {selector: opts.selector };
    }

    var controller = new a();
    var lastFetchedSeq;

    // Get all the changes starting wtih the one immediately after the
    // sequence number given by since.
    var fetchData = function (since, callback) {
      if (opts.aborted) {
        return;
      }
      params.since = since;
      // "since" can be any kind of json object in Cloudant/CouchDB 2.x
      /* istanbul ignore next */
      if (typeof params.since === "object") {
        params.since = JSON.stringify(params.since);
      }

      if (opts.descending) {
        if (limit) {
          params.limit = leftToFetch;
        }
      } else {
        params.limit = (!limit || leftToFetch > batchSize) ?
          batchSize : leftToFetch;
      }

      // Set the options for the ajax call
      var url = genDBUrl(host, '_changes' + paramsToStr(params));
      var fetchOpts = {
        signal: controller.signal,
        method: method,
        body: JSON.stringify(body)
      };
      lastFetchedSeq = since;

      /* istanbul ignore if */
      if (opts.aborted) {
        return;
      }

      // Get the changes
      setup().then(function () {
        return fetchJSON(url, fetchOpts, callback);
      }).catch(callback);
    };

    // If opts.since exists, get all the changes from the sequence
    // number given by opts.since. Otherwise, get all the changes
    // from the sequence number 0.
    var results = {results: []};

    var fetched = function (err, res) {
      if (opts.aborted) {
        return;
      }
      var raw_results_length = 0;
      // If the result of the ajax call (res) contains changes (res.results)
      if (res && res.results) {
        raw_results_length = res.results.length;
        results.last_seq = res.last_seq;
        var pending = null;
        var lastSeq = null;
        // Attach 'pending' property if server supports it (CouchDB 2.0+)
        /* istanbul ignore if */
        if (typeof res.pending === 'number') {
          pending = res.pending;
        }
        if (typeof results.last_seq === 'string' || typeof results.last_seq === 'number') {
          lastSeq = results.last_seq;
        }
        // For each change
        var req = {};
        req.query = opts.query_params;
        res.results = res.results.filter(function (c) {
          leftToFetch--;
          var ret = filterChange(opts)(c);
          if (ret) {
            if (opts.include_docs && opts.attachments && opts.binary) {
              readAttachmentsAsBlobOrBuffer(c);
            }
            if (opts.return_docs) {
              results.results.push(c);
            }
            opts.onChange(c, pending, lastSeq);
          }
          return ret;
        });
      } else if (err) {
        // In case of an error, stop listening for changes and call
        // opts.complete
        opts.aborted = true;
        opts.complete(err);
        return;
      }

      // The changes feed may have timed out with no results
      // if so reuse last update sequence
      if (res && res.last_seq) {
        lastFetchedSeq = res.last_seq;
      }

      var finished = (limit && leftToFetch <= 0) ||
        (res && raw_results_length < batchSize) ||
        (opts.descending);

      if ((opts.continuous && !(limit && leftToFetch <= 0)) || !finished) {
        // Queue a call to fetch again with the newest sequence number
        nextTick(function () { fetchData(lastFetchedSeq, fetched); });
      } else {
        // We're done, call the callback
        opts.complete(null, results);
      }
    };

    fetchData(opts.since || 0, fetched);

    // Return a method to cancel this method from processing any more
    return {
      cancel: function () {
        opts.aborted = true;
        controller.abort();
      }
    };
  };

  // Given a set of document/revision IDs (given by req), tets the subset of
  // those that do NOT correspond to revisions stored in the database.
  // See http://wiki.apache.org/couchdb/HttpPostRevsDiff
  api.revsDiff = adapterFun$$1('revsDiff', function (req, opts, callback) {
    // If no options were given, set the callback to be the second parameter
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }

    // Get the missing document/revision IDs
    fetchJSON(genDBUrl(host, '_revs_diff'), {
      method: 'POST',
      body: JSON.stringify(req)
    }, callback).catch(callback);
  });

  api._close = function (callback) {
    callback();
  };

  api._destroy = function (options, callback) {
    fetchJSON(genDBUrl(host, ''), {method: 'DELETE'}).then(function (json) {
      callback(null, json);
    }).catch(function (err) {
      /* istanbul ignore if */
      if (err.status === 404) {
        callback(null, {ok: true});
      } else {
        callback(err);
      }
    });
  };
}

// HttpPouch is a valid adapter.
HttpPouch.valid = function () {
  return true;
};

function HttpPouch$1 (PouchDB) {
  PouchDB.adapter('http', HttpPouch, false);
  PouchDB.adapter('https', HttpPouch, false);
}

function QueryParseError(message) {
  this.status = 400;
  this.name = 'query_parse_error';
  this.message = message;
  this.error = true;
  try {
    Error.captureStackTrace(this, QueryParseError);
  } catch (e) {}
}

inherits(QueryParseError, Error);

function NotFoundError(message) {
  this.status = 404;
  this.name = 'not_found';
  this.message = message;
  this.error = true;
  try {
    Error.captureStackTrace(this, NotFoundError);
  } catch (e) {}
}

inherits(NotFoundError, Error);

function BuiltInError(message) {
  this.status = 500;
  this.name = 'invalid_value';
  this.message = message;
  this.error = true;
  try {
    Error.captureStackTrace(this, BuiltInError);
  } catch (e) {}
}

inherits(BuiltInError, Error);

function promisedCallback(promise, callback) {
  if (callback) {
    promise.then(function (res) {
      nextTick(function () {
        callback(null, res);
      });
    }, function (reason) {
      nextTick(function () {
        callback(reason);
      });
    });
  }
  return promise;
}

function callbackify(fun) {
  return getArguments(function (args) {
    var cb = args.pop();
    var promise = fun.apply(this, args);
    if (typeof cb === 'function') {
      promisedCallback(promise, cb);
    }
    return promise;
  });
}

// Promise finally util similar to Q.finally
function fin(promise, finalPromiseFactory) {
  return promise.then(function (res) {
    return finalPromiseFactory().then(function () {
      return res;
    });
  }, function (reason) {
    return finalPromiseFactory().then(function () {
      throw reason;
    });
  });
}

function sequentialize(queue, promiseFactory) {
  return function () {
    var args = arguments;
    var that = this;
    return queue.add(function () {
      return promiseFactory.apply(that, args);
    });
  };
}

// uniq an array of strings, order not guaranteed
// similar to underscore/lodash _.uniq
function uniq(arr) {
  var theSet = new ExportedSet(arr);
  var result = new Array(theSet.size);
  var index = -1;
  theSet.forEach(function (value) {
    result[++index] = value;
  });
  return result;
}

function mapToKeysArray(map) {
  var result = new Array(map.size);
  var index = -1;
  map.forEach(function (value, key) {
    result[++index] = key;
  });
  return result;
}

function createBuiltInError(name) {
  var message = 'builtin ' + name +
    ' function requires map values to be numbers' +
    ' or number arrays';
  return new BuiltInError(message);
}

function sum(values) {
  var result = 0;
  for (var i = 0, len = values.length; i < len; i++) {
    var num = values[i];
    if (typeof num !== 'number') {
      if (Array.isArray(num)) {
        // lists of numbers are also allowed, sum them separately
        result = typeof result === 'number' ? [result] : result;
        for (var j = 0, jLen = num.length; j < jLen; j++) {
          var jNum = num[j];
          if (typeof jNum !== 'number') {
            throw createBuiltInError('_sum');
          } else if (typeof result[j] === 'undefined') {
            result.push(jNum);
          } else {
            result[j] += jNum;
          }
        }
      } else { // not array/number
        throw createBuiltInError('_sum');
      }
    } else if (typeof result === 'number') {
      result += num;
    } else { // add number to array
      result[0] += num;
    }
  }
  return result;
}

var log = guardedConsole.bind(null, 'log');
var isArray = Array.isArray;
var toJSON = JSON.parse;

function evalFunctionWithEval(func, emit) {
  return scopeEval(
    "return (" + func.replace(/;\s*$/, "") + ");",
    {
      emit: emit,
      sum: sum,
      log: log,
      isArray: isArray,
      toJSON: toJSON
    }
  );
}

/*
 * Simple task queue to sequentialize actions. Assumes
 * callbacks will eventually fire (once).
 */


function TaskQueue$1() {
  this.promise = new Promise(function (fulfill) {fulfill(); });
}
TaskQueue$1.prototype.add = function (promiseFactory) {
  this.promise = this.promise.catch(function () {
    // just recover
  }).then(function () {
    return promiseFactory();
  });
  return this.promise;
};
TaskQueue$1.prototype.finish = function () {
  return this.promise;
};

function stringify(input) {
  if (!input) {
    return 'undefined'; // backwards compat for empty reduce
  }
  // for backwards compat with mapreduce, functions/strings are stringified
  // as-is. everything else is JSON-stringified.
  switch (typeof input) {
    case 'function':
      // e.g. a mapreduce map
      return input.toString();
    case 'string':
      // e.g. a mapreduce built-in _reduce function
      return input.toString();
    default:
      // e.g. a JSON object in the case of mango queries
      return JSON.stringify(input);
  }
}

/* create a string signature for a view so we can cache it and uniq it */
function createViewSignature(mapFun, reduceFun) {
  // the "undefined" part is for backwards compatibility
  return stringify(mapFun) + stringify(reduceFun) + 'undefined';
}

function createView(sourceDB, viewName, mapFun, reduceFun, temporary, localDocName) {
  var viewSignature = createViewSignature(mapFun, reduceFun);

  var cachedViews;
  if (!temporary) {
    // cache this to ensure we don't try to update the same view twice
    cachedViews = sourceDB._cachedViews = sourceDB._cachedViews || {};
    if (cachedViews[viewSignature]) {
      return cachedViews[viewSignature];
    }
  }

  var promiseForView = sourceDB.info().then(function (info) {

    var depDbName = info.db_name + '-mrview-' +
      (temporary ? 'temp' : stringMd5(viewSignature));

    // save the view name in the source db so it can be cleaned up if necessary
    // (e.g. when the _design doc is deleted, remove all associated view data)
    function diffFunction(doc) {
      doc.views = doc.views || {};
      var fullViewName = viewName;
      if (fullViewName.indexOf('/') === -1) {
        fullViewName = viewName + '/' + viewName;
      }
      var depDbs = doc.views[fullViewName] = doc.views[fullViewName] || {};
      /* istanbul ignore if */
      if (depDbs[depDbName]) {
        return; // no update necessary
      }
      depDbs[depDbName] = true;
      return doc;
    }
    return upsert(sourceDB, '_local/' + localDocName, diffFunction).then(function () {
      return sourceDB.registerDependentDatabase(depDbName).then(function (res) {
        var db = res.db;
        db.auto_compaction = true;
        var view = {
          name: depDbName,
          db: db,
          sourceDB: sourceDB,
          adapter: sourceDB.adapter,
          mapFun: mapFun,
          reduceFun: reduceFun
        };
        return view.db.get('_local/lastSeq').catch(function (err) {
          /* istanbul ignore if */
          if (err.status !== 404) {
            throw err;
          }
        }).then(function (lastSeqDoc) {
          view.seq = lastSeqDoc ? lastSeqDoc.seq : 0;
          if (cachedViews) {
            view.db.once('destroyed', function () {
              delete cachedViews[viewSignature];
            });
          }
          return view;
        });
      });
    });
  });

  if (cachedViews) {
    cachedViews[viewSignature] = promiseForView;
  }
  return promiseForView;
}

var persistentQueues = {};
var tempViewQueue = new TaskQueue$1();
var CHANGES_BATCH_SIZE$1 = 50;

function parseViewName(name) {
  // can be either 'ddocname/viewname' or just 'viewname'
  // (where the ddoc name is the same)
  return name.indexOf('/') === -1 ? [name, name] : name.split('/');
}

function isGenOne(changes) {
  // only return true if the current change is 1-
  // and there are no other leafs
  return changes.length === 1 && /^1-/.test(changes[0].rev);
}

function emitError(db, e) {
  try {
    db.emit('error', e);
  } catch (err) {
    guardedConsole('error',
      'The user\'s map/reduce function threw an uncaught error.\n' +
      'You can debug this error by doing:\n' +
      'myDatabase.on(\'error\', function (err) { debugger; });\n' +
      'Please double-check your map/reduce function.');
    guardedConsole('error', e);
  }
}

/**
 * Returns an "abstract" mapreduce object of the form:
 *
 *   {
 *     query: queryFun,
 *     viewCleanup: viewCleanupFun
 *   }
 *
 * Arguments are:
 *
 * localDoc: string
 *   This is for the local doc that gets saved in order to track the
 *   "dependent" DBs and clean them up for viewCleanup. It should be
 *   unique, so that indexer plugins don't collide with each other.
 * mapper: function (mapFunDef, emit)
 *   Returns a map function based on the mapFunDef, which in the case of
 *   normal map/reduce is just the de-stringified function, but may be
 *   something else, such as an object in the case of pouchdb-find.
 * reducer: function (reduceFunDef)
 *   Ditto, but for reducing. Modules don't have to support reducing
 *   (e.g. pouchdb-find).
 * ddocValidator: function (ddoc, viewName)
 *   Throws an error if the ddoc or viewName is not valid.
 *   This could be a way to communicate to the user that the configuration for the
 *   indexer is invalid.
 */
function createAbstractMapReduce(localDocName, mapper, reducer, ddocValidator) {

  function tryMap(db, fun, doc) {
    // emit an event if there was an error thrown by a map function.
    // putting try/catches in a single function also avoids deoptimizations.
    try {
      fun(doc);
    } catch (e) {
      emitError(db, e);
    }
  }

  function tryReduce(db, fun, keys, values, rereduce) {
    // same as above, but returning the result or an error. there are two separate
    // functions to avoid extra memory allocations since the tryCode() case is used
    // for custom map functions (common) vs this function, which is only used for
    // custom reduce functions (rare)
    try {
      return {output : fun(keys, values, rereduce)};
    } catch (e) {
      emitError(db, e);
      return {error: e};
    }
  }

  function sortByKeyThenValue(x, y) {
    var keyCompare = collate(x.key, y.key);
    return keyCompare !== 0 ? keyCompare : collate(x.value, y.value);
  }

  function sliceResults(results, limit, skip) {
    skip = skip || 0;
    if (typeof limit === 'number') {
      return results.slice(skip, limit + skip);
    } else if (skip > 0) {
      return results.slice(skip);
    }
    return results;
  }

  function rowToDocId(row) {
    var val = row.value;
    // Users can explicitly specify a joined doc _id, or it
    // defaults to the doc _id that emitted the key/value.
    var docId = (val && typeof val === 'object' && val._id) || row.id;
    return docId;
  }

  function readAttachmentsAsBlobOrBuffer(res) {
    res.rows.forEach(function (row) {
      var atts = row.doc && row.doc._attachments;
      if (!atts) {
        return;
      }
      Object.keys(atts).forEach(function (filename) {
        var att = atts[filename];
        atts[filename].data = b64ToBluffer(att.data, att.content_type);
      });
    });
  }

  function postprocessAttachments(opts) {
    return function (res) {
      if (opts.include_docs && opts.attachments && opts.binary) {
        readAttachmentsAsBlobOrBuffer(res);
      }
      return res;
    };
  }

  function addHttpParam(paramName, opts, params, asJson) {
    // add an http param from opts to params, optionally json-encoded
    var val = opts[paramName];
    if (typeof val !== 'undefined') {
      if (asJson) {
        val = encodeURIComponent(JSON.stringify(val));
      }
      params.push(paramName + '=' + val);
    }
  }

  function coerceInteger(integerCandidate) {
    if (typeof integerCandidate !== 'undefined') {
      var asNumber = Number(integerCandidate);
      // prevents e.g. '1foo' or '1.1' being coerced to 1
      if (!isNaN(asNumber) && asNumber === parseInt(integerCandidate, 10)) {
        return asNumber;
      } else {
        return integerCandidate;
      }
    }
  }

  function coerceOptions(opts) {
    opts.group_level = coerceInteger(opts.group_level);
    opts.limit = coerceInteger(opts.limit);
    opts.skip = coerceInteger(opts.skip);
    return opts;
  }

  function checkPositiveInteger(number) {
    if (number) {
      if (typeof number !== 'number') {
        return  new QueryParseError('Invalid value for integer: "' +
          number + '"');
      }
      if (number < 0) {
        return new QueryParseError('Invalid value for positive integer: ' +
          '"' + number + '"');
      }
    }
  }

  function checkQueryParseError(options, fun) {
    var startkeyName = options.descending ? 'endkey' : 'startkey';
    var endkeyName = options.descending ? 'startkey' : 'endkey';

    if (typeof options[startkeyName] !== 'undefined' &&
      typeof options[endkeyName] !== 'undefined' &&
      collate(options[startkeyName], options[endkeyName]) > 0) {
      throw new QueryParseError('No rows can match your key range, ' +
        'reverse your start_key and end_key or set {descending : true}');
    } else if (fun.reduce && options.reduce !== false) {
      if (options.include_docs) {
        throw new QueryParseError('{include_docs:true} is invalid for reduce');
      } else if (options.keys && options.keys.length > 1 &&
        !options.group && !options.group_level) {
        throw new QueryParseError('Multi-key fetches for reduce views must use ' +
          '{group: true}');
      }
    }
    ['group_level', 'limit', 'skip'].forEach(function (optionName) {
      var error = checkPositiveInteger(options[optionName]);
      if (error) {
        throw error;
      }
    });
  }

  function httpQuery(db, fun, opts) {
    // List of parameters to add to the PUT request
    var params = [];
    var body;
    var method = 'GET';
    var ok, status;

    // If opts.reduce exists and is defined, then add it to the list
    // of parameters.
    // If reduce=false then the results are that of only the map function
    // not the final result of map and reduce.
    addHttpParam('reduce', opts, params);
    addHttpParam('include_docs', opts, params);
    addHttpParam('attachments', opts, params);
    addHttpParam('limit', opts, params);
    addHttpParam('descending', opts, params);
    addHttpParam('group', opts, params);
    addHttpParam('group_level', opts, params);
    addHttpParam('skip', opts, params);
    addHttpParam('stale', opts, params);
    addHttpParam('conflicts', opts, params);
    addHttpParam('startkey', opts, params, true);
    addHttpParam('start_key', opts, params, true);
    addHttpParam('endkey', opts, params, true);
    addHttpParam('end_key', opts, params, true);
    addHttpParam('inclusive_end', opts, params);
    addHttpParam('key', opts, params, true);
    addHttpParam('update_seq', opts, params);

    // Format the list of parameters into a valid URI query string
    params = params.join('&');
    params = params === '' ? '' : '?' + params;

    // If keys are supplied, issue a POST to circumvent GET query string limits
    // see http://wiki.apache.org/couchdb/HTTP_view_API#Querying_Options
    if (typeof opts.keys !== 'undefined') {
      var MAX_URL_LENGTH = 2000;
      // according to http://stackoverflow.com/a/417184/680742,
      // the de facto URL length limit is 2000 characters

      var keysAsString =
        'keys=' + encodeURIComponent(JSON.stringify(opts.keys));
      if (keysAsString.length + params.length + 1 <= MAX_URL_LENGTH) {
        // If the keys are short enough, do a GET. we do this to work around
        // Safari not understanding 304s on POSTs (see pouchdb/pouchdb#1239)
        params += (params[0] === '?' ? '&' : '?') + keysAsString;
      } else {
        method = 'POST';
        if (typeof fun === 'string') {
          body = {keys: opts.keys};
        } else { // fun is {map : mapfun}, so append to this
          fun.keys = opts.keys;
        }
      }
    }

    // We are referencing a query defined in the design doc
    if (typeof fun === 'string') {
      var parts = parseViewName(fun);
      return db.fetch('_design/' + parts[0] + '/_view/' + parts[1] + params, {
        headers: new h({'Content-Type': 'application/json'}),
        method: method,
        body: JSON.stringify(body)
      }).then(function (response) {
        ok = response.ok;
        status = response.status;
        return response.json();
      }).then(function (result) {
        if (!ok) {
          result.status = status;
          throw generateErrorFromResponse(result);
        }
        // fail the entire request if the result contains an error
        result.rows.forEach(function (row) {
          /* istanbul ignore if */
          if (row.value && row.value.error && row.value.error === "builtin_reduce_error") {
            throw new Error(row.reason);
          }
        });
        return result;
      }).then(postprocessAttachments(opts));
    }

    // We are using a temporary view, terrible for performance, good for testing
    body = body || {};
    Object.keys(fun).forEach(function (key) {
      if (Array.isArray(fun[key])) {
        body[key] = fun[key];
      } else {
        body[key] = fun[key].toString();
      }
    });

    return db.fetch('_temp_view' + params, {
      headers: new h({'Content-Type': 'application/json'}),
      method: 'POST',
      body: JSON.stringify(body)
    }).then(function (response) {
        ok = response.ok;
        status = response.status;
      return response.json();
    }).then(function (result) {
      if (!ok) {
        result.status = status;
        throw generateErrorFromResponse(result);
      }
      return result;
    }).then(postprocessAttachments(opts));
  }

  // custom adapters can define their own api._query
  // and override the default behavior
  /* istanbul ignore next */
  function customQuery(db, fun, opts) {
    return new Promise(function (resolve, reject) {
      db._query(fun, opts, function (err, res) {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
  }

  // custom adapters can define their own api._viewCleanup
  // and override the default behavior
  /* istanbul ignore next */
  function customViewCleanup(db) {
    return new Promise(function (resolve, reject) {
      db._viewCleanup(function (err, res) {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
  }

  function defaultsTo(value) {
    return function (reason) {
      /* istanbul ignore else */
      if (reason.status === 404) {
        return value;
      } else {
        throw reason;
      }
    };
  }

  // returns a promise for a list of docs to update, based on the input docId.
  // the order doesn't matter, because post-3.2.0, bulkDocs
  // is an atomic operation in all three adapters.
  function getDocsToPersist(docId, view, docIdsToChangesAndEmits) {
    var metaDocId = '_local/doc_' + docId;
    var defaultMetaDoc = {_id: metaDocId, keys: []};
    var docData = docIdsToChangesAndEmits.get(docId);
    var indexableKeysToKeyValues = docData[0];
    var changes = docData[1];

    function getMetaDoc() {
      if (isGenOne(changes)) {
        // generation 1, so we can safely assume initial state
        // for performance reasons (avoids unnecessary GETs)
        return Promise.resolve(defaultMetaDoc);
      }
      return view.db.get(metaDocId).catch(defaultsTo(defaultMetaDoc));
    }

    function getKeyValueDocs(metaDoc) {
      if (!metaDoc.keys.length) {
        // no keys, no need for a lookup
        return Promise.resolve({rows: []});
      }
      return view.db.allDocs({
        keys: metaDoc.keys,
        include_docs: true
      });
    }

    function processKeyValueDocs(metaDoc, kvDocsRes) {
      var kvDocs = [];
      var oldKeys = new ExportedSet();

      for (var i = 0, len = kvDocsRes.rows.length; i < len; i++) {
        var row = kvDocsRes.rows[i];
        var doc = row.doc;
        if (!doc) { // deleted
          continue;
        }
        kvDocs.push(doc);
        oldKeys.add(doc._id);
        doc._deleted = !indexableKeysToKeyValues.has(doc._id);
        if (!doc._deleted) {
          var keyValue = indexableKeysToKeyValues.get(doc._id);
          if ('value' in keyValue) {
            doc.value = keyValue.value;
          }
        }
      }
      var newKeys = mapToKeysArray(indexableKeysToKeyValues);
      newKeys.forEach(function (key) {
        if (!oldKeys.has(key)) {
          // new doc
          var kvDoc = {
            _id: key
          };
          var keyValue = indexableKeysToKeyValues.get(key);
          if ('value' in keyValue) {
            kvDoc.value = keyValue.value;
          }
          kvDocs.push(kvDoc);
        }
      });
      metaDoc.keys = uniq(newKeys.concat(metaDoc.keys));
      kvDocs.push(metaDoc);

      return kvDocs;
    }

    return getMetaDoc().then(function (metaDoc) {
      return getKeyValueDocs(metaDoc).then(function (kvDocsRes) {
        return processKeyValueDocs(metaDoc, kvDocsRes);
      });
    });
  }

  // updates all emitted key/value docs and metaDocs in the mrview database
  // for the given batch of documents from the source database
  function saveKeyValues(view, docIdsToChangesAndEmits, seq) {
    var seqDocId = '_local/lastSeq';
    return view.db.get(seqDocId)
      .catch(defaultsTo({_id: seqDocId, seq: 0}))
      .then(function (lastSeqDoc) {
        var docIds = mapToKeysArray(docIdsToChangesAndEmits);
        return Promise.all(docIds.map(function (docId) {
          return getDocsToPersist(docId, view, docIdsToChangesAndEmits);
        })).then(function (listOfDocsToPersist) {
          var docsToPersist = flatten(listOfDocsToPersist);
          lastSeqDoc.seq = seq;
          docsToPersist.push(lastSeqDoc);
          // write all docs in a single operation, update the seq once
          return view.db.bulkDocs({docs : docsToPersist});
        });
      });
  }

  function getQueue(view) {
    var viewName = typeof view === 'string' ? view : view.name;
    var queue = persistentQueues[viewName];
    if (!queue) {
      queue = persistentQueues[viewName] = new TaskQueue$1();
    }
    return queue;
  }

  function updateView(view) {
    return sequentialize(getQueue(view), function () {
      return updateViewInQueue(view);
    })();
  }

  function updateViewInQueue(view) {
    // bind the emit function once
    var mapResults;
    var doc;

    function emit(key, value) {
      var output = {id: doc._id, key: normalizeKey(key)};
      // Don't explicitly store the value unless it's defined and non-null.
      // This saves on storage space, because often people don't use it.
      if (typeof value !== 'undefined' && value !== null) {
        output.value = normalizeKey(value);
      }
      mapResults.push(output);
    }

    var mapFun = mapper(view.mapFun, emit);

    var currentSeq = view.seq || 0;

    function processChange(docIdsToChangesAndEmits, seq) {
      return function () {
        return saveKeyValues(view, docIdsToChangesAndEmits, seq);
      };
    }

    var queue = new TaskQueue$1();

    function processNextBatch() {
      return view.sourceDB.changes({
        return_docs: true,
        conflicts: true,
        include_docs: true,
        style: 'all_docs',
        since: currentSeq,
        limit: CHANGES_BATCH_SIZE$1
      }).then(processBatch);
    }

    function processBatch(response) {
      var results = response.results;
      if (!results.length) {
        return;
      }
      var docIdsToChangesAndEmits = createDocIdsToChangesAndEmits(results);
      queue.add(processChange(docIdsToChangesAndEmits, currentSeq));
      if (results.length < CHANGES_BATCH_SIZE$1) {
        return;
      }
      return processNextBatch();
    }

    function createDocIdsToChangesAndEmits(results) {
      var docIdsToChangesAndEmits = new ExportedMap();
      for (var i = 0, len = results.length; i < len; i++) {
        var change = results[i];
        if (change.doc._id[0] !== '_') {
          mapResults = [];
          doc = change.doc;

          if (!doc._deleted) {
            tryMap(view.sourceDB, mapFun, doc);
          }
          mapResults.sort(sortByKeyThenValue);

          var indexableKeysToKeyValues = createIndexableKeysToKeyValues(mapResults);
          docIdsToChangesAndEmits.set(change.doc._id, [
            indexableKeysToKeyValues,
            change.changes
          ]);
        }
        currentSeq = change.seq;
      }
      return docIdsToChangesAndEmits;
    }

    function createIndexableKeysToKeyValues(mapResults) {
      var indexableKeysToKeyValues = new ExportedMap();
      var lastKey;
      for (var i = 0, len = mapResults.length; i < len; i++) {
        var emittedKeyValue = mapResults[i];
        var complexKey = [emittedKeyValue.key, emittedKeyValue.id];
        if (i > 0 && collate(emittedKeyValue.key, lastKey) === 0) {
          complexKey.push(i); // dup key+id, so make it unique
        }
        indexableKeysToKeyValues.set(toIndexableString(complexKey), emittedKeyValue);
        lastKey = emittedKeyValue.key;
      }
      return indexableKeysToKeyValues;
    }

    return processNextBatch().then(function () {
      return queue.finish();
    }).then(function () {
      view.seq = currentSeq;
    });
  }

  function reduceView(view, results, options) {
    if (options.group_level === 0) {
      delete options.group_level;
    }

    var shouldGroup = options.group || options.group_level;

    var reduceFun = reducer(view.reduceFun);

    var groups = [];
    var lvl = isNaN(options.group_level) ? Number.POSITIVE_INFINITY :
      options.group_level;
    results.forEach(function (e) {
      var last = groups[groups.length - 1];
      var groupKey = shouldGroup ? e.key : null;

      // only set group_level for array keys
      if (shouldGroup && Array.isArray(groupKey)) {
        groupKey = groupKey.slice(0, lvl);
      }

      if (last && collate(last.groupKey, groupKey) === 0) {
        last.keys.push([e.key, e.id]);
        last.values.push(e.value);
        return;
      }
      groups.push({
        keys: [[e.key, e.id]],
        values: [e.value],
        groupKey: groupKey
      });
    });
    results = [];
    for (var i = 0, len = groups.length; i < len; i++) {
      var e = groups[i];
      var reduceTry = tryReduce(view.sourceDB, reduceFun, e.keys, e.values, false);
      if (reduceTry.error && reduceTry.error instanceof BuiltInError) {
        // CouchDB returns an error if a built-in errors out
        throw reduceTry.error;
      }
      results.push({
        // CouchDB just sets the value to null if a non-built-in errors out
        value: reduceTry.error ? null : reduceTry.output,
        key: e.groupKey
      });
    }
    // no total_rows/offset when reducing
    return {rows: sliceResults(results, options.limit, options.skip)};
  }

  function queryView(view, opts) {
    return sequentialize(getQueue(view), function () {
      return queryViewInQueue(view, opts);
    })();
  }

  function queryViewInQueue(view, opts) {
    var totalRows;
    var shouldReduce = view.reduceFun && opts.reduce !== false;
    var skip = opts.skip || 0;
    if (typeof opts.keys !== 'undefined' && !opts.keys.length) {
      // equivalent query
      opts.limit = 0;
      delete opts.keys;
    }

    function fetchFromView(viewOpts) {
      viewOpts.include_docs = true;
      return view.db.allDocs(viewOpts).then(function (res) {
        totalRows = res.total_rows;
        return res.rows.map(function (result) {

          // implicit migration - in older versions of PouchDB,
          // we explicitly stored the doc as {id: ..., key: ..., value: ...}
          // this is tested in a migration test
          /* istanbul ignore next */
          if ('value' in result.doc && typeof result.doc.value === 'object' &&
            result.doc.value !== null) {
            var keys = Object.keys(result.doc.value).sort();
            // this detection method is not perfect, but it's unlikely the user
            // emitted a value which was an object with these 3 exact keys
            var expectedKeys = ['id', 'key', 'value'];
            if (!(keys < expectedKeys || keys > expectedKeys)) {
              return result.doc.value;
            }
          }

          var parsedKeyAndDocId = parseIndexableString(result.doc._id);
          return {
            key: parsedKeyAndDocId[0],
            id: parsedKeyAndDocId[1],
            value: ('value' in result.doc ? result.doc.value : null)
          };
        });
      });
    }

    function onMapResultsReady(rows) {
      var finalResults;
      if (shouldReduce) {
        finalResults = reduceView(view, rows, opts);
      } else {
        finalResults = {
          total_rows: totalRows,
          offset: skip,
          rows: rows
        };
      }
      /* istanbul ignore if */
      if (opts.update_seq) {
        finalResults.update_seq = view.seq;
      }
      if (opts.include_docs) {
        var docIds = uniq(rows.map(rowToDocId));

        return view.sourceDB.allDocs({
          keys: docIds,
          include_docs: true,
          conflicts: opts.conflicts,
          attachments: opts.attachments,
          binary: opts.binary
        }).then(function (allDocsRes) {
          var docIdsToDocs = new ExportedMap();
          allDocsRes.rows.forEach(function (row) {
            docIdsToDocs.set(row.id, row.doc);
          });
          rows.forEach(function (row) {
            var docId = rowToDocId(row);
            var doc = docIdsToDocs.get(docId);
            if (doc) {
              row.doc = doc;
            }
          });
          return finalResults;
        });
      } else {
        return finalResults;
      }
    }

    if (typeof opts.keys !== 'undefined') {
      var keys = opts.keys;
      var fetchPromises = keys.map(function (key) {
        var viewOpts = {
          startkey : toIndexableString([key]),
          endkey   : toIndexableString([key, {}])
        };
        /* istanbul ignore if */
        if (opts.update_seq) {
          viewOpts.update_seq = true;
        }
        return fetchFromView(viewOpts);
      });
      return Promise.all(fetchPromises).then(flatten).then(onMapResultsReady);
    } else { // normal query, no 'keys'
      var viewOpts = {
        descending : opts.descending
      };
      /* istanbul ignore if */
      if (opts.update_seq) {
        viewOpts.update_seq = true;
      }
      var startkey;
      var endkey;
      if ('start_key' in opts) {
        startkey = opts.start_key;
      }
      if ('startkey' in opts) {
        startkey = opts.startkey;
      }
      if ('end_key' in opts) {
        endkey = opts.end_key;
      }
      if ('endkey' in opts) {
        endkey = opts.endkey;
      }
      if (typeof startkey !== 'undefined') {
        viewOpts.startkey = opts.descending ?
          toIndexableString([startkey, {}]) :
          toIndexableString([startkey]);
      }
      if (typeof endkey !== 'undefined') {
        var inclusiveEnd = opts.inclusive_end !== false;
        if (opts.descending) {
          inclusiveEnd = !inclusiveEnd;
        }

        viewOpts.endkey = toIndexableString(
          inclusiveEnd ? [endkey, {}] : [endkey]);
      }
      if (typeof opts.key !== 'undefined') {
        var keyStart = toIndexableString([opts.key]);
        var keyEnd = toIndexableString([opts.key, {}]);
        if (viewOpts.descending) {
          viewOpts.endkey = keyStart;
          viewOpts.startkey = keyEnd;
        } else {
          viewOpts.startkey = keyStart;
          viewOpts.endkey = keyEnd;
        }
      }
      if (!shouldReduce) {
        if (typeof opts.limit === 'number') {
          viewOpts.limit = opts.limit;
        }
        viewOpts.skip = skip;
      }
      return fetchFromView(viewOpts).then(onMapResultsReady);
    }
  }

  function httpViewCleanup(db) {
    return db.fetch('_view_cleanup', {
      headers: new h({'Content-Type': 'application/json'}),
      method: 'POST'
    }).then(function (response) {
      return response.json();
    });
  }

  function localViewCleanup(db) {
    return db.get('_local/' + localDocName).then(function (metaDoc) {
      var docsToViews = new ExportedMap();
      Object.keys(metaDoc.views).forEach(function (fullViewName) {
        var parts = parseViewName(fullViewName);
        var designDocName = '_design/' + parts[0];
        var viewName = parts[1];
        var views = docsToViews.get(designDocName);
        if (!views) {
          views = new ExportedSet();
          docsToViews.set(designDocName, views);
        }
        views.add(viewName);
      });
      var opts = {
        keys : mapToKeysArray(docsToViews),
        include_docs : true
      };
      return db.allDocs(opts).then(function (res) {
        var viewsToStatus = {};
        res.rows.forEach(function (row) {
          var ddocName = row.key.substring(8); // cuts off '_design/'
          docsToViews.get(row.key).forEach(function (viewName) {
            var fullViewName = ddocName + '/' + viewName;
            /* istanbul ignore if */
            if (!metaDoc.views[fullViewName]) {
              // new format, without slashes, to support PouchDB 2.2.0
              // migration test in pouchdb's browser.migration.js verifies this
              fullViewName = viewName;
            }
            var viewDBNames = Object.keys(metaDoc.views[fullViewName]);
            // design doc deleted, or view function nonexistent
            var statusIsGood = row.doc && row.doc.views &&
              row.doc.views[viewName];
            viewDBNames.forEach(function (viewDBName) {
              viewsToStatus[viewDBName] =
                viewsToStatus[viewDBName] || statusIsGood;
            });
          });
        });
        var dbsToDelete = Object.keys(viewsToStatus).filter(
          function (viewDBName) { return !viewsToStatus[viewDBName]; });
        var destroyPromises = dbsToDelete.map(function (viewDBName) {
          return sequentialize(getQueue(viewDBName), function () {
            return new db.constructor(viewDBName, db.__opts).destroy();
          })();
        });
        return Promise.all(destroyPromises).then(function () {
          return {ok: true};
        });
      });
    }, defaultsTo({ok: true}));
  }

  function queryPromised(db, fun, opts) {
    /* istanbul ignore next */
    if (typeof db._query === 'function') {
      return customQuery(db, fun, opts);
    }
    if (isRemote(db)) {
      return httpQuery(db, fun, opts);
    }

    if (typeof fun !== 'string') {
      // temp_view
      checkQueryParseError(opts, fun);

      tempViewQueue.add(function () {
        var createViewPromise = createView(
          /* sourceDB */ db,
          /* viewName */ 'temp_view/temp_view',
          /* mapFun */ fun.map,
          /* reduceFun */ fun.reduce,
          /* temporary */ true,
          /* localDocName */ localDocName);
        return createViewPromise.then(function (view) {
          return fin(updateView(view).then(function () {
            return queryView(view, opts);
          }), function () {
            return view.db.destroy();
          });
        });
      });
      return tempViewQueue.finish();
    } else {
      // persistent view
      var fullViewName = fun;
      var parts = parseViewName(fullViewName);
      var designDocName = parts[0];
      var viewName = parts[1];
      return db.get('_design/' + designDocName).then(function (doc) {
        var fun = doc.views && doc.views[viewName];

        if (!fun) {
          // basic validator; it's assumed that every subclass would want this
          throw new NotFoundError('ddoc ' + doc._id + ' has no view named ' +
            viewName);
        }

        ddocValidator(doc, viewName);
        checkQueryParseError(opts, fun);

        var createViewPromise = createView(
          /* sourceDB */ db,
          /* viewName */ fullViewName,
          /* mapFun */ fun.map,
          /* reduceFun */ fun.reduce,
          /* temporary */ false,
          /* localDocName */ localDocName);
        return createViewPromise.then(function (view) {
          if (opts.stale === 'ok' || opts.stale === 'update_after') {
            if (opts.stale === 'update_after') {
              nextTick(function () {
                updateView(view);
              });
            }
            return queryView(view, opts);
          } else { // stale not ok
            return updateView(view).then(function () {
              return queryView(view, opts);
            });
          }
        });
      });
    }
  }

  function abstractQuery(fun, opts, callback) {
    var db = this;
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    opts = opts ? coerceOptions(opts) : {};

    if (typeof fun === 'function') {
      fun = {map : fun};
    }

    var promise = Promise.resolve().then(function () {
      return queryPromised(db, fun, opts);
    });
    promisedCallback(promise, callback);
    return promise;
  }

  var abstractViewCleanup = callbackify(function () {
    var db = this;
    /* istanbul ignore next */
    if (typeof db._viewCleanup === 'function') {
      return customViewCleanup(db);
    }
    if (isRemote(db)) {
      return httpViewCleanup(db);
    }
    return localViewCleanup(db);
  });

  return {
    query: abstractQuery,
    viewCleanup: abstractViewCleanup
  };
}

var builtInReduce = {
  _sum: function (keys, values) {
    return sum(values);
  },

  _count: function (keys, values) {
    return values.length;
  },

  _stats: function (keys, values) {
    // no need to implement rereduce=true, because Pouch
    // will never call it
    function sumsqr(values) {
      var _sumsqr = 0;
      for (var i = 0, len = values.length; i < len; i++) {
        var num = values[i];
        _sumsqr += (num * num);
      }
      return _sumsqr;
    }
    return {
      sum     : sum(values),
      min     : Math.min.apply(null, values),
      max     : Math.max.apply(null, values),
      count   : values.length,
      sumsqr : sumsqr(values)
    };
  }
};

function getBuiltIn(reduceFunString) {
  if (/^_sum/.test(reduceFunString)) {
    return builtInReduce._sum;
  } else if (/^_count/.test(reduceFunString)) {
    return builtInReduce._count;
  } else if (/^_stats/.test(reduceFunString)) {
    return builtInReduce._stats;
  } else if (/^_/.test(reduceFunString)) {
    throw new Error(reduceFunString + ' is not a supported reduce function.');
  }
}

function mapper(mapFun, emit) {
  // for temp_views one can use emit(doc, emit), see #38
  if (typeof mapFun === "function" && mapFun.length === 2) {
    var origMap = mapFun;
    return function (doc) {
      return origMap(doc, emit);
    };
  } else {
    return evalFunctionWithEval(mapFun.toString(), emit);
  }
}

function reducer(reduceFun) {
  var reduceFunString = reduceFun.toString();
  var builtIn = getBuiltIn(reduceFunString);
  if (builtIn) {
    return builtIn;
  } else {
    return evalFunctionWithEval(reduceFunString);
  }
}

function ddocValidator(ddoc, viewName) {
  var fun = ddoc.views && ddoc.views[viewName];
  if (typeof fun.map !== 'string') {
    throw new NotFoundError('ddoc ' + ddoc._id + ' has no string view named ' +
      viewName + ', instead found object of type: ' + typeof fun.map);
  }
}

var localDocName = 'mrviews';
var abstract = createAbstractMapReduce(localDocName, mapper, reducer, ddocValidator);

function query(fun, opts, callback) {
  return abstract.query.call(this, fun, opts, callback);
}

function viewCleanup(callback) {
  return abstract.viewCleanup.call(this, callback);
}

var mapreduce = {
  query: query,
  viewCleanup: viewCleanup
};

function isGenOne$1(rev) {
  return /^1-/.test(rev);
}

function fileHasChanged(localDoc, remoteDoc, filename) {
  return !localDoc._attachments ||
         !localDoc._attachments[filename] ||
         localDoc._attachments[filename].digest !== remoteDoc._attachments[filename].digest;
}

function getDocAttachments(db, doc) {
  var filenames = Object.keys(doc._attachments);
  return Promise.all(filenames.map(function (filename) {
    return db.getAttachment(doc._id, filename, {rev: doc._rev});
  }));
}

function getDocAttachmentsFromTargetOrSource(target, src, doc) {
  var doCheckForLocalAttachments = isRemote(src) && !isRemote(target);
  var filenames = Object.keys(doc._attachments);

  if (!doCheckForLocalAttachments) {
    return getDocAttachments(src, doc);
  }

  return target.get(doc._id).then(function (localDoc) {
    return Promise.all(filenames.map(function (filename) {
      if (fileHasChanged(localDoc, doc, filename)) {
        return src.getAttachment(doc._id, filename);
      }

      return target.getAttachment(localDoc._id, filename);
    }));
  }).catch(function (error) {
    /* istanbul ignore if */
    if (error.status !== 404) {
      throw error;
    }

    return getDocAttachments(src, doc);
  });
}

function createBulkGetOpts(diffs) {
  var requests = [];
  Object.keys(diffs).forEach(function (id) {
    var missingRevs = diffs[id].missing;
    missingRevs.forEach(function (missingRev) {
      requests.push({
        id: id,
        rev: missingRev
      });
    });
  });

  return {
    docs: requests,
    revs: true,
    latest: true
  };
}

//
// Fetch all the documents from the src as described in the "diffs",
// which is a mapping of docs IDs to revisions. If the state ever
// changes to "cancelled", then the returned promise will be rejected.
// Else it will be resolved with a list of fetched documents.
//
function getDocs(src, target, diffs, state) {
  diffs = clone(diffs); // we do not need to modify this

  var resultDocs = [],
      ok = true;

  function getAllDocs() {

    var bulkGetOpts = createBulkGetOpts(diffs);

    if (!bulkGetOpts.docs.length) { // optimization: skip empty requests
      return;
    }

    return src.bulkGet(bulkGetOpts).then(function (bulkGetResponse) {
      /* istanbul ignore if */
      if (state.cancelled) {
        throw new Error('cancelled');
      }
      return Promise.all(bulkGetResponse.results.map(function (bulkGetInfo) {
        return Promise.all(bulkGetInfo.docs.map(function (doc) {
          var remoteDoc = doc.ok;

          if (doc.error) {
            // when AUTO_COMPACTION is set, docs can be returned which look
            // like this: {"missing":"1-7c3ac256b693c462af8442f992b83696"}
            ok = false;
          }

          if (!remoteDoc || !remoteDoc._attachments) {
            return remoteDoc;
          }

          return getDocAttachmentsFromTargetOrSource(target, src, remoteDoc)
                   .then(function (attachments) {
                           var filenames = Object.keys(remoteDoc._attachments);
                           attachments
                             .forEach(function (attachment, i) {
                                        var att = remoteDoc._attachments[filenames[i]];
                                        delete att.stub;
                                        delete att.length;
                                        att.data = attachment;
                                      });

                                      return remoteDoc;
                                    });
        }));
      }))

      .then(function (results) {
        resultDocs = resultDocs.concat(flatten(results).filter(Boolean));
      });
    });
  }

  function hasAttachments(doc) {
    return doc._attachments && Object.keys(doc._attachments).length > 0;
  }

  function hasConflicts(doc) {
    return doc._conflicts && doc._conflicts.length > 0;
  }

  function fetchRevisionOneDocs(ids) {
    // Optimization: fetch gen-1 docs and attachments in
    // a single request using _all_docs
    return src.allDocs({
      keys: ids,
      include_docs: true,
      conflicts: true
    }).then(function (res) {
      if (state.cancelled) {
        throw new Error('cancelled');
      }
      res.rows.forEach(function (row) {
        if (row.deleted || !row.doc || !isGenOne$1(row.value.rev) ||
            hasAttachments(row.doc) || hasConflicts(row.doc)) {
          // if any of these conditions apply, we need to fetch using get()
          return;
        }

        // strip _conflicts array to appease CSG (#5793)
        /* istanbul ignore if */
        if (row.doc._conflicts) {
          delete row.doc._conflicts;
        }

        // the doc we got back from allDocs() is sufficient
        resultDocs.push(row.doc);
        delete diffs[row.id];
      });
    });
  }

  function getRevisionOneDocs() {
    // filter out the generation 1 docs and get them
    // leaving the non-generation one docs to be got otherwise
    var ids = Object.keys(diffs).filter(function (id) {
      var missing = diffs[id].missing;
      return missing.length === 1 && isGenOne$1(missing[0]);
    });
    if (ids.length > 0) {
      return fetchRevisionOneDocs(ids);
    }
  }

  function returnResult() {
    return { ok:ok, docs:resultDocs };
  }

  return Promise.resolve()
    .then(getRevisionOneDocs)
    .then(getAllDocs)
    .then(returnResult);
}

var CHECKPOINT_VERSION = 1;
var REPLICATOR = "pouchdb";
// This is an arbitrary number to limit the
// amount of replication history we save in the checkpoint.
// If we save too much, the checkpoing docs will become very big,
// if we save fewer, we'll run a greater risk of having to
// read all the changes from 0 when checkpoint PUTs fail
// CouchDB 2.0 has a more involved history pruning,
// but let's go for the simple version for now.
var CHECKPOINT_HISTORY_SIZE = 5;
var LOWEST_SEQ = 0;

function updateCheckpoint(db, id, checkpoint, session, returnValue) {
  return db.get(id).catch(function (err) {
    if (err.status === 404) {
      if (db.adapter === 'http' || db.adapter === 'https') {
        explainError(
          404, 'PouchDB is just checking if a remote checkpoint exists.'
        );
      }
      return {
        session_id: session,
        _id: id,
        history: [],
        replicator: REPLICATOR,
        version: CHECKPOINT_VERSION
      };
    }
    throw err;
  }).then(function (doc) {
    if (returnValue.cancelled) {
      return;
    }

    // if the checkpoint has not changed, do not update
    if (doc.last_seq === checkpoint) {
      return;
    }

    // Filter out current entry for this replication
    doc.history = (doc.history || []).filter(function (item) {
      return item.session_id !== session;
    });

    // Add the latest checkpoint to history
    doc.history.unshift({
      last_seq: checkpoint,
      session_id: session
    });

    // Just take the last pieces in history, to
    // avoid really big checkpoint docs.
    // see comment on history size above
    doc.history = doc.history.slice(0, CHECKPOINT_HISTORY_SIZE);

    doc.version = CHECKPOINT_VERSION;
    doc.replicator = REPLICATOR;

    doc.session_id = session;
    doc.last_seq = checkpoint;

    return db.put(doc).catch(function (err) {
      if (err.status === 409) {
        // retry; someone is trying to write a checkpoint simultaneously
        return updateCheckpoint(db, id, checkpoint, session, returnValue);
      }
      throw err;
    });
  });
}

function Checkpointer(src, target, id, returnValue, opts) {
  this.src = src;
  this.target = target;
  this.id = id;
  this.returnValue = returnValue;
  this.opts = opts || {};
}

Checkpointer.prototype.writeCheckpoint = function (checkpoint, session) {
  var self = this;
  return this.updateTarget(checkpoint, session).then(function () {
    return self.updateSource(checkpoint, session);
  });
};

Checkpointer.prototype.updateTarget = function (checkpoint, session) {
  if (this.opts.writeTargetCheckpoint) {
    return updateCheckpoint(this.target, this.id, checkpoint,
      session, this.returnValue);
  } else {
    return Promise.resolve(true);
  }
};

Checkpointer.prototype.updateSource = function (checkpoint, session) {
  if (this.opts.writeSourceCheckpoint) {
    var self = this;
    return updateCheckpoint(this.src, this.id, checkpoint,
      session, this.returnValue)
      .catch(function (err) {
        if (isForbiddenError(err)) {
          self.opts.writeSourceCheckpoint = false;
          return true;
        }
        throw err;
      });
  } else {
    return Promise.resolve(true);
  }
};

var comparisons = {
  "undefined": function (targetDoc, sourceDoc) {
    // This is the previous comparison function
    if (collate(targetDoc.last_seq, sourceDoc.last_seq) === 0) {
      return sourceDoc.last_seq;
    }
    /* istanbul ignore next */
    return 0;
  },
  "1": function (targetDoc, sourceDoc) {
    // This is the comparison function ported from CouchDB
    return compareReplicationLogs(sourceDoc, targetDoc).last_seq;
  }
};

Checkpointer.prototype.getCheckpoint = function () {
  var self = this;

  if (self.opts && self.opts.writeSourceCheckpoint && !self.opts.writeTargetCheckpoint) {
    return self.src.get(self.id).then(function (sourceDoc) {
      return sourceDoc.last_seq || LOWEST_SEQ;
    }).catch(function (err) {
      /* istanbul ignore if */
      if (err.status !== 404) {
        throw err;
      }
      return LOWEST_SEQ;
    });
  }

  return self.target.get(self.id).then(function (targetDoc) {
    if (self.opts && self.opts.writeTargetCheckpoint && !self.opts.writeSourceCheckpoint) {
      return targetDoc.last_seq || LOWEST_SEQ;
    }

    return self.src.get(self.id).then(function (sourceDoc) {
      // Since we can't migrate an old version doc to a new one
      // (no session id), we just go with the lowest seq in this case
      /* istanbul ignore if */
      if (targetDoc.version !== sourceDoc.version) {
        return LOWEST_SEQ;
      }

      var version;
      if (targetDoc.version) {
        version = targetDoc.version.toString();
      } else {
        version = "undefined";
      }

      if (version in comparisons) {
        return comparisons[version](targetDoc, sourceDoc);
      }
      /* istanbul ignore next */
      return LOWEST_SEQ;
    }, function (err) {
      if (err.status === 404 && targetDoc.last_seq) {
        return self.src.put({
          _id: self.id,
          last_seq: LOWEST_SEQ
        }).then(function () {
          return LOWEST_SEQ;
        }, function (err) {
          if (isForbiddenError(err)) {
            self.opts.writeSourceCheckpoint = false;
            return targetDoc.last_seq;
          }
          /* istanbul ignore next */
          return LOWEST_SEQ;
        });
      }
      throw err;
    });
  }).catch(function (err) {
    if (err.status !== 404) {
      throw err;
    }
    return LOWEST_SEQ;
  });
};
// This checkpoint comparison is ported from CouchDBs source
// they come from here:
// https://github.com/apache/couchdb-couch-replicator/blob/master/src/couch_replicator.erl#L863-L906

function compareReplicationLogs(srcDoc, tgtDoc) {
  if (srcDoc.session_id === tgtDoc.session_id) {
    return {
      last_seq: srcDoc.last_seq,
      history: srcDoc.history
    };
  }

  return compareReplicationHistory(srcDoc.history, tgtDoc.history);
}

function compareReplicationHistory(sourceHistory, targetHistory) {
  // the erlang loop via function arguments is not so easy to repeat in JS
  // therefore, doing this as recursion
  var S = sourceHistory[0];
  var sourceRest = sourceHistory.slice(1);
  var T = targetHistory[0];
  var targetRest = targetHistory.slice(1);

  if (!S || targetHistory.length === 0) {
    return {
      last_seq: LOWEST_SEQ,
      history: []
    };
  }

  var sourceId = S.session_id;
  /* istanbul ignore if */
  if (hasSessionId(sourceId, targetHistory)) {
    return {
      last_seq: S.last_seq,
      history: sourceHistory
    };
  }

  var targetId = T.session_id;
  if (hasSessionId(targetId, sourceRest)) {
    return {
      last_seq: T.last_seq,
      history: targetRest
    };
  }

  return compareReplicationHistory(sourceRest, targetRest);
}

function hasSessionId(sessionId, history) {
  var props = history[0];
  var rest = history.slice(1);

  if (!sessionId || history.length === 0) {
    return false;
  }

  if (sessionId === props.session_id) {
    return true;
  }

  return hasSessionId(sessionId, rest);
}

function isForbiddenError(err) {
  return typeof err.status === 'number' && Math.floor(err.status / 100) === 4;
}

var STARTING_BACK_OFF = 0;

function backOff(opts, returnValue, error, callback) {
  if (opts.retry === false) {
    returnValue.emit('error', error);
    returnValue.removeAllListeners();
    return;
  }
  /* istanbul ignore if */
  if (typeof opts.back_off_function !== 'function') {
    opts.back_off_function = defaultBackOff;
  }
  returnValue.emit('requestError', error);
  if (returnValue.state === 'active' || returnValue.state === 'pending') {
    returnValue.emit('paused', error);
    returnValue.state = 'stopped';
    var backOffSet = function backoffTimeSet() {
      opts.current_back_off = STARTING_BACK_OFF;
    };
    var removeBackOffSetter = function removeBackOffTimeSet() {
      returnValue.removeListener('active', backOffSet);
    };
    returnValue.once('paused', removeBackOffSetter);
    returnValue.once('active', backOffSet);
  }

  opts.current_back_off = opts.current_back_off || STARTING_BACK_OFF;
  opts.current_back_off = opts.back_off_function(opts.current_back_off);
  setTimeout(callback, opts.current_back_off);
}

function sortObjectPropertiesByKey(queryParams) {
  return Object.keys(queryParams).sort(collate).reduce(function (result, key) {
    result[key] = queryParams[key];
    return result;
  }, {});
}

// Generate a unique id particular to this replication.
// Not guaranteed to align perfectly with CouchDB's rep ids.
function generateReplicationId(src, target, opts) {
  var docIds = opts.doc_ids ? opts.doc_ids.sort(collate) : '';
  var filterFun = opts.filter ? opts.filter.toString() : '';
  var queryParams = '';
  var filterViewName =  '';
  var selector = '';

  // possibility for checkpoints to be lost here as behaviour of
  // JSON.stringify is not stable (see #6226)
  /* istanbul ignore if */
  if (opts.selector) {
    selector = JSON.stringify(opts.selector);
  }

  if (opts.filter && opts.query_params) {
    queryParams = JSON.stringify(sortObjectPropertiesByKey(opts.query_params));
  }

  if (opts.filter && opts.filter === '_view') {
    filterViewName = opts.view.toString();
  }

  return Promise.all([src.id(), target.id()]).then(function (res) {
    var queryData = res[0] + res[1] + filterFun + filterViewName +
      queryParams + docIds + selector;
    return new Promise(function (resolve) {
      binaryMd5(queryData, resolve);
    });
  }).then(function (md5sum) {
    // can't use straight-up md5 alphabet, because
    // the char '/' is interpreted as being for attachments,
    // and + is also not url-safe
    md5sum = md5sum.replace(/\//g, '.').replace(/\+/g, '_');
    return '_local/' + md5sum;
  });
}

function replicate(src, target, opts, returnValue, result) {
  var batches = [];               // list of batches to be processed
  var currentBatch;               // the batch currently being processed
  var pendingBatch = {
    seq: 0,
    changes: [],
    docs: []
  }; // next batch, not yet ready to be processed
  var writingCheckpoint = false;  // true while checkpoint is being written
  var changesCompleted = false;   // true when all changes received
  var replicationCompleted = false; // true when replication has completed
  var last_seq = 0;
  var continuous = opts.continuous || opts.live || false;
  var batch_size = opts.batch_size || 100;
  var batches_limit = opts.batches_limit || 10;
  var changesPending = false;     // true while src.changes is running
  var doc_ids = opts.doc_ids;
  var selector = opts.selector;
  var repId;
  var checkpointer;
  var changedDocs = [];
  // Like couchdb, every replication gets a unique session id
  var session = uuid();

  result = result || {
    ok: true,
    start_time: new Date().toISOString(),
    docs_read: 0,
    docs_written: 0,
    doc_write_failures: 0,
    errors: []
  };

  var changesOpts = {};
  returnValue.ready(src, target);

  function initCheckpointer() {
    if (checkpointer) {
      return Promise.resolve();
    }
    return generateReplicationId(src, target, opts).then(function (res) {
      repId = res;

      var checkpointOpts = {};
      if (opts.checkpoint === false) {
        checkpointOpts = { writeSourceCheckpoint: false, writeTargetCheckpoint: false };
      } else if (opts.checkpoint === 'source') {
        checkpointOpts = { writeSourceCheckpoint: true, writeTargetCheckpoint: false };
      } else if (opts.checkpoint === 'target') {
        checkpointOpts = { writeSourceCheckpoint: false, writeTargetCheckpoint: true };
      } else {
        checkpointOpts = { writeSourceCheckpoint: true, writeTargetCheckpoint: true };
      }

      checkpointer = new Checkpointer(src, target, repId, returnValue, checkpointOpts);
    });
  }

  function writeDocs() {
    changedDocs = [];

    if (currentBatch.docs.length === 0) {
      return;
    }
    var docs = currentBatch.docs;
    var bulkOpts = {timeout: opts.timeout};
    return target.bulkDocs({docs: docs, new_edits: false}, bulkOpts).then(function (res) {
      /* istanbul ignore if */
      if (returnValue.cancelled) {
        completeReplication();
        throw new Error('cancelled');
      }

      // `res` doesn't include full documents (which live in `docs`), so we create a map of 
      // (id -> error), and check for errors while iterating over `docs`
      var errorsById = Object.create(null);
      res.forEach(function (res) {
        if (res.error) {
          errorsById[res.id] = res;
        }
      });

      var errorsNo = Object.keys(errorsById).length;
      result.doc_write_failures += errorsNo;
      result.docs_written += docs.length - errorsNo;

      docs.forEach(function (doc) {
        var error = errorsById[doc._id];
        if (error) {
          result.errors.push(error);
          // Normalize error name. i.e. 'Unauthorized' -> 'unauthorized' (eg Sync Gateway)
          var errorName = (error.name || '').toLowerCase();
          if (errorName === 'unauthorized' || errorName === 'forbidden') {
            returnValue.emit('denied', clone(error));
          } else {
            throw error;
          }
        } else {
          changedDocs.push(doc);
        }
      });

    }, function (err) {
      result.doc_write_failures += docs.length;
      throw err;
    });
  }

  function finishBatch() {
    if (currentBatch.error) {
      throw new Error('There was a problem getting docs.');
    }
    result.last_seq = last_seq = currentBatch.seq;
    var outResult = clone(result);
    if (changedDocs.length) {
      outResult.docs = changedDocs;
      // Attach 'pending' property if server supports it (CouchDB 2.0+)
      /* istanbul ignore if */
      if (typeof currentBatch.pending === 'number') {
        outResult.pending = currentBatch.pending;
        delete currentBatch.pending;
      }
      returnValue.emit('change', outResult);
    }
    writingCheckpoint = true;
    return checkpointer.writeCheckpoint(currentBatch.seq,
        session).then(function () {
      writingCheckpoint = false;
      /* istanbul ignore if */
      if (returnValue.cancelled) {
        completeReplication();
        throw new Error('cancelled');
      }
      currentBatch = undefined;
      getChanges();
    }).catch(function (err) {
      onCheckpointError(err);
      throw err;
    });
  }

  function getDiffs() {
    var diff = {};
    currentBatch.changes.forEach(function (change) {
      // Couchbase Sync Gateway emits these, but we can ignore them
      /* istanbul ignore if */
      if (change.id === "_user/") {
        return;
      }
      diff[change.id] = change.changes.map(function (x) {
        return x.rev;
      });
    });
    return target.revsDiff(diff).then(function (diffs) {
      /* istanbul ignore if */
      if (returnValue.cancelled) {
        completeReplication();
        throw new Error('cancelled');
      }
      // currentBatch.diffs elements are deleted as the documents are written
      currentBatch.diffs = diffs;
    });
  }

  function getBatchDocs() {
    return getDocs(src, target, currentBatch.diffs, returnValue).then(function (got) {
      currentBatch.error = !got.ok;
      got.docs.forEach(function (doc) {
        delete currentBatch.diffs[doc._id];
        result.docs_read++;
        currentBatch.docs.push(doc);
      });
    });
  }

  function startNextBatch() {
    if (returnValue.cancelled || currentBatch) {
      return;
    }
    if (batches.length === 0) {
      processPendingBatch(true);
      return;
    }
    currentBatch = batches.shift();
    getDiffs()
      .then(getBatchDocs)
      .then(writeDocs)
      .then(finishBatch)
      .then(startNextBatch)
      .catch(function (err) {
        abortReplication('batch processing terminated with error', err);
      });
  }


  function processPendingBatch(immediate) {
    if (pendingBatch.changes.length === 0) {
      if (batches.length === 0 && !currentBatch) {
        if ((continuous && changesOpts.live) || changesCompleted) {
          returnValue.state = 'pending';
          returnValue.emit('paused');
        }
        if (changesCompleted) {
          completeReplication();
        }
      }
      return;
    }
    if (
      immediate ||
      changesCompleted ||
      pendingBatch.changes.length >= batch_size
    ) {
      batches.push(pendingBatch);
      pendingBatch = {
        seq: 0,
        changes: [],
        docs: []
      };
      if (returnValue.state === 'pending' || returnValue.state === 'stopped') {
        returnValue.state = 'active';
        returnValue.emit('active');
      }
      startNextBatch();
    }
  }


  function abortReplication(reason, err) {
    if (replicationCompleted) {
      return;
    }
    if (!err.message) {
      err.message = reason;
    }
    result.ok = false;
    result.status = 'aborting';
    batches = [];
    pendingBatch = {
      seq: 0,
      changes: [],
      docs: []
    };
    completeReplication(err);
  }


  function completeReplication(fatalError) {
    if (replicationCompleted) {
      return;
    }
    /* istanbul ignore if */
    if (returnValue.cancelled) {
      result.status = 'cancelled';
      if (writingCheckpoint) {
        return;
      }
    }
    result.status = result.status || 'complete';
    result.end_time = new Date().toISOString();
    result.last_seq = last_seq;
    replicationCompleted = true;

    if (fatalError) {
      // need to extend the error because Firefox considers ".result" read-only
      fatalError = createError(fatalError);
      fatalError.result = result;

      // Normalize error name. i.e. 'Unauthorized' -> 'unauthorized' (eg Sync Gateway)
      var errorName = (fatalError.name || '').toLowerCase();
      if (errorName === 'unauthorized' || errorName === 'forbidden') {
        returnValue.emit('error', fatalError);
        returnValue.removeAllListeners();
      } else {
        backOff(opts, returnValue, fatalError, function () {
          replicate(src, target, opts, returnValue);
        });
      }
    } else {
      returnValue.emit('complete', result);
      returnValue.removeAllListeners();
    }
  }


  function onChange(change, pending, lastSeq) {
    /* istanbul ignore if */
    if (returnValue.cancelled) {
      return completeReplication();
    }
    // Attach 'pending' property if server supports it (CouchDB 2.0+)
    /* istanbul ignore if */
    if (typeof pending === 'number') {
      pendingBatch.pending = pending;
    }

    var filter = filterChange(opts)(change);
    if (!filter) {
      return;
    }
    pendingBatch.seq = change.seq || lastSeq;
    pendingBatch.changes.push(change);
    nextTick(function () {
      processPendingBatch(batches.length === 0 && changesOpts.live);
    });
  }


  function onChangesComplete(changes) {
    changesPending = false;
    /* istanbul ignore if */
    if (returnValue.cancelled) {
      return completeReplication();
    }

    // if no results were returned then we're done,
    // else fetch more
    if (changes.results.length > 0) {
      changesOpts.since = changes.results[changes.results.length - 1].seq;
      getChanges();
      processPendingBatch(true);
    } else {

      var complete = function () {
        if (continuous) {
          changesOpts.live = true;
          getChanges();
        } else {
          changesCompleted = true;
        }
        processPendingBatch(true);
      };

      // update the checkpoint so we start from the right seq next time
      if (!currentBatch && changes.results.length === 0) {
        writingCheckpoint = true;
        checkpointer.writeCheckpoint(changes.last_seq,
            session).then(function () {
          writingCheckpoint = false;
          result.last_seq = last_seq = changes.last_seq;
          complete();
        })
        .catch(onCheckpointError);
      } else {
        complete();
      }
    }
  }


  function onChangesError(err) {
    changesPending = false;
    /* istanbul ignore if */
    if (returnValue.cancelled) {
      return completeReplication();
    }
    abortReplication('changes rejected', err);
  }


  function getChanges() {
    if (!(
      !changesPending &&
      !changesCompleted &&
      batches.length < batches_limit
      )) {
      return;
    }
    changesPending = true;
    function abortChanges() {
      changes.cancel();
    }
    function removeListener() {
      returnValue.removeListener('cancel', abortChanges);
    }

    if (returnValue._changes) { // remove old changes() and listeners
      returnValue.removeListener('cancel', returnValue._abortChanges);
      returnValue._changes.cancel();
    }
    returnValue.once('cancel', abortChanges);

    var changes = src.changes(changesOpts)
      .on('change', onChange);
    changes.then(removeListener, removeListener);
    changes.then(onChangesComplete)
      .catch(onChangesError);

    if (opts.retry) {
      // save for later so we can cancel if necessary
      returnValue._changes = changes;
      returnValue._abortChanges = abortChanges;
    }
  }


  function startChanges() {
    initCheckpointer().then(function () {
      /* istanbul ignore if */
      if (returnValue.cancelled) {
        completeReplication();
        return;
      }
      return checkpointer.getCheckpoint().then(function (checkpoint) {
        last_seq = checkpoint;
        changesOpts = {
          since: last_seq,
          limit: batch_size,
          batch_size: batch_size,
          style: 'all_docs',
          doc_ids: doc_ids,
          selector: selector,
          return_docs: true // required so we know when we're done
        };
        if (opts.filter) {
          if (typeof opts.filter !== 'string') {
            // required for the client-side filter in onChange
            changesOpts.include_docs = true;
          } else { // ddoc filter
            changesOpts.filter = opts.filter;
          }
        }
        if ('heartbeat' in opts) {
          changesOpts.heartbeat = opts.heartbeat;
        }
        if ('timeout' in opts) {
          changesOpts.timeout = opts.timeout;
        }
        if (opts.query_params) {
          changesOpts.query_params = opts.query_params;
        }
        if (opts.view) {
          changesOpts.view = opts.view;
        }
        getChanges();
      });
    }).catch(function (err) {
      abortReplication('getCheckpoint rejected with ', err);
    });
  }

  /* istanbul ignore next */
  function onCheckpointError(err) {
    writingCheckpoint = false;
    abortReplication('writeCheckpoint completed with error', err);
  }

  /* istanbul ignore if */
  if (returnValue.cancelled) { // cancelled immediately
    completeReplication();
    return;
  }

  if (!returnValue._addedListeners) {
    returnValue.once('cancel', completeReplication);

    if (typeof opts.complete === 'function') {
      returnValue.once('error', opts.complete);
      returnValue.once('complete', function (result) {
        opts.complete(null, result);
      });
    }
    returnValue._addedListeners = true;
  }

  if (typeof opts.since === 'undefined') {
    startChanges();
  } else {
    initCheckpointer().then(function () {
      writingCheckpoint = true;
      return checkpointer.writeCheckpoint(opts.since, session);
    }).then(function () {
      writingCheckpoint = false;
      /* istanbul ignore if */
      if (returnValue.cancelled) {
        completeReplication();
        return;
      }
      last_seq = opts.since;
      startChanges();
    }).catch(onCheckpointError);
  }
}

// We create a basic promise so the caller can cancel the replication possibly
// before we have actually started listening to changes etc
inherits(Replication, events.EventEmitter);
function Replication() {
  events.EventEmitter.call(this);
  this.cancelled = false;
  this.state = 'pending';
  var self = this;
  var promise = new Promise(function (fulfill, reject) {
    self.once('complete', fulfill);
    self.once('error', reject);
  });
  self.then = function (resolve, reject) {
    return promise.then(resolve, reject);
  };
  self.catch = function (reject) {
    return promise.catch(reject);
  };
  // As we allow error handling via "error" event as well,
  // put a stub in here so that rejecting never throws UnhandledError.
  self.catch(function () {});
}

Replication.prototype.cancel = function () {
  this.cancelled = true;
  this.state = 'cancelled';
  this.emit('cancel');
};

Replication.prototype.ready = function (src, target) {
  var self = this;
  if (self._readyCalled) {
    return;
  }
  self._readyCalled = true;

  function onDestroy() {
    self.cancel();
  }
  src.once('destroyed', onDestroy);
  target.once('destroyed', onDestroy);
  function cleanup() {
    src.removeListener('destroyed', onDestroy);
    target.removeListener('destroyed', onDestroy);
  }
  self.once('complete', cleanup);
};

function toPouch(db, opts) {
  var PouchConstructor = opts.PouchConstructor;
  if (typeof db === 'string') {
    return new PouchConstructor(db, opts);
  } else {
    return db;
  }
}

function replicateWrapper(src, target, opts, callback) {

  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  if (typeof opts === 'undefined') {
    opts = {};
  }

  if (opts.doc_ids && !Array.isArray(opts.doc_ids)) {
    throw createError(BAD_REQUEST,
                       "`doc_ids` filter parameter is not a list.");
  }

  opts.complete = callback;
  opts = clone(opts);
  opts.continuous = opts.continuous || opts.live;
  opts.retry = ('retry' in opts) ? opts.retry : false;
  /*jshint validthis:true */
  opts.PouchConstructor = opts.PouchConstructor || this;
  var replicateRet = new Replication(opts);
  var srcPouch = toPouch(src, opts);
  var targetPouch = toPouch(target, opts);
  replicate(srcPouch, targetPouch, opts, replicateRet);
  return replicateRet;
}

inherits(Sync, events.EventEmitter);
function sync(src, target, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  if (typeof opts === 'undefined') {
    opts = {};
  }
  opts = clone(opts);
  /*jshint validthis:true */
  opts.PouchConstructor = opts.PouchConstructor || this;
  src = toPouch(src, opts);
  target = toPouch(target, opts);
  return new Sync(src, target, opts, callback);
}

function Sync(src, target, opts, callback) {
  var self = this;
  this.canceled = false;

  var optsPush = opts.push ? $inject_Object_assign({}, opts, opts.push) : opts;
  var optsPull = opts.pull ? $inject_Object_assign({}, opts, opts.pull) : opts;

  this.push = replicateWrapper(src, target, optsPush);
  this.pull = replicateWrapper(target, src, optsPull);

  this.pushPaused = true;
  this.pullPaused = true;

  function pullChange(change) {
    self.emit('change', {
      direction: 'pull',
      change: change
    });
  }
  function pushChange(change) {
    self.emit('change', {
      direction: 'push',
      change: change
    });
  }
  function pushDenied(doc) {
    self.emit('denied', {
      direction: 'push',
      doc: doc
    });
  }
  function pullDenied(doc) {
    self.emit('denied', {
      direction: 'pull',
      doc: doc
    });
  }
  function pushPaused() {
    self.pushPaused = true;
    /* istanbul ignore if */
    if (self.pullPaused) {
      self.emit('paused');
    }
  }
  function pullPaused() {
    self.pullPaused = true;
    /* istanbul ignore if */
    if (self.pushPaused) {
      self.emit('paused');
    }
  }
  function pushActive() {
    self.pushPaused = false;
    /* istanbul ignore if */
    if (self.pullPaused) {
      self.emit('active', {
        direction: 'push'
      });
    }
  }
  function pullActive() {
    self.pullPaused = false;
    /* istanbul ignore if */
    if (self.pushPaused) {
      self.emit('active', {
        direction: 'pull'
      });
    }
  }

  var removed = {};

  function removeAll(type) { // type is 'push' or 'pull'
    return function (event, func) {
      var isChange = event === 'change' &&
        (func === pullChange || func === pushChange);
      var isDenied = event === 'denied' &&
        (func === pullDenied || func === pushDenied);
      var isPaused = event === 'paused' &&
        (func === pullPaused || func === pushPaused);
      var isActive = event === 'active' &&
        (func === pullActive || func === pushActive);

      if (isChange || isDenied || isPaused || isActive) {
        if (!(event in removed)) {
          removed[event] = {};
        }
        removed[event][type] = true;
        if (Object.keys(removed[event]).length === 2) {
          // both push and pull have asked to be removed
          self.removeAllListeners(event);
        }
      }
    };
  }

  if (opts.live) {
    this.push.on('complete', self.pull.cancel.bind(self.pull));
    this.pull.on('complete', self.push.cancel.bind(self.push));
  }

  function addOneListener(ee, event, listener) {
    if (ee.listeners(event).indexOf(listener) == -1) {
      ee.on(event, listener);
    }
  }

  this.on('newListener', function (event) {
    if (event === 'change') {
      addOneListener(self.pull, 'change', pullChange);
      addOneListener(self.push, 'change', pushChange);
    } else if (event === 'denied') {
      addOneListener(self.pull, 'denied', pullDenied);
      addOneListener(self.push, 'denied', pushDenied);
    } else if (event === 'active') {
      addOneListener(self.pull, 'active', pullActive);
      addOneListener(self.push, 'active', pushActive);
    } else if (event === 'paused') {
      addOneListener(self.pull, 'paused', pullPaused);
      addOneListener(self.push, 'paused', pushPaused);
    }
  });

  this.on('removeListener', function (event) {
    if (event === 'change') {
      self.pull.removeListener('change', pullChange);
      self.push.removeListener('change', pushChange);
    } else if (event === 'denied') {
      self.pull.removeListener('denied', pullDenied);
      self.push.removeListener('denied', pushDenied);
    } else if (event === 'active') {
      self.pull.removeListener('active', pullActive);
      self.push.removeListener('active', pushActive);
    } else if (event === 'paused') {
      self.pull.removeListener('paused', pullPaused);
      self.push.removeListener('paused', pushPaused);
    }
  });

  this.pull.on('removeListener', removeAll('pull'));
  this.push.on('removeListener', removeAll('push'));

  var promise = Promise.all([
    this.push,
    this.pull
  ]).then(function (resp) {
    var out = {
      push: resp[0],
      pull: resp[1]
    };
    self.emit('complete', out);
    if (callback) {
      callback(null, out);
    }
    self.removeAllListeners();
    return out;
  }, function (err) {
    self.cancel();
    if (callback) {
      // if there's a callback, then the callback can receive
      // the error event
      callback(err);
    } else {
      // if there's no callback, then we're safe to emit an error
      // event, which would otherwise throw an unhandled error
      // due to 'error' being a special event in EventEmitters
      self.emit('error', err);
    }
    self.removeAllListeners();
    if (callback) {
      // no sense throwing if we're already emitting an 'error' event
      throw err;
    }
  });

  this.then = function (success, err) {
    return promise.then(success, err);
  };

  this.catch = function (err) {
    return promise.catch(err);
  };
}

Sync.prototype.cancel = function () {
  if (!this.canceled) {
    this.canceled = true;
    this.push.cancel();
    this.pull.cancel();
  }
};

function replication(PouchDB) {
  PouchDB.replicate = replicateWrapper;
  PouchDB.sync = sync;

  Object.defineProperty(PouchDB.prototype, 'replicate', {
    get: function () {
      var self = this;
      if (typeof this.replicateMethods === 'undefined') {
        this.replicateMethods = {
          from: function (other, opts, callback) {
            return self.constructor.replicate(other, self, opts, callback);
          },
          to: function (other, opts, callback) {
            return self.constructor.replicate(self, other, opts, callback);
          }
        };
      }
      return this.replicateMethods;
    }
  });

  PouchDB.prototype.sync = function (dbName, opts, callback) {
    return this.constructor.sync(this, dbName, opts, callback);
  };
}

PouchDB.plugin(IDBPouch)
  .plugin(HttpPouch$1)
  .plugin(mapreduce)
  .plugin(replication);

// Pull from src because pouchdb-node/pouchdb-browser themselves

module.exports = PouchDB;

}).call(this,require("b55mWE"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"argsarray":1,"b55mWE":3,"events":2,"immediate":4,"inherits":5,"spark-md5":7,"uuid":8,"vuvuzela":13}],7:[function(require,module,exports){
(function (factory) {
    if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
    } else {
        // Browser globals (with support for web workers)
        var glob;

        try {
            glob = window;
        } catch (e) {
            glob = self;
        }

        glob.SparkMD5 = factory();
    }
}(function (undefined) {

    'use strict';

    /*
     * Fastest md5 implementation around (JKM md5).
     * Credits: Joseph Myers
     *
     * @see http://www.myersdaily.org/joseph/javascript/md5-text.html
     * @see http://jsperf.com/md5-shootout/7
     */

    /* this function is much faster,
      so if possible we use it. Some IEs
      are the only ones I know of that
      need the idiotic second function,
      generated by an if clause.  */
    var add32 = function (a, b) {
        return (a + b) & 0xFFFFFFFF;
    },
        hex_chr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];


    function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
    }

    function md5cycle(x, k) {
        var a = x[0],
            b = x[1],
            c = x[2],
            d = x[3];

        a += (b & c | ~b & d) + k[0] - 680876936 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[1] - 389564586 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[2] + 606105819 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[3] - 1044525330 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[4] - 176418897 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[5] + 1200080426 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[6] - 1473231341 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[7] - 45705983 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[8] + 1770035416 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[9] - 1958414417 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[10] - 42063 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[11] - 1990404162 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[12] + 1804603682 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[13] - 40341101 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[14] - 1502002290 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[15] + 1236535329 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;

        a += (b & d | c & ~d) + k[1] - 165796510 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[6] - 1069501632 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[11] + 643717713 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[0] - 373897302 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[5] - 701558691 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[10] + 38016083 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[15] - 660478335 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[4] - 405537848 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[9] + 568446438 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[14] - 1019803690 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[3] - 187363961 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[8] + 1163531501 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[13] - 1444681467 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[2] - 51403784 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[7] + 1735328473 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[12] - 1926607734 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;

        a += (b ^ c ^ d) + k[5] - 378558 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[8] - 2022574463 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[11] + 1839030562 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[14] - 35309556 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[1] - 1530992060 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[4] + 1272893353 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[7] - 155497632 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[10] - 1094730640 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[13] + 681279174 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[0] - 358537222 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[3] - 722521979 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[6] + 76029189 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[9] - 640364487 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[12] - 421815835 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[15] + 530742520 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[2] - 995338651 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;

        a += (c ^ (b | ~d)) + k[0] - 198630844 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[7] + 1126891415 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[14] - 1416354905 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[5] - 57434055 | 0;
        b  = (b << 21 |b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[12] + 1700485571 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[3] - 1894986606 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[10] - 1051523 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[1] - 2054922799 | 0;
        b  = (b << 21 |b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[8] + 1873313359 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[15] - 30611744 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[6] - 1560198380 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[13] + 1309151649 | 0;
        b  = (b << 21 |b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[4] - 145523070 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[11] - 1120210379 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[2] + 718787259 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[9] - 343485551 | 0;
        b  = (b << 21 | b >>> 11) + c | 0;

        x[0] = a + x[0] | 0;
        x[1] = b + x[1] | 0;
        x[2] = c + x[2] | 0;
        x[3] = d + x[3] | 0;
    }

    function md5blk(s) {
        var md5blks = [],
            i; /* Andy King said do it this way. */

        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
    }

    function md5blk_array(a) {
        var md5blks = [],
            i; /* Andy King said do it this way. */

        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
        }
        return md5blks;
    }

    function md51(s) {
        var n = s.length,
            state = [1732584193, -271733879, -1732584194, 271733878],
            i,
            length,
            tail,
            tmp,
            lo,
            hi;

        for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        length = s.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
        }
        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;

        md5cycle(state, tail);
        return state;
    }

    function md51_array(a) {
        var n = a.length,
            state = [1732584193, -271733879, -1732584194, 271733878],
            i,
            length,
            tail,
            tmp,
            lo,
            hi;

        for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
        }

        // Not sure if it is a bug, however IE10 will always produce a sub array of length 1
        // containing the last element of the parent array if the sub array specified starts
        // beyond the length of the parent array - weird.
        // https://connect.microsoft.com/IE/feedback/details/771452/typed-array-subarray-issue
        a = (i - 64) < n ? a.subarray(i - 64) : new Uint8Array(0);

        length = a.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= a[i] << ((i % 4) << 3);
        }

        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;

        md5cycle(state, tail);

        return state;
    }

    function rhex(n) {
        var s = '',
            j;
        for (j = 0; j < 4; j += 1) {
            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
        }
        return s;
    }

    function hex(x) {
        var i;
        for (i = 0; i < x.length; i += 1) {
            x[i] = rhex(x[i]);
        }
        return x.join('');
    }

    // In some cases the fast add32 function cannot be used..
    if (hex(md51('hello')) !== '5d41402abc4b2a76b9719d911017c592') {
        add32 = function (x, y) {
            var lsw = (x & 0xFFFF) + (y & 0xFFFF),
                msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        };
    }

    // ---------------------------------------------------

    /**
     * ArrayBuffer slice polyfill.
     *
     * @see https://github.com/ttaubert/node-arraybuffer-slice
     */

    if (typeof ArrayBuffer !== 'undefined' && !ArrayBuffer.prototype.slice) {
        (function () {
            function clamp(val, length) {
                val = (val | 0) || 0;

                if (val < 0) {
                    return Math.max(val + length, 0);
                }

                return Math.min(val, length);
            }

            ArrayBuffer.prototype.slice = function (from, to) {
                var length = this.byteLength,
                    begin = clamp(from, length),
                    end = length,
                    num,
                    target,
                    targetArray,
                    sourceArray;

                if (to !== undefined) {
                    end = clamp(to, length);
                }

                if (begin > end) {
                    return new ArrayBuffer(0);
                }

                num = end - begin;
                target = new ArrayBuffer(num);
                targetArray = new Uint8Array(target);

                sourceArray = new Uint8Array(this, begin, num);
                targetArray.set(sourceArray);

                return target;
            };
        })();
    }

    // ---------------------------------------------------

    /**
     * Helpers.
     */

    function toUtf8(str) {
        if (/[\u0080-\uFFFF]/.test(str)) {
            str = unescape(encodeURIComponent(str));
        }

        return str;
    }

    function utf8Str2ArrayBuffer(str, returnUInt8Array) {
        var length = str.length,
           buff = new ArrayBuffer(length),
           arr = new Uint8Array(buff),
           i;

        for (i = 0; i < length; i += 1) {
            arr[i] = str.charCodeAt(i);
        }

        return returnUInt8Array ? arr : buff;
    }

    function arrayBuffer2Utf8Str(buff) {
        return String.fromCharCode.apply(null, new Uint8Array(buff));
    }

    function concatenateArrayBuffers(first, second, returnUInt8Array) {
        var result = new Uint8Array(first.byteLength + second.byteLength);

        result.set(new Uint8Array(first));
        result.set(new Uint8Array(second), first.byteLength);

        return returnUInt8Array ? result : result.buffer;
    }

    function hexToBinaryString(hex) {
        var bytes = [],
            length = hex.length,
            x;

        for (x = 0; x < length - 1; x += 2) {
            bytes.push(parseInt(hex.substr(x, 2), 16));
        }

        return String.fromCharCode.apply(String, bytes);
    }

    // ---------------------------------------------------

    /**
     * SparkMD5 OOP implementation.
     *
     * Use this class to perform an incremental md5, otherwise use the
     * static methods instead.
     */

    function SparkMD5() {
        // call reset to init the instance
        this.reset();
    }

    /**
     * Appends a string.
     * A conversion will be applied if an utf8 string is detected.
     *
     * @param {String} str The string to be appended
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.append = function (str) {
        // Converts the string to utf8 bytes if necessary
        // Then append as binary
        this.appendBinary(toUtf8(str));

        return this;
    };

    /**
     * Appends a binary string.
     *
     * @param {String} contents The binary string to be appended
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.appendBinary = function (contents) {
        this._buff += contents;
        this._length += contents.length;

        var length = this._buff.length,
            i;

        for (i = 64; i <= length; i += 64) {
            md5cycle(this._hash, md5blk(this._buff.substring(i - 64, i)));
        }

        this._buff = this._buff.substring(i - 64);

        return this;
    };

    /**
     * Finishes the incremental computation, reseting the internal state and
     * returning the result.
     *
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.prototype.end = function (raw) {
        var buff = this._buff,
            length = buff.length,
            i,
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ret;

        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff.charCodeAt(i) << ((i % 4) << 3);
        }

        this._finish(tail, length);
        ret = hex(this._hash);

        if (raw) {
            ret = hexToBinaryString(ret);
        }

        this.reset();

        return ret;
    };

    /**
     * Resets the internal state of the computation.
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.reset = function () {
        this._buff = '';
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];

        return this;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @return {Object} The state
     */
    SparkMD5.prototype.getState = function () {
        return {
            buff: this._buff,
            length: this._length,
            hash: this._hash
        };
    };

    /**
     * Gets the internal state of the computation.
     *
     * @param {Object} state The state
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.setState = function (state) {
        this._buff = state.buff;
        this._length = state.length;
        this._hash = state.hash;

        return this;
    };

    /**
     * Releases memory used by the incremental buffer and other additional
     * resources. If you plan to use the instance again, use reset instead.
     */
    SparkMD5.prototype.destroy = function () {
        delete this._hash;
        delete this._buff;
        delete this._length;
    };

    /**
     * Finish the final calculation based on the tail.
     *
     * @param {Array}  tail   The tail (will be modified)
     * @param {Number} length The length of the remaining buffer
     */
    SparkMD5.prototype._finish = function (tail, length) {
        var i = length,
            tmp,
            lo,
            hi;

        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(this._hash, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Do the final computation based on the tail and length
        // Beware that the final length may not fit in 32 bits so we take care of that
        tmp = this._length * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;
        md5cycle(this._hash, tail);
    };

    /**
     * Performs the md5 hash on a string.
     * A conversion will be applied if utf8 string is detected.
     *
     * @param {String}  str The string
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.hash = function (str, raw) {
        // Converts the string to utf8 bytes if necessary
        // Then compute it using the binary function
        return SparkMD5.hashBinary(toUtf8(str), raw);
    };

    /**
     * Performs the md5 hash on a binary string.
     *
     * @param {String}  content The binary string
     * @param {Boolean} raw     True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.hashBinary = function (content, raw) {
        var hash = md51(content),
            ret = hex(hash);

        return raw ? hexToBinaryString(ret) : ret;
    };

    // ---------------------------------------------------

    /**
     * SparkMD5 OOP implementation for array buffers.
     *
     * Use this class to perform an incremental md5 ONLY for array buffers.
     */
    SparkMD5.ArrayBuffer = function () {
        // call reset to init the instance
        this.reset();
    };

    /**
     * Appends an array buffer.
     *
     * @param {ArrayBuffer} arr The array to be appended
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.append = function (arr) {
        var buff = concatenateArrayBuffers(this._buff.buffer, arr, true),
            length = buff.length,
            i;

        this._length += arr.byteLength;

        for (i = 64; i <= length; i += 64) {
            md5cycle(this._hash, md5blk_array(buff.subarray(i - 64, i)));
        }

        this._buff = (i - 64) < length ? new Uint8Array(buff.buffer.slice(i - 64)) : new Uint8Array(0);

        return this;
    };

    /**
     * Finishes the incremental computation, reseting the internal state and
     * returning the result.
     *
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.ArrayBuffer.prototype.end = function (raw) {
        var buff = this._buff,
            length = buff.length,
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            i,
            ret;

        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff[i] << ((i % 4) << 3);
        }

        this._finish(tail, length);
        ret = hex(this._hash);

        if (raw) {
            ret = hexToBinaryString(ret);
        }

        this.reset();

        return ret;
    };

    /**
     * Resets the internal state of the computation.
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.reset = function () {
        this._buff = new Uint8Array(0);
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];

        return this;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @return {Object} The state
     */
    SparkMD5.ArrayBuffer.prototype.getState = function () {
        var state = SparkMD5.prototype.getState.call(this);

        // Convert buffer to a string
        state.buff = arrayBuffer2Utf8Str(state.buff);

        return state;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @param {Object} state The state
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.setState = function (state) {
        // Convert string to buffer
        state.buff = utf8Str2ArrayBuffer(state.buff, true);

        return SparkMD5.prototype.setState.call(this, state);
    };

    SparkMD5.ArrayBuffer.prototype.destroy = SparkMD5.prototype.destroy;

    SparkMD5.ArrayBuffer.prototype._finish = SparkMD5.prototype._finish;

    /**
     * Performs the md5 hash on an array buffer.
     *
     * @param {ArrayBuffer} arr The array buffer
     * @param {Boolean}     raw True to get the raw string, false to get the hex one
     *
     * @return {String} The result
     */
    SparkMD5.ArrayBuffer.hash = function (arr, raw) {
        var hash = md51_array(new Uint8Array(arr)),
            ret = hex(hash);

        return raw ? hexToBinaryString(ret) : ret;
    };

    return SparkMD5;
}));

},{}],8:[function(require,module,exports){
var v1 = require('./v1');
var v4 = require('./v4');

var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;

module.exports = uuid;

},{"./v1":11,"./v4":12}],9:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;

},{}],10:[function(require,module,exports){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection

// getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.
var getRandomValues = (typeof(crypto) != 'undefined' && crypto.getRandomValues.bind(crypto)) ||
                      (typeof(msCrypto) != 'undefined' && msCrypto.getRandomValues.bind(msCrypto));
if (getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

  module.exports = function whatwgRNG() {
    getRandomValues(rnds8);
    return rnds8;
  };
} else {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);

  module.exports = function mathRNG() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

},{}],11:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

var _nodeId;
var _clockseq;

// Previous uuid creation time
var _lastMSecs = 0;
var _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};
  var node = options.node || _nodeId;
  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189
  if (node == null || clockseq == null) {
    var seedBytes = rng();
    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [
        seedBytes[0] | 0x01,
        seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]
      ];
    }
    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  }

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;

},{"./lib/bytesToUuid":9,"./lib/rng":10}],12:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;

},{"./lib/bytesToUuid":9,"./lib/rng":10}],13:[function(require,module,exports){
'use strict';

/**
 * Stringify/parse functions that don't operate
 * recursively, so they avoid call stack exceeded
 * errors.
 */
exports.stringify = function stringify(input) {
  var queue = [];
  queue.push({obj: input});

  var res = '';
  var next, obj, prefix, val, i, arrayPrefix, keys, k, key, value, objPrefix;
  while ((next = queue.pop())) {
    obj = next.obj;
    prefix = next.prefix || '';
    val = next.val || '';
    res += prefix;
    if (val) {
      res += val;
    } else if (typeof obj !== 'object') {
      res += typeof obj === 'undefined' ? null : JSON.stringify(obj);
    } else if (obj === null) {
      res += 'null';
    } else if (Array.isArray(obj)) {
      queue.push({val: ']'});
      for (i = obj.length - 1; i >= 0; i--) {
        arrayPrefix = i === 0 ? '' : ',';
        queue.push({obj: obj[i], prefix: arrayPrefix});
      }
      queue.push({val: '['});
    } else { // object
      keys = [];
      for (k in obj) {
        if (obj.hasOwnProperty(k)) {
          keys.push(k);
        }
      }
      queue.push({val: '}'});
      for (i = keys.length - 1; i >= 0; i--) {
        key = keys[i];
        value = obj[key];
        objPrefix = (i > 0 ? ',' : '');
        objPrefix += JSON.stringify(key) + ':';
        queue.push({obj: value, prefix: objPrefix});
      }
      queue.push({val: '{'});
    }
  }
  return res;
};

// Convenience function for the parse function.
// This pop function is basically copied from
// pouchCollate.parseIndexableString
function pop(obj, stack, metaStack) {
  var lastMetaElement = metaStack[metaStack.length - 1];
  if (obj === lastMetaElement.element) {
    // popping a meta-element, e.g. an object whose value is another object
    metaStack.pop();
    lastMetaElement = metaStack[metaStack.length - 1];
  }
  var element = lastMetaElement.element;
  var lastElementIndex = lastMetaElement.index;
  if (Array.isArray(element)) {
    element.push(obj);
  } else if (lastElementIndex === stack.length - 2) { // obj with key+value
    var key = stack.pop();
    element[key] = obj;
  } else {
    stack.push(obj); // obj with key only
  }
}

exports.parse = function (str) {
  var stack = [];
  var metaStack = []; // stack for arrays and objects
  var i = 0;
  var collationIndex,parsedNum,numChar;
  var parsedString,lastCh,numConsecutiveSlashes,ch;
  var arrayElement, objElement;
  while (true) {
    collationIndex = str[i++];
    if (collationIndex === '}' ||
        collationIndex === ']' ||
        typeof collationIndex === 'undefined') {
      if (stack.length === 1) {
        return stack.pop();
      } else {
        pop(stack.pop(), stack, metaStack);
        continue;
      }
    }
    switch (collationIndex) {
      case ' ':
      case '\t':
      case '\n':
      case ':':
      case ',':
        break;
      case 'n':
        i += 3; // 'ull'
        pop(null, stack, metaStack);
        break;
      case 't':
        i += 3; // 'rue'
        pop(true, stack, metaStack);
        break;
      case 'f':
        i += 4; // 'alse'
        pop(false, stack, metaStack);
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
      case '-':
        parsedNum = '';
        i--;
        while (true) {
          numChar = str[i++];
          if (/[\d\.\-e\+]/.test(numChar)) {
            parsedNum += numChar;
          } else {
            i--;
            break;
          }
        }
        pop(parseFloat(parsedNum), stack, metaStack);
        break;
      case '"':
        parsedString = '';
        lastCh = void 0;
        numConsecutiveSlashes = 0;
        while (true) {
          ch = str[i++];
          if (ch !== '"' || (lastCh === '\\' &&
              numConsecutiveSlashes % 2 === 1)) {
            parsedString += ch;
            lastCh = ch;
            if (lastCh === '\\') {
              numConsecutiveSlashes++;
            } else {
              numConsecutiveSlashes = 0;
            }
          } else {
            break;
          }
        }
        pop(JSON.parse('"' + parsedString + '"'), stack, metaStack);
        break;
      case '[':
        arrayElement = { element: [], index: stack.length };
        stack.push(arrayElement.element);
        metaStack.push(arrayElement);
        break;
      case '{':
        objElement = { element: {}, index: stack.length };
        stack.push(objElement.element);
        metaStack.push(objElement);
        break;
      default:
        throw new Error(
          'unexpectedly reached end of input: ' + collationIndex);
    }
  }
};

},{}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getUUID = exports.measurementsDB = exports.chronicleDB = exports.annotatorsDB = exports.animalsDB = exports.adjectivesDB = exports.measurementsURL = exports.chronicleURL = exports.animalsURL = exports.adjectivesURL = exports.annotatorsURL = exports.uuidURL = void 0;

var _pouchdb = _interopRequireDefault(require("pouchdb"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// const baseUrl='http://127.0.0.1:5984';
//const baseURL='http://rsnacrowdquant.cloudapp.net:5984';
var baseURL = 'http://35.180.157.126:5984';
var uuidURL = "".concat(baseURL, "/_uuids");
exports.uuidURL = uuidURL;
var annotatorsURL = "".concat(baseURL, "/annotators");
exports.annotatorsURL = annotatorsURL;
var adjectivesURL = "".concat(baseURL, "/adjectives");
exports.adjectivesURL = adjectivesURL;
var animalsURL = "".concat(baseURL, "/animals");
exports.animalsURL = animalsURL;
var chronicleURL = "".concat(baseURL, "/chronicle"); //export const chronicleURL = `${baseURL}/compressed-chronicle2`;

exports.chronicleURL = chronicleURL;
var measurementsURL = "".concat(baseURL, "/measurements"); // console.log('url:', uuidUrl);
// export const uuidDB = new PouchDB(uuidURL);

exports.measurementsURL = measurementsURL;
var adjectivesDB = new _pouchdb.default(adjectivesURL);
exports.adjectivesDB = adjectivesDB;
var animalsDB = new _pouchdb.default(animalsURL);
exports.animalsDB = animalsDB;
var annotatorsDB = new _pouchdb.default(annotatorsURL);
exports.annotatorsDB = annotatorsDB;
var chronicleDB = new _pouchdb.default(chronicleURL);
exports.chronicleDB = chronicleDB;
var measurementsDB = new _pouchdb.default(measurementsURL);
exports.measurementsDB = measurementsDB;

var getUUID = function getUUID() {
  return new Promise(function (resolve, reject) {
    $.get(uuidURL, function (_ref) {
      var uuids = _ref.uuids;
      resolve(uuids[0]);
    }); // const uuid = doc.uuids[0];
    // console.log('uuid:', uuid);
  });
};

exports.getUUID = getUUID;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiLmpzIl0sIm5hbWVzIjpbImJhc2VVUkwiLCJ1dWlkVVJMIiwiYW5ub3RhdG9yc1VSTCIsImFkamVjdGl2ZXNVUkwiLCJhbmltYWxzVVJMIiwiY2hyb25pY2xlVVJMIiwibWVhc3VyZW1lbnRzVVJMIiwiYWRqZWN0aXZlc0RCIiwiUG91Y2hEQiIsImFuaW1hbHNEQiIsImFubm90YXRvcnNEQiIsImNocm9uaWNsZURCIiwibWVhc3VyZW1lbnRzREIiLCJnZXRVVUlEIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCIkIiwiZ2V0IiwidXVpZHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFDQTs7OztBQURBO0FBR0E7QUFDQSxJQUFNQSxPQUFPLEdBQUMsNEJBQWQ7QUFFTyxJQUFNQyxPQUFPLGFBQU1ELE9BQU4sWUFBYjs7QUFDQSxJQUFNRSxhQUFhLGFBQU1GLE9BQU4sZ0JBQW5COztBQUNBLElBQU1HLGFBQWEsYUFBTUgsT0FBTixnQkFBbkI7O0FBQ0EsSUFBTUksVUFBVSxhQUFNSixPQUFOLGFBQWhCOztBQUNBLElBQU1LLFlBQVksYUFBTUwsT0FBTixlQUFsQixDLENBQ1A7OztBQUVPLElBQU1NLGVBQWUsYUFBTU4sT0FBTixrQkFBckIsQyxDQUVQO0FBRUE7OztBQUNPLElBQU1PLFlBQVksR0FBRyxJQUFJQyxnQkFBSixDQUFZTCxhQUFaLENBQXJCOztBQUNBLElBQU1NLFNBQVMsR0FBRyxJQUFJRCxnQkFBSixDQUFZSixVQUFaLENBQWxCOztBQUNBLElBQU1NLFlBQVksR0FBRyxJQUFJRixnQkFBSixDQUFZTixhQUFaLENBQXJCOztBQUNBLElBQU1TLFdBQVcsR0FBRyxJQUFJSCxnQkFBSixDQUFZSCxZQUFaLENBQXBCOztBQUNBLElBQU1PLGNBQWMsR0FBRyxJQUFJSixnQkFBSixDQUFZRixlQUFaLENBQXZCOzs7QUFFQSxJQUFNTyxPQUFPLEdBQUcsU0FBVkEsT0FBVSxHQUFNO0FBQzNCLFNBQU8sSUFBSUMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtBQUN0Q0MsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU1qQixPQUFOLEVBQWUsZ0JBQWE7QUFBQSxVQUFYa0IsS0FBVyxRQUFYQSxLQUFXO0FBQUNKLE1BQUFBLE9BQU8sQ0FBQ0ksS0FBSyxDQUFDLENBQUQsQ0FBTixDQUFQO0FBQWtCLEtBQS9DLEVBRHNDLENBRXBDO0FBQ0E7QUFDSCxHQUpNLENBQVA7QUFLRCxDQU5NIiwic291cmNlc0NvbnRlbnQiOlsiLy8gY29uc3QgYmFzZVVybD0naHR0cDovLzEyNy4wLjAuMTo1OTg0JztcbmltcG9ydCBQb3VjaERCIGZyb20gJ3BvdWNoZGInO1xuXG4vL2NvbnN0IGJhc2VVUkw9J2h0dHA6Ly9yc25hY3Jvd2RxdWFudC5jbG91ZGFwcC5uZXQ6NTk4NCc7XG5jb25zdCBiYXNlVVJMPSdodHRwOi8vMzUuMTgwLjE1Ny4xMjY6NTk4NCc7XG5cbmV4cG9ydCBjb25zdCB1dWlkVVJMID0gYCR7YmFzZVVSTH0vX3V1aWRzYDtcbmV4cG9ydCBjb25zdCBhbm5vdGF0b3JzVVJMID0gYCR7YmFzZVVSTH0vYW5ub3RhdG9yc2A7XG5leHBvcnQgY29uc3QgYWRqZWN0aXZlc1VSTCA9IGAke2Jhc2VVUkx9L2FkamVjdGl2ZXNgO1xuZXhwb3J0IGNvbnN0IGFuaW1hbHNVUkwgPSBgJHtiYXNlVVJMfS9hbmltYWxzYDtcbmV4cG9ydCBjb25zdCBjaHJvbmljbGVVUkwgPSBgJHtiYXNlVVJMfS9jaHJvbmljbGVgO1xuLy9leHBvcnQgY29uc3QgY2hyb25pY2xlVVJMID0gYCR7YmFzZVVSTH0vY29tcHJlc3NlZC1jaHJvbmljbGUyYDtcblxuZXhwb3J0IGNvbnN0IG1lYXN1cmVtZW50c1VSTCA9IGAke2Jhc2VVUkx9L21lYXN1cmVtZW50c2A7XG5cbi8vIGNvbnNvbGUubG9nKCd1cmw6JywgdXVpZFVybCk7XG5cbi8vIGV4cG9ydCBjb25zdCB1dWlkREIgPSBuZXcgUG91Y2hEQih1dWlkVVJMKTtcbmV4cG9ydCBjb25zdCBhZGplY3RpdmVzREIgPSBuZXcgUG91Y2hEQihhZGplY3RpdmVzVVJMKTtcbmV4cG9ydCBjb25zdCBhbmltYWxzREIgPSBuZXcgUG91Y2hEQihhbmltYWxzVVJMKTtcbmV4cG9ydCBjb25zdCBhbm5vdGF0b3JzREIgPSBuZXcgUG91Y2hEQihhbm5vdGF0b3JzVVJMKTtcbmV4cG9ydCBjb25zdCBjaHJvbmljbGVEQiA9IG5ldyBQb3VjaERCKGNocm9uaWNsZVVSTCk7XG5leHBvcnQgY29uc3QgbWVhc3VyZW1lbnRzREIgPSBuZXcgUG91Y2hEQihtZWFzdXJlbWVudHNVUkwpO1xuXG5leHBvcnQgY29uc3QgZ2V0VVVJRCA9ICgpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAkLmdldCh1dWlkVVJMLCAoe3V1aWRzfSkgPT4ge3Jlc29sdmUodXVpZHNbMF0pfSk7XG4gICAgICAvLyBjb25zdCB1dWlkID0gZG9jLnV1aWRzWzBdO1xuICAgICAgLy8gY29uc29sZS5sb2coJ3V1aWQ6JywgdXVpZCk7XG4gIH0pO1xufTtcbiJdfQ==
},{"pouchdb":6}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _login = _interopRequireDefault(require("../login/login"));

var _viewer = _interopRequireDefault(require("../viewer/viewer"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = {
  $modal: $('.error-modal'),
  $overlay: $('.loading-overlay'),
  logout: function logout() {
    this.$modal.removeClass('show');
    this.$overlay.addClass('invisible');

    _login.default.logout();
  },
  nextCase: function nextCase() {
    this.hide();

    _viewer.default.getNextCase();
  },
  show: function show() {
    this.$modal.addClass('show');
    this.$overlay.removeClass('invisible');
  },
  hide: function hide() {
    this.$modal.removeClass('show');
    this.$overlay.addClass('invisible');
  },
  init: function init() {
    var _this = this;

    this.$modal.find('.ok').on('click', function () {
      return _this.hide();
    }); // this.$modal.find('.next-case').on('click', () => this.nextCase());
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZGFsLmpzIl0sIm5hbWVzIjpbIiRtb2RhbCIsIiQiLCIkb3ZlcmxheSIsImxvZ291dCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJMb2dpbiIsIm5leHRDYXNlIiwiaGlkZSIsIlZpZXdlciIsImdldE5leHRDYXNlIiwic2hvdyIsImluaXQiLCJmaW5kIiwib24iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFDQTs7OztlQUVlO0FBQ2JBLEVBQUFBLE1BQU0sRUFBRUMsQ0FBQyxDQUFDLGNBQUQsQ0FESTtBQUViQyxFQUFBQSxRQUFRLEVBQUVELENBQUMsQ0FBQyxrQkFBRCxDQUZFO0FBR2JFLEVBQUFBLE1BSGEsb0JBR0o7QUFDUCxTQUFLSCxNQUFMLENBQVlJLFdBQVosQ0FBd0IsTUFBeEI7QUFDQSxTQUFLRixRQUFMLENBQWNHLFFBQWQsQ0FBdUIsV0FBdkI7O0FBRUFDLG1CQUFNSCxNQUFOO0FBQ0QsR0FSWTtBQVNiSSxFQUFBQSxRQVRhLHNCQVNGO0FBQ1QsU0FBS0MsSUFBTDs7QUFFQUMsb0JBQU9DLFdBQVA7QUFDRCxHQWJZO0FBY2JDLEVBQUFBLElBZGEsa0JBY047QUFDTCxTQUFLWCxNQUFMLENBQVlLLFFBQVosQ0FBcUIsTUFBckI7QUFDQSxTQUFLSCxRQUFMLENBQWNFLFdBQWQsQ0FBMEIsV0FBMUI7QUFDRCxHQWpCWTtBQWtCYkksRUFBQUEsSUFsQmEsa0JBa0JOO0FBQ0wsU0FBS1IsTUFBTCxDQUFZSSxXQUFaLENBQXdCLE1BQXhCO0FBQ0EsU0FBS0YsUUFBTCxDQUFjRyxRQUFkLENBQXVCLFdBQXZCO0FBQ0QsR0FyQlk7QUFzQmJPLEVBQUFBLElBdEJhLGtCQXNCTjtBQUFBOztBQUNMLFNBQUtaLE1BQUwsQ0FBWWEsSUFBWixDQUFpQixLQUFqQixFQUF3QkMsRUFBeEIsQ0FBMkIsT0FBM0IsRUFBb0M7QUFBQSxhQUFNLEtBQUksQ0FBQ04sSUFBTCxFQUFOO0FBQUEsS0FBcEMsRUFESyxDQUVMO0FBQ0Q7QUF6QlksQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBMb2dpbiBmcm9tICcuLi9sb2dpbi9sb2dpbic7XG5pbXBvcnQgVmlld2VyIGZyb20gJy4uL3ZpZXdlci92aWV3ZXInO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gICRtb2RhbDogJCgnLmVycm9yLW1vZGFsJyksXG4gICRvdmVybGF5OiAkKCcubG9hZGluZy1vdmVybGF5JyksXG4gIGxvZ291dCgpIHtcbiAgICB0aGlzLiRtb2RhbC5yZW1vdmVDbGFzcygnc2hvdycpO1xuICAgIHRoaXMuJG92ZXJsYXkuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuXG4gICAgTG9naW4ubG9nb3V0KCk7XG4gIH0sXG4gIG5leHRDYXNlKCkge1xuICAgIHRoaXMuaGlkZSgpO1xuXG4gICAgVmlld2VyLmdldE5leHRDYXNlKCk7XG4gIH0sXG4gIHNob3coKSB7XG4gICAgdGhpcy4kbW9kYWwuYWRkQ2xhc3MoJ3Nob3cnKTtcbiAgICB0aGlzLiRvdmVybGF5LnJlbW92ZUNsYXNzKCdpbnZpc2libGUnKTtcbiAgfSxcbiAgaGlkZSgpIHtcbiAgICB0aGlzLiRtb2RhbC5yZW1vdmVDbGFzcygnc2hvdycpO1xuICAgIHRoaXMuJG92ZXJsYXkuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuICB9LFxuICBpbml0KCkge1xuICAgIHRoaXMuJG1vZGFsLmZpbmQoJy5vaycpLm9uKCdjbGljaycsICgpID0+IHRoaXMuaGlkZSgpKTtcbiAgICAvLyB0aGlzLiRtb2RhbC5maW5kKCcubmV4dC1jYXNlJykub24oJ2NsaWNrJywgKCkgPT4gdGhpcy5uZXh0Q2FzZSgpKTtcbiAgfVxufVxuIl19
},{"../login/login":17,"../viewer/viewer":26}],16:[function(require,module,exports){
"use strict";

var _viewer = _interopRequireDefault(require("../viewer/viewer"));

var _login = _interopRequireDefault(require("./login"));

var _signup = _interopRequireDefault(require("../signup/signup"));

var _db = require("../db/db");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_login.default.$loginForm.off('submit').on('submit', function (evt) {
  evt.preventDefault();
  var $loginUsername = $('#login-username');
  var username = $loginUsername.val();

  if (username === '') {
    return;
  }

  _login.default.$loadingImg.removeClass('invisible');

  $loginUsername.val('');
  _login.default.username = username;
  console.log('username:', username); //console.log('Login Login:', Login);

  _db.annotatorsDB.get(username).then(function (user) {
    _login.default.user = user;
    console.log('Login.user is: ', _login.default.user);
    $('#username-bottom-left').text(_login.default.username);
    window.localStorage.setItem('username', username);

    _login.default.$loadingImg.addClass('invisible');

    _login.default.$loginWrapper.addClass('invisible');

    _viewer.default.initViewer();
  }).catch(function (err) {
    var loginError = $('#login-error');
    loginError.text("Username ".concat(username, " is not found. Try another username or sign up for a new account"));
    loginError.removeClass('invisible');

    _login.default.$loadingImg.addClass('invisible');
  });
});

$('#open-signup-btn-new').off('click').click(function (event) {
  event.preventDefault();

  _login.default.$loginWrapper.addClass('invisible');

  new _signup.default().init();
});
$(document.body).css({
  position: 'relative',
  overflow: 'auto'
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZha2VfMTdjYzViMzkuanMiXSwibmFtZXMiOlsiTG9naW4iLCIkbG9naW5Gb3JtIiwib2ZmIiwib24iLCJldnQiLCJwcmV2ZW50RGVmYXVsdCIsIiRsb2dpblVzZXJuYW1lIiwiJCIsInVzZXJuYW1lIiwidmFsIiwiJGxvYWRpbmdJbWciLCJyZW1vdmVDbGFzcyIsImNvbnNvbGUiLCJsb2ciLCJhbm5vdGF0b3JzREIiLCJnZXQiLCJ0aGVuIiwidXNlciIsInRleHQiLCJ3aW5kb3ciLCJsb2NhbFN0b3JhZ2UiLCJzZXRJdGVtIiwiYWRkQ2xhc3MiLCIkbG9naW5XcmFwcGVyIiwiVmlld2VyIiwiaW5pdFZpZXdlciIsImNhdGNoIiwiZXJyIiwibG9naW5FcnJvciIsImNsaWNrIiwiZXZlbnQiLCJTaWdudXAiLCJpbml0IiwiZG9jdW1lbnQiLCJib2R5IiwiY3NzIiwicG9zaXRpb24iLCJvdmVyZmxvdyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7QUFDQTs7QUFDQTs7QUFDQTs7OztBQUVBQSxlQUFNQyxVQUFOLENBQWlCQyxHQUFqQixDQUFxQixRQUFyQixFQUErQkMsRUFBL0IsQ0FBa0MsUUFBbEMsRUFBNEMsVUFBVUMsR0FBVixFQUFlO0FBQ3pEQSxFQUFBQSxHQUFHLENBQUNDLGNBQUo7QUFFQSxNQUFNQyxjQUFjLEdBQUdDLENBQUMsQ0FBQyxpQkFBRCxDQUF4QjtBQUNBLE1BQU1DLFFBQVEsR0FBR0YsY0FBYyxDQUFDRyxHQUFmLEVBQWpCOztBQUNBLE1BQUlELFFBQVEsS0FBSyxFQUFqQixFQUFxQjtBQUNuQjtBQUNEOztBQUVEUixpQkFBTVUsV0FBTixDQUFrQkMsV0FBbEIsQ0FBOEIsV0FBOUI7O0FBRUFMLEVBQUFBLGNBQWMsQ0FBQ0csR0FBZixDQUFtQixFQUFuQjtBQUNBVCxpQkFBTVEsUUFBTixHQUFpQkEsUUFBakI7QUFDQUksRUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksV0FBWixFQUF5QkwsUUFBekIsRUFieUQsQ0FjekQ7O0FBRUFNLG1CQUFhQyxHQUFiLENBQWlCUCxRQUFqQixFQUEyQlEsSUFBM0IsQ0FBZ0MsVUFBQ0MsSUFBRCxFQUFVO0FBQ3hDakIsbUJBQU1pQixJQUFOLEdBQWFBLElBQWI7QUFDQUwsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksaUJBQVosRUFBK0JiLGVBQU1pQixJQUFyQztBQUNBVixJQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQlcsSUFBM0IsQ0FBZ0NsQixlQUFNUSxRQUF0QztBQUVBVyxJQUFBQSxNQUFNLENBQUNDLFlBQVAsQ0FBb0JDLE9BQXBCLENBQTRCLFVBQTVCLEVBQXdDYixRQUF4Qzs7QUFDQVIsbUJBQU1VLFdBQU4sQ0FBa0JZLFFBQWxCLENBQTJCLFdBQTNCOztBQUNBdEIsbUJBQU11QixhQUFOLENBQW9CRCxRQUFwQixDQUE2QixXQUE3Qjs7QUFFQUUsb0JBQU9DLFVBQVA7QUFDRCxHQVZELEVBVUdDLEtBVkgsQ0FVUyxVQUFDQyxHQUFELEVBQVM7QUFDaEIsUUFBTUMsVUFBVSxHQUFHckIsQ0FBQyxDQUFDLGNBQUQsQ0FBcEI7QUFDQXFCLElBQUFBLFVBQVUsQ0FBQ1YsSUFBWCxvQkFBNEJWLFFBQTVCO0FBQ0FvQixJQUFBQSxVQUFVLENBQUNqQixXQUFYLENBQXVCLFdBQXZCOztBQUNBWCxtQkFBTVUsV0FBTixDQUFrQlksUUFBbEIsQ0FBMkIsV0FBM0I7QUFDRCxHQWZEO0FBZ0JELENBaENEOztBQWtDQWYsQ0FBQyxDQUFDLHNCQUFELENBQUQsQ0FBMEJMLEdBQTFCLENBQThCLE9BQTlCLEVBQXVDMkIsS0FBdkMsQ0FBNkMsVUFBU0MsS0FBVCxFQUFnQjtBQUMzREEsRUFBQUEsS0FBSyxDQUFDekIsY0FBTjs7QUFFQUwsaUJBQU11QixhQUFOLENBQW9CRCxRQUFwQixDQUE2QixXQUE3Qjs7QUFFQSxNQUFJUyxlQUFKLEdBQWFDLElBQWI7QUFDRCxDQU5EO0FBUUF6QixDQUFDLENBQUMwQixRQUFRLENBQUNDLElBQVYsQ0FBRCxDQUFpQkMsR0FBakIsQ0FBcUI7QUFDbkJDLEVBQUFBLFFBQVEsRUFBRSxVQURTO0FBRW5CQyxFQUFBQSxRQUFRLEVBQUU7QUFGUyxDQUFyQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBWaWV3ZXIgZnJvbSAnLi4vdmlld2VyL3ZpZXdlcic7XG5pbXBvcnQgTG9naW4gZnJvbSAnLi9sb2dpbic7XG5pbXBvcnQgU2lnbnVwIGZyb20gJy4uL3NpZ251cC9zaWdudXAnO1xuaW1wb3J0IHthbm5vdGF0b3JzREJ9IGZyb20gJy4uL2RiL2RiJztcblxuTG9naW4uJGxvZ2luRm9ybS5vZmYoJ3N1Ym1pdCcpLm9uKCdzdWJtaXQnLCBmdW5jdGlvbiAoZXZ0KSB7XG4gIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gIGNvbnN0ICRsb2dpblVzZXJuYW1lID0gJCgnI2xvZ2luLXVzZXJuYW1lJyk7XG4gIGNvbnN0IHVzZXJuYW1lID0gJGxvZ2luVXNlcm5hbWUudmFsKCk7XG4gIGlmICh1c2VybmFtZSA9PT0gJycpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBMb2dpbi4kbG9hZGluZ0ltZy5yZW1vdmVDbGFzcygnaW52aXNpYmxlJyk7XG5cbiAgJGxvZ2luVXNlcm5hbWUudmFsKCcnKTtcbiAgTG9naW4udXNlcm5hbWUgPSB1c2VybmFtZTtcbiAgY29uc29sZS5sb2coJ3VzZXJuYW1lOicsIHVzZXJuYW1lKTtcbiAgLy9jb25zb2xlLmxvZygnTG9naW4gTG9naW46JywgTG9naW4pO1xuXG4gIGFubm90YXRvcnNEQi5nZXQodXNlcm5hbWUpLnRoZW4oKHVzZXIpID0+IHtcbiAgICBMb2dpbi51c2VyID0gdXNlcjtcbiAgICBjb25zb2xlLmxvZygnTG9naW4udXNlciBpczogJywgTG9naW4udXNlcik7XG4gICAgJCgnI3VzZXJuYW1lLWJvdHRvbS1sZWZ0JykudGV4dChMb2dpbi51c2VybmFtZSk7XG5cbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3VzZXJuYW1lJywgdXNlcm5hbWUpO1xuICAgIExvZ2luLiRsb2FkaW5nSW1nLmFkZENsYXNzKCdpbnZpc2libGUnKTtcbiAgICBMb2dpbi4kbG9naW5XcmFwcGVyLmFkZENsYXNzKCdpbnZpc2libGUnKTtcblxuICAgIFZpZXdlci5pbml0Vmlld2VyKCk7XG4gIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICBjb25zdCBsb2dpbkVycm9yID0gJCgnI2xvZ2luLWVycm9yJyk7XG4gICAgbG9naW5FcnJvci50ZXh0KGBVc2VybmFtZSAke3VzZXJuYW1lfSBpcyBub3QgZm91bmQuIFRyeSBhbm90aGVyIHVzZXJuYW1lIG9yIHNpZ24gdXAgZm9yIGEgbmV3IGFjY291bnRgKVxuICAgIGxvZ2luRXJyb3IucmVtb3ZlQ2xhc3MoJ2ludmlzaWJsZScpO1xuICAgIExvZ2luLiRsb2FkaW5nSW1nLmFkZENsYXNzKCdpbnZpc2libGUnKTtcbiAgfSk7XG59KTtcblxuJCgnI29wZW4tc2lnbnVwLWJ0bi1uZXcnKS5vZmYoJ2NsaWNrJykuY2xpY2soZnVuY3Rpb24oZXZlbnQpIHtcbiAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICBMb2dpbi4kbG9naW5XcmFwcGVyLmFkZENsYXNzKCdpbnZpc2libGUnKTtcblxuICBuZXcgU2lnbnVwKCkuaW5pdCgpO1xufSk7XG5cbiQoZG9jdW1lbnQuYm9keSkuY3NzKHtcbiAgcG9zaXRpb246ICdyZWxhdGl2ZScsXG4gIG92ZXJmbG93OiAnYXV0bydcbn0pO1xuIl19
},{"../db/db":14,"../signup/signup":20,"../viewer/viewer":26,"./login":17}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var $loadingImg = $('.login-wrapper .login-form button.submit .loading');
var $loginForm = $('.login-wrapper form');
var $loginWrapper = $('.login-wrapper');
var $homepage = $('#homepage');
var $signupWrapper = $('#signup-wrapper');
var $viewWrapper = $('.viewer-wrapper');
var $overlay = $('.loading-overlay');
var Login = {
  $loadingImg: $loadingImg,
  $loginForm: $loginForm,
  $loginWrapper: $loginWrapper,
  $viewWrapper: $viewWrapper,
  $overlay: $overlay,
  $homepage: $homepage,
  $signupWrapper: $signupWrapper,
  username: undefined,
  logout: function logout() {
    this.username = undefined;
    this.$overlay.addClass('invisible');
    this.$homepage.removeClass('invisible');
    this.$signupWrapper.addClass('invisible');
    this.$viewWrapper.addClass('invisible'); // Reset any body CSS imposed by the viewer

    $(document.body).css({
      position: 'relative',
      overflow: 'auto'
    }); // Remove this username from localstorage

    window.localStorage.removeItem('username');
  }
};
var _default = Login;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxvZ2luLmpzIl0sIm5hbWVzIjpbIiRsb2FkaW5nSW1nIiwiJCIsIiRsb2dpbkZvcm0iLCIkbG9naW5XcmFwcGVyIiwiJGhvbWVwYWdlIiwiJHNpZ251cFdyYXBwZXIiLCIkdmlld1dyYXBwZXIiLCIkb3ZlcmxheSIsIkxvZ2luIiwidXNlcm5hbWUiLCJ1bmRlZmluZWQiLCJsb2dvdXQiLCJhZGRDbGFzcyIsInJlbW92ZUNsYXNzIiwiZG9jdW1lbnQiLCJib2R5IiwiY3NzIiwicG9zaXRpb24iLCJvdmVyZmxvdyIsIndpbmRvdyIsImxvY2FsU3RvcmFnZSIsInJlbW92ZUl0ZW0iXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLElBQU1BLFdBQVcsR0FBR0MsQ0FBQyxDQUFDLG1EQUFELENBQXJCO0FBQ0EsSUFBTUMsVUFBVSxHQUFHRCxDQUFDLENBQUMscUJBQUQsQ0FBcEI7QUFDQSxJQUFNRSxhQUFhLEdBQUdGLENBQUMsQ0FBQyxnQkFBRCxDQUF2QjtBQUNBLElBQU1HLFNBQVMsR0FBR0gsQ0FBQyxDQUFDLFdBQUQsQ0FBbkI7QUFDQSxJQUFNSSxjQUFjLEdBQUdKLENBQUMsQ0FBQyxpQkFBRCxDQUF4QjtBQUNBLElBQU1LLFlBQVksR0FBR0wsQ0FBQyxDQUFDLGlCQUFELENBQXRCO0FBQ0EsSUFBTU0sUUFBUSxHQUFHTixDQUFDLENBQUMsa0JBQUQsQ0FBbEI7QUFFQSxJQUFNTyxLQUFLLEdBQUc7QUFDWlIsRUFBQUEsV0FBVyxFQUFYQSxXQURZO0FBRVpFLEVBQUFBLFVBQVUsRUFBVkEsVUFGWTtBQUdaQyxFQUFBQSxhQUFhLEVBQWJBLGFBSFk7QUFJWkcsRUFBQUEsWUFBWSxFQUFaQSxZQUpZO0FBS1pDLEVBQUFBLFFBQVEsRUFBUkEsUUFMWTtBQU1aSCxFQUFBQSxTQUFTLEVBQVRBLFNBTlk7QUFPWkMsRUFBQUEsY0FBYyxFQUFkQSxjQVBZO0FBUVpJLEVBQUFBLFFBQVEsRUFBRUMsU0FSRTtBQVNaQyxFQUFBQSxNQVRZLG9CQVNIO0FBQ1AsU0FBS0YsUUFBTCxHQUFnQkMsU0FBaEI7QUFDQSxTQUFLSCxRQUFMLENBQWNLLFFBQWQsQ0FBdUIsV0FBdkI7QUFDQSxTQUFLUixTQUFMLENBQWVTLFdBQWYsQ0FBMkIsV0FBM0I7QUFDQSxTQUFLUixjQUFMLENBQW9CTyxRQUFwQixDQUE2QixXQUE3QjtBQUNBLFNBQUtOLFlBQUwsQ0FBa0JNLFFBQWxCLENBQTJCLFdBQTNCLEVBTE8sQ0FPUDs7QUFDQVgsSUFBQUEsQ0FBQyxDQUFDYSxRQUFRLENBQUNDLElBQVYsQ0FBRCxDQUFpQkMsR0FBakIsQ0FBcUI7QUFDbkJDLE1BQUFBLFFBQVEsRUFBRSxVQURTO0FBRW5CQyxNQUFBQSxRQUFRLEVBQUU7QUFGUyxLQUFyQixFQVJPLENBYVA7O0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsWUFBUCxDQUFvQkMsVUFBcEIsQ0FBK0IsVUFBL0I7QUFDRDtBQXhCVyxDQUFkO2VBMkJlYixLIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgJGxvYWRpbmdJbWcgPSAkKCcubG9naW4td3JhcHBlciAubG9naW4tZm9ybSBidXR0b24uc3VibWl0IC5sb2FkaW5nJyk7XG5jb25zdCAkbG9naW5Gb3JtID0gJCgnLmxvZ2luLXdyYXBwZXIgZm9ybScpO1xuY29uc3QgJGxvZ2luV3JhcHBlciA9ICQoJy5sb2dpbi13cmFwcGVyJyk7XG5jb25zdCAkaG9tZXBhZ2UgPSAkKCcjaG9tZXBhZ2UnKTtcbmNvbnN0ICRzaWdudXBXcmFwcGVyID0gJCgnI3NpZ251cC13cmFwcGVyJyk7XG5jb25zdCAkdmlld1dyYXBwZXIgPSAkKCcudmlld2VyLXdyYXBwZXInKTtcbmNvbnN0ICRvdmVybGF5ID0gJCgnLmxvYWRpbmctb3ZlcmxheScpO1xuXG5jb25zdCBMb2dpbiA9IHtcbiAgJGxvYWRpbmdJbWcsXG4gICRsb2dpbkZvcm0sXG4gICRsb2dpbldyYXBwZXIsXG4gICR2aWV3V3JhcHBlcixcbiAgJG92ZXJsYXksXG4gICRob21lcGFnZSxcbiAgJHNpZ251cFdyYXBwZXIsXG4gIHVzZXJuYW1lOiB1bmRlZmluZWQsXG4gIGxvZ291dCgpIHtcbiAgICB0aGlzLnVzZXJuYW1lID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuJG92ZXJsYXkuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuICAgIHRoaXMuJGhvbWVwYWdlLnJlbW92ZUNsYXNzKCdpbnZpc2libGUnKTtcbiAgICB0aGlzLiRzaWdudXBXcmFwcGVyLmFkZENsYXNzKCdpbnZpc2libGUnKTtcbiAgICB0aGlzLiR2aWV3V3JhcHBlci5hZGRDbGFzcygnaW52aXNpYmxlJyk7XG5cbiAgICAvLyBSZXNldCBhbnkgYm9keSBDU1MgaW1wb3NlZCBieSB0aGUgdmlld2VyXG4gICAgJChkb2N1bWVudC5ib2R5KS5jc3Moe1xuICAgICAgcG9zaXRpb246ICdyZWxhdGl2ZScsXG4gICAgICBvdmVyZmxvdzogJ2F1dG8nXG4gICAgfSk7XG5cbiAgICAvLyBSZW1vdmUgdGhpcyB1c2VybmFtZSBmcm9tIGxvY2Fsc3RvcmFnZVxuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgndXNlcm5hbWUnKTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgTG9naW47Il19
},{}],18:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _login = _interopRequireWildcard(require("../login/login"));

var _modal = _interopRequireDefault(require("../modal/modal"));

var _modal2 = _interopRequireDefault(require("../errorModal/modal"));

var _viewer = _interopRequireDefault(require("../viewer/viewer"));

var _db = require("../db/db");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

var _default = {
  $menuWrapper: $('.menu-wrapper'),
  $overlay: $('.loading-overlay'),
  submit: function submit() {
    this.closeMenu();
    Commands.save();
  },
  nextCase: function nextCase() {
    this.closeMenu();

    _viewer.default.getNextCase();
  },
  logout: function logout() {
    this.closeMenu();

    _login.default.logout();
  },
  closeMenu: function closeMenu() {
    var _this = this;

    this.$overlay.addClass('invisible');
    this.$menuWrapper.removeClass('opened');
    setTimeout(function () {
      _this.$menuWrapper.addClass('invisible');
    }, 1200);
  },
  init: function init() {
    var _this2 = this;

    _modal.default.init();

    _modal2.default.init();

    this.$menuWrapper.on('click', 'a[data-menu]', function (event) {
      var $element = $(event.currentTarget);
      var menu = $element.attr('data-menu');
      event.preventDefault();

      if (menu) {
        _this2[menu]();
      }
    });
    this.$overlay.on('click', function (event) {
      if (_this2.$menuWrapper.hasClass('opened')) {
        _this2.closeMenu();
      }
    });
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1lbnUuanMiXSwibmFtZXMiOlsiJG1lbnVXcmFwcGVyIiwiJCIsIiRvdmVybGF5Iiwic3VibWl0IiwiY2xvc2VNZW51IiwiQ29tbWFuZHMiLCJzYXZlIiwibmV4dENhc2UiLCJWaWV3ZXIiLCJnZXROZXh0Q2FzZSIsImxvZ291dCIsIkxvZ2luIiwiYWRkQ2xhc3MiLCJyZW1vdmVDbGFzcyIsInNldFRpbWVvdXQiLCJpbml0IiwiTW9kYWwiLCJFcnJvck1vZGFsIiwib24iLCJldmVudCIsIiRlbGVtZW50IiwiY3VycmVudFRhcmdldCIsIm1lbnUiLCJhdHRyIiwicHJldmVudERlZmF1bHQiLCJoYXNDbGFzcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOzs7Ozs7ZUFHZTtBQUNiQSxFQUFBQSxZQUFZLEVBQUVDLENBQUMsQ0FBQyxlQUFELENBREY7QUFFYkMsRUFBQUEsUUFBUSxFQUFFRCxDQUFDLENBQUMsa0JBQUQsQ0FGRTtBQUliRSxFQUFBQSxNQUphLG9CQUlKO0FBQ1AsU0FBS0MsU0FBTDtBQUNBQyxJQUFBQSxRQUFRLENBQUNDLElBQVQ7QUFDRCxHQVBZO0FBUWJDLEVBQUFBLFFBUmEsc0JBUUY7QUFDVCxTQUFLSCxTQUFMOztBQUNBSSxvQkFBT0MsV0FBUDtBQUNELEdBWFk7QUFZYkMsRUFBQUEsTUFaYSxvQkFZTDtBQUNOLFNBQUtOLFNBQUw7O0FBQ0FPLG1CQUFNRCxNQUFOO0FBQ0QsR0FmWTtBQWdCYk4sRUFBQUEsU0FoQmEsdUJBZ0JEO0FBQUE7O0FBQ1YsU0FBS0YsUUFBTCxDQUFjVSxRQUFkLENBQXVCLFdBQXZCO0FBQ0EsU0FBS1osWUFBTCxDQUFrQmEsV0FBbEIsQ0FBOEIsUUFBOUI7QUFFQUMsSUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDZixNQUFBLEtBQUksQ0FBQ2QsWUFBTCxDQUFrQlksUUFBbEIsQ0FBMkIsV0FBM0I7QUFDRCxLQUZTLEVBRVAsSUFGTyxDQUFWO0FBR0QsR0F2Qlk7QUF3QmJHLEVBQUFBLElBeEJhLGtCQXdCTjtBQUFBOztBQUNMQyxtQkFBTUQsSUFBTjs7QUFDQUUsb0JBQVdGLElBQVg7O0FBRUEsU0FBS2YsWUFBTCxDQUFrQmtCLEVBQWxCLENBQXFCLE9BQXJCLEVBQThCLGNBQTlCLEVBQThDLFVBQUNDLEtBQUQsRUFBVztBQUN2RCxVQUFNQyxRQUFRLEdBQUduQixDQUFDLENBQUNrQixLQUFLLENBQUNFLGFBQVAsQ0FBbEI7QUFDQSxVQUFNQyxJQUFJLEdBQUdGLFFBQVEsQ0FBQ0csSUFBVCxDQUFjLFdBQWQsQ0FBYjtBQUVBSixNQUFBQSxLQUFLLENBQUNLLGNBQU47O0FBRUEsVUFBSUYsSUFBSixFQUFVO0FBQ1IsUUFBQSxNQUFJLENBQUNBLElBQUQsQ0FBSjtBQUNEO0FBQ0YsS0FURDtBQVdBLFNBQUtwQixRQUFMLENBQWNnQixFQUFkLENBQWlCLE9BQWpCLEVBQTBCLFVBQUNDLEtBQUQsRUFBVztBQUNuQyxVQUFJLE1BQUksQ0FBQ25CLFlBQUwsQ0FBa0J5QixRQUFsQixDQUEyQixRQUEzQixDQUFKLEVBQTBDO0FBQ3hDLFFBQUEsTUFBSSxDQUFDckIsU0FBTDtBQUNEO0FBQ0YsS0FKRDtBQUtEO0FBNUNZLEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTG9naW4gZnJvbSAnLi4vbG9naW4vbG9naW4nO1xuaW1wb3J0IE1vZGFsIGZyb20gJy4uL21vZGFsL21vZGFsJztcbmltcG9ydCBFcnJvck1vZGFsIGZyb20gJy4uL2Vycm9yTW9kYWwvbW9kYWwnO1xuaW1wb3J0IFZpZXdlciBmcm9tICcuLi92aWV3ZXIvdmlld2VyJztcbmltcG9ydCB7bWVhc3VyZW1lbnRzREIsIGdldFVVSUR9IGZyb20gJy4uL2RiL2RiJztcbmltcG9ydCB7dXNlcm5hbWV9IGZyb20gJy4uL2xvZ2luL2xvZ2luJztcblxuZXhwb3J0IGRlZmF1bHQge1xuICAkbWVudVdyYXBwZXI6ICQoJy5tZW51LXdyYXBwZXInKSxcbiAgJG92ZXJsYXk6ICQoJy5sb2FkaW5nLW92ZXJsYXknKSxcblxuICBzdWJtaXQoKSB7XG4gICAgdGhpcy5jbG9zZU1lbnUoKTtcbiAgICBDb21tYW5kcy5zYXZlKCk7XG4gIH0sXG4gIG5leHRDYXNlKCkge1xuICAgIHRoaXMuY2xvc2VNZW51KCk7XG4gICAgVmlld2VyLmdldE5leHRDYXNlKCk7XG4gIH0sXG4gIGxvZ291dCgpe1xuICAgIHRoaXMuY2xvc2VNZW51KCk7XG4gICAgTG9naW4ubG9nb3V0KCk7XG4gIH0sXG4gIGNsb3NlTWVudSgpIHtcbiAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdpbnZpc2libGUnKTtcbiAgICB0aGlzLiRtZW51V3JhcHBlci5yZW1vdmVDbGFzcygnb3BlbmVkJyk7XG5cbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuJG1lbnVXcmFwcGVyLmFkZENsYXNzKCdpbnZpc2libGUnKTtcbiAgICB9LCAxMjAwKTtcbiAgfSxcbiAgaW5pdCgpIHtcbiAgICBNb2RhbC5pbml0KCk7XG4gICAgRXJyb3JNb2RhbC5pbml0KCk7XG5cbiAgICB0aGlzLiRtZW51V3JhcHBlci5vbignY2xpY2snLCAnYVtkYXRhLW1lbnVdJywgKGV2ZW50KSA9PiB7XG4gICAgICBjb25zdCAkZWxlbWVudCA9ICQoZXZlbnQuY3VycmVudFRhcmdldCk7XG4gICAgICBjb25zdCBtZW51ID0gJGVsZW1lbnQuYXR0cignZGF0YS1tZW51Jyk7XG5cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIGlmIChtZW51KSB7XG4gICAgICAgIHRoaXNbbWVudV0oKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuJG92ZXJsYXkub24oJ2NsaWNrJywgKGV2ZW50KSA9PiB7XG4gICAgICBpZiAodGhpcy4kbWVudVdyYXBwZXIuaGFzQ2xhc3MoJ29wZW5lZCcpKSB7XG4gICAgICAgIHRoaXMuY2xvc2VNZW51KCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==
},{"../db/db":14,"../errorModal/modal":15,"../login/login":17,"../modal/modal":19,"../viewer/viewer":26}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _login = _interopRequireDefault(require("../login/login"));

var _viewer = _interopRequireDefault(require("../viewer/viewer"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = {
  $modal: $('.modal'),
  $overlay: $('.loading-overlay'),
  logout: function logout() {
    this.$modal.removeClass('show');
    this.$overlay.addClass('invisible');

    _login.default.logout();
  },
  show: function show() {
    this.$modal.addClass('show');
    this.$overlay.removeClass('invisible');
  },
  hide: function hide() {
    this.$modal.removeClass('show');
    this.$overlay.addClass('invisible');
  },
  init: function init() {
    var _this = this;

    this.$modal.find('.logout').on('click', function () {
      return _this.logout();
    });
    this.$modal.find('.next-case').on('click', function () {
      return _this.nextCase();
    });
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZGFsLmpzIl0sIm5hbWVzIjpbIiRtb2RhbCIsIiQiLCIkb3ZlcmxheSIsImxvZ291dCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJMb2dpbiIsInNob3ciLCJoaWRlIiwiaW5pdCIsImZpbmQiLCJvbiIsIm5leHRDYXNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7Ozs7ZUFFZTtBQUNiQSxFQUFBQSxNQUFNLEVBQUVDLENBQUMsQ0FBQyxRQUFELENBREk7QUFFYkMsRUFBQUEsUUFBUSxFQUFFRCxDQUFDLENBQUMsa0JBQUQsQ0FGRTtBQUdiRSxFQUFBQSxNQUhhLG9CQUdKO0FBQ1AsU0FBS0gsTUFBTCxDQUFZSSxXQUFaLENBQXdCLE1BQXhCO0FBQ0EsU0FBS0YsUUFBTCxDQUFjRyxRQUFkLENBQXVCLFdBQXZCOztBQUVBQyxtQkFBTUgsTUFBTjtBQUNELEdBUlk7QUFTYkksRUFBQUEsSUFUYSxrQkFTTjtBQUNMLFNBQUtQLE1BQUwsQ0FBWUssUUFBWixDQUFxQixNQUFyQjtBQUNBLFNBQUtILFFBQUwsQ0FBY0UsV0FBZCxDQUEwQixXQUExQjtBQUNELEdBWlk7QUFhYkksRUFBQUEsSUFiYSxrQkFhTjtBQUNMLFNBQUtSLE1BQUwsQ0FBWUksV0FBWixDQUF3QixNQUF4QjtBQUNBLFNBQUtGLFFBQUwsQ0FBY0csUUFBZCxDQUF1QixXQUF2QjtBQUNELEdBaEJZO0FBaUJiSSxFQUFBQSxJQWpCYSxrQkFpQk47QUFBQTs7QUFDTCxTQUFLVCxNQUFMLENBQVlVLElBQVosQ0FBaUIsU0FBakIsRUFBNEJDLEVBQTVCLENBQStCLE9BQS9CLEVBQXdDO0FBQUEsYUFBTSxLQUFJLENBQUNSLE1BQUwsRUFBTjtBQUFBLEtBQXhDO0FBQ0EsU0FBS0gsTUFBTCxDQUFZVSxJQUFaLENBQWlCLFlBQWpCLEVBQStCQyxFQUEvQixDQUFrQyxPQUFsQyxFQUEyQztBQUFBLGFBQU0sS0FBSSxDQUFDQyxRQUFMLEVBQU47QUFBQSxLQUEzQztBQUNEO0FBcEJZLEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTG9naW4gZnJvbSAnLi4vbG9naW4vbG9naW4nO1xuaW1wb3J0IFZpZXdlciBmcm9tICcuLi92aWV3ZXIvdmlld2VyJztcblxuZXhwb3J0IGRlZmF1bHQge1xuICAkbW9kYWw6ICQoJy5tb2RhbCcpLFxuICAkb3ZlcmxheTogJCgnLmxvYWRpbmctb3ZlcmxheScpLFxuICBsb2dvdXQoKSB7XG4gICAgdGhpcy4kbW9kYWwucmVtb3ZlQ2xhc3MoJ3Nob3cnKTtcbiAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdpbnZpc2libGUnKTtcblxuICAgIExvZ2luLmxvZ291dCgpO1xuICB9LFxuICBzaG93KCkge1xuICAgIHRoaXMuJG1vZGFsLmFkZENsYXNzKCdzaG93Jyk7XG4gICAgdGhpcy4kb3ZlcmxheS5yZW1vdmVDbGFzcygnaW52aXNpYmxlJyk7XG4gIH0sXG4gIGhpZGUoKSB7XG4gICAgdGhpcy4kbW9kYWwucmVtb3ZlQ2xhc3MoJ3Nob3cnKTtcbiAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdpbnZpc2libGUnKTtcbiAgfSxcbiAgaW5pdCgpIHtcbiAgICB0aGlzLiRtb2RhbC5maW5kKCcubG9nb3V0Jykub24oJ2NsaWNrJywgKCkgPT4gdGhpcy5sb2dvdXQoKSk7XG4gICAgdGhpcy4kbW9kYWwuZmluZCgnLm5leHQtY2FzZScpLm9uKCdjbGljaycsICgpID0+IHRoaXMubmV4dENhc2UoKSk7XG4gIH1cbn1cbiJdfQ==
},{"../login/login":17,"../viewer/viewer":26}],20:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _db = require("../db/db");

var _viewer = _interopRequireDefault(require("../viewer/viewer"));

var _login = _interopRequireDefault(require("../login/login"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Signup =
/*#__PURE__*/
function () {
  function Signup() {
    _classCallCheck(this, Signup);
  }

  _createClass(Signup, [{
    key: "getRandomUsername",
    value: function getRandomUsername() {
      var numOfAdjectives = 0;
      var numOfAnimals = 0;
      var name;
      return _db.adjectivesDB.info().then(function (doc) {
        numOfAdjectives = doc.doc_count; // console.log('numOfAdjectives', numOfAdjectives);

        var rand = Math.floor(numOfAdjectives * Math.random());
        return _db.adjectivesDB.get(rand);
      }).then(function (doc) {
        // console.log(doc.name);
        name = doc.name;
        return _db.animalsDB.info();
      }).then(function (doc) {
        numOfAnimals = doc.doc_count; // console.log('numOfAnimals', numOfAnimals);

        var rand = Math.floor(numOfAnimals * Math.random());
        return _db.animalsDB.get(rand);
      }).then(function (doc) {
        return name + "_".concat(doc.name);
      }).catch(function (err) {
        throw err;
      });
    }
  }, {
    key: "getRandomUsernames",
    value: function getRandomUsernames() {
      var _this = this;

      var num = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var names = [];
      console.log('num:', num);

      var next = function next() {
        return _this.getRandomUsername().then(function (name) {
          var accept = true;
          names.forEach(function (n) {
            if (n === name) {
              accept = false;
            }
          });

          if (accept) {
            return _db.annotatorsDB.get(name).then(function (user) {
              console.log('username', name, 'already exist in the database');
              return next();
            }).catch(function (err) {
              names.push(name);

              if (names.length !== num) {
                return next();
              }
            });
          } else {
            return next();
          }
        });
      };

      return next().then(function () {
        return names;
      });
    }
  }, {
    key: "createUser",
    value: function createUser(id, data) {
      return new Promise(function (resolve, reject) {
        $.ajax({
          url: "".concat(annotatorURL, "/").concat(id),
          type: 'PUT',
          dataType: 'json',
          data: data,
          success: function success(res) {
            // $loadingImg.addClass('invisible');
            // $signupWrapper.addClass('invisible');
            // Viewer.initViewer();
            resolve(res);
          },
          error: function error(err) {
            console.log(err);
            reject(err);
          }
        });
      });
    }
  }, {
    key: "init",
    value: function init() {
      console.log('Signup.init() is called');
      var $loading = $('.sign form button.submit loading');
      var $signup = $('.sign');
      var $overlay = $('.loading-overlay');
      $overlay.removeClass('invisible').addClass('loading');
      this.getRandomUsernames(4).then(function (names) {
        // console.log('usernames:', names);
        $overlay.removeClass('loading').addClass('invisible');
        $signup.removeClass('invisible');
        $('#signup-name-select').append("<option value=".concat(names[0], ">").concat(names[0], "</option>"));
        $('#signup-name-select').append("<option value=".concat(names[1], ">").concat(names[1], "</option>"));
        $('#signup-name-select').append("<option value=".concat(names[2], ">").concat(names[2], "</option>"));
        $('#signup-name-select').append("<option value=".concat(names[3], ">").concat(names[3], "</option>"));
      });
      var radiologist = $('input[name="is-radiologist"]');
      $(radiologist).change(function () {
        var isChecked = radiologist.is(':checked'); // console.log('isChecked:', isChecked);

        if (isChecked) {
          var isRadiologist = $('input[name="is-radiologist"]:checked').val() === 'yes'; // console.log('isRadiologist:', isRadiologist);

          if (isRadiologist) {
            if (!$('.speciality').hasClass('invisible')) {
              $('.speciality').addClass('invisible');
            }

            $('.years-of-experience').removeClass('invisible');
          } else {
            if (!$('.years-of-experience').hasClass('invisible')) {
              $('.years-of-experience').addClass('invisible');
            }

            $('.speciality').removeClass('invisible');
          }
        }
      }); // $('input[name="years-of-experience"]').focus(function() {
      //   console.log('years of exp');
      //   if(!$('.sign .error').hasClass('invisible')){
      //     $('.sign .error').text('');
      //     $('.sign .error').addClass('invisible');
      //   }
      // });

      $('.sign form').off('submit').on('submit', function (event) {
        event.preventDefault();
        $loading.removeClass('invisible'); // $('.sign .error').addClass('invisible');

        var username = $('#signup-name-select option:selected').text();
        _login.default.username = username; // console.log('signup Login:', Login);
        // const username = $('input[name="username"]').val();
        // const password = $('input[name="password"]').val();
        // const confirmPassword = $('input[name="confirm-password"]').val();

        var isRadiologist = $('input[name="is-radiologist"]:checked').val() === 'yes'; // const isChecked = $('input:radio[name="is-radiologist"]').is(':checked');
        // const isRadiologist2 = $('#radiologist-no').val();

        var yearsOfExperience;
        var speciality;
        var anatomyChoices = [];

        if (isRadiologist) {
          yearsOfExperience = $('#signup-years-of-experience option:selected').val();
        } else {
          speciality = $('#signup-speciality option:selected').val();
        }

        $("#anatomy-choices input:checkbox[name=anatomy-choice]:checked").each(function () {
          anatomyChoices.push($(this).val());
        });
        var email = $('#signup-email').val();
        console.log('email:', email); // if(isRadiologist && isNaN(yearsOfExperience)){
        //     $('.sign .error').removeClass('invisible');
        //     $('.sign .error').text('"Years of exprience" must be a number');
        //
        //     $('input[name="years-of-experience"]').val('');
        //
        //     $('#signup-button').blur();
        //
        //     $loadingImg.addClass('invisible');
        //
        //     return false;
        // }
        // var values = $(this).serializeArray();
        // console.log('values', values);
        // if(password !== confirmPassword){
        //   $('.sign .error').removeClass('invisible');
        //   $('.sign .error').text('Passwords don\'t match');
        //
        //   const password = $('#signup-password').val('');
        //   const confirmPassword = $('#signup-confirm-password').val('');
        //
        //   $('#signup-button').blur();
        //
        //   $loadingImg.addClass('invisible');
        //
        // }

        var createDate = Date.now();
        var data = {
          _id: username,
          username: username,
          // password,
          isRadiologist: isRadiologist,
          anatomyChoices: anatomyChoices,
          createDate: createDate
        };
        window.localStorage.setItem('username', username);

        if (speciality) {
          data.speciality = speciality;
        }

        if (yearsOfExperience) {
          data.yearsOfExperience = yearsOfExperience;
        }

        if (email) {
          data.email = email;
        }

        if (anatomyChoices && anatomyChoices.length > 0) {
          data.anatomyChoices = anatomyChoices;
        }

        _db.annotatorsDB.put(data).then(function (res) {
          _login.default.user = data;
          console.log('Login.user is: ', _login.default.user);
          $('#username-bottom-left').text(_login.default.username);
          $loading.addClass('invisible');
          $signup.addClass('invisible');

          _viewer.default.initViewer();
        });
      });
    }
  }]);

  return Signup;
}();

var _default = Signup;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNpZ251cC5qcyJdLCJuYW1lcyI6WyJTaWdudXAiLCJudW1PZkFkamVjdGl2ZXMiLCJudW1PZkFuaW1hbHMiLCJuYW1lIiwiYWRqZWN0aXZlc0RCIiwiaW5mbyIsInRoZW4iLCJkb2MiLCJkb2NfY291bnQiLCJyYW5kIiwiTWF0aCIsImZsb29yIiwicmFuZG9tIiwiZ2V0IiwiYW5pbWFsc0RCIiwiY2F0Y2giLCJlcnIiLCJudW0iLCJuYW1lcyIsImNvbnNvbGUiLCJsb2ciLCJuZXh0IiwiZ2V0UmFuZG9tVXNlcm5hbWUiLCJhY2NlcHQiLCJmb3JFYWNoIiwibiIsImFubm90YXRvcnNEQiIsInVzZXIiLCJwdXNoIiwibGVuZ3RoIiwiaWQiLCJkYXRhIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCIkIiwiYWpheCIsInVybCIsImFubm90YXRvclVSTCIsInR5cGUiLCJkYXRhVHlwZSIsInN1Y2Nlc3MiLCJyZXMiLCJlcnJvciIsIiRsb2FkaW5nIiwiJHNpZ251cCIsIiRvdmVybGF5IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImdldFJhbmRvbVVzZXJuYW1lcyIsImFwcGVuZCIsInJhZGlvbG9naXN0IiwiY2hhbmdlIiwiaXNDaGVja2VkIiwiaXMiLCJpc1JhZGlvbG9naXN0IiwidmFsIiwiaGFzQ2xhc3MiLCJvZmYiLCJvbiIsImV2ZW50IiwicHJldmVudERlZmF1bHQiLCJ1c2VybmFtZSIsInRleHQiLCJMb2dpbiIsInllYXJzT2ZFeHBlcmllbmNlIiwic3BlY2lhbGl0eSIsImFuYXRvbXlDaG9pY2VzIiwiZWFjaCIsImVtYWlsIiwiY3JlYXRlRGF0ZSIsIkRhdGUiLCJub3ciLCJfaWQiLCJ3aW5kb3ciLCJsb2NhbFN0b3JhZ2UiLCJzZXRJdGVtIiwicHV0IiwiVmlld2VyIiwiaW5pdFZpZXdlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUNBOzs7Ozs7Ozs7O0lBRU1BLE07OztBQUVKLG9CQUFlO0FBQUE7QUFFZDs7Ozt3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QUFJLENBQUNvQyxjQUFMLEdBQXNCQSxjQUF0QjtBQUNEOztBQUVEekMseUJBQWFtRCxHQUFiLENBQWlCOUMsSUFBakIsRUFBdUJ6QixJQUF2QixDQUE0QixVQUFDb0MsR0FBRCxFQUFTO0FBQ25Dc0IseUJBQU1yQyxJQUFOLEdBQWFJLElBQWI7QUFDQVosVUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksaUJBQVosRUFBK0I0QyxlQUFNckMsSUFBckM7QUFDQVEsVUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkI0QixJQUEzQixDQUFnQ0MsZUFBTUYsUUFBdEM7QUFDQWxCLFVBQUFBLFFBQVEsQ0FBQ0ksUUFBVCxDQUFrQixXQUFsQjtBQUNBSCxVQUFBQSxPQUFPLENBQUNHLFFBQVIsQ0FBaUIsV0FBakI7O0FBRUE4QiwwQkFBT0MsVUFBUDtBQUNELFNBUkQ7QUFTRCxPQWhHRDtBQWlHRDs7Ozs7O2VBR1kvRSxNIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHthZGplY3RpdmVzREIsIGFuaW1hbHNEQiwgYW5ub3RhdG9yc0RCLCBhbm5vdGF0b3JzVVJMfSBmcm9tICcuLi9kYi9kYic7XG5pbXBvcnQgVmlld2VyIGZyb20gJy4uL3ZpZXdlci92aWV3ZXInO1xuaW1wb3J0IExvZ2luIGZyb20gJy4uL2xvZ2luL2xvZ2luJztcblxuY2xhc3MgU2lnbnVwIHtcblxuICBjb25zdHJ1Y3RvciAoKSB7XG5cbiAgfVxuXG4gIGdldFJhbmRvbVVzZXJuYW1lICgpIHtcbiAgICBsZXQgbnVtT2ZBZGplY3RpdmVzID0gMDtcbiAgICBsZXQgbnVtT2ZBbmltYWxzID0gMDtcbiAgICBsZXQgbmFtZTtcblxuICAgIHJldHVybiBhZGplY3RpdmVzREIuaW5mbygpLnRoZW4oKGRvYykgPT4ge1xuICAgICAgbnVtT2ZBZGplY3RpdmVzID0gZG9jLmRvY19jb3VudDtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdudW1PZkFkamVjdGl2ZXMnLCBudW1PZkFkamVjdGl2ZXMpO1xuICAgICAgY29uc3QgcmFuZCA9IE1hdGguZmxvb3IobnVtT2ZBZGplY3RpdmVzKk1hdGgucmFuZG9tKCkpO1xuICAgICAgcmV0dXJuIGFkamVjdGl2ZXNEQi5nZXQocmFuZCk7XG4gICAgfSkudGhlbigoZG9jKSA9PiB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhkb2MubmFtZSk7XG4gICAgICBuYW1lID0gZG9jLm5hbWU7XG4gICAgICByZXR1cm4gYW5pbWFsc0RCLmluZm8oKTtcbiAgICB9KS50aGVuKChkb2MpID0+IHtcbiAgICAgIG51bU9mQW5pbWFscyA9IGRvYy5kb2NfY291bnQ7XG4gICAgICAvLyBjb25zb2xlLmxvZygnbnVtT2ZBbmltYWxzJywgbnVtT2ZBbmltYWxzKTtcbiAgICAgIGNvbnN0IHJhbmQgPSBNYXRoLmZsb29yKG51bU9mQW5pbWFscypNYXRoLnJhbmRvbSgpKTtcbiAgICAgIHJldHVybiBhbmltYWxzREIuZ2V0KHJhbmQpO1xuICAgIH0pLnRoZW4oKGRvYykgPT4ge1xuICAgICAgcmV0dXJuIG5hbWUgKyBgXyR7ZG9jLm5hbWV9YDtcbiAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfSk7XG4gIH1cblxuICBnZXRSYW5kb21Vc2VybmFtZXMgKG51bT0wKSB7XG4gICAgY29uc3QgbmFtZXMgPSBbXTtcbiAgICBjb25zb2xlLmxvZygnbnVtOicsIG51bSk7XG5cbiAgICBjb25zdCBuZXh0ID0gKCkgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmFuZG9tVXNlcm5hbWUoKS50aGVuKChuYW1lKSA9PiB7XG4gICAgICAgIGxldCBhY2NlcHQgPSB0cnVlO1xuICAgICAgICBuYW1lcy5mb3JFYWNoKChuKSA9PiB7XG4gICAgICAgICAgaWYobiA9PT0gbmFtZSl7XG4gICAgICAgICAgICBhY2NlcHQgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmKGFjY2VwdCl7XG4gICAgICAgICAgcmV0dXJuIGFubm90YXRvcnNEQi5nZXQobmFtZSkudGhlbigodXNlcikgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3VzZXJuYW1lJywgbmFtZSwgJ2FscmVhZHkgZXhpc3QgaW4gdGhlIGRhdGFiYXNlJyk7XG5cbiAgICAgICAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgbmFtZXMucHVzaChuYW1lKTtcblxuICAgICAgICAgICAgaWYobmFtZXMubGVuZ3RoICE9PSBudW0pe1xuICAgICAgICAgICAgICByZXR1cm4gbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICByZXR1cm4gbmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV4dCgpLnRoZW4oKCkgPT4ge1xuICAgICAgcmV0dXJuIG5hbWVzO1xuICAgIH0pO1xuICB9XG5cbiAgY3JlYXRlVXNlciAoaWQsIGRhdGEpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgJHthbm5vdGF0b3JVUkx9LyR7aWR9YCxcbiAgICAgICAgdHlwZTogJ1BVVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgLy8gJGxvYWRpbmdJbWcuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuICAgICAgICAgIC8vICRzaWdudXBXcmFwcGVyLmFkZENsYXNzKCdpbnZpc2libGUnKTtcbiAgICAgICAgICAvLyBWaWV3ZXIuaW5pdFZpZXdlcigpO1xuICAgICAgICAgIHJlc29sdmUocmVzKTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBpbml0ICgpIHtcbiAgICBjb25zb2xlLmxvZygnU2lnbnVwLmluaXQoKSBpcyBjYWxsZWQnKTtcbiAgICB2YXIgJGxvYWRpbmcgPSAkKCcuc2lnbiBmb3JtIGJ1dHRvbi5zdWJtaXQgbG9hZGluZycpO1xuICAgIHZhciAkc2lnbnVwID0gJCgnLnNpZ24nKTtcbiAgICB2YXIgJG92ZXJsYXkgPSAkKCcubG9hZGluZy1vdmVybGF5Jyk7XG5cbiAgICAkb3ZlcmxheS5yZW1vdmVDbGFzcygnaW52aXNpYmxlJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgIHRoaXMuZ2V0UmFuZG9tVXNlcm5hbWVzKDQpLnRoZW4oKG5hbWVzKSA9PiB7XG4gICAgICAvLyBjb25zb2xlLmxvZygndXNlcm5hbWVzOicsIG5hbWVzKTtcbiAgICAgICRvdmVybGF5LnJlbW92ZUNsYXNzKCdsb2FkaW5nJykuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuICAgICAgJHNpZ251cC5yZW1vdmVDbGFzcygnaW52aXNpYmxlJyk7XG5cbiAgICAgICQoJyNzaWdudXAtbmFtZS1zZWxlY3QnKS5hcHBlbmQoYDxvcHRpb24gdmFsdWU9JHtuYW1lc1swXX0+JHtuYW1lc1swXX08L29wdGlvbj5gKTtcbiAgICAgICQoJyNzaWdudXAtbmFtZS1zZWxlY3QnKS5hcHBlbmQoYDxvcHRpb24gdmFsdWU9JHtuYW1lc1sxXX0+JHtuYW1lc1sxXX08L29wdGlvbj5gKTtcbiAgICAgICQoJyNzaWdudXAtbmFtZS1zZWxlY3QnKS5hcHBlbmQoYDxvcHRpb24gdmFsdWU9JHtuYW1lc1syXX0+JHtuYW1lc1syXX08L29wdGlvbj5gKTtcbiAgICAgICQoJyNzaWdudXAtbmFtZS1zZWxlY3QnKS5hcHBlbmQoYDxvcHRpb24gdmFsdWU9JHtuYW1lc1szXX0+JHtuYW1lc1szXX08L29wdGlvbj5gKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IHJhZGlvbG9naXN0ID0gJCgnaW5wdXRbbmFtZT1cImlzLXJhZGlvbG9naXN0XCJdJyk7XG4gICAgJChyYWRpb2xvZ2lzdCkuY2hhbmdlKCgpID0+IHtcbiAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IHJhZGlvbG9naXN0LmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2lzQ2hlY2tlZDonLCBpc0NoZWNrZWQpO1xuICAgICAgaWYoaXNDaGVja2VkKSB7XG4gICAgICAgIGNvbnN0IGlzUmFkaW9sb2dpc3QgPSAoJCgnaW5wdXRbbmFtZT1cImlzLXJhZGlvbG9naXN0XCJdOmNoZWNrZWQnKS52YWwoKSA9PT0gJ3llcycpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnaXNSYWRpb2xvZ2lzdDonLCBpc1JhZGlvbG9naXN0KTtcbiAgICAgICAgaWYoaXNSYWRpb2xvZ2lzdCl7XG4gICAgICAgICAgaWYoISQoJy5zcGVjaWFsaXR5JykuaGFzQ2xhc3MoJ2ludmlzaWJsZScpKXtcbiAgICAgICAgICAgICQoJy5zcGVjaWFsaXR5JykuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAkKCcueWVhcnMtb2YtZXhwZXJpZW5jZScpLnJlbW92ZUNsYXNzKCdpbnZpc2libGUnKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgaWYoISQoJy55ZWFycy1vZi1leHBlcmllbmNlJykuaGFzQ2xhc3MoJ2ludmlzaWJsZScpKXtcbiAgICAgICAgICAgICQoJy55ZWFycy1vZi1leHBlcmllbmNlJykuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAkKCcuc3BlY2lhbGl0eScpLnJlbW92ZUNsYXNzKCdpbnZpc2libGUnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAvLyAkKCdpbnB1dFtuYW1lPVwieWVhcnMtb2YtZXhwZXJpZW5jZVwiXScpLmZvY3VzKGZ1bmN0aW9uKCkge1xuICAgIC8vICAgY29uc29sZS5sb2coJ3llYXJzIG9mIGV4cCcpO1xuICAgIC8vICAgaWYoISQoJy5zaWduIC5lcnJvcicpLmhhc0NsYXNzKCdpbnZpc2libGUnKSl7XG4gICAgLy8gICAgICQoJy5zaWduIC5lcnJvcicpLnRleHQoJycpO1xuICAgIC8vICAgICAkKCcuc2lnbiAuZXJyb3InKS5hZGRDbGFzcygnaW52aXNpYmxlJyk7XG4gICAgLy8gICB9XG4gICAgLy8gfSk7XG5cbiAgICAkKCcuc2lnbiBmb3JtJykub2ZmKCdzdWJtaXQnKS5vbignc3VibWl0JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAkbG9hZGluZy5yZW1vdmVDbGFzcygnaW52aXNpYmxlJyk7XG4gICAgICAvLyAkKCcuc2lnbiAuZXJyb3InKS5hZGRDbGFzcygnaW52aXNpYmxlJyk7XG5cbiAgICAgIGNvbnN0IHVzZXJuYW1lID0gJCgnI3NpZ251cC1uYW1lLXNlbGVjdCBvcHRpb246c2VsZWN0ZWQnKS50ZXh0KCk7XG4gICAgICBMb2dpbi51c2VybmFtZSA9IHVzZXJuYW1lO1xuICAgICAgLy8gY29uc29sZS5sb2coJ3NpZ251cCBMb2dpbjonLCBMb2dpbik7XG4gICAgICAvLyBjb25zdCB1c2VybmFtZSA9ICQoJ2lucHV0W25hbWU9XCJ1c2VybmFtZVwiXScpLnZhbCgpO1xuICAgICAgLy8gY29uc3QgcGFzc3dvcmQgPSAkKCdpbnB1dFtuYW1lPVwicGFzc3dvcmRcIl0nKS52YWwoKTtcbiAgICAgIC8vIGNvbnN0IGNvbmZpcm1QYXNzd29yZCA9ICQoJ2lucHV0W25hbWU9XCJjb25maXJtLXBhc3N3b3JkXCJdJykudmFsKCk7XG4gICAgICBjb25zdCBpc1JhZGlvbG9naXN0ID0gKCQoJ2lucHV0W25hbWU9XCJpcy1yYWRpb2xvZ2lzdFwiXTpjaGVja2VkJykudmFsKCkgPT09ICd5ZXMnKTtcbiAgICAgIC8vIGNvbnN0IGlzQ2hlY2tlZCA9ICQoJ2lucHV0OnJhZGlvW25hbWU9XCJpcy1yYWRpb2xvZ2lzdFwiXScpLmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgLy8gY29uc3QgaXNSYWRpb2xvZ2lzdDIgPSAkKCcjcmFkaW9sb2dpc3Qtbm8nKS52YWwoKTtcbiAgICAgIGxldCB5ZWFyc09mRXhwZXJpZW5jZTtcbiAgICAgIGxldCBzcGVjaWFsaXR5O1xuICAgICAgbGV0IGFuYXRvbXlDaG9pY2VzID0gW107XG5cbiAgICAgIGlmKGlzUmFkaW9sb2dpc3Qpe1xuICAgICAgICB5ZWFyc09mRXhwZXJpZW5jZSA9ICQoJyNzaWdudXAteWVhcnMtb2YtZXhwZXJpZW5jZSBvcHRpb246c2VsZWN0ZWQnKS52YWwoKTtcbiAgICAgIH1lbHNle1xuICAgICAgICBzcGVjaWFsaXR5ID0gJCgnI3NpZ251cC1zcGVjaWFsaXR5IG9wdGlvbjpzZWxlY3RlZCcpLnZhbCgpO1xuICAgICAgfVxuXG4gICAgICAkKFwiI2FuYXRvbXktY2hvaWNlcyBpbnB1dDpjaGVja2JveFtuYW1lPWFuYXRvbXktY2hvaWNlXTpjaGVja2VkXCIpLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICBhbmF0b215Q2hvaWNlcy5wdXNoKCQodGhpcykudmFsKCkpO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGVtYWlsID0gJCgnI3NpZ251cC1lbWFpbCcpLnZhbCgpO1xuICAgICAgY29uc29sZS5sb2coJ2VtYWlsOicsIGVtYWlsKTtcblxuICAgICAgLy8gaWYoaXNSYWRpb2xvZ2lzdCAmJiBpc05hTih5ZWFyc09mRXhwZXJpZW5jZSkpe1xuICAgICAgLy8gICAgICQoJy5zaWduIC5lcnJvcicpLnJlbW92ZUNsYXNzKCdpbnZpc2libGUnKTtcbiAgICAgIC8vICAgICAkKCcuc2lnbiAuZXJyb3InKS50ZXh0KCdcIlllYXJzIG9mIGV4cHJpZW5jZVwiIG11c3QgYmUgYSBudW1iZXInKTtcbiAgICAgIC8vXG4gICAgICAvLyAgICAgJCgnaW5wdXRbbmFtZT1cInllYXJzLW9mLWV4cGVyaWVuY2VcIl0nKS52YWwoJycpO1xuICAgICAgLy9cbiAgICAgIC8vICAgICAkKCcjc2lnbnVwLWJ1dHRvbicpLmJsdXIoKTtcbiAgICAgIC8vXG4gICAgICAvLyAgICAgJGxvYWRpbmdJbWcuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuICAgICAgLy9cbiAgICAgIC8vICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAvLyB9XG5cbiAgICAgIC8vIHZhciB2YWx1ZXMgPSAkKHRoaXMpLnNlcmlhbGl6ZUFycmF5KCk7XG4gICAgICAvLyBjb25zb2xlLmxvZygndmFsdWVzJywgdmFsdWVzKTtcblxuICAgICAgLy8gaWYocGFzc3dvcmQgIT09IGNvbmZpcm1QYXNzd29yZCl7XG4gICAgICAvLyAgICQoJy5zaWduIC5lcnJvcicpLnJlbW92ZUNsYXNzKCdpbnZpc2libGUnKTtcbiAgICAgIC8vICAgJCgnLnNpZ24gLmVycm9yJykudGV4dCgnUGFzc3dvcmRzIGRvblxcJ3QgbWF0Y2gnKTtcbiAgICAgIC8vXG4gICAgICAvLyAgIGNvbnN0IHBhc3N3b3JkID0gJCgnI3NpZ251cC1wYXNzd29yZCcpLnZhbCgnJyk7XG4gICAgICAvLyAgIGNvbnN0IGNvbmZpcm1QYXNzd29yZCA9ICQoJyNzaWdudXAtY29uZmlybS1wYXNzd29yZCcpLnZhbCgnJyk7XG4gICAgICAvL1xuICAgICAgLy8gICAkKCcjc2lnbnVwLWJ1dHRvbicpLmJsdXIoKTtcbiAgICAgIC8vXG4gICAgICAvLyAgICRsb2FkaW5nSW1nLmFkZENsYXNzKCdpbnZpc2libGUnKTtcbiAgICAgIC8vXG4gICAgICAvLyB9XG4gICAgICB2YXIgY3JlYXRlRGF0ZSA9IERhdGUubm93KCk7XG4gICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICBfaWQ6IHVzZXJuYW1lLFxuICAgICAgICB1c2VybmFtZSxcbiAgICAgICAgLy8gcGFzc3dvcmQsXG4gICAgICAgIGlzUmFkaW9sb2dpc3QsXG4gICAgICAgIGFuYXRvbXlDaG9pY2VzLFxuICAgICAgICBjcmVhdGVEYXRlXG4gICAgICB9XG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3VzZXJuYW1lJywgdXNlcm5hbWUpO1xuXG4gICAgICBpZihzcGVjaWFsaXR5KXtcbiAgICAgICAgZGF0YS5zcGVjaWFsaXR5ID0gc3BlY2lhbGl0eTtcbiAgICAgIH1cblxuICAgICAgaWYoeWVhcnNPZkV4cGVyaWVuY2Upe1xuICAgICAgICBkYXRhLnllYXJzT2ZFeHBlcmllbmNlID0geWVhcnNPZkV4cGVyaWVuY2U7XG4gICAgICB9XG5cbiAgICAgIGlmKGVtYWlsKXtcbiAgICAgICAgZGF0YS5lbWFpbCA9IGVtYWlsO1xuICAgICAgfVxuXG4gICAgICBpZiAoYW5hdG9teUNob2ljZXMgJiYgYW5hdG9teUNob2ljZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBkYXRhLmFuYXRvbXlDaG9pY2VzID0gYW5hdG9teUNob2ljZXM7XG4gICAgICB9XG5cbiAgICAgIGFubm90YXRvcnNEQi5wdXQoZGF0YSkudGhlbigocmVzKSA9PiB7XG4gICAgICAgIExvZ2luLnVzZXIgPSBkYXRhO1xuICAgICAgICBjb25zb2xlLmxvZygnTG9naW4udXNlciBpczogJywgTG9naW4udXNlcik7XG4gICAgICAgICQoJyN1c2VybmFtZS1ib3R0b20tbGVmdCcpLnRleHQoTG9naW4udXNlcm5hbWUpO1xuICAgICAgICAkbG9hZGluZy5hZGRDbGFzcygnaW52aXNpYmxlJyk7XG4gICAgICAgICRzaWdudXAuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuXG4gICAgICAgIFZpZXdlci5pbml0Vmlld2VyKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBTaWdudXA7XG4iXX0=
},{"../db/db":14,"../login/login":17,"../viewer/viewer":26}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _menu = _interopRequireDefault(require("../menu/menu.js"));

var _viewer = _interopRequireDefault(require("../viewer/viewer.js"));

var _modal = _interopRequireDefault(require("../errorModal/modal.js"));

var _db = require("../db/db.js");

var _login = _interopRequireDefault(require("../login/login"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultWlPresets = {
  SoftTissue: {
    wc: 40,
    ww: 400
  },
  Lung: {
    wc: -600,
    ww: 1500
  },
  Liver: {
    wc: 90,
    ww: 150
  }
}; // helper from https://stackoverflow.com/questions/12168909/blob-from-dataurl

function dataURItoBlob(dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(',')[1]); // separate out the mime component

  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]; // write the bytes of the string to an ArrayBuffer

  var ab = new ArrayBuffer(byteString.length); // create a view into the buffer

  var ia = new Uint8Array(ab); // set the bytes of the buffer to the correct values

  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  } // write the ArrayBuffer to a blob, and you're done


  var blob = new Blob([ab], {
    type: mimeString
  });
  return blob;
}

var _default = {
  isMenuOpened: false,
  commandSelector: '.viewer-tools',
  $overlay: $('.loading-overlay'),
  $loadingText: $('.loading-overlay .content .submit-text'),
  $commandMenu: $('.commands-wrapper'),
  clearAll: function clearAll() {
    // Remove all imageId-specific measurements associated with this element
    cornerstoneTools.globalImageIdSpecificToolStateManager.restoreToolState({}); // Reset the viewport parameters (i.e. VOI LUT, scale, translation)

    cornerstone.reset(this.element);
  },
  skip: function skip() {
    var _this = this;

    this.$overlay.removeClass('invisible').addClass('loading');
    var stack = cornerstoneTools.getToolState(this.element, 'stack');
    (0, _db.getUUID)().then(function (uuid) {
      var sliceIndex = stack.data[0].currentImageIdIndex;
      var doc = {
        '_id': uuid,
        'skip': true,
        'annotator': _login.default.username,
        'seriesUID': window.rsnaCrowdQuantSeriesUID,
        'instanceUID': window.rsnaCrowdQuantCaseStudy.instanceUIDs[sliceIndex],
        'instanceURL': window.rsnaCrowdQuantCaseStudy.urls[sliceIndex],
        'sliceIndex': sliceIndex,
        'date': Math.floor(Date.now() / 1000),
        'userAgent': navigator.userAgent
      };
      return _db.measurementsDB.put(doc);
    });

    _viewer.default.getNextCase().then(function () {
      _this.$overlay.removeClass('loading').addClass('invisible');
    });
  },
  setWL: function setWL(windowWidth, windowCenter) {
    var viewport = cornerstone.getViewport(this.element);
    viewport.voi.windowWidth = windowWidth;
    viewport.voi.windowCenter = windowCenter;
    cornerstone.updateImage(this.element);
  },
  setWLPreset: function setWLPreset(presetName) {
    var preset = defaultWlPresets[presetName];
    this.setWL(preset.ww, preset.wc);
  },
  setWLPresetLung: function setWLPresetLung() {
    this.setWLPreset('Lung');
  },
  setWLPresetLiver: function setWLPresetLiver() {
    this.setWLPreset('Liver');
  },
  setWLPresetSoftTissue: function setWLPresetSoftTissue() {
    this.setWLPreset('SoftTissue');
  },
  toggleMoreMenu: function toggleMoreMenu() {
    var _this2 = this;

    if (this.isMenuOpened) {
      this.$commandMenu.removeClass('open');
      setTimeout(function () {
        _this2.$commandMenu.removeClass('border');
      }, 1100);
    } else {
      this.$commandMenu.addClass('open border');
    }

    this.isMenuOpened = !this.isMenuOpened;
  },
  save: function save() {
    var _this3 = this;

    this.$overlay.removeClass('invisible').addClass('loading');
    this.$loadingText.text('Submitting your measurement...'); // Retrieve the tool state manager for this element

    var toolStateManager = cornerstoneTools.globalImageIdSpecificToolStateManager; // Dump all of its tool state into an Object

    var toolState = toolStateManager.saveToolState(); // Get the stack tool data

    var stackData = cornerstoneTools.getToolState(this.element, 'stack');
    var stack = stackData.data[0]; // Retrieve the length data from this Object

    var lengthData = [];
    Object.keys(toolState).forEach(function (imageId) {
      if (!toolState[imageId]['length'] || !toolState[imageId]['length'].data.length) {
        return;
      }

      lengthData.push({
        imageIndex: stack.imageIds.indexOf(imageId),
        data: toolState[imageId].length
      });
    });

    if (!lengthData.length) {
      // console.log('ErrorModal', ErrorModal);
      _modal.default.show();

      this.$loadingText.text('');
      this.$overlay.removeClass('loading').addClass('invisible');
      return;
    }

    if (lengthData.length > 1) {
      throw new Error('Only one length measurement should be in the lengthData');
    }

    var savingPromise = new Promise(function (resolve, reject) {
      console.time('getUUID');
      (0, _db.getUUID)().then(function (uuid) {
        console.timeEnd('getUUID');
        console.time('PUT to Measurement DB');
        var measurement = lengthData[0];
        var lengthMeasurement = measurement.data.data[0];
        cornerstoneTools.scrollToIndex(_this3.element, measurement.imageIndex);
        var doc = {
          '_id': uuid,
          'length': lengthMeasurement.length,
          'start_x': lengthMeasurement.handles.start.x,
          'start_y': lengthMeasurement.handles.start.y,
          'end_x': lengthMeasurement.handles.end.x,
          'end_y': lengthMeasurement.handles.end.y,
          'windowWidth': lengthMeasurement.windowWidth,
          'windowCenter': lengthMeasurement.windowCenter,
          'scale': lengthMeasurement.scale,
          'translation_x': lengthMeasurement.translation.x,
          'translation_y': lengthMeasurement.translation.y,
          'annotator': _login.default.username,
          'seriesUID': window.rsnaCrowdQuantSeriesUID,
          'instanceUID': window.rsnaCrowdQuantCaseStudy.instanceUIDs[measurement.imageIndex],
          'instanceURL': window.rsnaCrowdQuantCaseStudy.urls[measurement.imageIndex],
          'sliceIndex': measurement.imageIndex,
          'date': Math.floor(Date.now() / 1000),
          'userAgent': navigator.userAgent
        };
        return _db.measurementsDB.put(doc);
      }).then(function (response) {
        console.timeEnd('PUT to Measurement DB');
        console.time('PUT putAttachment');
        var canvas = document.querySelector('#cornerstoneViewport canvas');
        var imageBlob = dataURItoBlob(canvas.toDataURL());
        return _db.measurementsDB.putAttachment(response.id, 'screenshot.png', response.rev, imageBlob, 'image/png');
      }).then(function () {
        console.timeEnd('PUT putAttachment');
        resolve();
      }).catch(function (error) {
        reject(error);
      });
    });

    _viewer.default.getNextCase().then(function () {
      _this3.$loadingText.text('');

      _this3.$overlay.removeClass('loading').addClass('invisible');
    });

    return savingPromise;
  },
  logout: function logout() {
    _login.default.logout();
  },
  initCommands: function initCommands() {
    var _this4 = this;

    $(this.commandSelector).off('click');
    $(this.commandSelector).on('click', 'div[data-command]', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var $element = $(event.currentTarget);
      var tool = $element.attr('data-command');

      _this4[tool]();

      $element.addClass('active');
      setTimeout(function () {
        $element.removeClass('active');
      }, 300);
    });
    $(document).off('click');
    $(document).on('click', function (event) {
      if (_this4.isMenuOpened) {
        _this4.toggleMoreMenu();
      }
    });
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1hbmRzLmpzIl0sIm5hbWVzIjpbImRlZmF1bHRXbFByZXNldHMiLCJTb2Z0VGlzc3VlIiwid2MiLCJ3dyIsIkx1bmciLCJMaXZlciIsImRhdGFVUkl0b0Jsb2IiLCJkYXRhVVJJIiwiYnl0ZVN0cmluZyIsImF0b2IiLCJzcGxpdCIsIm1pbWVTdHJpbmciLCJhYiIsIkFycmF5QnVmZmVyIiwibGVuZ3RoIiwiaWEiLCJVaW50OEFycmF5IiwiaSIsImNoYXJDb2RlQXQiLCJibG9iIiwiQmxvYiIsInR5cGUiLCJpc01lbnVPcGVuZWQiLCJjb21tYW5kU2VsZWN0b3IiLCIkb3ZlcmxheSIsIiQiLCIkbG9hZGluZ1RleHQiLCIkY29tbWFuZE1lbnUiLCJjbGVhckFsbCIsImNvcm5lcnN0b25lVG9vbHMiLCJnbG9iYWxJbWFnZUlkU3BlY2lmaWNUb29sU3RhdGVNYW5hZ2VyIiwicmVzdG9yZVRvb2xTdGF0ZSIsImNvcm5lcnN0b25lIiwicmVzZXQiLCJlbGVtZW50Iiwic2tpcCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJzdGFjayIsImdldFRvb2xTdGF0ZSIsInRoZW4iLCJ1dWlkIiwic2xpY2VJbmRleCIsImRhdGEiLCJjdXJyZW50SW1hZ2VJZEluZGV4IiwiZG9jIiwiTG9naW4iLCJ1c2VybmFtZSIsIndpbmRvdyIsInJzbmFDcm93ZFF1YW50U2VyaWVzVUlEIiwicnNuYUNyb3dkUXVhbnRDYXNlU3R1ZHkiLCJpbnN0YW5jZVVJRHMiLCJ1cmxzIiwiTWF0aCIsImZsb29yIiwiRGF0ZSIsIm5vdyIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsIm1lYXN1cmVtZW50c0RCIiwicHV0IiwiVmlld2VyIiwiZ2V0TmV4dENhc2UiLCJzZXRXTCIsIndpbmRvd1dpZHRoIiwid2luZG93Q2VudGVyIiwidmlld3BvcnQiLCJnZXRWaWV3cG9ydCIsInZvaSIsInVwZGF0ZUltYWdlIiwic2V0V0xQcmVzZXQiLCJwcmVzZXROYW1lIiwicHJlc2V0Iiwic2V0V0xQcmVzZXRMdW5nIiwic2V0V0xQcmVzZXRMaXZlciIsInNldFdMUHJlc2V0U29mdFRpc3N1ZSIsInRvZ2dsZU1vcmVNZW51Iiwic2V0VGltZW91dCIsInNhdmUiLCJ0ZXh0IiwidG9vbFN0YXRlTWFuYWdlciIsInRvb2xTdGF0ZSIsInNhdmVUb29sU3RhdGUiLCJzdGFja0RhdGEiLCJsZW5ndGhEYXRhIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJpbWFnZUlkIiwicHVzaCIsImltYWdlSW5kZXgiLCJpbWFnZUlkcyIsImluZGV4T2YiLCJFcnJvck1vZGFsIiwic2hvdyIsIkVycm9yIiwic2F2aW5nUHJvbWlzZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY29uc29sZSIsInRpbWUiLCJ0aW1lRW5kIiwibWVhc3VyZW1lbnQiLCJsZW5ndGhNZWFzdXJlbWVudCIsInNjcm9sbFRvSW5kZXgiLCJoYW5kbGVzIiwic3RhcnQiLCJ4IiwieSIsImVuZCIsInNjYWxlIiwidHJhbnNsYXRpb24iLCJyZXNwb25zZSIsImNhbnZhcyIsImRvY3VtZW50IiwicXVlcnlTZWxlY3RvciIsImltYWdlQmxvYiIsInRvRGF0YVVSTCIsInB1dEF0dGFjaG1lbnQiLCJpZCIsInJldiIsImNhdGNoIiwiZXJyb3IiLCJsb2dvdXQiLCJpbml0Q29tbWFuZHMiLCJvZmYiLCJvbiIsImV2ZW50IiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCIkZWxlbWVudCIsImN1cnJlbnRUYXJnZXQiLCJ0b29sIiwiYXR0ciJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOzs7O0FBRUEsSUFBTUEsZ0JBQWdCLEdBQUc7QUFDckJDLEVBQUFBLFVBQVUsRUFBRTtBQUNSQyxJQUFBQSxFQUFFLEVBQUUsRUFESTtBQUVSQyxJQUFBQSxFQUFFLEVBQUU7QUFGSSxHQURTO0FBS3JCQyxFQUFBQSxJQUFJLEVBQUU7QUFDRkYsSUFBQUEsRUFBRSxFQUFFLENBQUMsR0FESDtBQUVGQyxJ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Q0FBQyxLQUFLRixlQUFOLENBQUQsQ0FBd0J1RyxHQUF4QixDQUE0QixPQUE1QjtBQUNBckcsSUFBQUEsQ0FBQyxDQUFDLEtBQUtGLGVBQU4sQ0FBRCxDQUF3QndHLEVBQXhCLENBQTJCLE9BQTNCLEVBQW9DLG1CQUFwQyxFQUF5RCxVQUFBQyxLQUFLLEVBQUk7QUFDaEVBLE1BQUFBLEtBQUssQ0FBQ0MsY0FBTjtBQUNBRCxNQUFBQSxLQUFLLENBQUNFLGVBQU47QUFFQSxVQUFNQyxRQUFRLEdBQUcxRyxDQUFDLENBQUN1RyxLQUFLLENBQUNJLGFBQVAsQ0FBbEI7QUFDQSxVQUFNQyxJQUFJLEdBQUdGLFFBQVEsQ0FBQ0csSUFBVCxDQUFjLGNBQWQsQ0FBYjs7QUFFQSxNQUFBLE1BQUksQ0FBQ0QsSUFBRCxDQUFKOztBQUVBRixNQUFBQSxRQUFRLENBQUM5RixRQUFULENBQWtCLFFBQWxCO0FBRUF3QyxNQUFBQSxVQUFVLENBQUMsWUFBVztBQUNwQnNELFFBQUFBLFFBQVEsQ0FBQy9GLFdBQVQsQ0FBcUIsUUFBckI7QUFDRCxPQUZTLEVBRVAsR0FGTyxDQUFWO0FBR0QsS0FkRDtBQWdCQVgsSUFBQUEsQ0FBQyxDQUFDMEYsUUFBRCxDQUFELENBQVlXLEdBQVosQ0FBZ0IsT0FBaEI7QUFDQXJHLElBQUFBLENBQUMsQ0FBQzBGLFFBQUQsQ0FBRCxDQUFZWSxFQUFaLENBQWUsT0FBZixFQUF3QixVQUFBQyxLQUFLLEVBQUk7QUFDL0IsVUFBSSxNQUFJLENBQUMxRyxZQUFULEVBQXVCO0FBQ3JCLFFBQUEsTUFBSSxDQUFDc0QsY0FBTDtBQUNEO0FBQ0YsS0FKRDtBQUtEO0FBek1ZLEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTWVudSBmcm9tICcuLi9tZW51L21lbnUuanMnO1xuaW1wb3J0IFZpZXdlciBmcm9tICcuLi92aWV3ZXIvdmlld2VyLmpzJztcbmltcG9ydCBFcnJvck1vZGFsIGZyb20gJy4uL2Vycm9yTW9kYWwvbW9kYWwuanMnO1xuaW1wb3J0IHttZWFzdXJlbWVudHNEQiwgZ2V0VVVJRH0gZnJvbSAnLi4vZGIvZGIuanMnO1xuaW1wb3J0IExvZ2luIGZyb20gJy4uL2xvZ2luL2xvZ2luJztcblxuY29uc3QgZGVmYXVsdFdsUHJlc2V0cyA9IHtcbiAgICBTb2Z0VGlzc3VlOiB7XG4gICAgICAgIHdjOiA0MCxcbiAgICAgICAgd3c6IDQwMFxuICAgIH0sXG4gICAgTHVuZzoge1xuICAgICAgICB3YzogLTYwMCxcbiAgICAgICAgd3c6IDE1MDBcbiAgICB9LFxuICAgIExpdmVyOiB7XG4gICAgICAgIHdjOiA5MCxcbiAgICAgICAgd3c6IDE1MFxuICAgIH1cbn07XG5cbi8vIGhlbHBlciBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEyMTY4OTA5L2Jsb2ItZnJvbS1kYXRhdXJsXG5mdW5jdGlvbiBkYXRhVVJJdG9CbG9iKGRhdGFVUkkpIHtcbiAgLy8gY29udmVydCBiYXNlNjQgdG8gcmF3IGJpbmFyeSBkYXRhIGhlbGQgaW4gYSBzdHJpbmdcbiAgLy8gZG9lc24ndCBoYW5kbGUgVVJMRW5jb2RlZCBEYXRhVVJJcyAtIHNlZSBTTyBhbnN3ZXIgIzY4NTAyNzYgZm9yIGNvZGUgdGhhdCBkb2VzIHRoaXNcbiAgdmFyIGJ5dGVTdHJpbmcgPSBhdG9iKGRhdGFVUkkuc3BsaXQoJywnKVsxXSk7XG4gIC8vIHNlcGFyYXRlIG91dCB0aGUgbWltZSBjb21wb25lbnRcbiAgdmFyIG1pbWVTdHJpbmcgPSBkYXRhVVJJLnNwbGl0KCcsJylbMF0uc3BsaXQoJzonKVsxXS5zcGxpdCgnOycpWzBdXG4gIC8vIHdyaXRlIHRoZSBieXRlcyBvZiB0aGUgc3RyaW5nIHRvIGFuIEFycmF5QnVmZmVyXG4gIHZhciBhYiA9IG5ldyBBcnJheUJ1ZmZlcihieXRlU3RyaW5nLmxlbmd0aCk7XG4gIC8vIGNyZWF0ZSBhIHZpZXcgaW50byB0aGUgYnVmZmVyXG4gIHZhciBpYSA9IG5ldyBVaW50OEFycmF5KGFiKTtcbiAgLy8gc2V0IHRoZSBieXRlcyBvZiB0aGUgYnVmZmVyIHRvIHRoZSBjb3JyZWN0IHZhbHVlc1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVTdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICBpYVtpXSA9IGJ5dGVTdHJpbmcuY2hhckNvZGVBdChpKTtcbiAgfVxuICAvLyB3cml0ZSB0aGUgQXJyYXlCdWZmZXIgdG8gYSBibG9iLCBhbmQgeW91J3JlIGRvbmVcbiAgdmFyIGJsb2IgPSBuZXcgQmxvYihbYWJdLCB7dHlwZTogbWltZVN0cmluZ30pO1xuICByZXR1cm4gYmxvYjtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuICBpc01lbnVPcGVuZWQ6IGZhbHNlLFxuICBjb21tYW5kU2VsZWN0b3I6ICcudmlld2VyLXRvb2xzJyxcbiAgJG92ZXJsYXk6ICQoJy5sb2FkaW5nLW92ZXJsYXknKSxcbiAgJGxvYWRpbmdUZXh0OiAkKCcubG9hZGluZy1vdmVybGF5IC5jb250ZW50IC5zdWJtaXQtdGV4dCcpLFxuICAkY29tbWFuZE1lbnU6ICQoJy5jb21tYW5kcy13cmFwcGVyJyksXG5cbiAgY2xlYXJBbGwoKSB7XG4gICAgLy8gUmVtb3ZlIGFsbCBpbWFnZUlkLXNwZWNpZmljIG1lYXN1cmVtZW50cyBhc3NvY2lhdGVkIHdpdGggdGhpcyBlbGVtZW50XG4gICAgY29ybmVyc3RvbmVUb29scy5nbG9iYWxJbWFnZUlkU3BlY2lmaWNUb29sU3RhdGVNYW5hZ2VyLnJlc3RvcmVUb29sU3RhdGUoe30pO1xuXG4gICAgLy8gUmVzZXQgdGhlIHZpZXdwb3J0IHBhcmFtZXRlcnMgKGkuZS4gVk9JIExVVCwgc2NhbGUsIHRyYW5zbGF0aW9uKVxuICAgIGNvcm5lcnN0b25lLnJlc2V0KHRoaXMuZWxlbWVudCk7XG4gIH0sXG5cbiAgc2tpcDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy4kb3ZlcmxheS5yZW1vdmVDbGFzcygnaW52aXNpYmxlJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgIGNvbnN0IHN0YWNrID0gY29ybmVyc3RvbmVUb29scy5nZXRUb29sU3RhdGUodGhpcy5lbGVtZW50LCAnc3RhY2snKTtcblxuICAgIGdldFVVSUQoKS50aGVuKCh1dWlkKSA9PiB7XG4gICAgICBjb25zdCBzbGljZUluZGV4ID0gc3RhY2suZGF0YVswXS5jdXJyZW50SW1hZ2VJZEluZGV4O1xuICAgICAgY29uc3QgZG9jID0ge1xuICAgICAgICAnX2lkJzogdXVpZCxcbiAgICAgICAgJ3NraXAnOiB0cnVlLFxuICAgICAgICAnYW5ub3RhdG9yJzogTG9naW4udXNlcm5hbWUsXG4gICAgICAgICdzZXJpZXNVSUQnOiB3aW5kb3cucnNuYUNyb3dkUXVhbnRTZXJpZXNVSUQsXG4gICAgICAgICdpbnN0YW5jZVVJRCc6IHdpbmRvdy5yc25hQ3Jvd2RRdWFudENhc2VTdHVkeS5pbnN0YW5jZVVJRHNbc2xpY2VJbmRleF0sXG4gICAgICAgICdpbnN0YW5jZVVSTCc6IHdpbmRvdy5yc25hQ3Jvd2RRdWFudENhc2VTdHVkeS51cmxzW3NsaWNlSW5kZXhdLFxuICAgICAgICAnc2xpY2VJbmRleCc6IHNsaWNlSW5kZXgsXG4gICAgICAgICdkYXRlJzogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCksXG4gICAgICAgICd1c2VyQWdlbnQnOiBuYXZpZ2F0b3IudXNlckFnZW50XG4gICAgICB9O1xuICAgICAgcmV0dXJuIG1lYXN1cmVtZW50c0RCLnB1dChkb2MpO1xuICAgIH0pO1xuXG4gICAgVmlld2VyLmdldE5leHRDYXNlKCkudGhlbigoKSA9PiB7XG4gICAgICB0aGlzLiRvdmVybGF5LnJlbW92ZUNsYXNzKCdsb2FkaW5nJykuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuICAgIH0pO1xuICB9LFxuXG4gIHNldFdMOiBmdW5jdGlvbiAod2luZG93V2lkdGgsIHdpbmRvd0NlbnRlcikge1xuICAgIGNvbnN0IHZpZXdwb3J0ID0gY29ybmVyc3RvbmUuZ2V0Vmlld3BvcnQodGhpcy5lbGVtZW50KTtcblxuICAgIHZpZXdwb3J0LnZvaS53aW5kb3dXaWR0aCA9IHdpbmRvd1dpZHRoO1xuICAgIHZpZXdwb3J0LnZvaS53aW5kb3dDZW50ZXIgPSB3aW5kb3dDZW50ZXI7XG5cbiAgICBjb3JuZXJzdG9uZS51cGRhdGVJbWFnZSh0aGlzLmVsZW1lbnQpO1xuICB9LFxuXG4gIHNldFdMUHJlc2V0OiBmdW5jdGlvbihwcmVzZXROYW1lKSB7XG4gICAgY29uc3QgcHJlc2V0ID0gZGVmYXVsdFdsUHJlc2V0c1twcmVzZXROYW1lXVxuICAgIHRoaXMuc2V0V0wocHJlc2V0Lnd3LCBwcmVzZXQud2MpO1xuICB9LFxuXG4gIHNldFdMUHJlc2V0THVuZzogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRXTFByZXNldCgnTHVuZycpO1xuICB9LFxuXG4gIHNldFdMUHJlc2V0TGl2ZXI6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0V0xQcmVzZXQoJ0xpdmVyJyk7XG4gIH0sXG5cbiAgc2V0V0xQcmVzZXRTb2Z0VGlzc3VlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNldFdMUHJlc2V0KCdTb2Z0VGlzc3VlJyk7XG4gIH0sXG5cbiAgdG9nZ2xlTW9yZU1lbnU6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pc01lbnVPcGVuZWQpIHtcbiAgICAgIHRoaXMuJGNvbW1hbmRNZW51LnJlbW92ZUNsYXNzKCdvcGVuJyk7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy4kY29tbWFuZE1lbnUucmVtb3ZlQ2xhc3MoJ2JvcmRlcicpO1xuICAgICAgfSwgMTEwMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuJGNvbW1hbmRNZW51LmFkZENsYXNzKCdvcGVuIGJvcmRlcicpO1xuICAgIH1cblxuICAgIHRoaXMuaXNNZW51T3BlbmVkID0gIXRoaXMuaXNNZW51T3BlbmVkO1xuICB9LFxuXG4gIHNhdmU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiRvdmVybGF5LnJlbW92ZUNsYXNzKCdpbnZpc2libGUnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIHRoaXMuJGxvYWRpbmdUZXh0LnRleHQoJ1N1Ym1pdHRpbmcgeW91ciBtZWFzdXJlbWVudC4uLicpO1xuXG4gICAgLy8gUmV0cmlldmUgdGhlIHRvb2wgc3RhdGUgbWFuYWdlciBmb3IgdGhpcyBlbGVtZW50XG4gICAgY29uc3QgdG9vbFN0YXRlTWFuYWdlciA9IGNvcm5lcnN0b25lVG9vbHMuZ2xvYmFsSW1hZ2VJZFNwZWNpZmljVG9vbFN0YXRlTWFuYWdlcjtcblxuICAgIC8vIER1bXAgYWxsIG9mIGl0cyB0b29sIHN0YXRlIGludG8gYW4gT2JqZWN0XG4gICAgY29uc3QgdG9vbFN0YXRlID0gdG9vbFN0YXRlTWFuYWdlci5zYXZlVG9vbFN0YXRlKCk7XG5cbiAgICAvLyBHZXQgdGhlIHN0YWNrIHRvb2wgZGF0YVxuICAgIGNvbnN0IHN0YWNrRGF0YSA9IGNvcm5lcnN0b25lVG9vbHMuZ2V0VG9vbFN0YXRlKHRoaXMuZWxlbWVudCwgJ3N0YWNrJyk7XG4gICAgY29uc3Qgc3RhY2sgPSBzdGFja0RhdGEuZGF0YVswXTtcblxuICAgIC8vIFJldHJpZXZlIHRoZSBsZW5ndGggZGF0YSBmcm9tIHRoaXMgT2JqZWN0XG4gICAgbGV0IGxlbmd0aERhdGEgPSBbXTtcbiAgICBPYmplY3Qua2V5cyh0b29sU3RhdGUpLmZvckVhY2goaW1hZ2VJZCA9PiB7XG4gICAgICBpZiAoIXRvb2xTdGF0ZVtpbWFnZUlkXVsnbGVuZ3RoJ10gfHwgIXRvb2xTdGF0ZVtpbWFnZUlkXVsnbGVuZ3RoJ10uZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBsZW5ndGhEYXRhLnB1c2goe1xuICAgICAgICBpbWFnZUluZGV4OiBzdGFjay5pbWFnZUlkcy5pbmRleE9mKGltYWdlSWQpLFxuICAgICAgICBkYXRhOiB0b29sU3RhdGVbaW1hZ2VJZF0ubGVuZ3RoXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGlmICghbGVuZ3RoRGF0YS5sZW5ndGgpe1xuICAgICAgLy8gY29uc29sZS5sb2coJ0Vycm9yTW9kYWwnLCBFcnJvck1vZGFsKTtcbiAgICAgIEVycm9yTW9kYWwuc2hvdygpO1xuICAgICAgdGhpcy4kbG9hZGluZ1RleHQudGV4dCgnJyk7XG4gICAgICB0aGlzLiRvdmVybGF5LnJlbW92ZUNsYXNzKCdsb2FkaW5nJykuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChsZW5ndGhEYXRhLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT25seSBvbmUgbGVuZ3RoIG1lYXN1cmVtZW50IHNob3VsZCBiZSBpbiB0aGUgbGVuZ3RoRGF0YScpO1xuICAgIH1cblxuICAgIGNvbnN0IHNhdmluZ1Byb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zb2xlLnRpbWUoJ2dldFVVSUQnKTtcbiAgICAgIGdldFVVSUQoKS50aGVuKCh1dWlkKSA9PiB7XG4gICAgICAgIGNvbnNvbGUudGltZUVuZCgnZ2V0VVVJRCcpO1xuICAgICAgICBjb25zb2xlLnRpbWUoJ1BVVCB0byBNZWFzdXJlbWVudCBEQicpO1xuICAgICAgICBjb25zdCBtZWFzdXJlbWVudCA9IGxlbmd0aERhdGFbMF07XG4gICAgICAgIGNvbnN0IGxlbmd0aE1lYXN1cmVtZW50ID0gbWVhc3VyZW1lbnQuZGF0YS5kYXRhWzBdO1xuXG4gICAgICAgIGNvcm5lcnN0b25lVG9vbHMuc2Nyb2xsVG9JbmRleCh0aGlzLmVsZW1lbnQsIG1lYXN1cmVtZW50LmltYWdlSW5kZXgpO1xuXG4gICAgICAgIGNvbnN0IGRvYyA9IHtcbiAgICAgICAgICAnX2lkJzogdXVpZCxcbiAgICAgICAgICAnbGVuZ3RoJzogbGVuZ3RoTWVhc3VyZW1lbnQubGVuZ3RoLFxuICAgICAgICAgICdzdGFydF94JzogbGVuZ3RoTWVhc3VyZW1lbnQuaGFuZGxlcy5zdGFydC54LFxuICAgICAgICAgICdzdGFydF95JzogbGVuZ3RoTWVhc3VyZW1lbnQuaGFuZGxlcy5zdGFydC55LFxuICAgICAgICAgICdlbmRfeCc6IGxlbmd0aE1lYXN1cmVtZW50LmhhbmRsZXMuZW5kLngsXG4gICAgICAgICAgJ2VuZF95JzogbGVuZ3RoTWVhc3VyZW1lbnQuaGFuZGxlcy5lbmQueSxcbiAgICAgICAgICAnd2luZG93V2lkdGgnOiBsZW5ndGhNZWFzdXJlbWVudC53aW5kb3dXaWR0aCxcbiAgICAgICAgICAnd2luZG93Q2VudGVyJzogbGVuZ3RoTWVhc3VyZW1lbnQud2luZG93Q2VudGVyLFxuICAgICAgICAgICdzY2FsZSc6IGxlbmd0aE1lYXN1cmVtZW50LnNjYWxlLFxuICAgICAgICAgICd0cmFuc2xhdGlvbl94JzogbGVuZ3RoTWVhc3VyZW1lbnQudHJhbnNsYXRpb24ueCxcbiAgICAgICAgICAndHJhbnNsYXRpb25feSc6IGxlbmd0aE1lYXN1cmVtZW50LnRyYW5zbGF0aW9uLnksXG4gICAgICAgICAgJ2Fubm90YXRvcic6IExvZ2luLnVzZXJuYW1lLFxuICAgICAgICAgICdzZXJpZXNVSUQnOiB3aW5kb3cucnNuYUNyb3dkUXVhbnRTZXJpZXNVSUQsXG4gICAgICAgICAgJ2luc3RhbmNlVUlEJzogd2luZG93LnJzbmFDcm93ZFF1YW50Q2FzZVN0dWR5Lmluc3RhbmNlVUlEc1ttZWFzdXJlbWVudC5pbWFnZUluZGV4XSxcbiAgICAgICAgICAnaW5zdGFuY2VVUkwnOiB3aW5kb3cucnNuYUNyb3dkUXVhbnRDYXNlU3R1ZHkudXJsc1ttZWFzdXJlbWVudC5pbWFnZUluZGV4XSxcbiAgICAgICAgICAnc2xpY2VJbmRleCc6IG1lYXN1cmVtZW50LmltYWdlSW5kZXgsXG4gICAgICAgICAgJ2RhdGUnOiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSxcbiAgICAgICAgICAndXNlckFnZW50JzogbmF2aWdhdG9yLnVzZXJBZ2VudFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBtZWFzdXJlbWVudHNEQi5wdXQoZG9jKTtcbiAgICAgIH0pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGNvbnNvbGUudGltZUVuZCgnUFVUIHRvIE1lYXN1cmVtZW50IERCJyk7XG4gICAgICAgIGNvbnNvbGUudGltZSgnUFVUIHB1dEF0dGFjaG1lbnQnKTtcbiAgICAgICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2Nvcm5lcnN0b25lVmlld3BvcnQgY2FudmFzJyk7XG4gICAgICAgIGNvbnN0IGltYWdlQmxvYiA9IGRhdGFVUkl0b0Jsb2IoY2FudmFzLnRvRGF0YVVSTCgpKTtcbiAgICAgICAgcmV0dXJuIG1lYXN1cmVtZW50c0RCLnB1dEF0dGFjaG1lbnQocmVzcG9uc2UuaWQsICdzY3JlZW5zaG90LnBuZycsIHJlc3BvbnNlLnJldiwgaW1hZ2VCbG9iLCAnaW1hZ2UvcG5nJyk7XG4gICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgY29uc29sZS50aW1lRW5kKCdQVVQgcHV0QXR0YWNobWVudCcpO1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgcmVqZWN0KGVycm9yKVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBWaWV3ZXIuZ2V0TmV4dENhc2UoKS50aGVuKCgpID0+IHtcbiAgICAgIHRoaXMuJGxvYWRpbmdUZXh0LnRleHQoJycpO1xuICAgICAgdGhpcy4kb3ZlcmxheS5yZW1vdmVDbGFzcygnbG9hZGluZycpLmFkZENsYXNzKCdpbnZpc2libGUnKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBzYXZpbmdQcm9taXNlO1xuICB9LFxuXG4gIGxvZ291dCgpIHtcbiAgICBMb2dpbi5sb2dvdXQoKTtcbiAgfSxcblxuICBpbml0Q29tbWFuZHMoKSB7XG4gICAgJCh0aGlzLmNvbW1hbmRTZWxlY3Rvcikub2ZmKCdjbGljaycpO1xuICAgICQodGhpcy5jb21tYW5kU2VsZWN0b3IpLm9uKCdjbGljaycsICdkaXZbZGF0YS1jb21tYW5kXScsIGV2ZW50ID0+IHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICAgY29uc3QgJGVsZW1lbnQgPSAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpO1xuICAgICAgY29uc3QgdG9vbCA9ICRlbGVtZW50LmF0dHIoJ2RhdGEtY29tbWFuZCcpO1xuXG4gICAgICB0aGlzW3Rvb2xdKCk7XG5cbiAgICAgICRlbGVtZW50LmFkZENsYXNzKCdhY3RpdmUnKTtcblxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgJGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgfSwgMzAwKTtcbiAgICB9KTtcblxuICAgICQoZG9jdW1lbnQpLm9mZignY2xpY2snKTtcbiAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCBldmVudCA9PiB7XG4gICAgICBpZiAodGhpcy5pc01lbnVPcGVuZWQpIHtcbiAgICAgICAgdGhpcy50b2dnbGVNb3JlTWVudSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59O1xuIl19
},{"../db/db.js":14,"../errorModal/modal.js":15,"../login/login":17,"../menu/menu.js":18,"../viewer/viewer.js":26}],22:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var mockUrl = 'http://localhost:4000/mock.json';
var _default = {
  getCase: function getCase() {
    return new Promise(function (resolve, reject) {
      var successHandler = function successHandler(response) {
        resolve(response);
      };

      var errorHandler = function errorHandler(error) {
        if (error) {
          console.error(error);
        }

        reject(error);
      };

      $.ajax(mockUrl).then(successHandler, errorHandler);
    });
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbm5lY3Rvci5qcyJdLCJuYW1lcyI6WyJtb2NrVXJsIiwiZ2V0Q2FzZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwic3VjY2Vzc0hhbmRsZXIiLCJyZXNwb25zZSIsImVycm9ySGFuZGxlciIsImVycm9yIiwiY29uc29sZSIsIiQiLCJhamF4IiwidGhlbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBTUEsT0FBTyxHQUFHLGlDQUFoQjtlQUVlO0FBQ2JDLEVBQUFBLE9BRGEscUJBQ0g7QUFDUixXQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFVQyxPQUFWLEVBQW1CQyxNQUFuQixFQUEyQjtBQUM1QyxVQUFNQyxjQUFjLEdBQUcsU0FBakJBLGNBQWlCLENBQUNDLFFBQUQsRUFBYztBQUNuQ0gsUUFBQUEsT0FBTyxDQUFDRyxRQUFELENBQVA7QUFDRCxPQUZEOztBQUdBLFVBQU1DLFlBQVksR0FBRyxTQUFmQSxZQUFlLENBQUNDLEtBQUQsRUFBVztBQUM5QixZQUFJQSxLQUFKLEVBQVc7QUFDVEMsVUFBQUEsT0FBTyxDQUFDRCxLQUFSLENBQWNBLEtBQWQ7QUFDRDs7QUFFREosUUFBQUEsTUFBTSxDQUFDSSxLQUFELENBQU47QUFDRCxPQU5EOztBQVFBRSxNQUFBQSxDQUFDLENBQUNDLElBQUYsQ0FBT1gsT0FBUCxFQUFnQlksSUFBaEIsQ0FBcUJQLGNBQXJCLEVBQXFDRSxZQUFyQztBQUNELEtBYk0sQ0FBUDtBQWNEO0FBaEJZLEMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBtb2NrVXJsID0gJ2h0dHA6Ly9sb2NhbGhvc3Q6NDAwMC9tb2NrLmpzb24nO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGdldENhc2UoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGNvbnN0IHN1Y2Nlc3NIYW5kbGVyID0gKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIHJlc29sdmUocmVzcG9uc2UpO1xuICAgICAgfTtcbiAgICAgIGNvbnN0IGVycm9ySGFuZGxlciA9IChlcnJvcikgPT4ge1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICB9O1xuXG4gICAgICAkLmFqYXgobW9ja1VybCkudGhlbihzdWNjZXNzSGFuZGxlciwgZXJyb3JIYW5kbGVyKTtcbiAgICB9KTtcbiAgfVxufTtcbiJdfQ==
},{}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

function _default(action, timeWindow) {
  var timeout;
  return function () {
    var _this = this,
        _arguments = arguments;

    clearTimeout(timeout);
    timeout = setTimeout(function () {
      return action.apply(_this, _arguments);
    }, timeWindow);
  };
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRlYm91bmNlLmpzIl0sIm5hbWVzIjpbImFjdGlvbiIsInRpbWVXaW5kb3ciLCJ0aW1lb3V0IiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImFwcGx5IiwiYXJndW1lbnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQWUsa0JBQVVBLE1BQVYsRUFBa0JDLFVBQWxCLEVBQThCO0FBQzNDLE1BQUlDLE9BQUo7QUFFQSxTQUFPLFlBQVc7QUFBQTtBQUFBOztBQUNoQkMsSUFBQUEsWUFBWSxDQUFDRCxPQUFELENBQVo7QUFDQUEsSUFBQUEsT0FBTyxHQUFHRSxVQUFVLENBQUM7QUFBQSxhQUFNSixNQUFNLENBQUNLLEtBQVAsQ0FBYSxLQUFiLEVBQW1CQyxVQUFuQixDQUFOO0FBQUEsS0FBRCxFQUFzQ0wsVUFBdEMsQ0FBcEI7QUFDRCxHQUhEO0FBSUQiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYWN0aW9uLCB0aW1lV2luZG93KSB7XG4gIGxldCB0aW1lb3V0O1xuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gYWN0aW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyksIHRpbWVXaW5kb3cpO1xuICB9O1xufSJdfQ==
},{}],24:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _connector = _interopRequireDefault(require("./connector"));

var _login = _interopRequireDefault(require("../login/login"));

var _db = require("../db/db");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var _default = {
  getCaseImages: function getCaseImages() {
    var $overlay = $('.loading-overlay');
    $overlay.addClass('loading');
    $overlay.removeClass('invisible');
    return this.getChronicleImageIDs().then(function (caseStudy) {
      if (!caseStudy || !caseStudy.urls) {
        throw new Error('No case study or no URLs provided');
      } // where to store the case id for access during save?
      // I don't understand the model hierarchy, so let's stick it on the window


      window.rsnaCrowdQuantSeriesUID = caseStudy.seriesUID;
      window.rsnaCrowdQuantCaseStudy = caseStudy;
      return caseStudy.urls.map(function (url) {
        return url.replace('http', 'wadouri');
      });
    });
  },
  currentSeriesIndex: undefined,
  seriesUID_A: undefined,
  getChronicleImageIDs: function getChronicleImageIDs() {
    var _this = this;

    var allCases; // this could be cached

    var userCases; // filtered to user's anatChoices

    return Promise.resolve('1.3.6.1.4.1.14519.5.2.1.7695.4007.290560597213035590678005726868').then(function (seriesUID) {
      if (!_this.currentSeriesIndex) {
        _this.currentSeriesIndex = 0;
      }

      _this.currentSeriesIndex++;
      console.log('series Index:', _this.currentSeriesIndex); //const key = data.rows[this.currentSeriesIndex].key;
      // if(currentSeriesIndex >= data.rows.length){
      //   currentSeriesIndex=0;
      // }

      _this.seriesUID_A = seriesUID;
      console.log('series UID:', seriesUID);

      if (seriesUID === undefined) {
        alert('Congratulations - you have looked at all the series');
        window.location.reload();
      }

      return _db.chronicleDB.query("instances/seriesInstances", {
        startkey: seriesUID,
        endkey: seriesUID + "\u9999",
        stale: 'update_after',
        reduce: false
      });
    }).then(function (data) {
      // console.log('instance data:', data);
      var instanceUIDs = [];
      data.rows.forEach(function (row) {
        var instanceUID = row.value[1];
        instanceUIDs.push(instanceUID);
      });
      console.time('Metadata Retrieval from Chronicle DB'); // TODO: Switch to some study or series-level call
      // It is quite slow to wait on metadata for every single image
      // each retrieved in separate calls

      return Promise.all(instanceUIDs.map(function (uid) {
        return _db.chronicleDB.get(uid);
      }));
    }).then(function (docs) {
      console.timeEnd('Metadata Retrieval from Chronicle DB');
      var instanceNumberTag = "00200013";
      var instanceUIDsByImageNumber = {};
      docs.forEach(function (doc) {
        var imageNumber = Number(doc.dataset[instanceNumberTag].Value);
        instanceUIDsByImageNumber[imageNumber] = doc._id;
      });
      var imageNumbers = Object.keys(instanceUIDsByImageNumber);
      imageNumbers.sort(function (a, b) {
        return a - b;
      });
      var instanceURLs = [];
      var instanceUIDs = [];
      imageNumbers.forEach(function (imageNumber) {
        var instanceUID = instanceUIDsByImageNumber[imageNumber];
        var instanceURL = "".concat(_db.chronicleURL, "/").concat(instanceUID, "/object.dcm");
        instanceURLs.push(instanceURL);
        instanceUIDs.push(instanceUID);
      });
      return {
        name: "default_case",
        seriesUID: _this.seriesUID_A,
        currentSeriesIndex: _this.currentSeriesIndex - 1,
        urls: instanceURLs,
        instanceUIDs: instanceUIDs
      };
    }).catch(function (err) {
      throw err;
    });
  },
  getNextSeriesForAnnotator: function getNextSeriesForAnnotator(annotatorID, cases) {
    // filter cases by annotator's anatomyChoices
    var measurementsPerSeries = {};
    var annotatorMeasuredSeries = {};
    var seriesUIDs = cases.map(function (c) {
      return c.key[0];
    }); // first, get list of all series (this should be factored out to be global and only queried once)
    // result.rows.forEach(row => {
    //   seriesUIDs.push(row.key[2][2]);
    // });
    // then get the list of all measurements per series and how many measurements
    // (not all series will have been measured)

    return _db.measurementsDB.query('by/seriesUIDNoSkip', {
      reduce: true,
      group: true,
      level: 'exact'
    }).then(function (result) {
      result.rows.forEach(function (row) {
        measurementsPerSeries[row.key] = row.value;
      });
      return _db.measurementsDB.query('by/annotators', {
        reduce: false,
        include_docs: true,
        start_key: annotatorID,
        end_key: annotatorID
      });
    }).then(function (result) {
      // todo- remove duplication! store on a utils object? or the Login?
      var categoryIdToLabelMap = {
        'TCGA-LUAD': 'Lung',
        'TCGA-LIHC': 'Liver',
        'TCGA_RN': 'Renal',
        'TCGA_OV': 'Ovarian'
      };
      result.rows.forEach(function (row) {
        annotatorMeasuredSeries[row.doc.seriesUID] = true;
      }); // now reconcile the data
      // - look through each available series
      // -- if nobody has measured it then use it
      // - if the user already measured it, ignore it
      // - otherwise find the least measured one

      var leastMeasured = {
        seriesUID: undefined,
        measurementCount: Number.MAX_SAFE_INTEGER
      };
      var caseDetails;

      var _loop = function _loop(seriesIndex) {
        var seriesUID = seriesUIDs[seriesIndex];

        if (!(seriesUID in measurementsPerSeries)) {
          caseDetails = cases.find(function (c) {
            return c.key[0] === seriesUID;
          }).key;
          console.log('Next Case Category:', caseDetails);
          $('#patient-id-upper-right').text(caseDetails[2]);
          $('#category-upper-right').text(categoryIdToLabelMap[caseDetails[1]]);
          return {
            v: seriesUID
          };
        }

        if (!(seriesUID in annotatorMeasuredSeries) && measurementsPerSeries[seriesUID] < leastMeasured.measurementCount) {
          leastMeasured.seriesUID = seriesUID;
          leastMeasured.measurementCount = measurementsPerSeries[seriesUID];
        }
      };

      for (var seriesIndex = 0; seriesIndex < seriesUIDs.length; seriesIndex++) {
        var _ret = _loop(seriesIndex);

        if (_typeof(_ret) === "object") return _ret.v;
      }

      caseDetails = cases.find(function (c) {
        return c.key[0] === leastMeasured.seriesUID;
      }).key;
      console.log('Next Case Category:', caseDetails);
      $('#patient-id-upper-right').text(caseDetails[2]);
      $('#category-upper-right').text(categoryIdToLabelMap[caseDetails[1]]);
      return leastMeasured.seriesUID;
    });
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGVzLmpzIl0sIm5hbWVzIjpbImdldENhc2VJbWFnZXMiLCIkb3ZlcmxheSIsIiQiLCJhZGRDbGFzcyIsInJlbW92ZUNsYXNzIiwiZ2V0Q2hyb25pY2xlSW1hZ2VJRHMiLCJ0aGVuIiwiY2FzZVN0dWR5IiwidXJscyIsIkVycm9yIiwid2luZG93IiwicnNuYUNyb3dkUXVhbnRTZXJpZXNVSUQiLCJzZXJpZXNVSUQiLCJyc25hQ3Jvd2RRdWFudENhc2VTdHVkeSIsIm1hcCIsInVybCIsInJlcGxhY2UiLCJjdXJyZW50U2VyaWVzSW5kZXgiLCJ1bmRlZmluZWQiLCJzZXJpZXNVSURfQSIsImFsbENhc2VzIiwidXNlckNhc2VzIiwiUHJvbWlzZSIsInJlc29sdmUiLCJjb25zb2xlIiwibG9nIiwiYWxlcnQiLCJsb2NhdGlvbiIsInJlbG9hZCIsImNocm9uaWNsZURCIiwicXVlcnkiLCJzdGFydGtleSIsImVuZGtleSIsInN0YWxlIiwicmVkdWNlIiwiZGF0YSIsImluc3RhbmNlVUlEcyIsInJvd3MiLCJmb3JFYWNoIiwicm93IiwiaW5zdGFuY2VVSUQiLCJ2YWx1ZSIsInB1c2giLCJ0aW1lIiwiYWxsIiwidWlkIiwiZ2V0IiwiZG9jcyIsInRpbWVFbmQiLCJpbnN0YW5jZU51bWJlclRhZyIsImluc3RhbmNlVUlEc0J5SW1hZ2VOdW1iZXIiLCJkb2MiLCJpbWFnZU51bWJlciIsIk51bWJlciIsImRhdGFzZXQiLCJWYWx1ZSIsIl9pZCIsImltYWdlTnVtYmVycyIsIk9iamVjdCIsImtleXMiLCJzb3J0IiwiYSIsImIiLCJpbnN0YW5jZVVSTHMiLCJpbnN0YW5jZVVSTCIsImNocm9uaWNsZVVSTCIsIm5hbWUiLCJjYXRjaCIsImVyciIsImdldE5leHRTZXJpZXNGb3JBbm5vdGF0b3IiLCJhbm5vdGF0b3JJRCIsImNhc2VzIiwibWVhc3VyZW1lbnRzUGVyU2VyaWVzIiwiYW5ub3RhdG9yTWVhc3VyZWRTZXJpZXMiLCJzZXJpZXNVSURzIiwiYyIsImtleSIsIm1lYXN1cmVtZW50c0RCIiwiZ3JvdXAiLCJsZXZlbCIsInJlc3VsdCIsImluY2x1ZGVfZG9jcyIsInN0YXJ0X2tleSIsImVuZF9rZXkiLCJjYXRlZ29yeUlkVG9MYWJlbE1hcCIsImxlYXN0TWVhc3VyZWQiLCJtZWFzdXJlbWVudENvdW50IiwiTUFYX1NBRkVfSU5URUdFUiIsImNhc2VEZXRhaWxzIiwic2VyaWVzSW5kZXgiLCJmaW5kIiwidGV4dCIsImxlbmd0aCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUNBOzs7Ozs7ZUFFZTtBQUNiQSxFQUFBQSxhQURhLDJCQUNHO0FBQ2QsUUFBTUMsUUFBUSxHQUFHQyxDQUFDLENBQUMsa0JBQUQsQ0FBbEI7QUFDQUQsSUFBQUEsUUFBUSxDQUFDRSxRQUFULENBQWtCLFNBQWxCO0FBQ0FGLElBQUFBLFFBQVEsQ0FBQ0csV0FBVCxDQUFxQixXQUFyQjtBQUVBLFdBQU8sS0FBS0Msb0JBQUwsR0FBNEJDLElBQTVCLENBQWlDLFVBQUNDLFNBQUQsRUFBZTtBQUNyRCxVQUFJLENBQUNBLFNBQUQsSUFBYyxDQUFDQSxTQUFTLENBQUNDLElBQTdCLEVBQW1DO0FBQ2pDLGNBQU0sSUFBSUMsS0FBSixDQUFVLG1DQUFWLENBQU47QUFDRCxPQUhvRCxDQUtyRDtBQUNBOzs7QUFDQUMsTUFBQUEsTUFBTSxDQUFDQyx1QkFBUCxHQUFpQ0osU0FBUyxDQUFDSyxTQUEzQztBQUNBRixNQUFBQSxNQUFNLENBQUNHLHVCQUFQLEdBQWlDTixTQUFqQztBQUVBLGFBQU9BLFNBQVMsQ0FBQ0MsSUFBVixDQUFlTSxHQUFmLENBQW1CLFVBQUFDLEdBQUc7QUFBQSxlQUFJQSxHQUFHLENBQUNDLE9BQUosQ0FBWSxNQUFaLEVBQW9CLFNBQXBCLENBQUo7QUFBQSxPQUF0QixDQUFQO0FBQ0QsS0FYTSxDQUFQO0FBWUQsR0FsQlk7QUFvQmJDLEVBQUFBLGtCQUFrQixFQUFFQyxTQXBCUDtBQXFCYkMsRUFBQUEsV0FBVyxFQUFFRCxTQXJCQTtBQXVCYmIsRUFBQUEsb0JBdkJh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cEQsTUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVkscUJBQVosRUFBbUMrRCxXQUFuQztBQUNBdEYsTUFBQUEsQ0FBQyxDQUFDLHlCQUFELENBQUQsQ0FBNkJ5RixJQUE3QixDQUFrQ0gsV0FBVyxDQUFDLENBQUQsQ0FBN0M7QUFDQXRGLE1BQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCeUYsSUFBM0IsQ0FBZ0NQLG9CQUFvQixDQUFDSSxXQUFXLENBQUMsQ0FBRCxDQUFaLENBQXBEO0FBQ0EsYUFBT0gsYUFBYSxDQUFDekUsU0FBckI7QUFDRCxLQTNETSxDQUFQO0FBNEREO0FBcExZLEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ29ubmVjdG9yIGZyb20gJy4vY29ubmVjdG9yJztcbmltcG9ydCBMb2dpbiBmcm9tICcuLi9sb2dpbi9sb2dpbic7XG5pbXBvcnQge2Nocm9uaWNsZVVSTCwgY2hyb25pY2xlREIsIG1lYXN1cmVtZW50c0RCfSBmcm9tICcuLi9kYi9kYic7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgZ2V0Q2FzZUltYWdlcygpIHtcbiAgICBjb25zdCAkb3ZlcmxheSA9ICQoJy5sb2FkaW5nLW92ZXJsYXknKTtcbiAgICAkb3ZlcmxheS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICRvdmVybGF5LnJlbW92ZUNsYXNzKCdpbnZpc2libGUnKTtcblxuICAgIHJldHVybiB0aGlzLmdldENocm9uaWNsZUltYWdlSURzKCkudGhlbigoY2FzZVN0dWR5KSA9PiB7XG4gICAgICBpZiAoIWNhc2VTdHVkeSB8fCAhY2FzZVN0dWR5LnVybHMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBjYXNlIHN0dWR5IG9yIG5vIFVSTHMgcHJvdmlkZWQnKTtcbiAgICAgIH1cblxuICAgICAgLy8gd2hlcmUgdG8gc3RvcmUgdGhlIGNhc2UgaWQgZm9yIGFjY2VzcyBkdXJpbmcgc2F2ZT9cbiAgICAgIC8vIEkgZG9uJ3QgdW5kZXJzdGFuZCB0aGUgbW9kZWwgaGllcmFyY2h5LCBzbyBsZXQncyBzdGljayBpdCBvbiB0aGUgd2luZG93XG4gICAgICB3aW5kb3cucnNuYUNyb3dkUXVhbnRTZXJpZXNVSUQgPSBjYXNlU3R1ZHkuc2VyaWVzVUlEO1xuICAgICAgd2luZG93LnJzbmFDcm93ZFF1YW50Q2FzZVN0dWR5ID0gY2FzZVN0dWR5O1xuXG4gICAgICByZXR1cm4gY2FzZVN0dWR5LnVybHMubWFwKHVybCA9PiB1cmwucmVwbGFjZSgnaHR0cCcsICd3YWRvdXJpJykpO1xuICAgIH0pO1xuICB9LFxuXG4gIGN1cnJlbnRTZXJpZXNJbmRleDogdW5kZWZpbmVkLFxuICBzZXJpZXNVSURfQTogdW5kZWZpbmVkLFxuXG4gIGdldENocm9uaWNsZUltYWdlSURzICgpIHtcblxuICAgIHZhciBhbGxDYXNlczsgLy8gdGhpcyBjb3VsZCBiZSBjYWNoZWRcbiAgICB2YXIgdXNlckNhc2VzOyAvLyBmaWx0ZXJlZCB0byB1c2VyJ3MgYW5hdENob2ljZXNcblxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoJzEuMy42LjEuNC4xLjE0NTE5LjUuMi4xLjc2OTUuNDAwNy4yOTA1NjA1OTcyMTMwMzU1OTA2NzgwMDU3MjY4NjgnKS50aGVuICgoc2VyaWVzVUlEKSA9PiB7XG5cbiAgICAgIGlmKCF0aGlzLmN1cnJlbnRTZXJpZXNJbmRleCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRTZXJpZXNJbmRleCA9IDA7XG4gICAgICB9XG4gICAgICB0aGlzLmN1cnJlbnRTZXJpZXNJbmRleCsrO1xuICAgICAgY29uc29sZS5sb2coJ3NlcmllcyBJbmRleDonLCB0aGlzLmN1cnJlbnRTZXJpZXNJbmRleCk7XG5cbiAgICAgIC8vY29uc3Qga2V5ID0gZGF0YS5yb3dzW3RoaXMuY3VycmVudFNlcmllc0luZGV4XS5rZXk7XG5cbiAgICAgIC8vIGlmKGN1cnJlbnRTZXJpZXNJbmRleCA+PSBkYXRhLnJvd3MubGVuZ3RoKXtcbiAgICAgIC8vICAgY3VycmVudFNlcmllc0luZGV4PTA7XG4gICAgICAvLyB9XG5cbiAgICAgIHRoaXMuc2VyaWVzVUlEX0EgPSBzZXJpZXNVSUQ7XG4gICAgICBjb25zb2xlLmxvZygnc2VyaWVzIFVJRDonLCBzZXJpZXNVSUQpO1xuXG4gICAgICBpZiAoc2VyaWVzVUlEID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYWxlcnQoJ0NvbmdyYXR1bGF0aW9ucyAtIHlvdSBoYXZlIGxvb2tlZCBhdCBhbGwgdGhlIHNlcmllcycpO1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjaHJvbmljbGVEQi5xdWVyeShcImluc3RhbmNlcy9zZXJpZXNJbnN0YW5jZXNcIiwge1xuICAgICAgICBzdGFydGtleSA6IHNlcmllc1VJRCxcbiAgICAgICAgZW5ka2V5IDogc2VyaWVzVUlEICsgJ1xcdTk5OTknLFxuICAgICAgICBzdGFsZSA6ICd1cGRhdGVfYWZ0ZXInLFxuICAgICAgICByZWR1Y2UgOiBmYWxzZSxcbiAgICAgIH0pO1xuICAgIH0pLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdpbnN0YW5jZSBkYXRhOicsIGRhdGEpO1xuICAgICAgY29uc3QgaW5zdGFuY2VVSURzID0gW107XG4gICAgICBkYXRhLnJvd3MuZm9yRWFjaCgocm93KSA9PiB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlVUlEID0gcm93LnZhbHVlWzFdO1xuICAgICAgICBpbnN0YW5jZVVJRHMucHVzaChpbnN0YW5jZVVJRCk7XG4gICAgICB9KTtcblxuICAgICAgY29uc29sZS50aW1lKCdNZXRhZGF0YSBSZXRyaWV2YWwgZnJvbSBDaHJvbmljbGUgREInKTtcbiAgICAgIC8vIFRPRE86IFN3aXRjaCB0byBzb21lIHN0dWR5IG9yIHNlcmllcy1sZXZlbCBjYWxsXG4gICAgICAvLyBJdCBpcyBxdWl0ZSBzbG93IHRvIHdhaXQgb24gbWV0YWRhdGEgZm9yIGV2ZXJ5IHNpbmdsZSBpbWFnZVxuICAgICAgLy8gZWFjaCByZXRyaWV2ZWQgaW4gc2VwYXJhdGUgY2FsbHNcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChpbnN0YW5jZVVJRHMubWFwKCh1aWQpID0+IHtcbiAgICAgICAgcmV0dXJuIGNocm9uaWNsZURCLmdldCh1aWQpO1xuICAgICAgfSkpO1xuICAgIH0pLnRoZW4oKGRvY3MpID0+IHtcbiAgICAgIGNvbnNvbGUudGltZUVuZCgnTWV0YWRhdGEgUmV0cmlldmFsIGZyb20gQ2hyb25pY2xlIERCJyk7XG4gICAgICBjb25zdCBpbnN0YW5jZU51bWJlclRhZyA9IFwiMDAyMDAwMTNcIjtcbiAgICAgIGxldCBpbnN0YW5jZVVJRHNCeUltYWdlTnVtYmVyID0ge307XG4gICAgICBkb2NzLmZvckVhY2goKGRvYykgPT4ge1xuICAgICAgICBjb25zdCBpbWFnZU51bWJlciA9IE51bWJlcihkb2MuZGF0YXNldFtpbnN0YW5jZU51bWJlclRhZ10uVmFsdWUpO1xuICAgICAgICBpbnN0YW5jZVVJRHNCeUltYWdlTnVtYmVyW2ltYWdlTnVtYmVyXSA9IGRvYy5faWQ7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgaW1hZ2VOdW1iZXJzID0gT2JqZWN0LmtleXMoaW5zdGFuY2VVSURzQnlJbWFnZU51bWJlcik7XG4gICAgICBpbWFnZU51bWJlcnMuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuXG4gICAgICBsZXQgaW5zdGFuY2VVUkxzID0gW107XG4gICAgICBsZXQgaW5zdGFuY2VVSURzID0gW107XG4gICAgICBpbWFnZU51bWJlcnMuZm9yRWFjaCgoaW1hZ2VOdW1iZXIpID0+IHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2VVSUQgPSBpbnN0YW5jZVVJRHNCeUltYWdlTnVtYmVyW2ltYWdlTnVtYmVyXTtcbiAgICAgICAgY29uc3QgaW5zdGFuY2VVUkwgPSBgJHtjaHJvbmljbGVVUkx9LyR7aW5zdGFuY2VVSUR9L29iamVjdC5kY21gO1xuICAgICAgICBpbnN0YW5jZVVSTHMucHVzaChpbnN0YW5jZVVSTCk7XG4gICAgICAgIGluc3RhbmNlVUlEcy5wdXNoKGluc3RhbmNlVUlEKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBcImRlZmF1bHRfY2FzZVwiLFxuICAgICAgICBzZXJpZXNVSUQ6IHRoaXMuc2VyaWVzVUlEX0EsXG4gICAgICAgIGN1cnJlbnRTZXJpZXNJbmRleDogdGhpcy5jdXJyZW50U2VyaWVzSW5kZXggLSAxLFxuICAgICAgICB1cmxzOiBpbnN0YW5jZVVSTHMsXG4gICAgICAgIGluc3RhbmNlVUlEc1xuICAgICAgfTtcbiAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfSk7XG4gIH0sXG5cbiAgZ2V0TmV4dFNlcmllc0ZvckFubm90YXRvcihhbm5vdGF0b3JJRCwgY2FzZXMpIHtcblxuICAgIC8vIGZpbHRlciBjYXNlcyBieSBhbm5vdGF0b3IncyBhbmF0b215Q2hvaWNlc1xuXG5cbiAgICBsZXQgbWVhc3VyZW1lbnRzUGVyU2VyaWVzID0ge307XG4gICAgbGV0IGFubm90YXRvck1lYXN1cmVkU2VyaWVzID0ge307XG4gICAgbGV0IHNlcmllc1VJRHMgPSBjYXNlcy5tYXAoYyA9PiB7IHJldHVybiBjLmtleVswXSB9KTtcblxuICAgIC8vIGZpcnN0LCBnZXQgbGlzdCBvZiBhbGwgc2VyaWVzICh0aGlzIHNob3VsZCBiZSBmYWN0b3JlZCBvdXQgdG8gYmUgZ2xvYmFsIGFuZCBvbmx5IHF1ZXJpZWQgb25jZSlcbiAgICAvLyByZXN1bHQucm93cy5mb3JFYWNoKHJvdyA9PiB7XG4gICAgLy8gICBzZXJpZXNVSURzLnB1c2gocm93LmtleVsyXVsyXSk7XG4gICAgLy8gfSk7XG5cbiAgICAvLyB0aGVuIGdldCB0aGUgbGlzdCBvZiBhbGwgbWVhc3VyZW1lbnRzIHBlciBzZXJpZXMgYW5kIGhvdyBtYW55IG1lYXN1cmVtZW50c1xuICAgIC8vIChub3QgYWxsIHNlcmllcyB3aWxsIGhhdmUgYmVlbiBtZWFzdXJlZClcbiAgICByZXR1cm4gbWVhc3VyZW1lbnRzREIucXVlcnkoJ2J5L3Nlcmllc1VJRE5vU2tpcCcsIHtcbiAgICAgIHJlZHVjZTogdHJ1ZSxcbiAgICAgIGdyb3VwOiB0cnVlLFxuICAgICAgbGV2ZWw6ICdleGFjdCdcbiAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgcmVzdWx0LnJvd3MuZm9yRWFjaChyb3cgPT4ge1xuICAgICAgICBtZWFzdXJlbWVudHNQZXJTZXJpZXNbcm93LmtleV0gPSByb3cudmFsdWU7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIG1lYXN1cmVtZW50c0RCLnF1ZXJ5KCdieS9hbm5vdGF0b3JzJywge1xuICAgICAgICByZWR1Y2U6IGZhbHNlLFxuICAgICAgICBpbmNsdWRlX2RvY3M6IHRydWUsXG4gICAgICAgIHN0YXJ0X2tleTogYW5ub3RhdG9ySUQsXG4gICAgICAgIGVuZF9rZXk6IGFubm90YXRvcklELFxuICAgICAgfSlcbiAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgLy8gdG9kby0gcmVtb3ZlIGR1cGxpY2F0aW9uISBzdG9yZSBvbiBhIHV0aWxzIG9iamVjdD8gb3IgdGhlIExvZ2luP1xuICAgICAgbGV0IGNhdGVnb3J5SWRUb0xhYmVsTWFwID0ge1xuICAgICAgICAgICdUQ0dBLUxVQUQnIDogJ0x1bmcnLFxuICAgICAgICAgICdUQ0dBLUxJSEMnIDogJ0xpdmVyJyxcbiAgICAgICAgICAnVENHQV9STicgOiAnUmVuYWwnLFxuICAgICAgICAgICdUQ0dBX09WJyA6ICdPdmFyaWFuJ1xuICAgICAgfTtcblxuICAgICAgcmVzdWx0LnJvd3MuZm9yRWFjaChyb3cgPT4ge1xuICAgICAgICBhbm5vdGF0b3JNZWFzdXJlZFNlcmllc1tyb3cuZG9jLnNlcmllc1VJRF0gPSB0cnVlO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIG5vdyByZWNvbmNpbGUgdGhlIGRhdGFcbiAgICAgIC8vIC0gbG9vayB0aHJvdWdoIGVhY2ggYXZhaWxhYmxlIHNlcmllc1xuICAgICAgLy8gLS0gaWYgbm9ib2R5IGhhcyBtZWFzdXJlZCBpdCB0aGVuIHVzZSBpdFxuICAgICAgLy8gLSBpZiB0aGUgdXNlciBhbHJlYWR5IG1lYXN1cmVkIGl0LCBpZ25vcmUgaXRcbiAgICAgIC8vIC0gb3RoZXJ3aXNlIGZpbmQgdGhlIGxlYXN0IG1lYXN1cmVkIG9uZVxuICAgICAgbGV0IGxlYXN0TWVhc3VyZWQgPSB7c2VyaWVzVUlEOiB1bmRlZmluZWQsIG1lYXN1cmVtZW50Q291bnQ6IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSfTtcbiAgICAgIGxldCBjYXNlRGV0YWlscztcblxuICAgICAgZm9yIChsZXQgc2VyaWVzSW5kZXggPSAwOyBzZXJpZXNJbmRleCA8IHNlcmllc1VJRHMubGVuZ3RoOyBzZXJpZXNJbmRleCsrKSB7XG4gICAgICAgIGxldCBzZXJpZXNVSUQgPSBzZXJpZXNVSURzW3Nlcmllc0luZGV4XTtcbiAgICAgICAgaWYgKCAhIChzZXJpZXNVSUQgaW4gbWVhc3VyZW1lbnRzUGVyU2VyaWVzKSApIHtcbiAgICAgICAgICBjYXNlRGV0YWlscyA9IChjYXNlcy5maW5kKGMgPT4gYy5rZXlbMF0gPT09IHNlcmllc1VJRCkua2V5KTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnTmV4dCBDYXNlIENhdGVnb3J5OicsIGNhc2VEZXRhaWxzKTtcbiAgICAgICAgICAkKCcjcGF0aWVudC1pZC11cHBlci1yaWdodCcpLnRleHQoY2FzZURldGFpbHNbMl0pO1xuICAgICAgICAgICQoJyNjYXRlZ29yeS11cHBlci1yaWdodCcpLnRleHQoY2F0ZWdvcnlJZFRvTGFiZWxNYXBbY2FzZURldGFpbHNbMV1dKTtcbiAgICAgICAgICByZXR1cm4gc2VyaWVzVUlEO1xuXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCAoISAoc2VyaWVzVUlEIGluIGFubm90YXRvck1lYXN1cmVkU2VyaWVzKSkgJiZcbiAgICAgICAgICAgICAgKG1lYXN1cmVtZW50c1BlclNlcmllc1tzZXJpZXNVSURdIDwgbGVhc3RNZWFzdXJlZC5tZWFzdXJlbWVudENvdW50KSApIHtcbiAgICAgICAgICBsZWFzdE1lYXN1cmVkLnNlcmllc1VJRCA9IHNlcmllc1VJRDtcbiAgICAgICAgICBsZWFzdE1lYXN1cmVkLm1lYXN1cmVtZW50Q291bnQgPSBtZWFzdXJlbWVudHNQZXJTZXJpZXNbc2VyaWVzVUlEXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2FzZURldGFpbHMgPSAoY2FzZXMuZmluZChjID0+IGMua2V5WzBdID09PSBsZWFzdE1lYXN1cmVkLnNlcmllc1VJRCkua2V5KTtcbiAgICAgIGNvbnNvbGUubG9nKCdOZXh0IENhc2UgQ2F0ZWdvcnk6JywgY2FzZURldGFpbHMpO1xuICAgICAgJCgnI3BhdGllbnQtaWQtdXBwZXItcmlnaHQnKS50ZXh0KGNhc2VEZXRhaWxzWzJdKTtcbiAgICAgICQoJyNjYXRlZ29yeS11cHBlci1yaWdodCcpLnRleHQoY2F0ZWdvcnlJZFRvTGFiZWxNYXBbY2FzZURldGFpbHNbMV1dKTtcbiAgICAgIHJldHVybiBsZWFzdE1lYXN1cmVkLnNlcmllc1VJRDtcbiAgICB9KVxuICB9XG59XG4iXX0=
},{"../db/db":14,"../login/login":17,"./connector":22}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _debounce = _interopRequireDefault(require("./debounce"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var tools = _defineProperty({
  pan: {
    mouse: cornerstoneTools.pan,
    touch: cornerstoneTools.panTouchDrag
  },
  wwwc: {
    mouse: cornerstoneTools.wwwc,
    touch: cornerstoneTools.wwwcTouchDrag
  },
  stackScroll: {
    mouse: cornerstoneTools.stackScroll,
    touch: cornerstoneTools.stackScrollTouchDrag
  },
  length: {
    mouse: cornerstoneTools.length,
    touch: cornerstoneTools.lengthTouch
  },
  zoom: {
    mouse: cornerstoneTools.zoom,
    touch: cornerstoneTools.zoomTouchDrag
  }
}, "stackScroll", {
  mouse: cornerstoneTools.stackScroll,
  touch: cornerstoneTools.stackScrollTouchDrag
});

var _default = {
  active: undefined,
  toolsSelector: '.viewer-tools',
  $cornerstoneViewport: $('#cornerstoneViewport'),
  toggleTool: function toggleTool(toolToActivate) {
    console.log("toggleTool ".concat(toolToActivate));

    if (!toolToActivate) {
      return;
    }

    var element = this.element;

    if (this.active) {
      var previousMouseTool = tools[this.active].mouse;
      var previousTouchTool = tools[this.active].touch;
      previousMouseTool.deactivate(element, 1);
      previousTouchTool.deactivate(element);
    }

    var mouseTool = tools[toolToActivate].mouse;
    var touchTool = tools[toolToActivate].touch;

    if (toolToActivate === 'pan') {
      // If the user has selected the pan tool, activate it for both left and middle
      // 3 means left mouse button and middle mouse button
      cornerstoneTools.pan.activate(element, 3);
      cornerstoneTools.zoom.activate(element, 4);
    } else if (toolToActivate === 'zoom') {
      // If the user has selected the zoom tool, activate it for both left and right
      // 5 means left mouse button and right mouse button
      cornerstoneTools.zoom.activate(element, 5);
      cornerstoneTools.pan.activate(element, 2);
    } else {
      // Otherwise, active the tool on left mouse, pan on middle, and zoom on right
      mouseTool.activate(element, 1);
      cornerstoneTools.pan.activate(element, 2);
      cornerstoneTools.zoom.activate(element, 4);
    }

    touchTool.activate(element);
    this.active = toolToActivate; // Set the element to focused, so we can properly handle keyboard events

    $(this.element).attr('tabindex', 0).focus();
  },
  initStackTool: function initStackTool(imageIds) {
    var _this = this;

    var $slider = $('.imageSlider');
    var slider = $slider[0];
    var stack = {
      currentImageIdIndex: 0,
      imageIds: imageIds
    }; // Init slider configurations

    slider.min = 0;
    slider.max = stack.imageIds.length - 1;
    slider.step = 1;
    slider.value = stack.currentImageIdIndex; // Clear any previous tool state

    cornerstoneTools.clearToolState(this.element, 'stack'); // Disable stack prefetch in case there are still queued requests

    cornerstoneTools.stackPrefetch.disable(this.element);
    cornerstoneTools.addStackStateManager(this.element, ['stack']);
    cornerstoneTools.addToolState(this.element, 'stack', stack);
    cornerstoneTools.stackPrefetch.enable(this.element);
    var element = this.element;
    var slideTimeoutTime = 5;
    var slideTimeout; // Adding input listener

    function selectImage(event) {
      // Note that we throttle requests to prevent the
      // user's ultrafast scrolling from firing requests too quickly.
      clearTimeout(slideTimeout);
      slideTimeout = setTimeout(function () {
        var newImageIdIndex = parseInt(event.currentTarget.value, 10);
        cornerstoneTools.scrollToIndex(element, newImageIdIndex);
      }, slideTimeoutTime);
    }

    $slider.off('input', selectImage);
    $slider.on('input', selectImage); // Setting the slider size

    var height = this.$cornerstoneViewport.height() - 60;
    $slider.css('width', "".concat(height, "px"));
    var debounceWindowResizeHandler = (0, _debounce.default)(function () {
      var height = _this.$cornerstoneViewport.height() - 60;
      $slider.css('width', "".concat(height, "px"));
    }, 150);
    $(window).off('resize', debounceWindowResizeHandler);
    $(window).on('resize', debounceWindowResizeHandler); // Listening to viewport stack image change, so the slider is synced

    var cornerstoneStackScrollHandler = function cornerstoneStackScrollHandler() {
      // Update the slider value
      slider.value = stack.currentImageIdIndex;
    };

    this.$cornerstoneViewport[0].removeEventListener('cornerstonestackscroll', cornerstoneStackScrollHandler);
    this.$cornerstoneViewport[0].addEventListener('cornerstonestackscroll', cornerstoneStackScrollHandler);
  },
  initInteractionTools: function initInteractionTools() {
    /*
    For touch devices, by default we activate:
    - Pinch to zoom
    - Two-finger Pan
    - Three (or more) finger Stack Scroll
     We also enable the Length tool so it is always visible
     */
    cornerstoneTools.zoomTouchPinch.activate(this.element);
    cornerstoneTools.panMultiTouch.activate(this.element);
    cornerstoneTools.panMultiTouch.setConfiguration({
      testPointers: function testPointers(eventData) {
        return eventData.numPointers === 2;
      }
    });
    cornerstoneTools.stackScrollMultiTouch.activate(this.element);
    cornerstoneTools.length.enable(this.element);
    /* For mouse devices, by default we turn on:
    - Stack scrolling by mouse wheel
    - Stack scrolling by keyboard up / down arrow keys
    - Pan with middle click
    - Zoom with right click
     */

    cornerstoneTools.stackScrollWheel.activate(this.element);
    cornerstoneTools.stackScrollKeyboard.activate(this.element);
    cornerstoneTools.pan.activate(this.element, 2);
    cornerstoneTools.zoom.activate(this.element, 4); // Set the tool font and font size
    // context.font = "[style] [variant] [weight] [size]/[line height] [font family]";

    var fontFamily = 'Roboto, OpenSans, HelveticaNeue-Light, Helvetica Neue Light, Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif';
    cornerstoneTools.textStyle.setFont('15px ' + fontFamily); // Set the tool width

    cornerstoneTools.toolStyle.setToolWidth(2); // Set color for inactive tools

    cornerstoneTools.toolColors.setToolColor('rgb(255, 255, 0)'); // Set color for active tools

    cornerstoneTools.toolColors.setActiveColor('rgb(0, 255, 0)');
    cornerstoneTools.length.setConfiguration({
      shadow: true
    }); // Stop users from zooming in or out too far

    cornerstoneTools.zoom.setConfiguration({
      minScale: 0.3,
      maxScale: 10,
      preventZoomOutsideImage: true
    });
  },
  toolClickHandler: function toolClickHandler(event) {
    var $element = $(event.currentTarget);
    var tool = $element.attr('data-tool');
    $('.active').removeClass('active');
    this.toggleTool(tool);
    $element.addClass('active');
  },
  attachEvents: function attachEvents() {
    // Extract which tool we are using and activating it
    $(this.toolsSelector).off('click', 'div[data-tool]', this.toolClickHandler.bind(this));
    $(this.toolsSelector).on('click', 'div[data-tool]', this.toolClickHandler.bind(this)); // Limiting measurements to 1

    function handleMeasurementAdded(event) {
      // Only handle Length measurements
      var toolType = 'length';

      if (event.detail.toolType !== toolType) {
        return;
      } // Retrieve the current image


      var element = event.detail.element;
      var image = cornerstone.getImage(element);
      var viewport = cornerstone.getViewport(element);
      var currentImageId = image.imageId; // When a new measurement is added, retrieve the current tool state

      var toolStateManager = cornerstoneTools.globalImageIdSpecificToolStateManager;
      var toolState = toolStateManager.saveToolState(); // Loop through all of the images (toolState is keyed by imageId)

      Object.keys(toolState).forEach(function (imageId) {
        // Delete all length measurements on images that are not the
        // current image
        if (imageId !== currentImageId) {
          delete toolState[imageId][toolType];
        }
      }); // Retrieve all of the length measurements on the current image

      var lengthMeasurements = toolState[currentImageId][toolType].data; // If there is more than length measurement, remove the oldest one

      if (lengthMeasurements.length > 1) {
        lengthMeasurements.shift();
      } // Add some viewport details to the length measurement data


      lengthMeasurements[0].windowWidth = viewport.voi.windowWidth;
      lengthMeasurements[0].windowCenter = viewport.voi.windowCenter;
      lengthMeasurements[0].scale = viewport.scale;
      lengthMeasurements[0].translation = viewport.translation; // Re-save this data into the toolState object

      toolState[currentImageId][toolType].data = lengthMeasurements; // Restore toolState into the toolStateManager

      toolStateManager.restoreToolState(toolState); // Update the image

      cornerstone.updateImage(element);
    }

    this.element.removeEventListener('cornerstonetoolsmeasurementadded', handleMeasurementAdded);
    this.element.addEventListener('cornerstonetoolsmeasurementadded', handleMeasurementAdded);
  },
  initTools: function initTools(imageIds) {
    cornerstoneTools.mouseInput.enable(this.element);
    cornerstoneTools.touchInput.enable(this.element);
    cornerstoneTools.mouseWheelInput.enable(this.element);
    cornerstoneTools.keyboardInput.enable(this.element);
    this.initInteractionTools(); // If a previously active tool exists, re-enable it.
    // If not, use wwwc

    var toolToActivate = this.active || 'wwwc';
    this.toggleTool(toolToActivate); // Remove the 'active' highlight from the other tools

    $("".concat(this.toolsSelector, " .active")).removeClass('.active'); // Add it to our desired tool

    $("".concat(this.toolsSelector, " div[data-tool=").concat(toolToActivate, "]")).addClass('active');
    this.attachEvents();
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRvb2xzLmpzIl0sIm5hbWVzIjpbInRvb2xzIiwicGFuIiwibW91c2UiLCJjb3JuZXJzdG9uZVRvb2xzIiwidG91Y2giLCJwYW5Ub3VjaERyYWciLCJ3d3djIiwid3d3Y1RvdWNoRHJhZyIsInN0YWNrU2Nyb2xsIiwic3RhY2tTY3JvbGxUb3VjaERyYWciLCJsZW5ndGgiLCJsZW5ndGhUb3VjaCIsInpvb20iLCJ6b29tVG91Y2hEcmFnIiwiYWN0aXZlIiwidW5kZWZpbmVkIiwidG9vbHNTZWxlY3RvciIsIiRjb3JuZXJzdG9uZVZpZXdwb3J0IiwiJCIsInRvZ2dsZVRvb2wiLCJ0b29sVG9BY3RpdmF0ZSIsImNvbnNvbGUiLCJsb2ciLCJlbGVtZW50IiwicHJldmlvdXNNb3VzZVRvb2wiLCJwcmV2aW91c1RvdWNoVG9vbCIsImRlYWN0aXZhdGUiLCJtb3VzZVRvb2wiLCJ0b3VjaFRvb2wiLCJhY3RpdmF0ZSIsImF0dHIiLCJmb2N1cyIsImluaXRTdGFja1Rvb2wiLCJpbWFnZUlkcyIsIiRzbGlkZXIiLCJzbGlkZXIiLCJzdGFjayIsImN1cnJlbnRJbWFnZUlkSW5kZXgiLCJtaW4iLCJtYXgiLCJzdGVwIiwidmFsdWUiLCJjbGVhclRvb2xTdGF0ZSIsInN0YWNrUHJlZmV0Y2giLCJkaXNhYmxlIiwiYWRkU3RhY2tTdGF0ZU1hbmFnZXIiLCJhZGRUb29sU3RhdGUiLCJlbmFibGUiLCJzbGlkZVRpbWVvdXRUaW1lIiwic2xpZGVUaW1lb3V0Iiwic2VsZWN0SW1hZ2UiLCJldmVudCIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJuZXdJbWFnZUlkSW5kZXgiLCJwYXJzZUludCIsImN1cnJlbnRUYXJnZXQiLCJzY3JvbGxUb0luZGV4Iiwib2ZmIiwib24iLCJoZWlnaHQiLCJjc3MiLCJkZWJvdW5jZVdpbmRvd1Jlc2l6ZUhhbmRsZXIiLCJ3aW5kb3ciLCJjb3JuZXJzdG9uZVN0YWNrU2Nyb2xsSGFuZGxlciIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJhZGRFdmVudExpc3RlbmVyIiwiaW5pdEludGVyYWN0aW9uVG9vbHMiLCJ6b29tVG91Y2hQaW5jaCIsInBhbk11bHRpVG91Y2giLCJzZXRDb25maWd1cmF0aW9uIiwidGVzdFBvaW50ZXJzIiwiZXZlbnREYXRhIiwibnVtUG9pbnRlcnMiLCJzdGFja1Njcm9sbE11bHRpVG91Y2giLCJzdGFja1Njcm9sbFdoZWVsIiwic3RhY2tTY3JvbGxLZXlib2FyZCIsImZvbnRGYW1pbHkiLCJ0ZXh0U3R5bGUiLCJzZXRGb250IiwidG9vbFN0eWxlIiwic2V0VG9vbFdpZHRoIiwidG9vbENvbG9ycyIsInNldFRvb2xDb2xvciIsInNldEFjdGl2ZUNvbG9yIiwic2hhZG93IiwibWluU2NhbGUiLCJtYXhTY2FsZSIsInByZXZlbnRab29tT3V0c2lkZUltYWdlIiwidG9vbENsaWNrSGFuZGxlciIsIiRlbGVtZW50IiwidG9vbCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJhdHRhY2hFdmVudHMiLCJiaW5kIiwiaGFuZGxlTWVhc3VyZW1lbnRBZGRlZCIsInRvb2xUeXBlIiwiZGV0YWlsIiwiaW1hZ2UiLCJjb3JuZXJzdG9uZSIsImdldEltYWdlIiwidmlld3BvcnQiLCJnZXRWaWV3cG9ydCIsImN1cnJlbnRJbWFnZUlkIiwiaW1hZ2VJZCIsInRvb2xTdGF0ZU1hbmFnZXIiLCJnbG9iYWxJbWFnZUlkU3BlY2lmaWNUb29sU3RhdGVNYW5hZ2VyIiwidG9vbFN0YXRlIiwic2F2ZVRvb2xTdGF0ZSIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwibGVuZ3RoTWVhc3VyZW1lbnRzIiwiZGF0YSIsInNoaWZ0Iiwid2luZG93V2lkdGgiLCJ2b2kiLCJ3aW5kb3dDZW50ZXIiLCJzY2FsZSIsInRyYW5zbGF0aW9uIiwicmVzdG9yZVRvb2xTdGF0ZSIsInVwZGF0ZUltYWdlIiwiaW5pdFRvb2xzIiwibW91c2VJbnB1dCIsInRvdWNoSW5wdXQiLCJtb3VzZVdoZWVsSW5wdXQiLCJrZXlib2FyZElucHV0Il0sIm1hcHBpbmdzIjoiOzs7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QixDQWdCbEI7O0FBQ0ExRSxJQUFBQSxDQUFDLFdBQUksS0FBS0YsYUFBVCw0QkFBd0NJLGNBQXhDLE9BQUQsQ0FBNER5RSxRQUE1RCxDQUFxRSxRQUFyRTtBQUVBLFNBQUtDLFlBQUw7QUFDRDtBQTlQWSxDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGRlYm91bmNlIGZyb20gJy4vZGVib3VuY2UnO1xuXG5jb25zdCB0b29scyA9IHtcbiAgcGFuOiB7XG4gICAgbW91c2U6IGNvcm5lcnN0b25lVG9vbHMucGFuLFxuICAgIHRvdWNoOiBjb3JuZXJzdG9uZVRvb2xzLnBhblRvdWNoRHJhZ1xuICB9LFxuICB3d3djOiB7XG4gICAgbW91c2U6IGNvcm5lcnN0b25lVG9vbHMud3d3YyxcbiAgICB0b3VjaDogY29ybmVyc3RvbmVUb29scy53d3djVG91Y2hEcmFnXG4gIH0sXG4gIHN0YWNrU2Nyb2xsOiB7XG4gICAgbW91c2U6IGNvcm5lcnN0b25lVG9vbHMuc3RhY2tTY3JvbGwsXG4gICAgdG91Y2g6IGNvcm5lcnN0b25lVG9vbHMuc3RhY2tTY3JvbGxUb3VjaERyYWdcbiAgfSxcbiAgbGVuZ3RoOiB7XG4gICAgbW91c2U6IGNvcm5lcnN0b25lVG9vbHMubGVuZ3RoLFxuICAgIHRvdWNoOiBjb3JuZXJzdG9uZVRvb2xzLmxlbmd0aFRvdWNoXG4gIH0sXG4gIHpvb206IHtcbiAgICBtb3VzZTogY29ybmVyc3RvbmVUb29scy56b29tLFxuICAgIHRvdWNoOiBjb3JuZXJzdG9uZVRvb2xzLnpvb21Ub3VjaERyYWdcbiAgfSxcbiAgc3RhY2tTY3JvbGw6IHtcbiAgICBtb3VzZTogY29ybmVyc3RvbmVUb29scy5zdGFja1Njcm9sbCxcbiAgICB0b3VjaDogY29ybmVyc3RvbmVUb29scy5zdGFja1Njcm9sbFRvdWNoRHJhZ1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGFjdGl2ZTogdW5kZWZpbmVkLFxuICB0b29sc1NlbGVjdG9yOiAnLnZpZXdlci10b29scycsXG4gICRjb3JuZXJzdG9uZVZpZXdwb3J0OiAkKCcjY29ybmVyc3RvbmVWaWV3cG9ydCcpLFxuICB0b2dnbGVUb29sKHRvb2xUb0FjdGl2YXRlKSB7XG4gICAgY29uc29sZS5sb2coYHRvZ2dsZVRvb2wgJHt0b29sVG9BY3RpdmF0ZX1gKTtcbiAgICBpZiAoIXRvb2xUb0FjdGl2YXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMuZWxlbWVudDtcblxuICAgIGlmICh0aGlzLmFjdGl2ZSkge1xuICAgICAgY29uc3QgcHJldmlvdXNNb3VzZVRvb2wgPSB0b29sc1t0aGlzLmFjdGl2ZV0ubW91c2U7XG4gICAgICBjb25zdCBwcmV2aW91c1RvdWNoVG9vbCA9IHRvb2xzW3RoaXMuYWN0aXZlXS50b3VjaDtcbiAgICAgIHByZXZpb3VzTW91c2VUb29sLmRlYWN0aXZhdGUoZWxlbWVudCwgMSk7XG4gICAgICBwcmV2aW91c1RvdWNoVG9vbC5kZWFjdGl2YXRlKGVsZW1lbnQpO1xuICAgIH1cblxuICAgIGNvbnN0IG1vdXNlVG9vbCA9IHRvb2xzW3Rvb2xUb0FjdGl2YXRlXS5tb3VzZTtcbiAgICBjb25zdCB0b3VjaFRvb2wgPSB0b29sc1t0b29sVG9BY3RpdmF0ZV0udG91Y2g7XG5cbiAgICBpZiAodG9vbFRvQWN0aXZhdGUgPT09ICdwYW4nKSB7XG4gICAgICAvLyBJZiB0aGUgdXNlciBoYXMgc2VsZWN0ZWQgdGhlIHBhbiB0b29sLCBhY3RpdmF0ZSBpdCBmb3IgYm90aCBsZWZ0IGFuZCBtaWRkbGVcbiAgICAgIC8vIDMgbWVhbnMgbGVmdCBtb3VzZSBidXR0b24gYW5kIG1pZGRsZSBtb3VzZSBidXR0b25cbiAgICAgIGNvcm5lcnN0b25lVG9vbHMucGFuLmFjdGl2YXRlKGVsZW1lbnQsIDMpO1xuICAgICAgY29ybmVyc3RvbmVUb29scy56b29tLmFjdGl2YXRlKGVsZW1lbnQsIDQpO1xuICAgIH0gZWxzZSBpZiAodG9vbFRvQWN0aXZhdGUgPT09ICd6b29tJykge1xuICAgICAgLy8gSWYgdGhlIHVzZXIgaGFzIHNlbGVjdGVkIHRoZSB6b29tIHRvb2wsIGFjdGl2YXRlIGl0IGZvciBib3RoIGxlZnQgYW5kIHJpZ2h0XG4gICAgICAvLyA1IG1lYW5zIGxlZnQgbW91c2UgYnV0dG9uIGFuZCByaWdodCBtb3VzZSBidXR0b25cbiAgICAgIGNvcm5lcnN0b25lVG9vbHMuem9vbS5hY3RpdmF0ZShlbGVtZW50LCA1KTtcbiAgICAgIGNvcm5lcnN0b25lVG9vbHMucGFuLmFjdGl2YXRlKGVsZW1lbnQsIDIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBPdGhlcndpc2UsIGFjdGl2ZSB0aGUgdG9vbCBvbiBsZWZ0IG1vdXNlLCBwYW4gb24gbWlkZGxlLCBhbmQgem9vbSBvbiByaWdodFxuICAgICAgbW91c2VUb29sLmFjdGl2YXRlKGVsZW1lbnQsIDEpO1xuICAgICAgY29ybmVyc3RvbmVUb29scy5wYW4uYWN0aXZhdGUoZWxlbWVudCwgMik7XG4gICAgICBjb3JuZXJzdG9uZVRvb2xzLnpvb20uYWN0aXZhdGUoZWxlbWVudCwgNCk7XG4gICAgfVxuXG4gICAgdG91Y2hUb29sLmFjdGl2YXRlKGVsZW1lbnQpO1xuXG4gICAgdGhpcy5hY3RpdmUgPSB0b29sVG9BY3RpdmF0ZTtcblxuICAgIC8vIFNldCB0aGUgZWxlbWVudCB0byBmb2N1c2VkLCBzbyB3ZSBjYW4gcHJvcGVybHkgaGFuZGxlIGtleWJvYXJkIGV2ZW50c1xuICAgICQodGhpcy5lbGVtZW50KS5hdHRyKCd0YWJpbmRleCcsIDApLmZvY3VzKCk7XG4gIH0sXG5cbiAgaW5pdFN0YWNrVG9vbChpbWFnZUlkcykge1xuICAgIGNvbnN0ICRzbGlkZXIgPSAkKCcuaW1hZ2VTbGlkZXInKTtcbiAgICBjb25zdCBzbGlkZXIgPSAkc2xpZGVyWzBdO1xuICAgIGNvbnN0IHN0YWNrID0ge1xuICAgICAgY3VycmVudEltYWdlSWRJbmRleDogMCxcbiAgICAgIGltYWdlSWRzOiBpbWFnZUlkc1xuICAgIH07XG5cbiAgICAvLyBJbml0IHNsaWRlciBjb25maWd1cmF0aW9uc1xuICAgIHNsaWRlci5taW4gPSAwO1xuICAgIHNsaWRlci5tYXggPSBzdGFjay5pbWFnZUlkcy5sZW5ndGggLSAxO1xuICAgIHNsaWRlci5zdGVwID0gMTtcbiAgICBzbGlkZXIudmFsdWUgPSBzdGFjay5jdXJyZW50SW1hZ2VJZEluZGV4O1xuXG4gICAgLy8gQ2xlYXIgYW55IHByZXZpb3VzIHRvb2wgc3RhdGVcbiAgICBjb3JuZXJzdG9uZVRvb2xzLmNsZWFyVG9vbFN0YXRlKHRoaXMuZWxlbWVudCwgJ3N0YWNrJyk7XG5cbiAgICAvLyBEaXNhYmxlIHN0YWNrIHByZWZldGNoIGluIGNhc2UgdGhlcmUgYXJlIHN0aWxsIHF1ZXVlZCByZXF1ZXN0c1xuICAgIGNvcm5lcnN0b25lVG9vbHMuc3RhY2tQcmVmZXRjaC5kaXNhYmxlKHRoaXMuZWxlbWVudCk7XG5cbiAgICBjb3JuZXJzdG9uZVRvb2xzLmFkZFN0YWNrU3RhdGVNYW5hZ2VyKHRoaXMuZWxlbWVudCwgWydzdGFjayddKTtcbiAgICBjb3JuZXJzdG9uZVRvb2xzLmFkZFRvb2xTdGF0ZSh0aGlzLmVsZW1lbnQsICdzdGFjaycsIHN0YWNrKTtcbiAgICBjb3JuZXJzdG9uZVRvb2xzLnN0YWNrUHJlZmV0Y2guZW5hYmxlKHRoaXMuZWxlbWVudCk7XG5cbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5lbGVtZW50O1xuICAgIGNvbnN0IHNsaWRlVGltZW91dFRpbWUgPSA1O1xuICAgIGxldCBzbGlkZVRpbWVvdXQ7XG5cbiAgICAvLyBBZGRpbmcgaW5wdXQgbGlzdGVuZXJcbiAgICBmdW5jdGlvbiBzZWxlY3RJbWFnZShldmVudCkge1xuICAgICAgLy8gTm90ZSB0aGF0IHdlIHRocm90dGxlIHJlcXVlc3RzIHRvIHByZXZlbnQgdGhlXG4gICAgICAvLyB1c2VyJ3MgdWx0cmFmYXN0IHNjcm9sbGluZyBmcm9tIGZpcmluZyByZXF1ZXN0cyB0b28gcXVpY2tseS5cbiAgICAgIGNsZWFyVGltZW91dChzbGlkZVRpbWVvdXQpO1xuICAgICAgc2xpZGVUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IG5ld0ltYWdlSWRJbmRleCA9IHBhcnNlSW50KGV2ZW50LmN1cnJlbnRUYXJnZXQudmFsdWUsIDEwKTtcbiAgICAgICAgY29ybmVyc3RvbmVUb29scy5zY3JvbGxUb0luZGV4KGVsZW1lbnQsIG5ld0ltYWdlSWRJbmRleCk7XG4gICAgICB9LCBzbGlkZVRpbWVvdXRUaW1lKTtcbiAgICB9XG5cbiAgICAkc2xpZGVyLm9mZignaW5wdXQnLCBzZWxlY3RJbWFnZSk7XG4gICAgJHNsaWRlci5vbignaW5wdXQnLCBzZWxlY3RJbWFnZSk7XG5cbiAgICAvLyBTZXR0aW5nIHRoZSBzbGlkZXIgc2l6ZVxuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuJGNvcm5lcnN0b25lVmlld3BvcnQuaGVpZ2h0KCkgLSA2MDtcbiAgICAkc2xpZGVyLmNzcygnd2lkdGgnLCBgJHtoZWlnaHR9cHhgKTtcblxuICAgIGNvbnN0IGRlYm91bmNlV2luZG93UmVzaXplSGFuZGxlciA9IGRlYm91bmNlKCgpID0+IHtcbiAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuJGNvcm5lcnN0b25lVmlld3BvcnQuaGVpZ2h0KCkgLSA2MDtcbiAgICAgICRzbGlkZXIuY3NzKCd3aWR0aCcsIGAke2hlaWdodH1weGApXG4gICAgfSwgMTUwKTtcblxuICAgICQod2luZG93KS5vZmYoJ3Jlc2l6ZScsIGRlYm91bmNlV2luZG93UmVzaXplSGFuZGxlcik7XG4gICAgJCh3aW5kb3cpLm9uKCdyZXNpemUnLCBkZWJvdW5jZVdpbmRvd1Jlc2l6ZUhhbmRsZXIpO1xuXG4gICAgLy8gTGlzdGVuaW5nIHRvIHZpZXdwb3J0IHN0YWNrIGltYWdlIGNoYW5nZSwgc28gdGhlIHNsaWRlciBpcyBzeW5jZWRcbiAgICBjb25zdCBjb3JuZXJzdG9uZVN0YWNrU2Nyb2xsSGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFVwZGF0ZSB0aGUgc2xpZGVyIHZhbHVlXG4gICAgICBzbGlkZXIudmFsdWUgPSBzdGFjay5jdXJyZW50SW1hZ2VJZEluZGV4O1xuICAgIH07XG5cbiAgICB0aGlzLiRjb3JuZXJzdG9uZVZpZXdwb3J0WzBdLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nvcm5lcnN0b25lc3RhY2tzY3JvbGwnLCBjb3JuZXJzdG9uZVN0YWNrU2Nyb2xsSGFuZGxlcik7XG4gICAgdGhpcy4kY29ybmVyc3RvbmVWaWV3cG9ydFswXS5hZGRFdmVudExpc3RlbmVyKCdjb3JuZXJzdG9uZXN0YWNrc2Nyb2xsJywgY29ybmVyc3RvbmVTdGFja1Njcm9sbEhhbmRsZXIpO1xuICB9LFxuXG4gIGluaXRJbnRlcmFjdGlvblRvb2xzKCkge1xuICAgIC8qXG4gICAgRm9yIHRvdWNoIGRldmljZXMsIGJ5IGRlZmF1bHQgd2UgYWN0aXZhdGU6XG4gICAgLSBQaW5jaCB0byB6b29tXG4gICAgLSBUd28tZmluZ2VyIFBhblxuICAgIC0gVGhyZWUgKG9yIG1vcmUpIGZpbmdlciBTdGFjayBTY3JvbGxcblxuICAgIFdlIGFsc28gZW5hYmxlIHRoZSBMZW5ndGggdG9vbCBzbyBpdCBpcyBhbHdheXMgdmlzaWJsZVxuICAgICAqL1xuICAgIGNvcm5lcnN0b25lVG9vbHMuem9vbVRvdWNoUGluY2guYWN0aXZhdGUodGhpcy5lbGVtZW50KTtcbiAgICBjb3JuZXJzdG9uZVRvb2xzLnBhbk11bHRpVG91Y2guYWN0aXZhdGUodGhpcy5lbGVtZW50KTtcbiAgICBjb3JuZXJzdG9uZVRvb2xzLnBhbk11bHRpVG91Y2guc2V0Q29uZmlndXJhdGlvbih7XG4gICAgICAgIHRlc3RQb2ludGVyczogKGV2ZW50RGF0YSkgPT4gKGV2ZW50RGF0YS5udW1Qb2ludGVycyA9PT0gMilcbiAgICB9KTtcbiAgICBjb3JuZXJzdG9uZVRvb2xzLnN0YWNrU2Nyb2xsTXVsdGlUb3VjaC5hY3RpdmF0ZSh0aGlzLmVsZW1lbnQpO1xuICAgIGNvcm5lcnN0b25lVG9vbHMubGVuZ3RoLmVuYWJsZSh0aGlzLmVsZW1lbnQpO1xuXG4gICAgLyogRm9yIG1vdXNlIGRldmljZXMsIGJ5IGRlZmF1bHQgd2UgdHVybiBvbjpcbiAgICAtIFN0YWNrIHNjcm9sbGluZyBieSBtb3VzZSB3aGVlbFxuICAgIC0gU3RhY2sgc2Nyb2xsaW5nIGJ5IGtleWJvYXJkIHVwIC8gZG93biBhcnJvdyBrZXlzXG4gICAgLSBQYW4gd2l0aCBtaWRkbGUgY2xpY2tcbiAgICAtIFpvb20gd2l0aCByaWdodCBjbGlja1xuICAgICAqL1xuICAgIGNvcm5lcnN0b25lVG9vbHMuc3RhY2tTY3JvbGxXaGVlbC5hY3RpdmF0ZSh0aGlzLmVsZW1lbnQpO1xuICAgIGNvcm5lcnN0b25lVG9vbHMuc3RhY2tTY3JvbGxLZXlib2FyZC5hY3RpdmF0ZSh0aGlzLmVsZW1lbnQpO1xuICAgIGNvcm5lcnN0b25lVG9vbHMucGFuLmFjdGl2YXRlKHRoaXMuZWxlbWVudCwgMik7XG4gICAgY29ybmVyc3RvbmVUb29scy56b29tLmFjdGl2YXRlKHRoaXMuZWxlbWVudCwgNCk7XG5cbiAgICAvLyBTZXQgdGhlIHRvb2wgZm9udCBhbmQgZm9udCBzaXplXG4gICAgLy8gY29udGV4dC5mb250ID0gXCJbc3R5bGVdIFt2YXJpYW50XSBbd2VpZ2h0XSBbc2l6ZV0vW2xpbmUgaGVpZ2h0XSBbZm9udCBmYW1pbHldXCI7XG4gICAgY29uc3QgZm9udEZhbWlseSA9ICdSb2JvdG8sIE9wZW5TYW5zLCBIZWx2ZXRpY2FOZXVlLUxpZ2h0LCBIZWx2ZXRpY2EgTmV1ZSBMaWdodCwgSGVsdmV0aWNhIE5ldWUsIEhlbHZldGljYSwgQXJpYWwsIEx1Y2lkYSBHcmFuZGUsIHNhbnMtc2VyaWYnO1xuICAgIGNvcm5lcnN0b25lVG9vbHMudGV4dFN0eWxlLnNldEZvbnQoJzE1cHggJyArIGZvbnRGYW1pbHkpO1xuXG4gICAgLy8gU2V0IHRoZSB0b29sIHdpZHRoXG4gICAgY29ybmVyc3RvbmVUb29scy50b29sU3R5bGUuc2V0VG9vbFdpZHRoKDIpO1xuXG4gICAgLy8gU2V0IGNvbG9yIGZvciBpbmFjdGl2ZSB0b29sc1xuICAgIGNvcm5lcnN0b25lVG9vbHMudG9vbENvbG9ycy5zZXRUb29sQ29sb3IoJ3JnYigyNTUsIDI1NSwgMCknKTtcblxuICAgIC8vIFNldCBjb2xvciBmb3IgYWN0aXZlIHRvb2xzXG4gICAgY29ybmVyc3RvbmVUb29scy50b29sQ29sb3JzLnNldEFjdGl2ZUNvbG9yKCdyZ2IoMCwgMjU1LCAwKScpO1xuXG4gICAgY29ybmVyc3RvbmVUb29scy5sZW5ndGguc2V0Q29uZmlndXJhdGlvbih7c2hhZG93OiB0cnVlfSk7XG5cbiAgICAvLyBTdG9wIHVzZXJzIGZyb20gem9vbWluZyBpbiBvciBvdXQgdG9vIGZhclxuICAgIGNvcm5lcnN0b25lVG9vbHMuem9vbS5zZXRDb25maWd1cmF0aW9uKHtcbiAgICAgICAgbWluU2NhbGU6IDAuMyxcbiAgICAgICAgbWF4U2NhbGU6IDEwLFxuICAgICAgICBwcmV2ZW50Wm9vbU91dHNpZGVJbWFnZTogdHJ1ZVxuICAgIH0pO1xuICB9LFxuXG4gIHRvb2xDbGlja0hhbmRsZXIoZXZlbnQpIHtcbiAgICBjb25zdCAkZWxlbWVudCA9ICQoZXZlbnQuY3VycmVudFRhcmdldCk7XG4gICAgY29uc3QgdG9vbCA9ICRlbGVtZW50LmF0dHIoJ2RhdGEtdG9vbCcpO1xuXG4gICAgJCgnLmFjdGl2ZScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblxuICAgIHRoaXMudG9nZ2xlVG9vbCh0b29sKTtcblxuICAgICRlbGVtZW50LmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgfSxcblxuICBhdHRhY2hFdmVudHMoKSB7XG4gICAgLy8gRXh0cmFjdCB3aGljaCB0b29sIHdlIGFyZSB1c2luZyBhbmQgYWN0aXZhdGluZyBpdFxuICAgICQodGhpcy50b29sc1NlbGVjdG9yKS5vZmYoJ2NsaWNrJywgJ2RpdltkYXRhLXRvb2xdJywgdGhpcy50b29sQ2xpY2tIYW5kbGVyLmJpbmQodGhpcykpO1xuICAgICQodGhpcy50b29sc1NlbGVjdG9yKS5vbignY2xpY2snLCAnZGl2W2RhdGEtdG9vbF0nLCB0aGlzLnRvb2xDbGlja0hhbmRsZXIuYmluZCh0aGlzKSk7XG5cbiAgICAvLyBMaW1pdGluZyBtZWFzdXJlbWVudHMgdG8gMVxuICAgIGZ1bmN0aW9uIGhhbmRsZU1lYXN1cmVtZW50QWRkZWQgKGV2ZW50KSB7XG4gICAgICAvLyBPbmx5IGhhbmRsZSBMZW5ndGggbWVhc3VyZW1lbnRzXG4gICAgICBjb25zdCB0b29sVHlwZSA9ICdsZW5ndGgnO1xuICAgICAgaWYgKGV2ZW50LmRldGFpbC50b29sVHlwZSAhPT0gdG9vbFR5cGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXRyaWV2ZSB0aGUgY3VycmVudCBpbWFnZVxuICAgICAgY29uc3QgZWxlbWVudCA9IGV2ZW50LmRldGFpbC5lbGVtZW50O1xuICAgICAgY29uc3QgaW1hZ2UgPSBjb3JuZXJzdG9uZS5nZXRJbWFnZShlbGVtZW50KTtcbiAgICAgIGNvbnN0IHZpZXdwb3J0ID0gY29ybmVyc3RvbmUuZ2V0Vmlld3BvcnQoZWxlbWVudCk7XG4gICAgICBjb25zdCBjdXJyZW50SW1hZ2VJZCA9IGltYWdlLmltYWdlSWQ7XG5cbiAgICAgIC8vIFdoZW4gYSBuZXcgbWVhc3VyZW1lbnQgaXMgYWRkZWQsIHJldHJpZXZlIHRoZSBjdXJyZW50IHRvb2wgc3RhdGVcbiAgICAgIGNvbnN0IHRvb2xTdGF0ZU1hbmFnZXIgPSBjb3JuZXJzdG9uZVRvb2xzLmdsb2JhbEltYWdlSWRTcGVjaWZpY1Rvb2xTdGF0ZU1hbmFnZXI7XG4gICAgICBjb25zdCB0b29sU3RhdGUgPSB0b29sU3RhdGVNYW5hZ2VyLnNhdmVUb29sU3RhdGUoKTtcblxuICAgICAgLy8gTG9vcCB0aHJvdWdoIGFsbCBvZiB0aGUgaW1hZ2VzICh0b29sU3RhdGUgaXMga2V5ZWQgYnkgaW1hZ2VJZClcbiAgICAgIE9iamVjdC5rZXlzKHRvb2xTdGF0ZSkuZm9yRWFjaChpbWFnZUlkID0+IHtcbiAgICAgICAgLy8gRGVsZXRlIGFsbCBsZW5ndGggbWVhc3VyZW1lbnRzIG9uIGltYWdlcyB0aGF0IGFyZSBub3QgdGhlXG4gICAgICAgIC8vIGN1cnJlbnQgaW1hZ2VcbiAgICAgICAgaWYgKGltYWdlSWQgIT09IGN1cnJlbnRJbWFnZUlkKSB7XG4gICAgICAgICAgZGVsZXRlIHRvb2xTdGF0ZVtpbWFnZUlkXVt0b29sVHlwZV07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBSZXRyaWV2ZSBhbGwgb2YgdGhlIGxlbmd0aCBtZWFzdXJlbWVudHMgb24gdGhlIGN1cnJlbnQgaW1hZ2VcbiAgICAgIGNvbnN0IGxlbmd0aE1lYXN1cmVtZW50cyA9IHRvb2xTdGF0ZVtjdXJyZW50SW1hZ2VJZF1bdG9vbFR5cGVdLmRhdGE7XG5cbiAgICAgIC8vIElmIHRoZXJlIGlzIG1vcmUgdGhhbiBsZW5ndGggbWVhc3VyZW1lbnQsIHJlbW92ZSB0aGUgb2xkZXN0IG9uZVxuICAgICAgaWYgKGxlbmd0aE1lYXN1cmVtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGxlbmd0aE1lYXN1cmVtZW50cy5zaGlmdCgpO1xuICAgICAgfVxuXG4gICAgICAvLyBBZGQgc29tZSB2aWV3cG9ydCBkZXRhaWxzIHRvIHRoZSBsZW5ndGggbWVhc3VyZW1lbnQgZGF0YVxuICAgICAgbGVuZ3RoTWVhc3VyZW1lbnRzWzBdLndpbmRvd1dpZHRoID0gdmlld3BvcnQudm9pLndpbmRvd1dpZHRoO1xuICAgICAgbGVuZ3RoTWVhc3VyZW1lbnRzWzBdLndpbmRvd0NlbnRlciA9IHZpZXdwb3J0LnZvaS53aW5kb3dDZW50ZXI7XG4gICAgICBsZW5ndGhNZWFzdXJlbWVudHNbMF0uc2NhbGUgPSB2aWV3cG9ydC5zY2FsZTtcbiAgICAgIGxlbmd0aE1lYXN1cmVtZW50c1swXS50cmFuc2xhdGlvbiA9IHZpZXdwb3J0LnRyYW5zbGF0aW9uO1xuXG4gICAgICAvLyBSZS1zYXZlIHRoaXMgZGF0YSBpbnRvIHRoZSB0b29sU3RhdGUgb2JqZWN0XG4gICAgICB0b29sU3RhdGVbY3VycmVudEltYWdlSWRdW3Rvb2xUeXBlXS5kYXRhID0gbGVuZ3RoTWVhc3VyZW1lbnRzO1xuXG4gICAgICAvLyBSZXN0b3JlIHRvb2xTdGF0ZSBpbnRvIHRoZSB0b29sU3RhdGVNYW5hZ2VyXG4gICAgICB0b29sU3RhdGVNYW5hZ2VyLnJlc3RvcmVUb29sU3RhdGUodG9vbFN0YXRlKTtcblxuICAgICAgLy8gVXBkYXRlIHRoZSBpbWFnZVxuICAgICAgY29ybmVyc3RvbmUudXBkYXRlSW1hZ2UoZWxlbWVudCk7XG4gICAgfVxuXG4gICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nvcm5lcnN0b25ldG9vbHNtZWFzdXJlbWVudGFkZGVkJywgaGFuZGxlTWVhc3VyZW1lbnRBZGRlZCk7XG4gICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2Nvcm5lcnN0b25ldG9vbHNtZWFzdXJlbWVudGFkZGVkJywgaGFuZGxlTWVhc3VyZW1lbnRBZGRlZCk7XG4gIH0sXG5cbiAgaW5pdFRvb2xzKGltYWdlSWRzKSB7XG4gICAgY29ybmVyc3RvbmVUb29scy5tb3VzZUlucHV0LmVuYWJsZSh0aGlzLmVsZW1lbnQpO1xuICAgIGNvcm5lcnN0b25lVG9vbHMudG91Y2hJbnB1dC5lbmFibGUodGhpcy5lbGVtZW50KTtcbiAgICBjb3JuZXJzdG9uZVRvb2xzLm1vdXNlV2hlZWxJbnB1dC5lbmFibGUodGhpcy5lbGVtZW50KTtcbiAgICBjb3JuZXJzdG9uZVRvb2xzLmtleWJvYXJkSW5wdXQuZW5hYmxlKHRoaXMuZWxlbWVudCk7XG5cbiAgICB0aGlzLmluaXRJbnRlcmFjdGlvblRvb2xzKCk7XG5cbiAgICAvLyBJZiBhIHByZXZpb3VzbHkgYWN0aXZlIHRvb2wgZXhpc3RzLCByZS1lbmFibGUgaXQuXG4gICAgLy8gSWYgbm90LCB1c2Ugd3d3Y1xuICAgIGNvbnN0IHRvb2xUb0FjdGl2YXRlID0gdGhpcy5hY3RpdmUgfHwgJ3d3d2MnO1xuICAgIHRoaXMudG9nZ2xlVG9vbCh0b29sVG9BY3RpdmF0ZSk7XG5cbiAgICAvLyBSZW1vdmUgdGhlICdhY3RpdmUnIGhpZ2hsaWdodCBmcm9tIHRoZSBvdGhlciB0b29sc1xuICAgICQoYCR7dGhpcy50b29sc1NlbGVjdG9yfSAuYWN0aXZlYCkucmVtb3ZlQ2xhc3MoJy5hY3RpdmUnKTtcblxuICAgIC8vIEFkZCBpdCB0byBvdXIgZGVzaXJlZCB0b29sXG4gICAgJChgJHt0aGlzLnRvb2xzU2VsZWN0b3J9IGRpdltkYXRhLXRvb2w9JHt0b29sVG9BY3RpdmF0ZX1dYCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgdGhpcy5hdHRhY2hFdmVudHMoKTtcbiAgfVxufTtcbiJdfQ==
},{"./debounce":23}],26:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _files = _interopRequireDefault(require("./files"));

var _tools = _interopRequireDefault(require("./tools"));

var _commands = _interopRequireDefault(require("./commands"));

var _menu = _interopRequireDefault(require("../menu/menu"));

var _debounce = _interopRequireDefault(require("./debounce"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneTools.external.cornerstone = cornerstone;
var config = {
  maxWebWorkers: navigator.hardwareConcurrency || 1,
  startWebWorkersOnDemand: true,
  webWorkerPath: 'node_modules/cornerstone-wado-image-loader/dist/cornerstoneWADOImageLoaderWebWorker.min.js',
  webWorkerTaskPaths: [],
  taskConfiguration: {
    decodeTask: {
      loadCodecsOnStartup: true,
      initializeCodecsOnStartup: false,
      codecsPath: 'cornerstoneWADOImageLoaderCodecs.min.js',
      usePDFJS: false,
      strict: false
    }
  }
};
var IMAGE_LOADED_EVENT = 'cornerstoneimageloaded';
var _default = {
  $window: $(window),
  $viewer: $('.viewer-wrapper'),
  $overlay: $('.loading-overlay'),
  $loadingText: $('.loading-overlay .content .submit-text'),
  numImagesLoaded: 0,
  getNextCase: function getNextCase() {
    var _this = this;

    // Purge the old image cache, we don't expect to ever load the same case again
    cornerstone.imageCache.purgeCache(); // TODO: Check this. Not sure this is necessary, actually, since things should be decached anyway

    cornerstoneWADOImageLoader.wadouri.dataSetCacheManager.purge(); // Clear any old requests in the request pool

    cornerstoneTools.requestPoolManager.clearRequestStack('interaction');
    cornerstoneTools.requestPoolManager.clearRequestStack('prefetch'); // TODO: Cancel all ongoing requests
    // Remove all tool data in the tool state manager

    cornerstoneTools.globalImageIdSpecificToolStateManager.restoreToolState({});
    return new Promise(function (resolve, reject) {
      var enabledElement = cornerstone.getEnabledElement(_this.element);

      _this.$loadingText.text('Retrieving case metadata...');

      _files.default.getCaseImages().then(function (imageIds) {
        _this.$loadingText.text('Loading images...');

        console.time('Loading All Images');
        var loadingProgress = $('#loading-progress');
        var numImagesLoaded = 0;

        function handleImageLoaded() {
          numImagesLoaded += 1;
          var imagesLeft = imageIds.length - numImagesLoaded;
          loadingProgress.text("".concat(imagesLeft, " images requested"));

          if (numImagesLoaded === imageIds.length) {
            console.timeEnd('Loading All Images');
            loadingProgress.text('');
          }
        }

        cornerstone.events.removeEventListener(IMAGE_LOADED_EVENT, handleImageLoaded);
        cornerstone.events.addEventListener(IMAGE_LOADED_EVENT, handleImageLoaded);

        _tools.default.initStackTool(imageIds);

        var bottomRight = $('.viewport #mrbottomright');
        var imageIndex = 1;
        bottomRight.text("Image: ".concat(imageIndex, "/").concat(imageIds.length));
        var currentViewport = cornerstone.getViewport(_this.element);
        cornerstone.loadAndCacheImage(imageIds[0]).then(function (image) {
          resolve(); // Set the default viewport parameters
          // We need the new scale and translation parameters so the image fits properly

          var viewport = cornerstone.getDefaultViewport(enabledElement.canvas, image); // e.g. lung window
          //viewport.voi.windowWidth = 1500;
          //viewport.voi.windowCenter = -300;
          // Retain current window width and center

          if (currentViewport) {
            viewport.voi.windowWidth = currentViewport.voi.windowWidth;
            viewport.voi.windowCenter = currentViewport.voi.windowCenter;
          }

          cornerstone.displayImage(_this.element, image, viewport);

          _tools.default.initTools(imageIds);

          _this.$loadingText.text('');
        }, reject);
      }, reject);
    });
  },
  initViewer: function initViewer() {
    var _this2 = this;

    this.$overlay.removeClass('invisible').addClass('loading');
    this.$loadingText.text('Initializing Viewer');
    this.element = $('#cornerstoneViewport')[0];
    $(document.body).css({
      position: 'fixed',
      overflow: 'hidden'
    });

    _menu.default.init();

    this.$viewer.removeClass('invisible');
    _tools.default.element = this.element;
    _commands.default.element = this.element;
    _menu.default.element = this.element;

    _commands.default.initCommands();

    var debounceCornerstoneResize = (0, _debounce.default)(function () {
      return cornerstone.resize(_this2.element, true);
    }, 300);
    this.$window.off('resize', debounceCornerstoneResize);
    this.$window.on('resize', debounceCornerstoneResize);
    cornerstone.enable(this.element); // Listen for changes to the viewport so we can update the text overlays in the corner

    var bottomLeft = $('.viewport #mrbottomrightWWWC');

    function onImageRendered(e) {
      var viewport = e.detail.viewport;
      bottomLeft.text("WW/WC: " + Math.round(viewport.voi.windowWidth) + "/" + Math.round(viewport.voi.windowCenter));
    }

    ;
    this.element.removeEventListener('cornerstoneimagerendered', onImageRendered);
    this.element.addEventListener('cornerstoneimagerendered', onImageRendered);
    var bottomRight = $('.viewport #mrbottomrightImageIndex');

    function onStackScroll(e) {
      var element = e.target;
      var stack = cornerstoneTools.getToolState(element, 'stack');
      var stackData = stack.data[0];
      var imageIndex = stackData.currentImageIdIndex + 1;
      bottomRight.text("Image: ".concat(imageIndex, "/").concat(stackData.imageIds.length));
    }

    ;
    this.element.removeEventListener('cornerstonestackscroll', onStackScroll);
    this.element.addEventListener('cornerstonestackscroll', onStackScroll);
    var loadHandlerTimeout;
    var loadIndicatorDelay = 25;
    var loadIndicator = $('#loadingIndicator');

    var startLoadingHandler = function startLoadingHandler(element) {
      clearTimeout(loadHandlerTimeout);
      loadHandlerTimeout = setTimeout(function () {
        loadIndicator.css('display', 'block');
      }, loadIndicatorDelay);
    };

    var doneLoadingHandler = function doneLoadingHandler(element) {
      clearTimeout(loadHandlerTimeout);
      loadIndicator.css('display', 'none');
    };

    cornerstoneTools.loadHandlerManager.setStartLoadHandler(startLoadingHandler);
    cornerstoneTools.loadHandlerManager.setEndLoadHandler(doneLoadingHandler); // currentSeriesIndex = 0;//a hack to get series in order

    this.getNextCase().then(function () {
      _this2.$overlay.removeClass('loading').addClass('invisible');
    });
  }
};
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZpZXdlci5qcyJdLCJuYW1lcyI6WyJjb3JuZXJzdG9uZVdBRE9JbWFnZUxvYWRlciIsImV4dGVybmFsIiwiY29ybmVyc3RvbmUiLCJjb3JuZXJzdG9uZVRvb2xzIiwiY29uZmlnIiwibWF4V2ViV29ya2VycyIsIm5hdmlnYXRvciIsImhhcmR3YXJlQ29uY3VycmVuY3kiLCJzdGFydFdlYldvcmtlcnNPbkRlbWFuZCIsIndlYldvcmtlclBhdGgiLCJ3ZWJXb3JrZXJUYXNrUGF0aHMiLCJ0YXNrQ29uZmlndXJhdGlvbiIsImRlY29kZVRhc2siLCJsb2FkQ29kZWNzT25TdGFydHVwIiwiaW5pdGlhbGl6ZUNvZGVjc09uU3RhcnR1cCIsImNvZGVjc1BhdGgiLCJ1c2VQREZKUyIsInN0cmljdCIsIklNQUdFX0xPQURFRF9FVkVOVCIsIiR3aW5kb3ciLCIkIiwid2luZG93IiwiJHZpZXdlciIsIiRvdmVybGF5IiwiJGxvYWRpbmdUZXh0IiwibnVtSW1hZ2VzTG9hZGVkIiwiZ2V0TmV4dENhc2UiLCJpbWFnZUNhY2hlIiwicHVyZ2VDYWNoZSIsIndhZG91cmkiLCJkYXRhU2V0Q2FjaGVNYW5hZ2VyIiwicHVyZ2UiLCJyZXF1ZXN0UG9vbE1hbmFnZXIiLCJjbGVhclJlcXVlc3RTdGFjayIsImdsb2JhbEltYWdlSWRTcGVjaWZpY1Rvb2xTdGF0ZU1hbmFnZXIiLCJyZXN0b3JlVG9vbFN0YXRlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJlbmFibGVkRWxlbWVudCIsImdldEVuYWJsZWRFbGVtZW50IiwiZWxlbWVudCIsInRleHQiLCJGaWxlcyIsImdldENhc2VJbWFnZXMiLCJ0aGVuIiwiaW1hZ2VJZHMiLCJjb25zb2xlIiwidGltZSIsImxvYWRpbmdQcm9ncmVzcyIsImhhbmRsZUltYWdlTG9hZGVkIiwiaW1hZ2VzTGVmdCIsImxlbmd0aCIsInRpbWVFbmQiLCJldmVudHMiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiYWRkRXZlbnRMaXN0ZW5lciIsIlRvb2xzIiwiaW5pdFN0YWNrVG9vbCIsImJvdHRvbVJpZ2h0IiwiaW1hZ2VJbmRleCIsImN1cnJlbnRWaWV3cG9ydCIsImdldFZpZXdwb3J0IiwibG9hZEFuZENhY2hlSW1hZ2UiLCJpbWFnZSIsInZpZXdwb3J0IiwiZ2V0RGVmYXVsdFZpZXdwb3J0IiwiY2FudmFzIiwidm9pIiwid2luZG93V2lkdGgiLCJ3aW5kb3dDZW50ZXIiLCJkaXNwbGF5SW1hZ2UiLCJpbml0VG9vbHMiLCJpbml0Vmlld2VyIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImRvY3VtZW50IiwiYm9keSIsImNzcyIsInBvc2l0aW9uIiwib3ZlcmZsb3ciLCJNZW51IiwiaW5pdCIsIkNvbW1hbmRzIiwiaW5pdENvbW1hbmRzIiwiZGVib3VuY2VDb3JuZXJzdG9uZVJlc2l6ZSIsInJlc2l6ZSIsIm9mZiIsIm9uIiwiZW5hYmxlIiwiYm90dG9tTGVmdCIsIm9uSW1hZ2VSZW5kZXJlZCIsImUiLCJkZXRhaWwiLCJNYXRoIiwicm91bmQiLCJvblN0YWNrU2Nyb2xsIiwidGFyZ2V0Iiwic3RhY2siLCJnZXRUb29sU3RhdGUiLCJzdGFja0RhdGEiLCJkYXRhIiwiY3VycmVudEltYWdlSWRJbmRleCIsImxvYWRIYW5kbGVyVGltZW91dCIsImxvYWRJbmRpY2F0b3JEZWxheSIsImxvYWRJbmRpY2F0b3IiLCJzdGFydExvYWRpbmdIYW5kbGVyIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImRvbmVMb2FkaW5nSGFuZGxlciIsImxvYWRIYW5kbGVyTWFuYWdlciIsInNldFN0YXJ0TG9hZEhhbmRsZXIiLCJzZXRFbmRMb2FkSGFuZGxlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOzs7O0FBRUFBLDBCQUEwQixDQUFDQyxRQUEzQixDQUFvQ0MsV0FBcEMsR0FBa0RBLFdBQWxEO0FBQ0FDLGdCQUFnQixDQUFDRixRQUFqQixDQUEwQkMsV0FBMUIsR0FBd0NBLFdBQXhDO0FBRUEsSUFBTUUsTUFB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QU1DLGtCQUFrQixHQUFHLEVBQTNCO0FBQ0EsUUFBTUMsYUFBYSxHQUFHckYsQ0FBQyxDQUFDLG1CQUFELENBQXZCOztBQUVBLFFBQU1zRixtQkFBbUIsR0FBRyxTQUF0QkEsbUJBQXNCLENBQUFqRSxPQUFPLEVBQUk7QUFDckNrRSxNQUFBQSxZQUFZLENBQUNKLGtCQUFELENBQVo7QUFDQUEsTUFBQUEsa0JBQWtCLEdBQUdLLFVBQVUsQ0FBQyxZQUFNO0FBQ3BDSCxRQUFBQSxhQUFhLENBQUMzQixHQUFkLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCO0FBQ0QsT0FGOEIsRUFFNUIwQixrQkFGNEIsQ0FBL0I7QUFHRCxLQUxEOztBQU9BLFFBQU1LLGtCQUFrQixHQUFHLFNBQXJCQSxrQkFBcUIsQ0FBQXBFLE9BQU8sRUFBSTtBQUNwQ2tFLE1BQUFBLFlBQVksQ0FBQ0osa0JBQUQsQ0FBWjtBQUNBRSxNQUFBQSxhQUFhLENBQUMzQixHQUFkLENBQWtCLFNBQWxCLEVBQTZCLE1BQTdCO0FBQ0QsS0FIRDs7QUFLQTNFLElBQUFBLGdCQUFnQixDQUFDMkcsa0JBQWpCLENBQW9DQyxtQkFBcEMsQ0FBd0RMLG1CQUF4RDtBQUNBdkcsSUFBQUEsZ0JBQWdCLENBQUMyRyxrQkFBakIsQ0FBb0NFLGlCQUFwQyxDQUFzREgsa0JBQXRELEVBbEVXLENBb0VYOztBQUNBLFNBQUtuRixXQUFMLEdBQW1CbUIsSUFBbkIsQ0FBd0IsWUFBTTtBQUM1QixNQUFBLE1BQUksQ0FBQ3RCLFFBQUwsQ0FBY21ELFdBQWQsQ0FBMEIsU0FBMUIsRUFBcUNDLFFBQXJDLENBQThDLFdBQTlDO0FBQ0QsS0FGRDtBQUdEO0FBdkpZLEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgRmlsZXMgZnJvbSAnLi9maWxlcyc7XG5pbXBvcnQgVG9vbHMgZnJvbSAnLi90b29scyc7XG5pbXBvcnQgQ29tbWFuZHMgZnJvbSAnLi9jb21tYW5kcyc7XG5pbXBvcnQgTWVudSBmcm9tICcuLi9tZW51L21lbnUnO1xuaW1wb3J0IGRlYm91bmNlIGZyb20gJy4vZGVib3VuY2UnO1xuXG5jb3JuZXJzdG9uZVdBRE9JbWFnZUxvYWRlci5leHRlcm5hbC5jb3JuZXJzdG9uZSA9IGNvcm5lcnN0b25lO1xuY29ybmVyc3RvbmVUb29scy5leHRlcm5hbC5jb3JuZXJzdG9uZSA9IGNvcm5lcnN0b25lO1xuXG5jb25zdCBjb25maWcgPSB7XG4gIG1heFdlYldvcmtlcnM6IG5hdmlnYXRvci5oYXJkd2FyZUNvbmN1cnJlbmN5IHx8IDEsXG4gIHN0YXJ0V2ViV29ya2Vyc09uRGVtYW5kOiB0cnVlLFxuICB3ZWJXb3JrZXJQYXRoOiAnbm9kZV9tb2R1bGVzL2Nvcm5lcnN0b25lLXdhZG8taW1hZ2UtbG9hZGVyL2Rpc3QvY29ybmVyc3RvbmVXQURPSW1hZ2VMb2FkZXJXZWJXb3JrZXIubWluLmpzJyxcbiAgd2ViV29ya2VyVGFza1BhdGhzOiBbXSxcbiAgdGFza0NvbmZpZ3VyYXRpb246IHtcbiAgICBkZWNvZGVUYXNrOiB7XG4gICAgICBsb2FkQ29kZWNzT25TdGFydHVwOiB0cnVlLFxuICAgICAgaW5pdGlhbGl6ZUNvZGVjc09uU3RhcnR1cDogZmFsc2UsXG4gICAgICBjb2RlY3NQYXRoOiAnY29ybmVyc3RvbmVXQURPSW1hZ2VMb2FkZXJDb2RlY3MubWluLmpzJyxcbiAgICAgIHVzZVBERkpTOiBmYWxzZSxcbiAgICAgIHN0cmljdDogZmFsc2UsXG4gICAgfVxuICB9XG59O1xuXG5jb25zdCBJTUFHRV9MT0FERURfRVZFTlQgPSAnY29ybmVyc3RvbmVpbWFnZWxvYWRlZCc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgJHdpbmRvdzogJCh3aW5kb3cpLFxuICAkdmlld2VyOiAkKCcudmlld2VyLXdyYXBwZXInKSxcbiAgJG92ZXJsYXk6ICQoJy5sb2FkaW5nLW92ZXJsYXknKSxcbiAgJGxvYWRpbmdUZXh0OiAkKCcubG9hZGluZy1vdmVybGF5IC5jb250ZW50IC5zdWJtaXQtdGV4dCcpLFxuICBudW1JbWFnZXNMb2FkZWQ6IDAsXG4gIGdldE5leHRDYXNlKCkge1xuICAgIC8vIFB1cmdlIHRoZSBvbGQgaW1hZ2UgY2FjaGUsIHdlIGRvbid0IGV4cGVjdCB0byBldmVyIGxvYWQgdGhlIHNhbWUgY2FzZSBhZ2FpblxuICAgIGNvcm5lcnN0b25lLmltYWdlQ2FjaGUucHVyZ2VDYWNoZSgpO1xuXG4gICAgLy8gVE9ETzogQ2hlY2sgdGhpcy4gTm90IHN1cmUgdGhpcyBpcyBuZWNlc3NhcnksIGFjdHVhbGx5LCBzaW5jZSB0aGluZ3Mgc2hvdWxkIGJlIGRlY2FjaGVkIGFueXdheVxuICAgIGNvcm5lcnN0b25lV0FET0ltYWdlTG9hZGVyLndhZG91cmkuZGF0YVNldENhY2hlTWFuYWdlci5wdXJnZSgpO1xuXG4gICAgLy8gQ2xlYXIgYW55IG9sZCByZXF1ZXN0cyBpbiB0aGUgcmVxdWVzdCBwb29sXG4gICAgY29ybmVyc3RvbmVUb29scy5yZXF1ZXN0UG9vbE1hbmFnZXIuY2xlYXJSZXF1ZXN0U3RhY2soJ2ludGVyYWN0aW9uJyk7XG4gICAgY29ybmVyc3RvbmVUb29scy5yZXF1ZXN0UG9vbE1hbmFnZXIuY2xlYXJSZXF1ZXN0U3RhY2soJ3ByZWZldGNoJyk7XG5cbiAgICAvLyBUT0RPOiBDYW5jZWwgYWxsIG9uZ29pbmcgcmVxdWVzdHNcblxuICAgIC8vIFJlbW92ZSBhbGwgdG9vbCBkYXRhIGluIHRoZSB0b29sIHN0YXRlIG1hbmFnZXJcbiAgICBjb3JuZXJzdG9uZVRvb2xzLmdsb2JhbEltYWdlSWRTcGVjaWZpY1Rvb2xTdGF0ZU1hbmFnZXIucmVzdG9yZVRvb2xTdGF0ZSh7fSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgZW5hYmxlZEVsZW1lbnQgPSBjb3JuZXJzdG9uZS5nZXRFbmFibGVkRWxlbWVudCh0aGlzLmVsZW1lbnQpO1xuXG4gICAgICB0aGlzLiRsb2FkaW5nVGV4dC50ZXh0KCdSZXRyaWV2aW5nIGNhc2UgbWV0YWRhdGEuLi4nKTtcbiAgICAgIEZpbGVzLmdldENhc2VJbWFnZXMoKS50aGVuKChpbWFnZUlkcykgPT4ge1xuICAgICAgICB0aGlzLiRsb2FkaW5nVGV4dC50ZXh0KCdMb2FkaW5nIGltYWdlcy4uLicpO1xuICAgICAgICBjb25zb2xlLnRpbWUoJ0xvYWRpbmcgQWxsIEltYWdlcycpO1xuXG4gICAgICAgIGNvbnN0IGxvYWRpbmdQcm9ncmVzcyA9ICQoJyNsb2FkaW5nLXByb2dyZXNzJyk7XG4gICAgICAgIGxldCBudW1JbWFnZXNMb2FkZWQgPSAwO1xuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZUltYWdlTG9hZGVkKCkge1xuICAgICAgICAgIG51bUltYWdlc0xvYWRlZCArPSAxO1xuICAgICAgICAgIGNvbnN0IGltYWdlc0xlZnQgPSBpbWFnZUlkcy5sZW5ndGggLSBudW1JbWFnZXNMb2FkZWQ7XG4gICAgICAgICAgbG9hZGluZ1Byb2dyZXNzLnRleHQoYCR7aW1hZ2VzTGVmdH0gaW1hZ2VzIHJlcXVlc3RlZGApO1xuICAgICAgICAgIGlmIChudW1JbWFnZXNMb2FkZWQgPT09IGltYWdlSWRzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS50aW1lRW5kKCdMb2FkaW5nIEFsbCBJbWFnZXMnKTtcbiAgICAgICAgICAgIGxvYWRpbmdQcm9ncmVzcy50ZXh0KCcnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb3JuZXJzdG9uZS5ldmVudHMucmVtb3ZlRXZlbnRMaXN0ZW5lcihJTUFHRV9MT0FERURfRVZFTlQsIGhhbmRsZUltYWdlTG9hZGVkKTtcbiAgICAgICAgY29ybmVyc3RvbmUuZXZlbnRzLmFkZEV2ZW50TGlzdGVuZXIoSU1BR0VfTE9BREVEX0VWRU5ULCBoYW5kbGVJbWFnZUxvYWRlZCk7XG5cbiAgICAgICAgVG9vbHMuaW5pdFN0YWNrVG9vbChpbWFnZUlkcyk7XG5cbiAgICAgICAgY29uc3QgYm90dG9tUmlnaHQgPSAkKCcudmlld3BvcnQgI21yYm90dG9tcmlnaHQnKTtcbiAgICAgICAgY29uc3QgaW1hZ2VJbmRleCA9IDE7XG4gICAgICAgIGJvdHRvbVJpZ2h0LnRleHQoYEltYWdlOiAke2ltYWdlSW5kZXh9LyR7aW1hZ2VJZHMubGVuZ3RofWApO1xuXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWaWV3cG9ydCA9IGNvcm5lcnN0b25lLmdldFZpZXdwb3J0KHRoaXMuZWxlbWVudCk7XG5cbiAgICAgICAgY29ybmVyc3RvbmUubG9hZEFuZENhY2hlSW1hZ2UoaW1hZ2VJZHNbMF0pLnRoZW4oKGltYWdlKSA9PiB7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuXG4gICAgICAgICAgLy8gU2V0IHRoZSBkZWZhdWx0IHZpZXdwb3J0IHBhcmFtZXRlcnNcbiAgICAgICAgICAvLyBXZSBuZWVkIHRoZSBuZXcgc2NhbGUgYW5kIHRyYW5zbGF0aW9uIHBhcmFtZXRlcnMgc28gdGhlIGltYWdlIGZpdHMgcHJvcGVybHlcbiAgICAgICAgICBjb25zdCB2aWV3cG9ydCA9IGNvcm5lcnN0b25lLmdldERlZmF1bHRWaWV3cG9ydChlbmFibGVkRWxlbWVudC5jYW52YXMsIGltYWdlKTtcbiAgICAgICAgICAvLyBlLmcuIGx1bmcgd2luZG93XG4gICAgICAgICAgLy92aWV3cG9ydC52b2kud2luZG93V2lkdGggPSAxNTAwO1xuICAgICAgICAgIC8vdmlld3BvcnQudm9pLndpbmRvd0NlbnRlciA9IC0zMDA7XG5cbiAgICAgICAgICAvLyBSZXRhaW4gY3VycmVudCB3aW5kb3cgd2lkdGggYW5kIGNlbnRlclxuICAgICAgICAgIGlmIChjdXJyZW50Vmlld3BvcnQpIHtcbiAgICAgICAgICAgIHZpZXdwb3J0LnZvaS53aW5kb3dXaWR0aCA9IGN1cnJlbnRWaWV3cG9ydC52b2kud2luZG93V2lkdGg7XG4gICAgICAgICAgICB2aWV3cG9ydC52b2kud2luZG93Q2VudGVyID0gY3VycmVudFZpZXdwb3J0LnZvaS53aW5kb3dDZW50ZXI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29ybmVyc3RvbmUuZGlzcGxheUltYWdlKHRoaXMuZWxlbWVudCwgaW1hZ2UsIHZpZXdwb3J0KTtcbiAgICAgICAgICBUb29scy5pbml0VG9vbHMoaW1hZ2VJZHMpO1xuXG4gICAgICAgICAgdGhpcy4kbG9hZGluZ1RleHQudGV4dCgnJyk7XG4gICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9LCByZWplY3QpO1xuICAgIH0pO1xuICB9LFxuXG4gIGluaXRWaWV3ZXIoKSB7XG4gICAgdGhpcy4kb3ZlcmxheS5yZW1vdmVDbGFzcygnaW52aXNpYmxlJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB0aGlzLiRsb2FkaW5nVGV4dC50ZXh0KCdJbml0aWFsaXppbmcgVmlld2VyJyk7XG4gICAgdGhpcy5lbGVtZW50ID0gJCgnI2Nvcm5lcnN0b25lVmlld3BvcnQnKVswXTtcblxuICAgICQoZG9jdW1lbnQuYm9keSkuY3NzKHtcbiAgICAgIHBvc2l0aW9uOiAnZml4ZWQnLFxuICAgICAgb3ZlcmZsb3c6ICdoaWRkZW4nXG4gICAgfSk7XG5cbiAgICBNZW51LmluaXQoKTtcblxuICAgIHRoaXMuJHZpZXdlci5yZW1vdmVDbGFzcygnaW52aXNpYmxlJyk7XG5cbiAgICBUb29scy5lbGVtZW50ID0gdGhpcy5lbGVtZW50O1xuICAgIENvbW1hbmRzLmVsZW1lbnQgPSB0aGlzLmVsZW1lbnQ7XG4gICAgTWVudS5lbGVtZW50ID0gdGhpcy5lbGVtZW50O1xuXG4gICAgQ29tbWFuZHMuaW5pdENvbW1hbmRzKCk7XG5cbiAgICBjb25zdCBkZWJvdW5jZUNvcm5lcnN0b25lUmVzaXplID0gZGVib3VuY2UoKCkgPT4gY29ybmVyc3RvbmUucmVzaXplKHRoaXMuZWxlbWVudCwgdHJ1ZSksIDMwMCk7XG5cbiAgICB0aGlzLiR3aW5kb3cub2ZmKCdyZXNpemUnLCBkZWJvdW5jZUNvcm5lcnN0b25lUmVzaXplKTtcbiAgICB0aGlzLiR3aW5kb3cub24oJ3Jlc2l6ZScsIGRlYm91bmNlQ29ybmVyc3RvbmVSZXNpemUpO1xuXG4gICAgY29ybmVyc3RvbmUuZW5hYmxlKHRoaXMuZWxlbWVudCk7XG5cbiAgICAvLyBMaXN0ZW4gZm9yIGNoYW5nZXMgdG8gdGhlIHZpZXdwb3J0IHNvIHdlIGNhbiB1cGRhdGUgdGhlIHRleHQgb3ZlcmxheXMgaW4gdGhlIGNvcm5lclxuICAgIGNvbnN0IGJvdHRvbUxlZnQgPSAkKCcudmlld3BvcnQgI21yYm90dG9tcmlnaHRXV1dDJyk7XG4gICAgZnVuY3Rpb24gb25JbWFnZVJlbmRlcmVkKGUpIHtcbiAgICAgICAgY29uc3Qgdmlld3BvcnQgPSBlLmRldGFpbC52aWV3cG9ydDtcbiAgICAgICAgYm90dG9tTGVmdC50ZXh0KFwiV1cvV0M6IFwiICsgTWF0aC5yb3VuZCh2aWV3cG9ydC52b2kud2luZG93V2lkdGgpICsgXCIvXCIgKyBNYXRoLnJvdW5kKHZpZXdwb3J0LnZvaS53aW5kb3dDZW50ZXIpKTtcbiAgICB9O1xuXG4gICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nvcm5lcnN0b25laW1hZ2VyZW5kZXJlZCcsIG9uSW1hZ2VSZW5kZXJlZCk7XG4gICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2Nvcm5lcnN0b25laW1hZ2VyZW5kZXJlZCcsIG9uSW1hZ2VSZW5kZXJlZCk7XG5cbiAgICBjb25zdCBib3R0b21SaWdodCA9ICQoJy52aWV3cG9ydCAjbXJib3R0b21yaWdodEltYWdlSW5kZXgnKTtcbiAgICBmdW5jdGlvbiBvblN0YWNrU2Nyb2xsKGUpIHtcbiAgICAgIGNvbnN0IGVsZW1lbnQgPSBlLnRhcmdldDtcbiAgICAgIGNvbnN0IHN0YWNrID0gY29ybmVyc3RvbmVUb29scy5nZXRUb29sU3RhdGUoZWxlbWVudCwgJ3N0YWNrJyk7XG4gICAgICBjb25zdCBzdGFja0RhdGEgPSBzdGFjay5kYXRhWzBdO1xuICAgICAgY29uc3QgaW1hZ2VJbmRleCA9IHN0YWNrRGF0YS5jdXJyZW50SW1hZ2VJZEluZGV4ICsgMTtcbiAgICAgIGJvdHRvbVJpZ2h0LnRleHQoYEltYWdlOiAke2ltYWdlSW5kZXh9LyR7c3RhY2tEYXRhLmltYWdlSWRzLmxlbmd0aH1gKTtcbiAgICB9O1xuXG4gICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nvcm5lcnN0b25lc3RhY2tzY3JvbGwnLCBvblN0YWNrU2Nyb2xsKTtcbiAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY29ybmVyc3RvbmVzdGFja3Njcm9sbCcsIG9uU3RhY2tTY3JvbGwpO1xuXG4gICAgbGV0IGxvYWRIYW5kbGVyVGltZW91dDtcbiAgICBjb25zdCBsb2FkSW5kaWNhdG9yRGVsYXkgPSAyNTtcbiAgICBjb25zdCBsb2FkSW5kaWNhdG9yID0gJCgnI2xvYWRpbmdJbmRpY2F0b3InKTtcblxuICAgIGNvbnN0IHN0YXJ0TG9hZGluZ0hhbmRsZXIgPSBlbGVtZW50ID0+IHtcbiAgICAgIGNsZWFyVGltZW91dChsb2FkSGFuZGxlclRpbWVvdXQpO1xuICAgICAgbG9hZEhhbmRsZXJUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGxvYWRJbmRpY2F0b3IuY3NzKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICB9LCBsb2FkSW5kaWNhdG9yRGVsYXkpO1xuICAgIH07XG5cbiAgICBjb25zdCBkb25lTG9hZGluZ0hhbmRsZXIgPSBlbGVtZW50ID0+IHtcbiAgICAgIGNsZWFyVGltZW91dChsb2FkSGFuZGxlclRpbWVvdXQpO1xuICAgICAgbG9hZEluZGljYXRvci5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgIH07XG5cbiAgICBjb3JuZXJzdG9uZVRvb2xzLmxvYWRIYW5kbGVyTWFuYWdlci5zZXRTdGFydExvYWRIYW5kbGVyKHN0YXJ0TG9hZGluZ0hhbmRsZXIpO1xuICAgIGNvcm5lcnN0b25lVG9vbHMubG9hZEhhbmRsZXJNYW5hZ2VyLnNldEVuZExvYWRIYW5kbGVyKGRvbmVMb2FkaW5nSGFuZGxlcik7XG5cbiAgICAvLyBjdXJyZW50U2VyaWVzSW5kZXggPSAwOy8vYSBoYWNrIHRvIGdldCBzZXJpZXMgaW4gb3JkZXJcbiAgICB0aGlzLmdldE5leHRDYXNlKCkudGhlbigoKSA9PiB7XG4gICAgICB0aGlzLiRvdmVybGF5LnJlbW92ZUNsYXNzKCdsb2FkaW5nJykuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuICAgIH0pO1xuICB9XG59XG4iXX0=
},{"../menu/menu":18,"./commands":21,"./debounce":23,"./files":24,"./tools":25}]},{},[16])