/*! pharaonic/livewire-assistant | MIT License */

// resources/js/diagnostics.js
var ERROR_EVENT = "pharaonic:assistant:error";
function assistantError(code, message, cause) {
  const error = new Error(`[Pharaonic Assistant] ${message}`, cause === void 0 ? void 0 : { cause });
  error.name = "PharaonicAssistantError";
  error.code = code;
  return error;
}
function createReporter(win) {
  return function report(code, message, { integration = null, componentId = null, element = null, cause } = {}) {
    var _a;
    const detail = { code, message, integration, componentId, element };
    try {
      win.dispatchEvent(new win.CustomEvent(ERROR_EVENT, { detail }));
    } finally {
      (_a = win.console) == null ? void 0 : _a.error(`[Pharaonic Assistant] ${code}: ${message}`, ...cause === void 0 ? [] : [cause]);
    }
  };
}

// resources/js/livewire.js
var livewire = {
  present(win) {
    return win.livewire !== void 0 || win.Livewire !== void 0;
  },
  detect(win) {
    const instance = win.Livewire;
    return instance !== null && typeof instance === "object" && typeof instance.hook === "function" && typeof instance.all === "function" && typeof instance.find === "function" && typeof instance.interceptMessage === "function";
  },
  connect(win, events) {
    const livewire2 = win.Livewire;
    const document = win.document;
    const tracked = /* @__PURE__ */ new WeakSet();
    const waiting = /* @__PURE__ */ new Map();
    const componentOf = (id) => {
      var _a, _b;
      return (_b = (_a = livewire2.find(id)) == null ? void 0 : _a.__instance) != null ? _b : null;
    };
    const track = (component) => {
      if (component && !tracked.has(component)) {
        tracked.add(component);
        component.addCleanup(() => {
          rejectAll(component, () => assistantError("stale-context", `Component "${component.id}" was removed before its request finished.`));
          events.componentRemoved(component);
        });
      }
      return component;
    };
    const listOf = (component) => {
      let list = waiting.get(component);
      if (!list) {
        list = /* @__PURE__ */ new Set();
        waiting.set(component, list);
      }
      return list;
    };
    const rejectAll = (component, error) => {
      var _a;
      const list = (_a = waiting.get(component)) != null ? _a : /* @__PURE__ */ new Set();
      for (const operation of list) {
        operation.reject(error());
      }
      list.clear();
      waiting.delete(component);
    };
    const requestFailed = (component) => assistantError("request-failed", `The Livewire request of component "${component.id}" failed.`);
    const enqueue = (component, start2) => new Promise((resolve, reject) => {
      const list = listOf(component);
      const operation = {
        resolve: (value) => list.delete(operation) && resolve(value),
        reject: (error) => list.delete(operation) && reject(error)
      };
      list.add(operation);
      start2(operation);
    });
    const follow = (component, operation, promise, result) => promise.then(
      (value) => operation.resolve(result(value)),
      (failure) => (failure == null ? void 0 : failure.errors) ? operation.resolve(void 0) : operation.reject(requestFailed(component))
    );
    livewire2.hook("component.init", ({ component }) => {
      track(component);
      events.componentAdded(component);
    });
    livewire2.hook("element.init", ({ el }) => {
      var _a;
      if ((_a = el.hasAttribute) == null ? void 0 : _a.call(el, "data-pharaonic")) {
        events.added(el);
      }
    });
    livewire2.hook("morph.added", ({ el }) => events.added(el));
    const differing = /* @__PURE__ */ new WeakSet();
    livewire2.hook("morph.updating", ({ el, toEl }) => {
      if (!el.isEqualNode(toEl)) {
        differing.add(el);
      }
    });
    livewire2.hook("morph.updated", ({ el }) => {
      if (differing.delete(el)) {
        events.changed(el);
      }
    });
    livewire2.hook("morph.removed", ({ el }) => events.removed(el));
    livewire2.interceptMessage(({ message, onError, onFailure, onCancel, onFinish }) => {
      var _a;
      const component = message.component;
      const carried = [...(_a = waiting.get(component)) != null ? _a : []].filter((operation) => operation.deferred && !operation.carried);
      let failed = false;
      carried.forEach((operation) => operation.carried = true);
      onError(() => failed = true);
      onFailure(() => failed = true);
      onCancel(() => failed = true);
      onFinish(() => {
        if (failed) {
          carried.forEach((operation) => operation.reject(requestFailed(component)));
          return;
        }
        carried.forEach((operation) => operation.resolve(void 0));
        events.settled(component);
      });
    });
    document.addEventListener("livewire:navigating", () => events.navigating());
    document.addEventListener("livewire:navigated", () => events.ready());
    document.addEventListener("livewire:initialized", () => events.ready());
    if (livewire2.initialRenderIsFinished || livewire2.all().length > 0) {
      events.ready();
    }
    const find = (id) => track(componentOf(id));
    return {
      find,
      ownerOf(element) {
        const root = element.closest("[wire\\:id]");
        return root ? find(root.getAttribute("wire:id")) : null;
      },
      idOf(component) {
        return component.id;
      },
      isAlive(component) {
        return componentOf(component.id) === component;
      },
      get(component, path) {
        return path.split(".").reduce((carry, segment) => carry === null || carry === void 0 ? void 0 : carry[segment], component.ephemeral);
      },
      set(component, path, value, { live }) {
        value = value === void 0 ? void 0 : JSON.parse(JSON.stringify(value));
        return enqueue(component, (operation) => {
          if (live) {
            follow(component, operation, component.$wire.$set(path, value, true), () => void 0);
            return;
          }
          operation.deferred = true;
          component.$wire.$set(path, value, false);
        });
      },
      call(component, method, args) {
        return enqueue(component, (operation) => {
          follow(component, operation, component.$wire.$call(method, ...args), (value) => value != null ? value : void 0);
        });
      }
    };
  }
};

// resources/js/runtime.js
var SELECTOR = "[data-pharaonic]";
var NAME_PATTERN = /^[A-Za-z0-9][\w.:-]*$/;
var PATH_PATTERN = /^[A-Za-z_$][\w$]*(?:\.[\w$]+)*$/;
function createRuntime({ window: win, livewire: livewire2 }) {
  const document = win.document;
  const report = createReporter(win);
  const registrations = /* @__PURE__ */ new Map();
  const records = /* @__PURE__ */ new WeakMap();
  const mounted = /* @__PURE__ */ new Set();
  const pending = /* @__PURE__ */ new Set();
  const skipped = /* @__PURE__ */ new WeakMap();
  const warned = /* @__PURE__ */ new Set();
  const watchers = /* @__PURE__ */ new Map();
  const queuedRoots = /* @__PURE__ */ new Set();
  const queuedChanges = /* @__PURE__ */ new Set();
  const settled = /* @__PURE__ */ new Set();
  let connection = null;
  let ready = false;
  let started = false;
  let unsupported = false;
  let flushQueued = false;
  let retryPending = false;
  function register2(name, definition) {
    if (typeof name !== "string" || !NAME_PATTERN.test(name.trim())) {
      throw assistantError("invalid-registration", 'An integration name must be a non-empty string of letters, digits, ".", ":", "_" or "-".');
    }
    name = name.trim();
    if (typeof (definition == null ? void 0 : definition.mount) !== "function" || definition.update !== void 0 && typeof definition.update !== "function") {
      throw assistantError("invalid-registration", `Integration "${name}" must be an object with a mount(context) function and an optional update(context) function.`);
    }
    const current = registrations.get(name);
    if (current) {
      if (current.definition === definition) {
        return current.unregister;
      }
      throw assistantError("registration-conflict", `Integration "${name}" is already registered with a different definition.`);
    }
    const registration = { name, definition };
    registration.unregister = () => {
      if (registrations.get(name) === registration) {
        registrations.delete(name);
        teardownWhere((record) => record.registration === registration);
      }
    };
    registrations.set(name, registration);
    if (ready) {
      discover(document);
    }
    return registration.unregister;
  }
  function start2() {
    if (!started) {
      started = true;
      connect();
    }
  }
  function scan2(root = document) {
    if (ready) {
      discover(root);
    }
  }
  function destroy2(root = document) {
    const inside = (element) => root === element || root.contains(element);
    teardownWhere((record) => inside(record.element));
    for (const element of [...pending]) {
      if (inside(element)) {
        pending.delete(element);
      }
    }
    for (const element of matches(root)) {
      skipped.delete(element);
    }
  }
  function connect() {
    if (livewire2.detect(win)) {
      connection = livewire2.connect(win, createEvents());
      return;
    }
    if (livewire2.present(win)) {
      unsupported = true;
      report("livewire-unsupported", "The Livewire runtime on this page is not supported by this release of Pharaonic Livewire Assistant; it supports Livewire 4.");
      return;
    }
    const retry = () => {
      if (!connection && !unsupported && livewire2.present(win)) {
        connect();
      }
    };
    const giveUp = () => win.setTimeout(() => {
      retry();
      if (!connection && !unsupported) {
        report("livewire-missing", "Livewire was not found on this page. Load Livewire's scripts before or with @livewireAssistantScripts.");
      }
    }, 0);
    document.addEventListener("DOMContentLoaded", retry, { once: true });
    document.addEventListener("livewire:load", retry, { once: true });
    if (document.readyState === "complete") {
      giveUp();
    } else {
      win.addEventListener("load", giveUp, { once: true });
    }
  }
  function createEvents() {
    const whenReady = (handler) => (...args) => {
      if (ready) {
        handler(...args);
        schedule();
      }
    };
    return {
      ready() {
        ready = true;
        queuedRoots.add(document);
        schedule();
      },
      added: whenReady((root) => queuedRoots.add(root)),
      componentAdded: whenReady(() => retryPending = true),
      changed: whenReady((node) => queuedChanges.add(node)),
      removed: whenReady(() => {
      }),
      settled: whenReady((component) => settled.add(component)),
      componentRemoved(component) {
        teardownWhere((record) => record.component === component);
        watchers.delete(component);
        settled.delete(component);
      },
      navigating() {
        destroy2(document);
      },
      report
    };
  }
  function schedule() {
    if (!flushQueued) {
      flushQueued = true;
      queueMicrotask(flush);
    }
  }
  function flush() {
    var _a;
    flushQueued = false;
    teardownWhere((record) => !record.element.isConnected);
    for (const element of [...pending]) {
      if (!element.isConnected) {
        pending.delete(element);
      }
    }
    const changed = /* @__PURE__ */ new Set();
    for (const node of queuedChanges) {
      for (let current = node; current; current = current.parentElement) {
        if (records.has(current)) {
          changed.add(current);
        }
      }
      if (!records.has(node) && ((_a = node.hasAttribute) == null ? void 0 : _a.call(node, "data-pharaonic"))) {
        queuedRoots.add(node);
      }
    }
    queuedChanges.clear();
    changed.forEach((element) => sync(element, true));
    const roots = [...queuedRoots];
    queuedRoots.clear();
    roots.forEach(discover);
    if (retryPending) {
      retryPending = false;
      for (const element of [...pending]) {
        if (connection.find(readBinding(element).componentId)) {
          skipped.delete(element);
          sync(element);
        }
      }
    }
    const components = [...settled];
    settled.clear();
    components.forEach(notifyWatchers);
  }
  function discover(root) {
    if (root.isConnected !== false) {
      matches(root).forEach((element) => sync(element));
    }
  }
  function sync(element, changed = false) {
    const record = records.get(element);
    if (record) {
      if (!changed) {
        return;
      }
      if (element.isConnected && isSameBinding(record, readBinding(element))) {
        runUpdate(record);
        return;
      }
      teardown(element);
    }
    if (!element.isConnected) {
      return;
    }
    const binding = readBinding(element);
    const registration = registrations.get(binding.name);
    if (!registration) {
      warnMissing(binding.name);
      return;
    }
    const skip = skipped.get(element);
    if ((skip == null ? void 0 : skip.registration) === registration && skip.key === binding.key) {
      return;
    }
    const fail = (code, message, details = {}) => {
      skipped.set(element, { registration, key: binding.key });
      report(code, message, { integration: binding.name, componentId: binding.componentId, element, ...details });
    };
    if (binding.options instanceof Error) {
      fail("invalid-options", `data-options of integration "${binding.name}" must be a JSON object.`, { cause: binding.options });
      return;
    }
    const component = resolve(element, binding);
    if (!component) {
      if (binding.componentId === null) {
        fail("component-not-found", `The element of integration "${binding.name}" is not inside a Livewire component and has no data-component-id.`);
      } else {
        pending.add(element);
        fail("component-not-found", `No Livewire component has the id "${binding.componentId}" given by data-component-id. The element mounts if that component initializes later.`);
      }
      return;
    }
    pending.delete(element);
    mount(element, registration, binding, component, fail);
  }
  function mount(element, registration, binding, component, fail) {
    const record = { element, registration, key: binding.key, component, disposers: [], destroyed: false };
    const details = { componentId: connection.idOf(component) };
    const reject = (code, message, cause) => {
      dispose(record);
      fail(code, message, { ...details, cause });
    };
    record.context = createContext(record, binding);
    let result;
    try {
      result = registration.definition.mount(record.context);
    } catch (error) {
      reject("mount-failed", `Integration "${registration.name}" failed to mount.`, error);
      return;
    }
    if (typeof (result == null ? void 0 : result.then) === "function") {
      reject("mount-async", `mount() of integration "${registration.name}" returned a promise; mount must be synchronous. The instance was not kept.`);
      return;
    }
    if (result !== void 0 && typeof result !== "function") {
      reject("mount-failed", `mount() of integration "${registration.name}" must return a cleanup function or undefined.`);
      return;
    }
    if (result) {
      record.disposers.push(result);
    }
    skipped.delete(element);
    records.set(element, record);
    mounted.add(element);
  }
  function runUpdate(record) {
    const { update } = record.registration.definition;
    try {
      update == null ? void 0 : update.call(record.registration.definition, record.context);
    } catch (error) {
      report("update-failed", `Integration "${record.registration.name}" failed to update.`, describe(record, error));
    }
  }
  function teardownWhere(predicate) {
    for (const element of [...mounted]) {
      if (predicate(records.get(element))) {
        teardown(element);
      }
    }
  }
  function teardown(element) {
    const record = records.get(element);
    pending.delete(element);
    if (record) {
      records.delete(element);
      mounted.delete(element);
      dispose(record);
    }
  }
  function dispose(record) {
    record.destroyed = true;
    for (const disposer of record.disposers.splice(0).reverse()) {
      runDisposer(record, disposer);
    }
  }
  function runDisposer(record, disposer) {
    try {
      disposer();
    } catch (error) {
      report("cleanup-failed", `A cleanup callback of integration "${record.registration.name}" failed.`, describe(record, error));
    }
  }
  function createContext(record, binding) {
    const component = record.component;
    const id = connection.idOf(component);
    const guard = () => {
      if (record.destroyed || !connection.isAlive(component)) {
        throw assistantError("stale-context", `The context of integration "${record.registration.name}" for component "${id}" is no longer active.`);
      }
    };
    const promise = (operation) => new Promise((resolve2) => resolve2(operation()));
    const bridge = Object.freeze({
      id,
      get(path) {
        guard();
        assertPath(path);
        return copy(connection.get(component, path));
      },
      set(path, value, { live = true } = {}) {
        return promise(() => {
          guard();
          assertPath(path);
          return connection.set(component, path, value, { live }).then(() => void 0);
        });
      },
      call(method, ...args) {
        return promise(() => {
          guard();
          return connection.call(component, method, args);
        });
      },
      watch(path, callback) {
        var _a;
        guard();
        assertPath(path);
        const value = connection.get(component, path);
        const watcher = { record, path, callback, value: copy(value), key: canonical(value) };
        const list = (_a = watchers.get(component)) != null ? _a : /* @__PURE__ */ new Set();
        list.add(watcher);
        watchers.set(component, list);
        const unsubscribe = once(() => list.delete(watcher));
        record.disposers.push(unsubscribe);
        return unsubscribe;
      }
    });
    return Object.freeze({
      element: record.element,
      property: binding.property,
      options: binding.options,
      component: bridge,
      onCleanup(callback) {
        if (record.destroyed) {
          runDisposer(record, callback);
        } else {
          record.disposers.push(once(callback));
        }
      }
    });
  }
  function notifyWatchers(component) {
    const list = watchers.get(component);
    if (!list || !connection.isAlive(component)) {
      return;
    }
    for (const watcher of [...list]) {
      const value = connection.get(component, watcher.path);
      const key = canonical(value);
      if (!list.has(watcher) || key === watcher.key) {
        continue;
      }
      const previous = watcher.value;
      watcher.value = copy(value);
      watcher.key = key;
      try {
        watcher.callback(copy(value), previous);
      } catch (error) {
        report("watcher-failed", `A watcher of integration "${watcher.record.registration.name}" on "${watcher.path}" failed.`, describe(watcher.record, error));
      }
    }
  }
  function readBinding(element) {
    var _a;
    const attribute = (name2) => {
      var _a2;
      return ((_a2 = element.getAttribute(name2)) != null ? _a2 : "").trim() || null;
    };
    const raw = element.getAttribute("data-options");
    const options = parseOptions(raw);
    const name = (_a = attribute("data-pharaonic")) != null ? _a : "";
    const property = attribute("data-property");
    const componentId = attribute("data-component-id");
    const optionsKey = options instanceof Error ? `invalid:${raw}` : canonical(options);
    return { name, property, componentId, options, key: JSON.stringify([name, property, componentId, optionsKey]) };
  }
  function resolve(element, binding) {
    return binding.componentId === null ? connection.ownerOf(element) : connection.find(binding.componentId);
  }
  function isSameBinding(record, binding) {
    return binding.key === record.key && registrations.get(binding.name) === record.registration && resolve(record.element, binding) === record.component;
  }
  function describe(record, cause) {
    return { integration: record.registration.name, componentId: connection.idOf(record.component), element: record.element, cause };
  }
  function warnMissing(name) {
    var _a;
    if (name !== "" && !warned.has(name)) {
      warned.add(name);
      (_a = win.console) == null ? void 0 : _a.warn(`[Pharaonic Assistant] No integration is registered as "${name}"; its elements stay unmounted until it registers.`);
    }
  }
  function matches(root) {
    const found = root.nodeType === 1 && root.matches(SELECTOR) ? [root] : [];
    return found.concat([...root.querySelectorAll(SELECTOR)]);
  }
  return { register: register2, start: start2, scan: scan2, destroy: destroy2, report };
}
function assertPath(path) {
  if (typeof path !== "string" || !PATH_PATTERN.test(path)) {
    throw assistantError("invalid-property", `"${String(path)}" is not a valid property path; use a property name or a dot path such as "address.city".`);
  }
}
function parseOptions(raw) {
  if (raw === null || raw.trim() === "") {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : new TypeError("data-options is not a JSON object.");
  } catch (error) {
    return error;
  }
}
function canonical(value) {
  if (value === void 0) {
    return "undefined";
  }
  return JSON.stringify(value, (key, current) => {
    if (current === null || typeof current !== "object" || Array.isArray(current)) {
      return current;
    }
    return Object.fromEntries(Object.keys(current).sort().map((name) => [name, current[name]]));
  });
}
function copy(value) {
  return value === void 0 ? void 0 : JSON.parse(JSON.stringify(value));
}
function once(callback) {
  let called = false;
  return () => {
    if (!called) {
      called = true;
      callback();
    }
  };
}

// resources/js/index.js
function install(win) {
  var _a;
  const namespace = (_a = win.Pharaonic) != null ? _a : win.Pharaonic = {};
  if (namespace.assistant) {
    return namespace.assistant;
  }
  const runtime = createRuntime({ window: win, livewire });
  const assistant2 = Object.freeze({
    register: runtime.register,
    start: runtime.start,
    scan: runtime.scan,
    destroy: runtime.destroy
  });
  namespace.assistant = assistant2;
  const run = (callback) => {
    try {
      if (typeof callback !== "function") {
        throw new TypeError("Queued entries must be functions.");
      }
      callback(assistant2);
    } catch (error) {
      runtime.report("queue-callback-failed", "A queued Pharaonic Assistant registration callback failed.", { cause: error });
    }
  };
  const queued = win.PharaonicAssistantQueue;
  win.PharaonicAssistantQueue = Object.freeze({
    push(...callbacks) {
      callbacks.forEach(run);
      return 0;
    }
  });
  if (Array.isArray(queued)) {
    queued.splice(0).forEach(run);
  } else if (queued !== void 0) {
    runtime.report("queue-callback-failed", "window.PharaonicAssistantQueue must be an array of functions.");
  }
  assistant2.start();
  return assistant2;
}
var assistant = install(window);
var register = (name, definition) => assistant.register(name, definition);
var start = () => assistant.start();
var scan = (root) => assistant.scan(root);
var destroy = (root) => assistant.destroy(root);
export {
  destroy,
  register,
  scan,
  start
};
