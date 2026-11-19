"use strict";

const CSS = `
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{font-family:sans-serif;color:#0f172a}
body{background:linear-gradient(180deg,#dbeafe,#bae6fd);min-height:100vh;padding:14px 12px 22px}
.wrap{max-width:560px;margin:0 auto}
.banner{border-radius:30px;padding:20px 22px 22px;background:linear-gradient(110deg,#0ea5e9,#38bdf8 60%,#a5f3fc)}
.banner small{display:block;font-size:13px;font-weight:700;letter-spacing:.5px;color:rgba(255,255,255,.9)}
.banner h1{font-size:28px;line-height:1.1;color:#fff;margin:6px 0 4px;word-break:break-word}
.banner p{font-size:14px;color:rgba(255,255,255,.95)}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
.tile{background:#fff;border:2px solid #bae6fd;border-radius:18px;padding:12px 4px;text-align:center}
.tile b{display:block;font-size:17px;color:#0369a1;word-break:break-word}
.tile span{display:block;font-size:11px;color:#64748b;margin-top:4px}
.track{height:14px;border-radius:9px;background:#e2e8f0;margin-top:14px;overflow:hidden}
.track i{display:block;height:100%;min-width:14px;border-radius:9px;background:linear-gradient(90deg,#38bdf8,#0ea5e9)}
.cap{font-size:13px;color:#475569;margin:8px 4px 14px}
.search{width:100%;padding:11px 14px;border-radius:16px;border:2px solid #bae6fd;background:#fff;color:#0f172a;font:inherit;font-size:15px;outline:none;margin-bottom:12px}
.search:focus{border-color:#0ea5e9}
.feat{display:flex;gap:14px;background:#fff;border:2px solid #bae6fd;border-radius:22px;padding:14px;margin-bottom:12px;cursor:pointer}
.fimg{width:34%;flex:none;aspect-ratio:3/4;border-radius:16px;background:#e0f2fe;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:32px;color:#7dd3fc}
.fimg img,.dimg img{width:100%;height:100%;object-fit:cover;display:block}
.ftxt{min-width:0;display:flex;flex-direction:column;justify-content:center}
.ftxt em{font-style:normal;font-size:12px;font-weight:700;color:#0ea5e9}
.ftxt h2{font-size:21px;line-height:1.15;margin:4px 0;word-break:break-word}
.ftxt .s{font-size:14px;color:#475569;word-break:break-word}
.ftxt .i{font-size:12px;color:#94a3b8;margin-top:2px}
.ftxt .v{font-size:19px;font-weight:700;color:#0369a1;margin-top:8px}
.fav{display:inline-block;margin-top:8px;padding:4px 12px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;align-self:flex-start}
.row{display:flex;align-items:center;gap:12px;background:#fff;border:2px solid #e0f2fe;border-radius:20px;padding:11px 14px;margin-bottom:9px;cursor:pointer}
.row:active{background:#f0f9ff}
.num{width:42px;height:42px;border-radius:50%;background:#e0f2fe;color:#0369a1;font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;flex:none}
.mid{flex:1;min-width:0}
.mid b{display:block;font-size:16px;line-height:1.2;overflow-wrap:break-word}
.mid span{display:block;font-size:12px;color:#64748b;margin-top:2px;word-break:break-word}
.val{font-size:14px;font-weight:700;color:#0369a1;text-align:right;flex:none;white-space:nowrap}
.pager{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px}
.pbtn{width:62px;height:46px;border-radius:16px;border:2px solid #7dd3fc;background:#0ea5e9;color:#fff;font-size:22px;font-weight:700;cursor:pointer}
.pbtn[disabled]{opacity:.35;cursor:default}
.pinfo{flex:1;text-align:center;padding:11px;border-radius:16px;background:#fff;border:2px solid #bae6fd;color:#475569;font-size:14px;font-weight:700}
.empty{padding:30px 10px;text-align:center;color:#475569}
.hint{text-align:center;color:#475569;font-size:12px;margin-top:12px}
.back{border:2px solid #7dd3fc;background:#fff;color:#0369a1;padding:9px 18px;border-radius:999px;font:inherit;font-weight:700;cursor:pointer;margin-bottom:12px}
.dcard{background:#fff;border:2px solid #bae6fd;border-radius:26px;padding:16px;text-align:center}
.dimg{width:60%;aspect-ratio:3/4;margin:0 auto;border-radius:18px;background:#e0f2fe;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:44px;color:#7dd3fc}
.dcard h2{font-size:25px;line-height:1.1;margin-top:14px;word-break:break-word}
.dcard .s{font-size:14px;color:#475569;margin-top:4px;word-break:break-word}
.dcard .i{font-size:12px;color:#94a3b8;margin-top:2px}
.dcard .fav{margin-top:10px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
.info div{background:#f0f9ff;border:2px solid #e0f2fe;border-radius:16px;padding:10px 6px}
.info b{display:block;font-size:15px;color:#0369a1;word-break:break-word}
.info span{display:block;font-size:11px;color:#64748b;margin-top:3px}
.cmds{margin-top:14px;padding:10px 12px;border-radius:16px;background:#f0f9ff;border:2px dashed #bae6fd;text-align:left;font-size:13px;color:#475569;line-height:1.7}
.cmds b{color:#0369a1}
.dimg[data-zoom]{cursor:zoom-in;position:relative}
.dimg[data-zoom]::after{content:"\\1F50D";position:absolute;right:8px;bottom:8px;width:30px;height:30px;border-radius:50%;background:rgba(15,23,42,.55);font-size:14px;display:flex;align-items:center;justify-content:center}
.dimg.z{width:100%;aspect-ratio:auto;background:none;cursor:zoom-out}
.dimg.z::after{display:none}
.dimg.z img{width:100%;height:auto;object-fit:contain;border-radius:14px}
.zh{font-size:11px;color:#94a3b8;margin-top:6px}
`;

const CLIENT = `
(function(){
  var D = JSON.parse(document.getElementById('data').textContent);
  var PER = 8;
  var S = { q: '', p: 1, d: null, z: false };
  var app = document.getElementById('app');

  function esc(t){ var e = document.createElement('div'); e.textContent = String(t == null ? '' : t); return e.innerHTML.replace(/"/g,'&quot;'); }
  function filtered(){
    var q = S.q.trim().toLowerCase();
    if (!q) return D.items;
    return D.items.filter(function(c){ return c.n.toLowerCase().indexOf(q) !== -1 || c.s.toLowerCase().indexOf(q) !== -1; });
  }
  function img(src){
    return src ? '<img src="' + esc(src) + '" alt="" onerror="this.remove()">' : '\\u2744\\uFE0F';
  }
  function top(){
    var pct = D.catalog > 0 ? Math.max(2, Math.min(100, D.items.length / D.catalog * 100)) : 2;
    return '<div class="banner"><small>KORI  |  HAREM</small><h1>' + esc(D.owner) + '</h1><p>Colecci\\u00F3n de personajes reclamados</p></div>' +
      '<div class="tiles"><div class="tile"><b>' + D.items.length + '</b><span>Personajes</span></div>' +
      '<div class="tile"><b>' + D.catalog + '</b><span>En el cat\\u00E1logo</span></div>' +
      '<div class="tile"><b>' + esc(D.total) + '</b><span>Valor total</span></div></div>' +
      '<div class="track"><i style="width:' + pct + '%"></i></div>' +
      '<div class="cap">' + D.items.length + ' de ' + D.catalog + ' personajes del cat\\u00E1logo</div>';
  }
  function list(){
    var all = filtered();
    var pages = Math.max(1, Math.ceil(all.length / PER));
    if (S.p > pages) S.p = pages;
    var start = (S.p - 1) * PER;
    var slice = all.slice(start, start + PER);
    var feat = '';
    if (S.p === 1 && !S.q.trim() && D.featured) {
      var f = D.items.filter(function(x){ return x.i === D.featured; })[0];
      if (f) feat = '<div class="feat" data-id="' + esc(f.i) + '"><div class="fimg">' + img(f.big || f.img) + '</div>' +
        '<div class="ftxt"><em>DESTACADO</em><h2>' + esc(f.n) + '</h2><div class="s">' + esc(f.s) + '</div><div class="i">ID ' + esc(f.i) + '</div>' +
        '<div class="v">' + esc(f.vf) + '</div>' + (f.fav ? '<span class="fav">\\u2605 Favorito</span>' : '') + '</div></div>';
    }
    var rows = slice.map(function(c, i){
      return '<div class="row" data-id="' + esc(c.i) + '"><div class="num">' + (start + i + 1) + '</div>' +
        '<div class="mid"><b>' + (c.fav ? '\\u2605 ' : '') + esc(c.n) + '</b><span>' + esc(c.s) + '</span></div>' +
        '<div class="val">' + esc(c.vs || c.vf) + '</div></div>';
    }).join('');
    return top() +
      '<input class="search" id="q" type="text" placeholder="Buscar personaje o serie" value="' + esc(S.q) + '">' +
      feat +
      (slice.length ? rows : '<div class="empty">No hay personajes que coincidan.</div>') +
      '<div class="pager"><button class="pbtn" data-p="-1"' + (S.p <= 1 ? ' disabled' : '') + '>\\u2039</button>' +
      '<div class="pinfo">P\\u00E1gina ' + S.p + ' de ' + pages + '</div>' +
      '<button class="pbtn" data-p="1"' + (S.p >= pages ? ' disabled' : '') + '>\\u203A</button></div>' +
      '<div class="hint">Toca un personaje para ver sus detalles</div>';
  }
  function detail(c){
    var zi = c.full || c.big || c.img;
    return '<button class="back" data-back="1">\\u2039 Volver</button>' +
      '<div class="dcard"><div class="dimg' + (S.z ? ' z' : '') + '"' + (zi ? ' data-zoom="1"' : '') + '>' + img(zi) + '</div>' +
      (zi ? '<div class="zh">' + (S.z ? 'Toca la imagen para reducir' : 'Toca la imagen para ampliar') + '</div>' : '') +
      '<h2>' + esc(c.n) + '</h2><div class="s">' + esc(c.s) + '</div><div class="i">ID ' + esc(c.i) + '</div>' +
      (c.fav ? '<span class="fav">\\u2605 Favorito</span>' : '') +
      '<div class="info"><div><b>' + esc(c.vf) + '</b><span>Valor</span></div><div><b>#' + esc(c.k || '-') + '</b><span>Puesto</span></div>' +
      '<div><b>' + esc(c.g || '-') + '</b><span>G\\u00E9nero</span></div><div><b>' + esc(c.d || '-') + '</b><span>Reclamado</span></div></div>' +
      '<div class="cmds"><b>' + esc(D.prefix) + 'charinfo ' + esc(c.i) + '</b><br><b>' + esc(D.prefix) + 'setfav ' + esc(c.i) + '</b><br><b>' + esc(D.prefix) + 'sell 5000 ' + esc(c.i) + '</b></div></div>';
  }
  function render(keep){
    var c = S.d ? D.items.filter(function(x){ return x.i === S.d; })[0] : null;
    app.innerHTML = c ? detail(c) : list();
    var q = document.getElementById('q');
    if (q) q.addEventListener('input', function(){
      S.q = q.value; S.p = 1;
      var pos = q.selectionStart;
      render(true);
      var n = document.getElementById('q');
      if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} }
    });
    if (!keep) window.scrollTo(0, 0);
  }
  app.addEventListener('click', function(ev){
    var t = ev.target;
    while (t && t !== app && !(t.dataset && (t.dataset.p || t.dataset.id || t.dataset.back || t.dataset.zoom))) t = t.parentNode;
    if (!t || t === app) return;
    if (t.dataset.p !== undefined) { if (t.disabled) return; S.p += parseInt(t.dataset.p, 10); render(); }
    else if (t.dataset.id !== undefined) { S.d = t.dataset.id; S.z = false; render(); }
    else if (t.dataset.zoom !== undefined) { S.z = !S.z; render(true); }
    else if (t.dataset.back !== undefined) { S.d = null; S.z = false; render(); }
  });
  render();
})();
`;

const BG_CSS = `
html{background:#bae6fd}
body{background:none}
body::before{content:"";position:fixed;top:0;right:0;bottom:0;left:0;z-index:-1;background:linear-gradient(180deg,rgba(219,234,254,.45),rgba(186,230,253,.45)),url("__BG__") center/cover no-repeat}
.hasbg .tile,.hasbg .feat,.hasbg .row,.hasbg .pinfo,.hasbg .dcard,.hasbg .search{background:rgba(255,255,255,.88)}
.hasbg .info div,.hasbg .cmds{background:rgba(240,249,255,.9)}
.hasbg .cap,.hasbg .hint{color:#0f172a;text-shadow:0 1px 2px rgba(255,255,255,.8)}
`;

function buildHaremHtml(data) {
  const bg = typeof data.bg === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(data.bg) ? data.bg : null;
  const { bg: _omit, ...rest } = data;
  data = rest;
  const payload = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return (
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<style>${CSS}${bg ? BG_CSS.replace("__BG__", () => bg) : ""}</style></head><body${bg ? ' class="hasbg"' : ""}><div class="wrap"><div id="app"></div></div>` +
    `<script type="application/json" id="data">${payload}</script>` +
    `<script>${CLIENT}</script></body></html>`
  );
}

module.exports = { buildHaremHtml };
