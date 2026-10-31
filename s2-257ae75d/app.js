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
    var rows = (f.answered ? [['日程', f.days], ['宿泊', f.stay || '—']] : []).concat([['ホテル', f.hotel]]);
    $('meDl').innerHTML = rows.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('');
    // 第1回のご回答とホテルの予約の食い違いは赤字で（文はサーバーが決まった文で作る）
    $('warnBox').hidden = !f.warns.length;
    $('warnList').innerHTML = f.warns.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('');
    // A は日程・ホテルの変更と、別の方としての回答だけ。行き・帰りは B の 2/18・2/21 で伺う（2026-10-31 小西さん指示）
    $('holdBox').hidden = !me.hold;
    $('hotelOpen').hidden = me.hold; $('hotelBox').hidden = true;
    $('staffLine').textContent = me.staff ? '担当の事務局（' + me.staff + '）に、Messenger などで直接ご連絡いただいても構いません。' : '';
    $('rest').hidden = me.hold;
    renderDays(a);
    radios('o-kind', 'kind', ['スキー', 'スノーボード'], a.kind);
    // レベルは目安を添えて（2026-10-31 小西さん指示）
    $('o-level').innerHTML = r.levels.map(function (v) {
      return '<label class="opt"><input type="radio" name="level" value="' + esc(v) + '"' + (v === a.level ? ' checked' : '') + '><span class="t">' + esc(v) + (r.levelNotes[v] ? '<span class="s">' + esc(r.levelNotes[v]) + '</span>' : '') + '</span></label>';
    }).join('');
    radios('o-av', 'avalanche', r.avalancheOpts, a.avalanche);
    radios('o-alc', 'alcohol', r.alcoholOpts, a.alcohol);
    radios('o-allergy', 'famAllergy', r.allergyOpts, a.famAllergy);
    $('famAllergyBody').value = a.famAllergyBody || ''; $('allergyBox').hidden = a.famAllergy !== 'ある';
    document.querySelectorAll('input[name=famAllergy]').forEach(function (i) { i.addEventListener('change', function () { $('allergyBox').hidden = i.value !== 'ある'; }); });
    // 食事会ごとに、人数とそのうち未就学児の人数（2026-10-28 小西さん指摘）
    var sel = function (id, v) { return '<select id="' + id + '" aria-label="' + id + '">' + [0, 1, 2, 3, 4].map(function (n) { return '<option value="' + n + '"' + (String(v || 0) === String(n) ? ' selected' : '') + '>' + n + '名</option>'; }).join('') + '</select>'; };
    $('famMeals').innerHTML = '<span></span><span class="mh">人数</span><span class="mh">うち未就学児</span>' + r.famMeals.map(function (m) {
      return '<label for="' + m.key + '">' + esc(m.label) + '</label>' + sel(m.key, a[m.key]) + (m.kid ? sel(m.kid, a[m.kid]) : '<span class="muted">―</span>');
    }).join('');
    radios('o-sex', 'sex', ['男性', '女性'], a.sex);
    document.querySelectorAll('input[name=fam]').forEach(function (i) { i.checked = i.value === a.fam; });
    $('famN').value = a.famN || '1名'; $('famWish').value = a.famWish || ''; $('memo').value = a.memo || ''; $('tel').value = a.tel || '';
    $('famBox').hidden = a.fam !== 'yes';
    $('mailList').innerHTML = r.addresses.map(function (x) { return '<li><span class="addr">' + esc(x.masked) + '</span>' + (x.role ? '（' + esc(x.role === '本人' ? 'ご本人' : '秘書・ご担当者') + '）' : '') + '</li>'; }).join('');
    var hasSelf = r.addresses.some(function (x) { return x.role === '本人'; });
    $('addBox').hidden = hasSelf; $('addMail').value = '';
    err('saveErr', '');
    if (r.test) $('testBadge').hidden = false;
    skiRule();
  }

  function openHotel() { $('hotelBox').hidden = false; $('hotelOpen').hidden = true; $('hotelBox').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('hotelBody').focus({ preventScroll: true }); }
  $('hotelOpen').addEventListener('click', openHotel);
  $('hotelCancel').addEventListener('click', function () { $('hotelBox').hidden = true; $('hotelOpen').hidden = false; });
  $('hotelSend').addEventListener('click', function () {
    var body = $('hotelBody').value.trim(), contact = $('hotelContact').value.trim();
    if (!body) return err('hotelErr', '変更したい内容を書いてください');
    if (!contact) return err('hotelErr', 'ご連絡先（電話番号またはメールアドレス）を入れてください');
    err('hotelErr', ''); busy($('hotelSend'), true);
    api('ask', { kind: 'hotel', s: st.s, body: body, contact: contact }).then(function (r) {
      busy($('hotelSend'), false);
      if (!r.ok) return err('hotelErr', r.message);
      loadMe(st.s);
    });
  });

  // 行き・帰りの選択肢の説明（貸切バスは行き2/18・帰り2/21の1便ずつ）
  var GO_NOTE = { '貸切バス': '新千歳空港 11:15発（ホテル14:00着）。乗車費は片道6,000円（税別）', '自前': 'ご自身で手配' };
  function backNote(v) {
    if (v === '貸切バス') return 'ホテル10:00発。乗車費は片道6,000円（税別）';
    if (v.indexOf('遅い便') === 0) return 'ホテル14:00発。割り勘で1人10,000〜30,000円程度（検討中）';
    return v === '自前' ? 'ご自身で手配' : '';
  }
  // 行き・帰りの欄：いまの状態と、選択肢（全部見せる。「変更する」で隠すと、帰りの午後の便が無くなったように見えた・2026-10-31 小西さん指摘）
  function moveBox(key, label, opts, now, note) {
    var cur = opts.indexOf(now) >= 0 ? now : '';
    return '<div class="stat"><span class="k">' + label + '</span><span class="v">' + (cur ? esc(cur) + (note(cur) ? '<span class="s">' + esc(note(cur)) + '</span>' : '') : '<span class="todo">まだ伺っていません。下から選んでください</span>') + '</span>' +
      '</div>' + (cur ? '<span class="ql">変更する場合は、選び直してください</span>' : '') +
      '<div class="opts" id="o-' + key + '" role="radiogroup" aria-label="' + label + '">' + opts.map(function (v) {
        return '<label class="opt"><input type="radio" name="' + key + '" value="' + esc(v) + '"' + (v === cur ? ' checked' : '') + '><span class="t">' + esc(v) + (note(v) ? '<span class="s">' + esc(note(v)) + '</span>' : '') + '</span></label>';
      }).join('') + '</div>';
  }
  // 4日（2/18〜21）を日付の見出しで分け、日ごとに状態と質問を出す。いない日は「該当なし」（2026-10-31 小西さん指示）
  var DAY4 = [[18, '2/18（木）'], [19, '2/19（金）'], [20, '2/20（土）'], [21, '2/21（日）']];
  function renderDays(a) {
    var r = st.me, me = r.me, f = me.first, box = $('days'); box.innerHTML = '';
    var rng = (f.days || '').match(/2\/(\d+)\s*〜\s*(?:2\/)?(\d+)/);
    DAY4.forEach(function (x) {
      var n = x[0], el = document.createElement('div'); el.className = 'day';
      var dk = 'd' + n, act = n === 19 || n === 20, here = me.present.indexOf(n) >= 0;
      var html = '<h3>' + x[1] + '</h3>';
      if (!here || (act && me.days.indexOf(dk) < 0)) {
        var why = !here ? '第1回でお答えいただいた日程（' + f.days + '）では、ニセコにいらっしゃらない日です'
          : rng && Number(rng[1]) === n ? 'お越しになる日のため、アクティビティはありません' : 'お帰りになる日のため、アクティビティはありません';
        html += '<p class="none">該当なし<span class="s">' + esc(why) + '</span></p><button type="button" class="link" data-hotel="1">日程を変更したい場合はこちら</button>';
      } else if (n === 18) {
        html += moveBox('go', '行き', ['貸切バス', '自前'], f.go, function (v) { return GO_NOTE[v] || ''; }) +
          '<div class="stat"><span class="k">前夜祭</span><span class="v">17:00〜 ヒラフ「HITO by TACUBO」<span class="s">参加費に含まれます</span></span></div>' +
          '<div class="q"><span class="ql">前夜祭のあとの二次会に参加されますか<span class="req">*</span></span><div class="opts" role="radiogroup" aria-label="前夜祭のあとの二次会">' +
          r.nijikaiOpts.map(function (v) { return '<label class="opt"><input type="radio" name="nijikai" value="' + esc(v) + '"' + (v === a.nijikai ? ' checked' : '') + '><span class="t">' + esc(v) + '</span></label>'; }).join('') +
          '</div><p class="muted">二次会の費用は、飲まれた分を各自その場でお支払いください。</p></div>';
      } else if (n === 21) {
        // 最終日は自由行動。チェックアウトはホテルの規定で11:00（2026-10-31 小西さん指示）
        html += '<div class="stat"><span class="k">チェックアウト</span><span class="v">11:00まで<span class="s">貸切バス（10:00発）の方は、出発までにお済ませください</span></span></div>' +
          '<div class="stat"><span class="k">自由時間</span><span class="v">最終日は自由行動です<span class="s">スキー・スノボを楽しんで、午後にお帰りいただくこともできます</span></span></div>' +
          moveBox('back', '帰り', r.backOpts, f.back, backNote);
      } else {
        html += dayActs(dk, a);
      }
      el.innerHTML = html;
      if (act && el.querySelector('.opts')) el.insertBefore($('dayNote').content.cloneNode(true), el.children[1]);
      box.appendChild(el);
    });
    box.querySelectorAll('input').forEach(function (i) { i.addEventListener('change', skiRule); });
    box.querySelectorAll('[data-hotel]').forEach(function (b) { b.hidden = me.hold; b.addEventListener('click', openHotel); });
  }

  // 2/19・2/20 の選択肢（アクティビティ・キャンセル待ち・お昼だけ合流）
  function dayActs(dk, a) {
    var r = st.me, d = r.dayDefs.filter(function (x) { return x.key === dk; })[0];
    // held＝保存済みで席を持っているもの、sel＝いま選んでいるもの（キャンセル待ちならそのアクティビティ）
    var held = (r.answer || {})[dk] || '', savedW = (r.answer || {})[dk + '_w'] || '', sel = a[dk + '_w'] || a[dk] || '';
    var html = '<div class="opts" role="radiogroup" aria-label="' + esc(d.label) + 'の過ごし方">', last = '';
    acts(dk).forEach(function (x) {
      if (x.g !== last) { html += '<div class="grp">' + esc(x.g) + '</div>'; last = x.g; }
      var full = isFull(dk, x, held), on = sel === x.id, lim = limited(x);
      var left = lim ? leftOf(dk, x) : null;
      html += '<label class="opt' + (full ? ' wait' : '') + '"><input type="radio" name="' + dk + '" value="' + x.id + '"' + (on ? ' checked' : '') + '>' +
        '<span class="t"><span class="name"><span>' + esc(x.t) + '</span>' + (lim ? '<span class="left">' + (held === x.id ? 'お申し込み済み' : full ? (savedW === x.id ? 'キャンセル待ちで申し込み済み' : '満員・キャンセル待ちできます') : '残り' + left + '名') + '</span>' : '') + '</span>' +
        ((x.info.length || lim) ? '<dl>' + (x.cap ? '<dt>人数</dt><dd>' + (x.min ? x.min + '〜' : '') + x.cap + '名</dd>' : '') + (x.pool && r.pools[x.pool].cap ? '<dt>お店の席</dt><dd>' + esc(r.pools[x.pool].t) + ' ' + r.pools[x.pool].cap + '名（同じお店の組の合計）</dd>' : '') + x.info.map(function (kv) { return '<dt>' + esc(kv[0]) + '</dt><dd>' + esc(kv[1]) + '</dd>'; }).join('') + '</dl>' : '') + '</span></label>';
    });
    html += '</div>';
    // キャンセル待ちを選んだときだけ、空きが出なかったときの過ごし方を選んでもらう
    var fbVal = a[dk + '_w'] ? a[dk] : '';
    html += '<div class="fb" id="fb-' + dk + '" hidden><span class="ql">キャンセル待ちのため、空きが出なかったときの過ごし方も選んでください<span class="req">*</span></span><div class="opts" role="radiogroup" aria-label="' + esc(d.label) + 'の空きが出なかったときの過ごし方">';
    acts(dk).forEach(function (x) {
      if (isFull(dk, x, held)) return;
      html += '<label class="opt"><input type="radio" name="' + dk + '_f" value="' + x.id + '"' + (fbVal === x.id ? ' checked' : '') + '><span class="t">' + esc(x.t) + '</span></label>';
    });
    html += '</div></div>';
    // お昼だけ合流（スキー・スノボなどを選んだときだけ出す）（2026-10-27 白井さん）。席は数えない（アクティビティの参加者を優先し、空きがあれば入る・2026-10-31 小西さん指示）
    var lk = r.lunch[dk] || [], lv = a[dk + '_l'] || '';
    if (lk.length) {
      html += '<div class="q lunch" id="lb-' + dk + '" hidden><span class="ql">お昼だけ合流（' + esc(d.label) + '）</span><p class="muted">' + esc(r.lunchNote) + '</p><div class="opts" role="radiogroup" aria-label="' + esc(d.label) + 'のランチ">' +
        '<label class="opt"><input type="radio" name="' + dk + '_l" value=""' + (!lv ? ' checked' : '') + '><span class="t">参加しない</span></label>';
      lk.forEach(function (k) {
        html += '<label class="opt"><input type="radio" name="' + dk + '_l" value="' + k + '"' + (lv === k ? ' checked' : '') + '><span class="t">' + esc(r.pools[k].t) + '</span></label>';
      });
      html += '</div></div>';
    }
    return html;
  }

  // 満員か（自分が席を持っているものは満員にしない）
  function isFull(dk, x, held) {
    if (!limited(x)) return false;
    return leftOf(dk, x) <= 0 && held !== x.id;
  }
  function acts(dk) { return st.me.acts.filter(function (x) { return !x.days || x.days.indexOf(dk) >= 0; }); }
  function limited(x) { return !!(x.cap || (x.pool && st.me.pools[x.pool].cap)); }
  // お店の席はアクティビティの参加者だけで数える（ランチだけの方より優先）
  function leftOf(dk, x) {
    var t = st.me.taken[dk] || {}, out = null;
    if (x.cap) out = x.cap - (t[x.id] || 0);
    var p = x.pool && st.me.pools[x.pool];
    if (p && p.cap) { var l = p.cap - (t['pool:' + x.pool] || 0); out = out === null ? l : Math.min(out, l); }
    return out;
  }
  function act(id) { return st.me.acts.filter(function (a) { return a.id === id; })[0]; }
  function radio(name) { var c = document.querySelector('input[name=' + name + ']:checked'); return c ? c.value : ''; }
  // その日の回答：{c: 過ごし方, w: キャンセル待ち}
  function choice(d) {
    var main = radio(d), cur = (st.me.answer || {})[d] || '';
    var x = act(main);
    if (x && isFull(d, x, cur)) return { c: radio(d + '_f'), w: main };
    return { c: main, w: '' };
  }
  function skiRule() {
    var r = st.me; if (!r) return;
    var ski = false, bc = false;
    // 日ごとに全部見る（some で止めると、2/19 がスキーのとき 2/20 のお昼の欄が切り替わらなかった・2026-10-31 小西さん指摘）
    r.me.days.forEach(function (d) {
      var c = choice(d), x = act(c.c), w = act(c.w);
      var fb = $('fb-' + d); if (fb) fb.hidden = !c.w;
      // お昼だけ合流は、スキー・スノボ（班・自分たち）と自分で過ごす日だけ出す
      var lb = $('lb-' + d);
      if (lb) { lb.hidden = !(x && x.lunchOk); if (lb.hidden) { var none = lb.querySelector('input[value=""]'); if (none) none.checked = true; } }
      if ((x && x.ski) || (w && w.ski)) ski = true;
      if ((x && x.avalanche) || (w && w.avalanche)) bc = true;
    });
    $('secC').hidden = !ski; $('avBox').hidden = !bc;
  }
  document.querySelectorAll('input[name=fam]').forEach(function (i) { i.addEventListener('change', function () { $('famBox').hidden = i.value !== 'yes' || !i.checked; }); });

  $('stForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var r = st.me, ans = {};
    r.me.days.forEach(function (d) {
      var c = choice(d); ans[d] = c.c; ans[d + '_w'] = c.w;
      var lb = $('lb-' + d); ans[d + '_l'] = lb && !lb.hidden ? radio(d + '_l') : '';
    });
    ans.go = radio('go'); ans.back = radio('back');
    var miss = r.me.days.filter(function (d) { return ans[d + '_w'] && !ans[d]; });
    if (miss.length) return err('saveErr', miss.map(function (d) { return r.dayDefs.filter(function (x) { return x.key === d; })[0].label; }).join('、') + 'の、空きが出なかったときの過ごし方を選んでください');
    ['kind', 'level', 'sex', 'fam', 'famAllergy', 'avalanche', 'nijikai', 'alcohol'].forEach(function (n) { var c = document.querySelector('input[name=' + n + ']:checked'); ans[n] = c ? c.value : ''; });
    if ($('secC').hidden) { ans.kind = ans.level = ans.sex = ''; }
    r.famMeals.forEach(function (m) { ans[m.key] = $(m.key).value; if (m.kid) ans[m.kid] = $(m.kid).value; });
    if ($('avBox').hidden) ans.avalanche = '';
    ans.famAllergyBody = $('famAllergyBody').value; ans.famN = $('famN').value; ans.famWish = $('famWish').value; ans.memo = $('memo').value; ans.tel = $('tel').value.trim();
    var add = $('addBox').hidden ? '' : $('addMail').value.trim();
    busy($('save'), true); err('saveErr', ''); $('save').textContent = '送信しています（数秒かかります）…';
    api('save', { s: st.s, answers: ans, add_email: add, add_role: '本人' }).then(function (res) {
      busy($('save'), false); $('save').textContent = '送信';
      if (!res.ok) {
        if (res.error === 'session') { store(''); show('stName'); return err('nameErr', res.message); }
        if (res.taken) {
          // 選んでいたものを残したまま、最新の空き状況で描き直す
          var keep = {}; r.me.days.forEach(function (d) { var c = choice(d); keep[d] = c.w || c.c; });
          st.me.taken = res.taken;
          var a2 = Object.assign({}, st.me.answer || {});
          r.me.days.forEach(function (d) { a2[d + '_w'] = ''; a2[d] = keep[d]; var lb = $('lb-' + d); a2[d + '_l'] = lb && !lb.hidden ? radio(d + '_l') : ''; });
          a2.nijikai = radio('nijikai'); st.me.me.first.go = radio('go') || st.me.me.first.go; st.me.me.first.back = radio('back') || st.me.me.first.back;
          renderDays(a2); skiRule();
        }
        return err('saveErr', res.message);
      }
      st.me.answer = res.answer; st.me.taken = res.taken;
      if (ans.go) st.me.me.first.go = ans.go;
      if (ans.back) st.me.me.first.back = ans.back;
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
      // 確定ではないことが分かるように（2026-10-24 小西さん指示）
      var NOTE = '第2回アンケートでお選びいただいた内容です（仮）。人数などにより変わる場合があります。最終的な内容は1月に事務局からご連絡します。';
      var title = function (e) { return '（仮）ニセコ会議 ' + e.a.t + (e.a.time ? ' ' + e.a.time : '') + '（1月に確定）'; };
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//niseko-forum.com//survey2//JA'].concat(ev.map(function (e) {
        return ['BEGIN:VEVENT', 'UID:niseko2027-' + e.d.key + '-' + Date.now() + '@niseko-forum.com', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
          'DTSTART;VALUE=DATE:' + ymd(e.d.date), 'DTEND;VALUE=DATE:' + next(e.d.date), 'SUMMARY:' + title(e), 'DESCRIPTION:' + NOTE, 'LOCATION:ヒルトンニセコビレッジ', 'END:VEVENT'].join('\r\n');
      })).concat(['END:VCALENDAR']).join('\r\n');
      $('icsLink').href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      $('gcal').innerHTML = ev.map(function (e) {
        var u = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title(e)) + '&dates=' + ymd(e.d.date) + '/' + next(e.d.date) + '&details=' + encodeURIComponent(NOTE) + '&location=' + encodeURIComponent('ヒルトンニセコビレッジ');
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
