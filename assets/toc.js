/* 侧边目录：自动收集页面里的标题，生成快捷跳转
   - 宽屏：左侧固定目录，滚动时高亮当前章节
   - 窄屏（手机）：左下角「目录」按钮，点开后选择跳转
   - 隐藏（不公开）的章节不会出现在目录里
   - 目录是运行时生成的（带 ed-ui 类），编辑模式保存时会被自动去掉
*/
/* 图片大图查看：页面内弹出，点 ×、点背景或按 Esc 关闭（用于带 data-lightbox 的链接） */
(function(){
  var links = document.querySelectorAll('a[data-lightbox]');
  if (!links.length) return;
  var css = document.createElement('style'); css.className = 'ed-ui';
  css.textContent = [
    '.lb{position:fixed;inset:0;z-index:100;display:none;overflow:auto;background:rgba(21,48,58,.88);padding:56px 2vw 32px;text-align:center}',
    '.lb.open{display:block}',
    '.lb img{display:inline-block;width:min(100%,1544px);height:auto;background:#fff;border-radius:4px;cursor:zoom-out}',
    '.lb-close{position:fixed;top:12px;right:16px;width:40px;height:40px;border-radius:50%;border:1px solid #fff;background:rgba(21,48,58,.6);color:#fff;font-size:24px;line-height:1;cursor:pointer}',
    '.lb-close:hover{background:#fff;color:var(--ink)}',
    '.lb-close:focus-visible{outline:2px solid var(--sun);outline-offset:3px}',
    'body.lb-lock{overflow:hidden}'
  ].join('\n');
  document.head.appendChild(css);
  var box = document.createElement('div'); box.className = 'lb ed-ui'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', '查看大图');
  var x = document.createElement('button'); x.type = 'button'; x.className = 'lb-close'; x.setAttribute('aria-label', '关闭'); x.textContent = '×';
  var img = document.createElement('img'); img.alt = '';
  box.appendChild(x); box.appendChild(img); document.body.appendChild(box);
  var last = null;
  function open(a){ last = a; img.src = a.getAttribute('href'); var i = a.querySelector('img'); img.alt = i ? i.alt : ''; box.classList.add('open'); box.scrollTop = 0; document.body.classList.add('lb-lock'); x.focus(); }
  function close(){ box.classList.remove('open'); document.body.classList.remove('lb-lock'); if (last) last.focus(); }
  Array.prototype.forEach.call(links, function(a){ a.addEventListener('click', function(e){ if (document.body.classList.contains('editing')) return; e.preventDefault(); open(a); }); });
  x.addEventListener('click', close);
  box.addEventListener('click', function(e){ if (e.target === box || e.target === img) close(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && box.classList.contains('open')) close(); });
})();

(function(){
  var SEL = 'h2.section-title, .entry h2, .doc h3, footer h2';
  var heads = Array.prototype.slice.call(document.querySelectorAll(SEL))
    .filter(function(h){ return h.offsetParent !== null && h.textContent.trim(); });
  if (heads.length < 3) return;

  var css = document.createElement('style');
  css.className = 'ed-ui';
  css.textContent = [
    'h2.section-title,.entry h2,.doc h3,footer h2{scroll-margin-top:24px}',
    '.toc{position:fixed;z-index:40;font-family:var(--sans);font-size:14px;line-height:1.5}',
    '.toc-list{list-style:none;margin:0;padding:0}',
    '.toc-list a{display:block;padding:5px 10px 5px 12px;border-left:2px solid var(--chart);color:var(--muted);text-decoration:none}',
    '.toc-list a:hover{color:var(--tide);border-left-color:var(--tide)}',
    '.toc-list a.on{color:var(--ink);font-weight:500;border-left-color:var(--sun);background:rgba(195,154,47,.10)}',
    '.toc-list .lv2 a{padding-left:24px;font-size:13px}',
    '.toc-title{margin:0 0 8px 14px;font-family:var(--serif);font-weight:600;font-size:15px;color:var(--ink)}',
    '.toc-top a{color:var(--tide)}',
    /* 宽屏：左侧固定 */
    '.toc.side{top:96px;left:24px;max-height:calc(100vh - 140px);overflow-y:auto;padding:4px 4px 4px 0;opacity:0;pointer-events:none;transition:opacity .25s}',
    '.toc.side.show{opacity:1;pointer-events:auto}',
    /* 窄屏：按钮 + 弹出面板 */
    '.toc.float{left:16px;bottom:20px}',
    'body.editing .toc.float{bottom:96px}',
    '.toc-btn{font:inherit;font-size:14px;padding:8px 16px;border:1px solid var(--tide);border-radius:999px;background:var(--foam);color:var(--tide);box-shadow:0 4px 14px rgba(21,48,58,.18);cursor:pointer}',
    '.toc-btn:hover,.toc.open .toc-btn{background:var(--tide);color:var(--foam)}',
    '.toc-panel{display:none;position:absolute;left:0;bottom:calc(100% + 10px);width:min(300px,calc(100vw - 32px));max-height:min(60vh,480px);overflow-y:auto;padding:14px 10px 12px 0;background:var(--foam);border:1px solid var(--chart);border-radius:10px;box-shadow:0 10px 30px rgba(21,48,58,.22)}',
    '.toc.open .toc-panel{display:block}',
    '.toc-btn:focus-visible,.toc-list a:focus-visible{outline:2px solid var(--sun);outline-offset:2px}',
    '@media print{.toc{display:none}}'
  ].join('\n');
  document.head.appendChild(css);

  var used = {};
  heads.forEach(function(h, i){ if (!h.id) { var id = 'toc-' + (i + 1); while (document.getElementById(id) || used[id]) id += 'x'; h.id = id; used[id] = 1; } });

  function makeList(){
    var ul = document.createElement('ul'); ul.className = 'toc-list';
    var top = document.createElement('li'); top.className = 'toc-top';
    var ta = document.createElement('a'); ta.href = '#'; ta.textContent = '↑ 回到顶部';
    ta.addEventListener('click', function(e){ e.preventDefault(); scrollTo({top:0, behavior:'smooth'}); close(); });
    top.appendChild(ta); ul.appendChild(top);
    heads.forEach(function(h){
      var li = document.createElement('li');
      li.className = h.tagName === 'H3' ? 'lv2' : 'lv1';
      var a = document.createElement('a'); a.href = '#' + h.id;
      a.textContent = h.textContent.replace(/\s+/g, ' ').trim();
      a.addEventListener('click', function(e){ e.preventDefault(); h.scrollIntoView({behavior:'smooth', block:'start'}); history.replaceState(null, '', '#' + h.id); close(); });
      li.appendChild(a); ul.appendChild(li);
    });
    return ul;
  }

  var box = document.createElement('nav');
  box.className = 'toc ed-ui'; box.setAttribute('aria-label', '页面目录');
  var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'toc-btn'; btn.textContent = '目录';
  btn.setAttribute('aria-expanded', 'false');
  var panel = document.createElement('div'); panel.className = 'toc-panel';
  var title = document.createElement('p'); title.className = 'toc-title'; title.textContent = '目录';
  var list = makeList();
  box.appendChild(title); box.appendChild(list);
  document.body.appendChild(box);

  function close(){ if (box.classList.contains('open')) { box.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } }
  btn.addEventListener('click', function(){ var o = box.classList.toggle('open'); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  document.addEventListener('click', function(e){ if (!box.contains(e.target)) close(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });

  var content = document.querySelector('.wrap, main') || document.body;
  var mode = '';
  function layout(){
    var left = content.getBoundingClientRect().left;
    var want = left >= 200 ? 'side' : 'float';
    if (want !== mode) {
      mode = want;
      box.classList.remove('side', 'float', 'open', 'show');
      box.classList.add(want);
      if (want === 'side') { if (panel.parentNode) { panel.removeChild(title); panel.removeChild(list); box.removeChild(panel); box.removeChild(btn); } box.appendChild(title); box.appendChild(list); }
      else { box.innerHTML = ''; panel.appendChild(title); panel.appendChild(list); box.appendChild(panel); box.appendChild(btn); }
    }
    if (mode === 'side') box.style.width = Math.min(220, left - 48) + 'px';
    else box.style.width = '';
    update();
  }

  var links = Array.prototype.slice.call(list.querySelectorAll('li:not(.toc-top) a'));
  var ticking = false;
  function update(){
    ticking = false;
    var y = window.scrollY;
    if (mode === 'side') box.classList.toggle('show', y > 160);
    var cur = -1;
    for (var i = 0; i < heads.length; i++) { if (heads[i].getBoundingClientRect().top < 140) cur = i; else break; }
    if (window.innerHeight + y >= document.documentElement.scrollHeight - 4) cur = heads.length - 1;
    links.forEach(function(a, i){ a.classList.toggle('on', i === cur); });
    if (mode === 'side' && cur >= 0) {
      var a = links[cur], bt = box.getBoundingClientRect(), at = a.getBoundingClientRect();
      if (at.top < bt.top || at.bottom > bt.bottom) box.scrollTop += at.top - bt.top - bt.height / 3;
    }
  }
  window.addEventListener('scroll', function(){ if (!ticking) { ticking = true; requestAnimationFrame(update); } }, {passive:true});
  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
  layout();
})();
