(function () {
  'use strict';
  // 自己紹介（3つ目のリンク・2026-11-11）。本人確認は第2回アンケートと同じ仕組みで、同じ端末なら第2回のセッションをそのまま使う
  // 本番の画面（niseko-forum.github.io）以外はテスト版として動く（テスト用マスター・メールは事務局だけ）
  var ENV = location.hostname === 'niseko-forum.github.io' ? '' : 'test';
  // テスト版と本番は、同じ GAS の別のデプロイを使う。テスト版で直したものは、小西さんの OK が出るまで本番のデプロイに出さない（2026-11-09 小西さん指示）
  var API = ENV === 'test' ? 'https://script.google.com/macros/s/AKfycbwSmmOdIQG3asMQMzBhvqS7o-rC7HumW1fL4gCjS_BqGeSgJgC9MtLbYJVQCGf-gfL-/exec'
    : 'https://script.google.com/macros/s/AKfycbw7_X7ussUPrxCZHx4gi3j-L-bxQcfNYPnGswowTk_kU9P81EXiEHn999GnzwYu861C/exec';
  var K = 'ATYSbKZLx7bkAPnDWDOg-MizwHodtzu5';
  var SKEY = 'niseko2027-s2';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var st = { cid: '', name: '', addresses: [], codeId: '', sendArgs: null, me: null, timer: 0, photo: '', thumb: '', hasPhoto: false };

  function store(v) { try { if (v) localStorage.setItem(SKEY, v); else localStorage.removeItem(SKEY); } catch (e) { /* 保存できない端末でも動く */ } }
  function stored() { try { return localStorage.getItem(SKEY) || ''; } catch (e) { return ''; } }

  function api(action, payload, attempt) {
    attempt = attempt || 1;
    var body = Object.assign({ action: action, k: K }, ENV ? { env: ENV } : {}, payload || {});
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', credentials: 'omit', cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        try { return JSON.parse(t); } catch (e) {
          if (attempt < 3) return new Promise(function (res) { setTimeout(res, 1200 * attempt); }).then(function () { return api(action, payload, attempt + 1); });
          return { ok: false, error: 'bad_response', message: 'サーバーが混み合っています。数秒おいて、もう一度お試しください' };
        }
      })
      .catch(function () { return { ok: false, error: 'network', message: '通信できませんでした。電波の良いところで、もう一度お試しください' }; });
  }

  function show(id) {
    ['stName', 'stMail', 'stCode', 'stForm', 'stDone', 'loading'].forEach(function (s) { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }
  function err(id, msg) { $(id).hidden = !msg; $(id).textContent = msg || ''; }
  function busy(btn, on) { btn.disabled = !!on; }

  // ---------------------------------------------------------------- 1. 名前
  function find() {
    var q = $('surname').value.trim();
    if (!q) return err('nameErr', '名字を入れてください');
    err('nameErr', ''); busy($('find'), true);
    api('lookup', { surname: q }).then(function (r) {
      busy($('find'), false);
      $('nameAskOpen').hidden = false;
      var box = $('cands'); box.innerHTML = '';
      if (!r.ok) { box.hidden = true; return err('nameErr', r.message); }
      if (!r.candidates.length) { box.hidden = true; return err('nameErr', 'お名前が見つかりませんでした。漢字を変えてお試しいただくか、下の「お名前が出てこないとき」から事務局へご連絡ください'); }
      r.candidates.forEach(function (c) {
        var b = document.createElement('button'); b.type = 'button';
        b.textContent = c.name + (c.company ? '（' + c.company + '）' : '');
        b.addEventListener('click', function () { pick(c); });
        box.appendChild(b);
      });
      box.hidden = false;
    });
  }
  $('find').addEventListener('click', find);
  // お名前が見つからないとき：事務局へ連絡（2026-10-24 小西さん指示）
  $('nameAskOpen').addEventListener('click', function () {
    $('nameAskBox').hidden = false; $('nameAskOpen').hidden = true;
    if (!$('askName').value) $('askName').value = $('surname').value.trim();
    $('askName').focus();
  });
  $('nameAskSend').addEventListener('click', function () {
    var name = $('askName').value.trim(), contact = $('askContact').value.trim();
    if (!name) return err('nameAskErr', 'お名前を入れてください');
    if (!contact) return err('nameAskErr', 'ご連絡先（電話番号またはメールアドレス）を入れてください');
    err('nameAskErr', ''); busy($('nameAskSend'), true);
    api('ask', { kind: 'name', name: name, company: $('askCompany').value.trim(), contact: contact, body: $('askBody').value.trim() }).then(function (r) {
      busy($('nameAskSend'), false);
      if (!r.ok) return err('nameAskErr', r.message);
      $('nameAskBox').hidden = true; $('nameAskDone').hidden = false;
    });
  });
  $('surname').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); find(); } });

  // ---------------------------------------------------------------- 2. メール
  function pick(c) {
    st.cid = c.cid; st.name = c.name;
    show('loading');
    api('addresses', { cid: c.cid }).then(function (r) {
      if (!r.ok) { show('stName'); return err('nameErr', r.message); }
      st.addresses = r.addresses;
      $('mailWho').textContent = c.name + ' 様';
      var opts = $('addrOpts'); opts.innerHTML = '';
      if (r.addresses.length) {
        r.addresses.forEach(function (a, i) {
          var l = document.createElement('label'); l.className = 'opt';
          l.innerHTML = '<input type="radio" name="addr" value="' + esc(a.aid) + '"' + (i === 0 ? ' checked' : '') + '><span class="t"><span class="addr">' + esc(a.masked) + '</span><span class="s">ご登録のアドレス' + (a.role ? '（' + esc(a.role === '本人' ? 'ご本人' : '秘書・ご担当者') + '）' : '') + '</span></span>';
          opts.appendChild(l);
        });
        var o = document.createElement('label'); o.className = 'opt';
        o.innerHTML = '<input type="radio" name="addr" value="new"><span class="t">別のアドレスに送る</span>';
        opts.appendChild(o);
        $('addrBox').hidden = false; $('newBox').hidden = true;
        $('newMailLabel').textContent = '送り先のメールアドレス';
      } else {
        $('addrBox').hidden = true; $('newBox').hidden = false;
        $('newMailLabel').textContent = 'メールアドレスのご登録がまだありません。確認コードの送り先をご入力ください';
      }
      opts.querySelectorAll('input[name=addr]').forEach(function (i) { i.addEventListener('change', syncAddr); });
      syncAddr();
      err('mailErr', '');
      show('stMail');
    });
  }
  function syncAddr() {
    var sel = document.querySelector('input[name=addr]:checked');
    var aid = sel ? sel.value : 'new';
    if (st.addresses.length) $('newBox').hidden = aid !== 'new';
    var known = st.addresses.filter(function (a) { return a.aid === aid; })[0];
    document.querySelectorAll('input[name=role]').forEach(function (i) { i.checked = !!(known && known.role && i.value === known.role); });
  }
  $('backName').addEventListener('click', function () { show('stName'); });

  function sendCode(args) {
    busy($('sendCode'), true); busy($('resend'), true);
    return api('sendCode', args).then(function (r) {
      busy($('sendCode'), false); busy($('resend'), false);
      if (!r.ok) return r;
      st.codeId = r.code_id; st.sendArgs = args;
      $('codeTo').textContent = r.masked; $('code').value = ''; err('codeErr', '');
      $('codeHelp').hidden = true; clearTimeout(st.timer);
      st.timer = setTimeout(function () { $('codeHelp').hidden = false; }, 60000);
      show('stCode'); $('code').focus();
      return r;
    });
  }
  $('sendCode').addEventListener('click', function () {
    var sel = document.querySelector('input[name=addr]:checked');
    var aid = st.addresses.length && sel ? sel.value : 'new';
    var role = (document.querySelector('input[name=role]:checked') || {}).value;
    if (!role) return err('mailErr', 'どなたのアドレスかを選んでください');
    var args = { cid: st.cid, role: role, purpose: 'intro' };
    if (aid === 'new') {
      var m = $('newMail').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return err('mailErr', 'メールアドレスの形が正しくありません');
      args.email = m;
    } else args.aid = aid;
    err('mailErr', '');
    sendCode(args).then(function (r) { if (r && !r.ok) err('mailErr', r.message); });
  });

  // ---------------------------------------------------------------- 3. コード
  function verify() {
    var c = $('code').value.replace(/\D/g, '');
    if (c.length !== 6) return err('codeErr', '6桁の数字を入れてください');
    busy($('verify'), true);
    api('verify', { code_id: st.codeId, code: c }).then(function (r) {
      busy($('verify'), false);
      if (!r.ok) return err('codeErr', r.message);
      clearTimeout(st.timer);
      st.s = r.s; store(r.s); loadIntro(r.s);
    });
  }
  $('verify').addEventListener('click', verify);
  $('code').addEventListener('input', function () { if ($('code').value.replace(/\D/g, '').length === 6) verify(); });
  $('resend').addEventListener('click', function () { sendCode(st.sendArgs).then(function (r) { if (r && !r.ok) err('codeErr', r.message); }); });
  $('otherAddr').addEventListener('click', function () {
    clearTimeout(st.timer);
    var n = document.querySelector('input[name=addr][value=new]'); if (n) { n.checked = true; syncAddr(); }
    show('stMail');
  });

  // ---------------------------------------------------------------- 4. 写真と自己紹介
  var MAX = 200;
  function len(s) { return Array.from(String(s || '')).length; }
  function count() {
    var n = len($('introText').value.trim());
    $('count').textContent = n + '／' + MAX + '字';
    $('count').classList.toggle('over', n > MAX);
  }
  $('introText').addEventListener('input', count);
  function syncInd() { $('industryOther').hidden = $('industry').value !== 'その他'; }
  $('industry').addEventListener('change', function () { syncInd(); if (!$('industryOther').hidden) $('industryOther').focus(); });

  function loadIntro(s) {
    st.s = s; show('loading');
    return api('introMe', { s: s }).then(function (r) {
      if (!r.ok) { store(''); show('stName'); if (r.error !== 'session') err('nameErr', r.message); return; }
      st.me = r; MAX = r.max || MAX; st.photo = ''; st.hasPhoto = r.hasPhoto;
      $('meName').textContent = r.me.name + ' 様';
      $('introText').value = r.intro || ''; count();
      $('company').value = r.company || ''; $('title').value = r.title || '';
      $('prefillNote').hidden = !(r.company || r.title) || !!r.industry;
      var ind = r.industry || '', other = '';
      if (ind.indexOf('その他：') === 0) { other = ind.slice(4); ind = 'その他'; }
      $('industry').innerHTML = '<option value="">選んでください</option>' + r.industries.map(function (x) { return '<option' + (x === ind ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
      $('industryOther').value = other; syncInd();
      $('photo').value = '';
      st.thumb = '';
      $('face').hidden = !r.thumb; $('faceEmpty').hidden = !!r.thumb;
      if (r.thumb) $('face').src = r.thumb;
      $('faceEmpty').textContent = r.hasPhoto ? '登録済み' : '写真なし';
      $('photoNote').textContent = r.hasPhoto ? 'ご登録の写真があります。変えるときだけ、新しい写真を選んでください。' : 'お顔がはっきり写った写真を1枚お選びください。';
      err('saveErr', '');
      show('stForm');
    });
  }

  // 写真は画面の中で縮めてから送る（長い辺 800px・JPEG）。サーバーに送れる大きさ（約36万字）に収まるまで画質を下げる
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var side = 800, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, side / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        var q = 0.85, d = c.toDataURL('image/jpeg', q);
        while (d.length > 340000 && q > 0.4) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
        if (d.length > 340000) return reject(new Error('big'));
        var k2 = Math.min(1, 240 / Math.max(w, h)), c2 = document.createElement('canvas'); c2.width = Math.round(w * k2); c2.height = Math.round(h * k2);
        var g2 = c2.getContext('2d'); g2.fillStyle = '#fff'; g2.fillRect(0, 0, c2.width, c2.height); g2.drawImage(img, 0, 0, c2.width, c2.height);
        resolve({ d: d, t: c2.toDataURL('image/jpeg', 0.7) });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('read')); };
      img.src = url;
    });
  }
  $('photo').addEventListener('change', function () {
    var f = $('photo').files && $('photo').files[0];
    if (!f) return;
    err('saveErr', '');
    shrink(f).then(function (x) {
      st.photo = x.d; st.thumb = x.t; $('face').src = x.d; $('face').hidden = false; $('faceEmpty').hidden = true;
    }).catch(function () {
      st.photo = ''; $('photo').value = '';
      err('saveErr', 'この写真は読み込めませんでした。別の写真（JPEG・PNG など）でお試しください');
    });
  });

  $('save').addEventListener('click', function () {
    var text = $('introText').value.trim();
    var company = $('company').value.trim(), title = $('title').value.trim(), ind = $('industry').value, other = $('industryOther').value.trim();
    if (!company) return err('saveErr', '会社名を入れてください');
    if (!title) return err('saveErr', '役職を入れてください');
    if (!ind) return err('saveErr', '業種を選んでください');
    if (ind === 'その他' && !other) return err('saveErr', '「その他」の業種を入れてください');
    if (!st.photo && !st.hasPhoto) return err('saveErr', 'お顔の写真を選んでください');
    if (!text) return err('saveErr', '自己紹介を入れてください');
    if (len(text) > MAX) return err('saveErr', '自己紹介は' + MAX + '字以内でお願いします（いま' + len(text) + '字）');
    err('saveErr', ''); busy($('save'), true);
    api('introSave', { s: st.s, text: text, photo: st.photo, thumb: st.thumb, company: company, title: title, industry: ind, industryOther: other }).then(function (r) {
      busy($('save'), false);
      if (!r.ok) { if (r.error === 'session') { store(''); show('stName'); return err('nameErr', r.message); } return err('saveErr', r.message); }
      if (st.photo) st.hasPhoto = true;
      $('doneText').textContent = text;
      $('doneWho').textContent = company + '　' + title + '（' + (ind === 'その他' ? other : ind) + '）';
      var shown = st.photo || ($('face').hidden ? '' : $('face').src);
      $('doneFace').hidden = !shown; if (shown) $('doneFace').src = shown;
      st.me.intro = text;
      show('stDone');
    });
  });
  $('edit').addEventListener('click', function () { loadIntro(st.s); });
  $('logout').addEventListener('click', function () { store(''); st.s = ''; st.me = null; $('surname').value = ''; $('cands').hidden = true; show('stName'); });

  // ---------------------------------------------------------------- 表示の明るさ
  function themeLabel() { $('themeBtn').textContent = document.documentElement.dataset.theme === 'dark' ? '明るい背景で表示する' : '暗い背景で表示する'; }
  $('themeBtn').addEventListener('click', function () {
    var t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('niseko2027-theme', t); } catch (e) { /* 保存できなくても切り替えはできる */ }
    themeLabel();
  });
  themeLabel();

  // ---------------------------------------------------------------- 起動
  api('ping').then(function (r) {
    if (r.ok && r.test) $('testBadge').hidden = false;
    var s = stored();
    if (s) loadIntro(s); else show('stName');
  });
})();
