/* 子页面的编辑模式
   - 只在本地打开（双击 html 文件）或网址带 ?edit 时出现，访客看不到
   - data-edit：可直接修改的文字（data-edit="multi" 允许回车换段）
   - data-edit-list：列表，可以「+ 条目」
   - data-edit-block：可前移、后移、复制、删除的块（比如时间线上的一条记录）
   - data-edit-href：链接，可以修改它指向的页面
*/
(function(){
  var isLocal = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var wantEdit = /[?&]edit(\b|=|&|$)/.test(location.search);
  if (!isLocal && !wantEdit) return;
  if (isLocal) document.body.classList.add('local');

  var css = document.createElement('style');
  css.className = 'ed-ui';
  css.textContent = [
    '.ed-btn{font:inherit;font-size:13px;line-height:1.4;padding:5px 12px;border:1px solid var(--tide);border-radius:999px;background:var(--foam);color:var(--tide);cursor:pointer}',
    '.ed-btn:hover{background:var(--tide);color:var(--foam)}',
    '.ed-btn.danger{border-color:#A4473B;color:#A4473B}.ed-btn.danger:hover{background:#A4473B;color:#fff}',
    '.ed-btn.primary{background:var(--tide);color:var(--foam)}',
    '.ed-corner{position:fixed;right:20px;bottom:20px;z-index:50}',
    'body.editing{padding-bottom:110px}',
    '.editing [contenteditable="true"]{outline:1px dashed rgba(195,154,47,.7);outline-offset:3px;cursor:text}',
    '.editing [contenteditable="true"]:focus{outline:2px solid var(--sun);background:rgba(231,198,106,.14)}',
    '.ed-tools{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px;font-size:13px}',
    '.ed-href{font:inherit;font-size:13px;padding:4px 8px;border:1px solid var(--chart);border-radius:6px;width:16em;background:#fff}',
    '.ed-add{margin:8px 0 0}',
    '.ed-bar{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:60;width:min(800px,calc(100% - 24px));display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px;padding:12px 16px;background:var(--ink);color:var(--foam);border-radius:14px;box-shadow:0 8px 28px rgba(21,48,58,.28);font-size:14px;line-height:1.5}',
    '.ed-bar p{margin:0;flex:1 1 260px}',
    '.ed-bar .ed-btn{border-color:var(--foam)}',
    '.ed-bar .ed-btn.primary{background:var(--sun);border-color:var(--sun);color:var(--ink)}'
  ].join('\n');
  document.head.appendChild(css);

  var dirty = false;
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function btn(label, cls, fn){
    var b = document.createElement('button'); b.type = 'button';
    b.className = 'ed-ui ed-btn ' + (cls||''); b.textContent = label;
    b.addEventListener('click', fn); return b;
  }
  function selectAll(el){
    el.focus(); var r = document.createRange(); r.selectNodeContents(el);
    var s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function fileName(){
    var f = location.pathname.split('/').pop();
    return f && /\.html?$/.test(f) ? decodeURIComponent(f) : 'index.html';
  }

  function makeEditable(root){
    qsa('[data-edit]', root).forEach(function(el){ el.contentEditable = 'true'; el.spellcheck = false; });
    qsa('[data-edit-list]', root).forEach(function(list){
      if (list.nextElementSibling && list.nextElementSibling.classList.contains('ed-add')) return;
      var add = btn('+ 条目', 'ed-add', function(){
        var li = document.createElement('li'); li.textContent = '新的条目';
        li.setAttribute('data-edit', ''); li.contentEditable = 'true';
        list.appendChild(li); selectAll(li); dirty = true;
      });
      list.after(add);
    });
    qsa('[data-edit-href]', root).forEach(function(a){
      if (a.querySelector('.ed-href') || (a.nextElementSibling && a.nextElementSibling.classList.contains('ed-href-wrap'))) return;
      var wrap = document.createElement('div'); wrap.className = 'ed-ui ed-tools ed-href-wrap';
      wrap.appendChild(document.createTextNode('链接到：'));
      var input = document.createElement('input'); input.className = 'ed-href';
      input.value = a.getAttribute('href') || a.getAttribute('data-off-href') || '';
      input.addEventListener('input', function(){ a.setAttribute(a.hasAttribute('href') ? 'href' : 'data-off-href', input.value.trim()); dirty = true; });
      wrap.appendChild(input);
      a.after(wrap);
    });
  }

  function setupBlock(block){
    var tools = document.createElement('div'); tools.className = 'ed-ui ed-tools';
    tools.appendChild(btn('前移', '', function(){
      var p = block.previousElementSibling;
      if (p && p.hasAttribute('data-edit-block')) { p.before(block); dirty = true; }
    }));
    tools.appendChild(btn('后移', '', function(){
      var n = block.nextElementSibling;
      if (n && n.hasAttribute('data-edit-block')) { n.after(block); dirty = true; }
    }));
    tools.appendChild(btn('复制', '', function(){
      var c = block.cloneNode(true);
      qsa('.ed-ui', c).forEach(function(n){ n.remove(); });
      block.after(c); makeEditable(c); setupBlock(c); dirty = true;
      var first = c.querySelector('[data-edit]'); if (first) selectAll(first);
    }));
    var card = block.querySelector('a.log-card');
    if (card) {
      var lt = btn('', '', function(){
        if (card.hasAttribute('href')) { card.setAttribute('data-off-href', card.getAttribute('href')); card.removeAttribute('href'); }
        else { card.setAttribute('href', card.getAttribute('data-off-href') || ''); card.removeAttribute('data-off-href'); }
        lab(); dirty = true;
      });
      function lab(){ var off = !card.hasAttribute('href'); lt.textContent = off ? '链接：已隐藏（点击公开）' : '链接：公开中（点击隐藏）'; lt.classList.toggle('danger', off); }
      lab(); tools.appendChild(lt);
    }
    tools.appendChild(btn('删除', 'danger', function(){
      if (confirm('删除这一块？保存前都可以退出编辑来撤销。')) { block.remove(); dirty = true; }
    }));
    block.appendChild(tools);
  }

  function download(name){
    var root = document.documentElement.cloneNode(true);
    qsa('.ed-ui', root).forEach(function(n){ n.remove(); });
    qsa('[contenteditable]', root).forEach(function(n){ n.removeAttribute('contenteditable'); n.removeAttribute('spellcheck'); });
    qsa('[data-edit-list] > li', root).forEach(function(li){ if (!li.textContent.trim()) li.remove(); });
    var body = root.querySelector('body'); body.classList.remove('editing'); body.classList.remove('local');
    if (!body.getAttribute('class')) body.removeAttribute('class');
    var html = '<!doctype html>\n' + root.outerHTML;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], {type:'text/html;charset=utf-8'}));
    a.download = name; a.className = 'ed-ui';
    document.body.appendChild(a); a.click(); a.remove();
  }

  function enter(){
    document.body.classList.add('editing');
    makeEditable(document);
    qsa('[data-edit-block]').forEach(setupBlock);

    document.addEventListener('click', function(e){
      var a = e.target.closest('a');
      if (a && !a.hasAttribute('download') && !e.target.closest('.ed-ui')) e.preventDefault();
    }, true);
    document.addEventListener('paste', function(e){
      if (!e.target.closest('[contenteditable="true"]')) return;
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData||window.clipboardData).getData('text/plain'));
    });
    document.addEventListener('keydown', function(e){
      var el = e.target.closest && e.target.closest('[contenteditable="true"]');
      if (e.key === 'Enter' && el && el.getAttribute('data-edit') !== 'multi') e.preventDefault();
    });
    document.addEventListener('input', function(e){ if (!e.target.classList.contains('ed-href')) dirty = true; });
    window.addEventListener('beforeunload', function(e){ if (dirty) { e.preventDefault(); e.returnValue = ''; } });

    var bar = document.createElement('div'); bar.className = 'ed-ui ed-bar';
    var tip = document.createElement('p');
    tip.textContent = '编辑模式：点虚线框里的文字直接修改。删除列表里的某一条，把文字删空即可。';
    bar.appendChild(tip);
    var vis = btn('', '', function(){
      if (document.body.hasAttribute('data-page-hidden')) document.body.removeAttribute('data-page-hidden');
      else document.body.setAttribute('data-page-hidden', '');
      visLabel(); dirty = true;
    });
    function visLabel(){
      var hidden = document.body.hasAttribute('data-page-hidden');
      vis.textContent = hidden ? '本页：不公开（点击公开）' : '本页：公开中（点击设为不公开）';
      vis.classList.toggle('danger', hidden);
    }
    visLabel(); bar.appendChild(vis);
    bar.appendChild(btn('保存为 ' + fileName(), 'primary', function(){ download(fileName()); dirty = false; }));
    if (document.body.hasAttribute('data-log-page')) {
      bar.appendChild(btn('另存为新记录页', '', function(){
        var name = prompt('新记录页的文件名（例如 log-08.html）：', 'log-08.html');
        if (name) download(/\.html?$/.test(name) ? name : name + '.html');
      }));
    }
    bar.appendChild(btn('退出编辑', '', function(){
      if (!dirty || confirm('有未保存的修改，确定退出？')) { dirty = false; location.href = location.pathname; }
    }));
    document.body.appendChild(bar);
  }

  if (wantEdit) enter();
  else document.body.appendChild(btn('编辑', 'ed-corner primary', function(){ location.href = location.pathname + '?edit'; }));
})();
