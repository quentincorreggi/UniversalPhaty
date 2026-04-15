// Debug overlay — toggle with `D` or the gear button (top-right of canvas).
//
// Every tunable in SL.cfg gets an editable control here. Changes apply
// live and auto-save to localStorage. Use "Copy values" to dump a JS
// snippet that can be pasted back into config.js as the new defaults.
//
// Some config keys (grid sizes, palette) require structural resets; those
// are triggered automatically in `applyChange`.

SL.debugPanel = (function() {

  var STORAGE_KEY = 'sandloop.cfg.v1';
  var rootEl = null;
  var gearEl = null;
  var wonEl  = null;
  var open = false;

  // Schema for the UI. Each entry: { key, label, min, max, step }
  // or { key, label, type: 'color', colorIndex }
  // or { key, label, type: 'seed' } for the gridSeed text area.
  var SCHEMA = [
    { section: 'Canvas' },
    { key: 'canvasW', label: 'Canvas W',     min: 320, max: 1080, step: 10 },
    { key: 'canvasH', label: 'Canvas H',     min: 480, max: 1920, step: 10 },

    { section: 'Sand image' },
    { key: 'imageX',  label: 'X',            min: 0,   max: 800,  step: 1 },
    { key: 'imageY',  label: 'Y',            min: 0,   max: 800,  step: 1 },
    { key: 'imageW',  label: 'Width',        min: 60,  max: 1000, step: 1 },
    { key: 'imageH',  label: 'Height',       min: 60,  max: 1000, step: 1 },
    { key: 'gridCols', label: 'Grid cols',   min: 40,  max: 500,  step: 10, resets: 'sand' },
    { key: 'gridRows', label: 'Grid rows',   min: 40,  max: 500,  step: 10, resets: 'sand' },

    { section: 'Conveyor belt' },
    { key: 'conveyorX', label: 'X',          min: 0,   max: 800,  step: 1 },
    { key: 'conveyorY', label: 'Y',          min: 0,   max: 1500, step: 1 },
    { key: 'conveyorW', label: 'Width',      min: 60,  max: 1000, step: 1 },
    { key: 'conveyorH', label: 'Height',     min: 20,  max: 200,  step: 1 },
    { key: 'conveyorSlots', label: 'Slots',  min: 1,   max: 8,    step: 1 },
    { key: 'conveyorSpeed', label: 'Speed',  min: 0,   max: 240,  step: 2 },

    { section: 'Bucket grid' },
    { key: 'gridX', label: 'X',              min: 0,   max: 800,  step: 1 },
    { key: 'gridY', label: 'Y',              min: 0,   max: 1800, step: 1 },
    { key: 'gridCellSize', label: 'Cell size', min: 30, max: 160, step: 1 },
    { key: 'gridBucketCols', label: 'Cols',  min: 2,   max: 10,   step: 1, resets: 'grid' },
    { key: 'gridBucketRows', label: 'Rows',  min: 1,   max: 8,    step: 1, resets: 'grid' },
    { key: 'gridSeed', type: 'seed',         label: 'Seed (. empty, 1-4 color)', resets: 'grid' },

    { section: 'Suction / bucket flight' },
    { key: 'suctionRadius',   label: 'Suction radius (cells)', min: 1, max: 80, step: 1 },
    { key: 'bucketCapacity',  label: 'Bucket capacity',         min: 10, max: 500, step: 5 },
    { key: 'suctionPerFrame', label: 'Suction / frame',         min: 1, max: 30,  step: 1 },
    { key: 'flightDuration',  label: 'Flight duration (s)',     min: 0.1, max: 1.5, step: 0.05 },
    { key: 'flightArc',       label: 'Flight arc (px)',         min: 0,   max: 400, step: 5 },

    { section: 'Palette' },
    { key: 'background', type: 'color-bg', label: 'Background' },
    { key: 'color1', type: 'color', colorIndex: 1, label: 'Color 1' },
    { key: 'color2', type: 'color', colorIndex: 2, label: 'Color 2' },
    { key: 'color3', type: 'color', colorIndex: 3, label: 'Color 3' },
    { key: 'color4', type: 'color', colorIndex: 4, label: 'Color 4' }
  ];

  // ------------------------------------------------------------------
  // Persistence
  // ------------------------------------------------------------------
  function saveToStorage() {
    try {
      var payload = { cfg: SL.cfg, palette: SL.palette };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) { /* localStorage may be disabled; ignore */ }
  }

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var obj = JSON.parse(raw);
      if (obj && obj.cfg) {
        for (var k in obj.cfg) if (obj.cfg.hasOwnProperty(k)) SL.cfg[k] = obj.cfg[k];
      }
      if (obj && obj.palette && obj.palette.colors) {
        SL.palette.colors = obj.palette.colors;
        SL.palette.background = obj.palette.background;
      }
      return true;
    } catch (e) { return false; }
  }

  function clearStorage() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  // ------------------------------------------------------------------
  // UI
  // ------------------------------------------------------------------
  function build() {
    // Gear button — always visible, toggles panel.
    gearEl = document.createElement('button');
    gearEl.id = 'sl-gear';
    gearEl.title = 'Debug (D)';
    gearEl.textContent = '\u2699';
    gearEl.addEventListener('click', toggle);
    document.body.appendChild(gearEl);

    // Win banner (hidden until all sand collected).
    wonEl = document.createElement('div');
    wonEl.id = 'sl-win';
    wonEl.innerHTML = '<div>Level clear!</div><button id="sl-win-again">Play again</button>';
    wonEl.style.display = 'none';
    document.body.appendChild(wonEl);
    wonEl.querySelector('#sl-win-again').addEventListener('click', function() {
      SL.sandfield.reset(SL.cfg.gridCols, SL.cfg.gridRows);
      SL.bucketGrid.reset();
      SL.conveyor.reset();
      entities = [];
      SL.state = 'playing';
      wonEl.style.display = 'none';
    });

    // Root panel.
    rootEl = document.createElement('div');
    rootEl.id = 'sl-debug';
    rootEl.style.display = 'none';
    document.body.appendChild(rootEl);

    rebuildContents();

    // Keyboard shortcut.
    window.addEventListener('keydown', function(ev) {
      if (ev.key === 'd' || ev.key === 'D') toggle();
    });

    injectStyles();
  }

  function rebuildContents() {
    rootEl.innerHTML = '';
    var header = document.createElement('div');
    header.className = 'sl-header';
    header.innerHTML = '<span>Sandloop debug</span>';
    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.className = 'sl-close';
    closeBtn.addEventListener('click', toggle);
    header.appendChild(closeBtn);
    rootEl.appendChild(header);

    var body = document.createElement('div');
    body.className = 'sl-body';
    rootEl.appendChild(body);

    for (var i = 0; i < SCHEMA.length; i++) {
      var item = SCHEMA[i];
      if (item.section) {
        var h = document.createElement('h4');
        h.textContent = item.section;
        body.appendChild(h);
        continue;
      }
      body.appendChild(buildRow(item));
    }

    // Actions.
    var act = document.createElement('div');
    act.className = 'sl-actions';
    act.appendChild(btn('Reset image', function() {
      SL.sandfield.reset(SL.cfg.gridCols, SL.cfg.gridRows);
    }));
    act.appendChild(btn('Reset grid', function() {
      SL.bucketGrid.reset();
    }));
    act.appendChild(btn('Reset belt', function() {
      SL.conveyor.reset();
      entities = [];
    }));
    act.appendChild(btn('Copy values', copyValues));
    act.appendChild(btn('Save', saveToStorage));
    act.appendChild(btn('Load', function() {
      if (loadFromStorage()) {
        // Structural refresh.
        applyStructuralRefresh();
        rebuildContents();
      }
    }));
    act.appendChild(btn('Reset defaults', function() {
      clearStorage();
      for (var k in SL.cfgDefault) {
        if (SL.cfgDefault.hasOwnProperty(k)) {
          var v = SL.cfgDefault[k];
          SL.cfg[k] = (Object.prototype.toString.call(v) === '[object Array]') ? v.slice() : v;
        }
      }
      applyStructuralRefresh();
      rebuildContents();
    }));
    rootEl.appendChild(act);

    var info = document.createElement('div');
    info.className = 'sl-info';
    info.innerHTML = 'Press <b>D</b> to toggle. Changes save to localStorage.';
    rootEl.appendChild(info);
  }

  function btn(text, fn) {
    var b = document.createElement('button');
    b.textContent = text;
    b.addEventListener('click', fn);
    return b;
  }

  function buildRow(item) {
    var row = document.createElement('div');
    row.className = 'sl-row';
    var label = document.createElement('label');
    label.textContent = item.label;
    row.appendChild(label);

    if (item.type === 'color' || item.type === 'color-bg') {
      var input = document.createElement('input');
      input.type = 'color';
      input.value = (item.type === 'color-bg') ? SL.palette.background : SL.palette.colors[item.colorIndex];
      input.addEventListener('input', function() {
        if (item.type === 'color-bg') SL.palette.background = input.value;
        else SL.palette.colors[item.colorIndex] = input.value;
        saveToStorage();
      });
      row.appendChild(input);
      return row;
    }

    if (item.type === 'seed') {
      var ta = document.createElement('textarea');
      ta.rows = 4;
      ta.value = SL.cfg.gridSeed.join('\n');
      ta.addEventListener('change', function() {
        SL.cfg.gridSeed = ta.value.split(/\r?\n/).filter(function(s){ return s.length; });
        applyChange(item);
        saveToStorage();
      });
      row.appendChild(ta);
      return row;
    }

    // Numeric: slider + number input.
    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = item.min;
    slider.max = item.max;
    slider.step = item.step;
    slider.value = SL.cfg[item.key];

    var num = document.createElement('input');
    num.type = 'number';
    num.min = item.min;
    num.max = item.max;
    num.step = item.step;
    num.value = SL.cfg[item.key];
    num.className = 'sl-num';

    function onChange(v) {
      var n = parseFloat(v);
      if (isNaN(n)) return;
      SL.cfg[item.key] = n;
      slider.value = n;
      num.value = n;
      applyChange(item);
      saveToStorage();
    }
    slider.addEventListener('input', function() { onChange(slider.value); });
    num.addEventListener('change', function() { onChange(num.value); });

    row.appendChild(slider);
    row.appendChild(num);
    return row;
  }

  function applyChange(item) {
    // Resize canvas if size changed.
    if (item.key === 'canvasW' || item.key === 'canvasH') {
      canvas.width = SL.cfg.canvasW;
      canvas.height = SL.cfg.canvasH;
      W = canvas.width;
      H = canvas.height;
      return;
    }
    if (item.resets === 'sand') {
      SL.sandfield.reset(SL.cfg.gridCols, SL.cfg.gridRows);
    } else if (item.resets === 'grid') {
      SL.bucketGrid.reset();
    }
  }

  function applyStructuralRefresh() {
    canvas.width = SL.cfg.canvasW;
    canvas.height = SL.cfg.canvasH;
    W = canvas.width;
    H = canvas.height;
    SL.sandfield.reset(SL.cfg.gridCols, SL.cfg.gridRows);
    SL.bucketGrid.reset();
    SL.conveyor.reset();
    entities = [];
  }

  function copyValues() {
    // Build a JS snippet the user can paste into SL.cfgDefault.
    var lines = ['SL.cfgDefault = {'];
    var order = [
      'canvasW','canvasH',
      'imageX','imageY','imageW','imageH',
      'gridCols','gridRows',
      'conveyorX','conveyorY','conveyorW','conveyorH','conveyorSlots','conveyorSpeed',
      'gridX','gridY','gridCellSize','gridBucketCols','gridBucketRows',
      'suctionRadius','bucketCapacity','suctionPerFrame',
      'flightDuration','flightArc',
      'sandPixelScale','belowImageMargin'
    ];
    for (var i = 0; i < order.length; i++) {
      var k = order[i];
      lines.push('  ' + k + ': ' + JSON.stringify(SL.cfg[k]) + ',');
    }
    lines.push('  gridSeed: ' + JSON.stringify(SL.cfg.gridSeed) + ',');
    lines.push('};');
    lines.push('SL.palette.background = ' + JSON.stringify(SL.palette.background) + ';');
    lines.push('SL.palette.colors = ' + JSON.stringify(SL.palette.colors) + ';');
    var snippet = lines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(snippet).then(function() {
        toast('Copied to clipboard');
      }, function() { showSnippet(snippet); });
    } else {
      showSnippet(snippet);
    }
  }

  function showSnippet(snippet) {
    var pre = document.createElement('textarea');
    pre.value = snippet;
    pre.className = 'sl-snippet';
    document.body.appendChild(pre);
    pre.select();
    setTimeout(function() { pre.remove(); }, 15000);
    toast('Snippet shown — copy and close');
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'sl-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 1800);
  }

  function toggle() {
    open = !open;
    rootEl.style.display = open ? 'block' : 'none';
  }

  // Win banner handling (called from game loop).
  function updateWinUI() {
    if (SL.state === 'won') wonEl.style.display = 'flex';
    else wonEl.style.display = 'none';
  }

  // ------------------------------------------------------------------
  // Styles (injected once).
  // ------------------------------------------------------------------
  function injectStyles() {
    var css = ''
      + '#sl-gear{position:fixed;top:10px;right:10px;z-index:1000;'
      +   'width:38px;height:38px;border-radius:10px;border:none;'
      +   'background:#2a313c;color:#fff;font-size:22px;cursor:pointer;'
      +   'box-shadow:0 2px 8px rgba(0,0,0,0.3);}'
      + '#sl-gear:hover{background:#3a414d;}'
      + '#sl-debug{position:fixed;top:60px;right:10px;width:340px;'
      +   'max-height:85vh;overflow:auto;background:#1c2028;color:#dde1ea;'
      +   'border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);'
      +   'font-family:Fredoka,sans-serif;font-size:13px;z-index:999;}'
      + '.sl-header{display:flex;justify-content:space-between;align-items:center;'
      +   'padding:10px 12px;background:#262b35;border-radius:12px 12px 0 0;'
      +   'font-weight:600;}'
      + '.sl-close{background:none;border:none;color:#fff;font-size:16px;cursor:pointer;}'
      + '.sl-body{padding:8px 12px;}'
      + '.sl-body h4{margin:12px 0 4px;font-size:11px;text-transform:uppercase;'
      +   'letter-spacing:0.08em;color:#8d95a3;}'
      + '.sl-row{display:flex;align-items:center;gap:6px;margin:4px 0;}'
      + '.sl-row label{flex:0 0 110px;color:#b9c1cf;}'
      + '.sl-row input[type=range]{flex:1;}'
      + '.sl-row .sl-num{width:56px;background:#2a313c;color:#fff;border:none;'
      +   'padding:3px 6px;border-radius:4px;font-family:inherit;}'
      + '.sl-row input[type=color]{width:56px;height:28px;border:none;'
      +   'background:transparent;cursor:pointer;}'
      + '.sl-row textarea{flex:1;background:#2a313c;color:#fff;border:none;'
      +   'padding:4px 6px;border-radius:4px;font-family:monospace;font-size:12px;}'
      + '.sl-actions{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;'
      +   'border-top:1px solid #2a313c;}'
      + '.sl-actions button{background:#394151;color:#fff;border:none;padding:6px 10px;'
      +   'border-radius:6px;cursor:pointer;font-family:inherit;font-size:12px;}'
      + '.sl-actions button:hover{background:#4a5366;}'
      + '.sl-info{padding:6px 12px 12px;color:#7b8494;font-size:11px;}'
      + '.sl-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);'
      +   'background:#2a313c;color:#fff;padding:8px 16px;border-radius:8px;'
      +   'z-index:1100;box-shadow:0 4px 16px rgba(0,0,0,0.4);}'
      + '.sl-snippet{position:fixed;top:20%;left:10%;width:80%;height:60%;'
      +   'z-index:1100;background:#1c2028;color:#dde1ea;border:1px solid #394151;'
      +   'font-family:monospace;font-size:12px;padding:12px;border-radius:8px;}'
      + '#sl-win{position:fixed;inset:0;background:rgba(18,22,30,0.78);'
      +   'display:none;flex-direction:column;align-items:center;justify-content:center;'
      +   'color:#fff;z-index:1001;gap:16px;font-size:28px;font-weight:700;}'
      + '#sl-win button{background:#3ecfd8;color:#101418;border:none;padding:10px 24px;'
      +   'border-radius:10px;font-size:16px;font-family:inherit;font-weight:600;cursor:pointer;}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  return {
    build: build,
    loadFromStorage: loadFromStorage,
    saveToStorage: saveToStorage,
    updateWinUI: updateWinUI
  };
})();
