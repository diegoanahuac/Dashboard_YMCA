// Simulación mínima de la API dash para probar la página localmente.
(() => {
  const DATA = window.__DATA; const calcs = {}; const draws = {}; const onDatas = [];
  let params = { ...window.__PARAMS };
  const defaults = { ...window.__PARAMS };
  const run = () => {
    for (const [id, c] of Object.entries(calcs)) c.out = c.fn(...c.inputs.map((i) => (DATA[i] ?? calcs[i].out)));
    onDatas.forEach((f) => f());
    for (const [name, fn] of Object.entries(draws)) document.querySelectorAll(`[data-draw="${name}"]`).forEach((el) => { if (!el.closest('[hidden]')) fn(el); });
  };
  window.dash = {
    colors: ['#2a6fdb', '#d9822b', '#1f9e74', '#b6458f', '#6b6bd6', '#c0a030', '#5c8a8a', '#888'],
    data: (id) => (DATA[id] ? { status: 'ok', data: DATA[id] } : calcs[id] ? { status: 'ok', data: calcs[id].out } : { status: 'missing', data: [] }),
    calc: (id, o) => { calcs[id] = { ...o }; },
    onData: (f) => { onDatas.push(f); },
    draw: (name, fn) => { if (fn) draws[name] = fn; },
    params: () => ({ ...params }),
    setParams: (o) => { params = { ...params, ...o }; for (const k in params) if (params[k] == null) delete params[k]; queueMicrotask(run); },
    resetParams: () => { params = { ...defaults }; queueMicrotask(run); },
    setLink: () => {},
    __run: run,
  };
})();
