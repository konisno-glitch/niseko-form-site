(function () {
  'use strict';
  var API = 'https://script.google.com/macros/s/AKfycbw7_X7ussUPrxCZHx4gi3j-L-bxQcfNYPnGswowTk_kU9P81EXiEHn999GnzwYu861C/exec';
  var K = 'ATYSbKZLx7bkAPnDWDOg-MizwHodtzu5';
  var SKEY = 'niseko2027-s2';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var st = { cid: '', name: '', addresses: [], codeId: '', sendArgs: null, me: null, timer: 0 };

  function store(v) { try { if (v) localStorage.setItem(SKEY, v); else localStorage.removeItem(SKEY); } catch (e) { /* 保存できない端末でも動く */ } }
  function stored() { try { return localStorage.getItem(SKEY) || ''; } catch (e) { return ''; } }

  function api(action, payload, attempt) {
    attempt = attempt || 1;
    var body = Object.assign({ action: action, k: K }, payload || {});
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
      var box = $('cands'); box.innerHTML = '';
      if (!r.ok) { box.hidden = true; return err('nameErr', r.message); }
      if (!r.candidates.length) { box.hidden = true; return err('nameErr', 'お名前が見つかりませんでした。漢字を変えてお試しいただくか、担当の事務局へご連絡ください'); }
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
    var args = { cid: st.cid, role: role };
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
      st.s = r.s; store(r.s); loadMe(r.s);
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

  // ---------------------------------------------------------------- 4. アンケート
  function loadMe(s) {
    st.s = s; show('loading');
    return api('me', { s: s }).then(function (r) {
      if (!r.ok) { store(''); show('stName'); if (r.error !== 'session') err('nameErr', r.message); return; }
      st.me = r; renderForm(); show('stForm');
    });
  }

  function radios(boxId, name, list, val) {
    $(boxId).innerHTML = list.map(function (v) {
      return '<label class="opt"><input type="radio" name="' + name + '" value="' + esc(v) + '"' + (v === val ? ' checked' : '') + '><span class="t">' + esc(v) + '</span></label>';
    }).join('');
  }

  function renderForm() {
    var r = st.me, me = r.me, a = r.answer || {};
    $('meName').textContent = me.name + ' 様' + (me.company ? '（' + me.company + '）' : '');
    var f = me.first;
    $('meLead').textContent = f.answered ? '第1回でいただいたご回答です。' : '第1回のアンケートは、まだご回答いただいていません。';
    var rows = f.answered ? [['日程', f.days], ['宿泊', f.stay || '—'], ['行き・帰り', (f.go || '—') + '・' + (f.back || '—')]] : [];
    $('meDl').innerHTML = rows.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('');
    renderDays(a);
    radios('o-kind', 'kind', ['スキー', 'スノーボード'], a.kind);
    radios('o-level', 'level', ['初級', '中級', '上級', 'エキスパート'], a.level);
    radios('o-sex', 'sex', ['男性', '女性'], a.sex);
    document.querySelectorAll('input[name=fam]').forEach(function (i) { i.checked = i.value === a.fam; });
    $('famN').value = a.famN || '1名'; $('famWish').value = a.famWish || ''; $('memo').value = a.memo || '';
    $('famBox').hidden = a.fam !== 'yes';
    $('mailList').innerHTML = r.addresses.map(function (x) { return '<li><span class="addr">' + esc(x.masked) + '</span>' + (x.role ? '（' + esc(x.role === '本人' ? 'ご本人' : '秘書・ご担当者') + '）' : '') + '</li>'; }).join('');
    var hasSelf = r.addresses.some(function (x) { return x.role === '本人'; });
    $('addBox').hidden = hasSelf; $('addMail').value = '';
    err('saveErr', '');
    if (r.test) $('testBadge').hidden = false;
    skiRule();
  }

  function renderDays(a) {
    var r = st.me, box = $('days'); box.innerHTML = '';
    $('noDays').hidden = r.me.days.length > 0;
    r.dayDefs.forEach(function (d) {
      if (r.me.days.indexOf(d.key) < 0) return;
      var cur = a[d.key] || '';
      var el = document.createElement('div'); el.className = 'day'; el.dataset.d = d.key;
      var html = '<h3>' + esc(d.label) + '</h3><div class="opts" role="radiogroup" aria-label="' + esc(d.label) + 'の過ごし方">', last = '';
      r.acts.forEach(function (x) {
        if (x.g !== last) { html += '<div class="grp">' + esc(x.g) + '</div>'; last = x.g; }
        var left = x.cap ? x.cap - ((r.taken[d.key] || {})[x.id] || 0) : null;
        var full = left !== null && left <= 0 && cur !== x.id;
        html += '<label class="opt' + (full ? ' full' : '') + '"><input type="radio" name="' + d.key + '" value="' + x.id + '"' + (full ? ' disabled' : '') + (cur === x.id ? ' checked' : '') + '>' +
          '<span class="t"><span class="name"><span>' + esc(x.t) + '</span>' + (x.cap ? '<span class="left">' + (full ? '満員' : '残り' + Math.max(left, cur === x.id ? 1 : 0) + '名') + '</span>' : '') + '</span>' +
          ((x.info.length || x.cap) ? '<dl>' + (x.cap ? '<dt>人数</dt><dd>' + x.min + '〜' + x.cap + '名</dd>' : '') + x.info.map(function (kv) { return '<dt>' + esc(kv[0]) + '</dt><dd>' + esc(kv[1]) + '</dd>'; }).join('') + '</dl>' : '') + '</span></label>';
      });
      el.innerHTML = html + '</div>';
      box.appendChild(el);
    });
    box.querySelectorAll('input').forEach(function (i) { i.addEventListener('change', skiRule); });
  }

  function choice(d) { var c = document.querySelector('input[name=' + d + ']:checked'); return c ? c.value : ''; }
  function skiRule() {
    var r = st.me; if (!r) return;
    var ski = r.me.days.some(function (d) { var x = r.acts.filter(function (a) { return a.id === choice(d); })[0]; return x && x.ski; });
    $('secC').hidden = !ski;
  }
  document.querySelectorAll('input[name=fam]').forEach(function (i) { i.addEventListener('change', function () { $('famBox').hidden = i.value !== 'yes' || !i.checked; }); });

  $('stForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var r = st.me, ans = {};
    r.me.days.forEach(function (d) { ans[d] = choice(d); });
    ['kind', 'level', 'sex', 'fam'].forEach(function (n) { var c = document.querySelector('input[name=' + n + ']:checked'); ans[n] = c ? c.value : ''; });
    if ($('secC').hidden) { ans.kind = ans.level = ans.sex = ''; }
    ans.famN = $('famN').value; ans.famWish = $('famWish').value; ans.memo = $('memo').value;
    var add = $('addBox').hidden ? '' : $('addMail').value.trim();
    busy($('save'), true); err('saveErr', '');
    api('save', { s: st.s, answers: ans, add_email: add, add_role: '本人' }).then(function (res) {
      busy($('save'), false);
      if (!res.ok) {
        if (res.error === 'session') { store(''); show('stName'); return err('nameErr', res.message); }
        if (res.taken) { st.me.taken = res.taken; var keep = {}; r.me.days.forEach(function (d) { keep[d] = choice(d); }); renderDays(keep); skiRule(); }
        return err('saveErr', res.message);
      }
      st.me.answer = res.answer; st.me.taken = res.taken;
      done(res);
    });
  });

  // ---------------------------------------------------------------- 5. 完了
  function done(res) {
    $('sum').innerHTML = res.summary.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('');
    $('mailed').textContent = res.queued
      ? '確認メールは、本日の送信の上限に達したため、明日お送りします（' + res.mailed_to.join('、') + '）。'
      : (res.mailed_to.length ? '同じ内容を、' + res.mailed_to.join('、') + ' にメールでお送りしました。' : '');
    var r = st.me, ev = [];
    r.me.days.forEach(function (k) {
      var d = r.dayDefs.filter(function (x) { return x.key === k; })[0], a = r.acts.filter(function (x) { return x.id === res.answer[k]; })[0];
      if (d && a) ev.push({ d: d, a: a });
    });
    $('calBox').hidden = !ev.length;
    if (ev.length) {
      var ymd = function (s) { return s.replace(/-/g, ''); };
      var next = function (s) { var t = new Date(s + 'T00:00:00+09:00'); t.setDate(t.getDate() + 1); return t.getFullYear() + ('0' + (t.getMonth() + 1)).slice(-2) + ('0' + t.getDate()).slice(-2); };
      var title = function (e) { return 'ニセコ会議 ' + e.a.t + (e.a.time ? '（' + e.a.time + '）' : ''); };
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//niseko-forum.com//survey2//JA'].concat(ev.map(function (e) {
        return ['BEGIN:VEVENT', 'UID:niseko2027-' + e.d.key + '-' + Date.now() + '@niseko-forum.com', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
          'DTSTART;VALUE=DATE:' + ymd(e.d.date), 'DTEND;VALUE=DATE:' + next(e.d.date), 'SUMMARY:' + title(e), 'LOCATION:ヒルトンニセコビレッジ', 'END:VEVENT'].join('\r\n');
      })).concat(['END:VCALENDAR']).join('\r\n');
      $('icsLink').href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      $('gcal').innerHTML = ev.map(function (e) {
        var u = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title(e)) + '&dates=' + ymd(e.d.date) + '/' + next(e.d.date) + '&location=' + encodeURIComponent('ヒルトンニセコビレッジ');
        return '<a href="' + u + '" target="_blank" rel="noopener">Google カレンダーに追加：' + esc(e.d.label) + '</a>';
      }).join('');
    }
    show('stDone');
  }
  $('edit').addEventListener('click', function () { renderForm(); show('stForm'); });
  $('logout').addEventListener('click', function () { store(''); st.s = ''; st.me = null; $('surname').value = ''; $('cands').hidden = true; show('stName'); });

  // ---------------------------------------------------------------- 起動
  api('ping').then(function (r) {
    if (r.ok && r.test) $('testBadge').hidden = false;
    var s = stored();
    if (s) loadMe(s); else show('stName');
  });
})();
