/* ニセコ会議2027 参加登録フォーム — フロント本体（依存ライブラリなし） */
(function () {
  'use strict';
  var CFG = window.NISEKO_CONFIG;
  var app = document.getElementById('app');
  var foot = document.getElementById('foot');
  var state = { token: null, ctx: null, answers: {}, stepIdx: 0, sections: [], flow: null };

  // ---------------------------------------------------------------- 設問定義
  // type: radio | check | text | email | tel | textarea | select
  // showIf: function(answers) → 表示条件 / phase: 1 | 2
  var SECTIONS = [
    { id: 'attendance', phase: 1, title: 'ご参加の日程', questions: [
      { id: 'attendance', type: 'radio', label: 'ご参加の形態をお選びください', options: [
        { v: 'full', t: 'フル参加', d: '2/18（木）イン 〜 2/21（日）アウト' },
        { v: 'two_nights', t: '2ナイト参加', d: '2泊のみ' },
        { v: 'undecided', t: '未定', d: '決まり次第、同じリンクから更新できます' },
        { v: 'absent', t: '今回は不参加', d: 'ご予定が変われば、同じリンクから参加に変更できます' } ] },
      { id: 'absent_note', type: 'textarea', label: '事務局へのひと言', optional: true, showIf: function (a) { return a.attendance === 'absent'; } },
      { id: 'two_nights_start', type: 'radio', label: '2ナイトの日程', showIf: function (a) { return a.attendance === 'two_nights'; }, options: [
        { v: '2027-02-18', t: '2/18（木）〜 2/20（土）' },
        { v: '2027-02-19', t: '2/19（金）〜 2/21（日）' } ] }
    ]},
    { id: 'lodging', phase: 1, title: 'ご宿泊', questions: [
      { id: 'lodging', type: 'radio', label: 'ご宿泊の形態', options: [
        { v: 'twin_share', t: 'ツイン相部屋', d: '宿泊費は参加費に含まれます' },
        { v: 'single', t: 'シングル利用', d: 'ニセコ会議専用サイトからご自身でご予約' },
        { v: 'self', t: '自分で手配', d: 'ヒルトン以外のご宿泊も含む' } ] },
      { id: 'roommate', type: 'text', label: '同室のご希望', optional: true, placeholder: '例：〇〇社 △△さん', showIf: function (a) { return a.lodging === 'twin_share'; } },
      { id: 'companions', type: 'radio', label: '同伴者', options: [
        { v: 'none', t: 'なし' }, { v: 'one', t: '1名' }, { v: 'two_plus', t: '2名以上' } ], row: true },
      { id: 'companion_party', type: 'radio', label: '同伴者の懇親会へのご参加', showIf: function (a) { return a.companions && a.companions !== 'none'; }, options: [
        { v: 'yes', t: '参加する' }, { v: 'no', t: '参加しない' } ], row: true }
    ]},
    { id: 'contact', phase: 1, title: 'ご連絡', questions: [
      { id: 'contact_via', type: 'radio', label: '事務局からのご連絡先', options: [
        { v: 'self', t: 'ご本人へ' }, { v: 'secretary', t: '秘書の方へ' } ], row: true },
      { id: 'secretary_name', type: 'text', label: '秘書の方のお名前', showIf: function (a) { return a.contact_via === 'secretary'; } },
      { id: 'secretary_email', type: 'email', label: '秘書の方のメールアドレス', showIf: function (a) { return a.contact_via === 'secretary'; } },
      { id: 'note1', type: 'textarea', label: '事務局へのご連絡事項', optional: true }
    ]},
    // ---- 第2弾（ニセコでの過ごし方）：設定シートの phase2_open を TRUE にすると、同じリンクで表示
    { id: 'transport', phase: 2, title: '交通', questions: [
      { id: 'go', type: 'radio', label: '行き（新千歳空港 → ニセコ）', options: [
        { v: 'bus', t: '貸切バスに乗る', d: '事務局手配・時刻は後日ご案内' },
        { v: 'self', t: '自分で手配', d: 'レンタカー・タクシー・路線バスなど' } ] },
      { id: 'back', type: 'radio', label: '帰り（ニセコ → 新千歳空港）', options: [
        { v: 'bus', t: '貸切バスに乗る' },
        { v: 'self', t: '自分で手配' } ] },
      { id: 'return_flight', type: 'text', label: '帰りの便', optional: true, placeholder: '例：ANA 4726便 16:50発（分かれば）' }
    ]},
    { id: 'ski', phase: 2, title: 'スキー・スノーボード', questions: [
      { id: 'ski', type: 'radio', label: 'スキー・スノーボードをされますか', options: [
        { v: 'yes', t: 'する' }, { v: 'no', t: 'しない' } ], row: true },
      { id: 'ski_type', type: 'radio', label: '種目', showIf: function (a) { return a.ski === 'yes'; }, options: [
        { v: 'ski', t: 'スキー' }, { v: 'snowboard', t: 'スノーボード' }, { v: 'both', t: '両方' } ], row: true },
      { id: 'ski_level', type: 'radio', label: 'レベル', showIf: function (a) { return a.ski === 'yes'; }, options: [
        { v: 'beginner', t: '初めて・初心者' },
        { v: 'novice', t: '初級', d: '緩やかな斜面をゆっくり' },
        { v: 'intermediate', t: '中級', d: '一般コースを一通り滑れる' },
        { v: 'advanced', t: '上級', d: 'どのコースでも滑れる' } ] },
      { id: 'powder', type: 'radio', label: 'パウダーツアー', hint: 'ガイド付きでゲレンデ外のパウダーエリアへ（エキスパート向け・早期予約が必要）', showIf: function (a) { return a.ski === 'yes'; }, options: [
        { v: 'yes', t: '希望する' }, { v: 'no', t: '希望しない' } ], row: true },
      { id: 'rental', type: 'radio', label: 'レンタル（板・ブーツ・ウェア）', showIf: function (a) { return a.ski === 'yes'; }, options: [
        { v: 'yes', t: '必要' }, { v: 'no', t: '不要' } ], row: true },
      { id: 'no_ski_wish', type: 'check', label: 'スキー以外でご希望のもの', optional: true, hint: '複数選べます', showIf: function (a) { return a.ski === 'no'; }, options: [
        { v: 'onsen', t: '温泉' }, { v: 'lunch', t: 'ランチ会' }, { v: 'distillery', t: '蒸留所見学' }, { v: 'snowmobile', t: 'スノーモービル' }, { v: 'undecided', t: '未定' } ] }
    ]},
    { id: 'topics', phase: 2, title: '経営テーマ', intro: 'いま関心のある経営テーマを最大3つ、ひと言でお書きください（任意）。座談会やテーブル編成の参考にします。', questions: [
      { id: 'topic1', type: 'text', label: 'テーマ 1', optional: true, placeholder: '例：AI活用、後継者、海外展開' },
      { id: 'topic2', type: 'text', label: 'テーマ 2', optional: true },
      { id: 'topic3', type: 'text', label: 'テーマ 3', optional: true }
    ]},
    { id: 'extras', phase: 2, title: 'そのほか', questions: [
      { id: 'arrival_flight', type: 'text', label: '到着便・到着時刻', optional: true, placeholder: '例：ANA 4721便 10:35着' },
      { id: 'diet', type: 'text', label: 'お食事のご制限', optional: true, placeholder: 'アレルギー・苦手なものなど' },
      { id: 'note', type: 'textarea', label: 'その他ご質問・ご要望', optional: true }
    ]}
  ];
  // ---------------------------------------------------------------- API
  var RETRYABLE = { ping: 1, getContext: 1, lookupSurname: 1 }; // 送信・保存は二重実行を避けるため再試行しない
  function api(action, payload, attempt) {
    attempt = attempt || 1;
    var maxAttempt = RETRYABLE[action] ? 2 : 1;
    var body = Object.assign({ action: action, k: CFG.k }, payload || {});
    return fetch(CFG.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', credentials: 'omit', cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        try { return JSON.parse(t); } catch (e) {
          // Google 側が一時的に HTML を返すことがあるため 1 回だけ再試行
          if (attempt < maxAttempt) return new Promise(function (res) { setTimeout(res, 1200); }).then(function () { return api(action, payload, attempt + 1); });
          return { ok: false, error: 'bad_response', message: 'サーバーが混み合っています。数秒おいて、もう一度お試しください' };
        }
      })
      .catch(function () {
        if (attempt < maxAttempt) return new Promise(function (res) { setTimeout(res, 1200); }).then(function () { return api(action, payload, attempt + 1); });
        return { ok: false, error: 'network', message: '通信に失敗しました。電波の良い場所で再度お試しください' };
      });
  }

  // ---------------------------------------------------------------- 描画ユーティリティ
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== undefined && attrs[k] !== null) el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c === null || c === undefined) return; el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function render(nodes) { app.innerHTML = ''; (Array.isArray(nodes) ? nodes : [nodes]).forEach(function (n) { app.appendChild(n); }); window.scrollTo(0, 0); }
  function card(children) { return h('div', { class: 'card' }, children); }
  function err(msg) { return h('p', { class: 'err' }, [msg]); }
  function busy(btn, on) { if (!btn) return; btn.disabled = on; if (on) { btn.dataset.t = btn.textContent; btn.innerHTML = '<span class="spinner"></span>送信中…'; } else if (btn.dataset.t) btn.textContent = btn.dataset.t; }

  // ---------------------------------------------------------------- 入口
  function boot() {
    foot.textContent = CFG.env === 'test' ? 'テスト環境（本番のデータではありません）' : '';
    var p = new URLSearchParams(location.search).get('p');
    if (p) { state.token = p; loadContext(); } else screenEntry();
  }

  function screenEntry() {
    render(card([
      h('h1', null, ['ご参加登録']),
      h('p', { class: 'muted' }, ['3分ほどで終わります。後から同じリンクで変更できます。']),
      h('button', { class: 'btn primary big', onclick: screenReturning }, ['昨年（ニセコ会議2026）に参加した', h('small', null, ['名字を入れるだけで、会社名などは自動で入ります'])]),
      h('button', { class: 'btn ghost big', onclick: screenNew }, ['初めて参加する', h('small', null, ['お名前・会社名・ご連絡先をご入力ください'])])
    ]));
  }

  // ---- 昨年参加：名字 → 候補 → コード
  function screenReturning() {
    var input = h('input', { type: 'text', placeholder: '例：山田', autocomplete: 'family-name', autofocus: 'autofocus' });
    var msg = h('div');
    var go = h('button', { class: 'btn primary', onclick: function () {
      var q = input.value.trim(); if (!q) return;
      busy(go, true); msg.innerHTML = '';
      api('lookupSurname', { surname: q }).then(function (r) {
        busy(go, false);
        if (!r.ok) { msg.appendChild(err(r.message)); return; }
        if (!r.candidates.length) {
          msg.appendChild(err('「' + q + '」で見つかりませんでした。'));
          msg.appendChild(h('p', null, ['フルネームでお試しいただくか、', h('button', { class: 'link', onclick: screenNew }, ['初めて参加として登録']), 'してください。']));
          return;
        }
        screenCandidates(q, r.candidates);
      });
    } }, ['次へ']);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
    render(card([
      h('h2', null, ['お名前（名字）を入力してください']),
      h('div', { class: 'q' }, [input]), msg,
      h('div', { class: 'actions' }, [h('button', { class: 'btn ghost sub', onclick: screenEntry }, ['戻る']), go])
    ]));
    setTimeout(function () { input.focus(); }, 50);
  }

  function screenCandidates(q, cands) {
    var list = cands.map(function (c) {
      return h('button', { class: 'choice', onclick: function () { pickCandidate(c); } }, [h('span', { class: 'mark' }), h('span', { class: 'txt' }, [q + ' 様', h('span', { class: 'desc' }, [c.company + (c.title ? ' ／ ' + c.title : '')])])]);
    });
    render(card([
      h('h2', null, ['ご本人の会社をお選びください']),
      h('div', { class: 'choices' }, list),
      h('p', { class: 'muted', style: 'margin-top:14px' }, ['該当がない場合は ', h('button', { class: 'link', onclick: screenNew }, ['初めて参加として登録']), ' してください。']),
      h('div', { class: 'actions' }, [h('button', { class: 'btn ghost sub', onclick: screenReturning }, ['戻る'])])
    ]));
  }

  function pickCandidate(c) {
    if (!c._who) {
      render(card([
        h('h2', null, ['どなたがご入力されますか']),
        h('p', { class: 'muted' }, ['6桁の認証コードをメールでお送りします。秘書の方はご本人と同じように登録・変更ができます。']),
        h('div', { class: 'choices' }, [
          h('button', { class: 'choice', onclick: function () { c._who = 'self'; pickCandidate(c); } }, [h('span', { class: 'mark' }), h('span', { class: 'txt' }, ['ご本人', h('span', { class: 'desc' }, [c.has_email ? 'ご登録のメールアドレスにコードを送ります' : 'メールアドレスをご入力いただきます'])])]),
          h('button', { class: 'choice', onclick: function () { c._who = 'secretary'; pickCandidate(c); } }, [h('span', { class: 'mark' }), h('span', { class: 'txt' }, ['秘書・代理の方', h('span', { class: 'desc' }, [c.has_secretary ? 'ご登録の秘書の方のアドレスにコードを送ります' : '秘書の方のメールアドレスをご入力いただきます'])])])
        ]),
        h('div', { class: 'actions', style: 'margin-top:14px' }, [h('button', { class: 'btn ghost sub', onclick: screenReturning }, ['戻る'])])
      ]));
      return;
    }
    var sec = c._who === 'secretary';
    if ((sec && c.has_secretary) || (!sec && c.has_email)) {
      render(card([h('h2', null, ['認証コードをお送りしています']), h('p', null, [h('span', { class: 'spinner' }), 'ご登録のメールアドレスへ送信中です。数秒お待ちください…'])]));
      requestCode({ cid: c.cid, to: sec ? 'secretary' : undefined }, function () { c._who = null; pickCandidate(c); });
      return;
    }
    // アドレス未登録 → 入力してもらう（秘書は名前も）
    var name = h('input', { type: 'text', placeholder: '例：鈴木', autocomplete: 'name' });
    var input = h('input', { type: 'email', placeholder: 'you@example.co.jp', autocomplete: 'email' });
    var msg = h('div');
    var go = h('button', { class: 'btn primary', onclick: function () {
      var e = input.value.trim(); if (!e) return;
      requestCode(sec ? { cid: c.cid, to: 'secretary', email: e, secretary_name: name.value.trim() } : { cid: c.cid, email: e }, function () { c._who = null; pickCandidate(c); }, go, msg);
    } }, ['認証コードを送る']);
    var row = function (label, el) { return h('div', { class: 'q' }, [h('label', { class: 'label' }, [label]), el]); };
    render(card([
      h('h2', null, [sec ? '秘書の方のメールアドレス' : 'メールアドレスをご登録ください']),
      h('p', { class: 'muted' }, [sec ? 'ご入力のアドレスに認証コードをお送りします。ご本人には、秘書の方が登録を始めた旨をメールでお知らせします。' : 'ご登録のメールアドレスが事務局にありません。ご本人のメールアドレスをご入力ください。認証コードをお送りします。']),
      sec ? row('秘書の方のお名前', name) : null,
      row('メールアドレス', input), msg,
      h('div', { class: 'actions' }, [h('button', { class: 'btn ghost sub', onclick: function () { c._who = null; pickCandidate(c); } }, ['戻る']), go])
    ]));
  }

  // ---- 初めて参加
  function screenNew() {
    var f = {
      name: h('input', { type: 'text', placeholder: '例：山田 太郎', autocomplete: 'name' }),
      company: h('input', { type: 'text', placeholder: '例：株式会社〇〇', autocomplete: 'organization' }),
      title: h('input', { type: 'text', placeholder: '例：代表取締役社長', autocomplete: 'organization-title' }),
      email: h('input', { type: 'email', placeholder: 'you@example.co.jp', autocomplete: 'email' }),
      phone: h('input', { type: 'tel', placeholder: '090-0000-0000（任意）', autocomplete: 'tel' }),
      referrer: h('select', null, [h('option', { value: '' }, ['選択してください'])])
    };
    fetchReferrers().then(function (list) { list.forEach(function (n) { f.referrer.appendChild(h('option', { value: n }, [n])); }); });
    var msg = h('div');
    var go = h('button', { class: 'btn primary', onclick: function () {
      var np = { name: f.name.value.trim(), company: f.company.value.trim(), title: f.title.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), referrer: f.referrer.value };
      msg.innerHTML = '';
      if (!np.name || !np.company || !np.email) { msg.appendChild(err('お名前・会社名・メールアドレスは必須です')); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(np.email)) { msg.appendChild(err('メールアドレスの形式をご確認ください')); return; }
      requestCode({ newProfile: np }, screenNew, go, msg);
    } }, ['認証コードを送る']);
    var row = function (label, el, opt) { return h('div', { class: 'q' }, [h('label', { class: 'label' }, [label, opt ? h('span', { class: 'opt' }, ['任意']) : null]), el]); };
    render(card([
      h('h2', null, ['はじめてのご参加']),
      h('p', { class: 'muted' }, ['ご入力のメールアドレスに認証コードをお送りします。']),
      row('お名前', f.name), row('会社名', f.company), row('役職', f.title), row('メールアドレス', f.email), row('電話番号', f.phone, true), row('ご紹介者（事務局メンバー）', f.referrer),
      msg,
      h('div', { class: 'actions' }, [h('button', { class: 'btn ghost sub', onclick: screenEntry }, ['戻る']), go])
    ]));
  }

  var referrersCache = null;
  function fetchReferrers() {
    if (referrersCache) return Promise.resolve(referrersCache);
    return api('ping').then(function (r) {
      referrersCache = (r.ok && r.referrers && r.referrers.length) ? r.referrers : ['富山', '小西', '白井', '佐伯', '渡辺', '高橋', 'その他・不明'];
      return referrersCache;
    });
  }

  // ---- 認証コード
  var sendingCode = false;
  function requestCode(payload, backFn, btn, msg) {
    if (sendingCode) return;
    sendingCode = true;
    busy(btn, true);
    api('sendCode', payload).then(function (r) {
      sendingCode = false;
      busy(btn, false);
      if (!r.ok && r.error === 'maybe_existing') { screenMaybeExisting(r.candidates, payload, backFn); return; }
      if (!r.ok) {
        if (msg) { msg.innerHTML = ''; msg.appendChild(err(r.message)); }
        else render(card([h('h2', null, ['送信できませんでした']), err(r.message), h('div', { class: 'actions' }, [h('button', { class: 'btn ghost', onclick: backFn }, ['戻る'])])]));
        return;
      }
      screenCode(r, payload, backFn);
    });
  }

  function screenMaybeExisting(cands, payload, backFn) {
    var name = (payload.newProfile && payload.newProfile.name) || '';
    render(card([
      h('h2', null, ['昨年ご参加の方ではありませんか']),
      h('p', { class: 'muted' }, ['同じお名前の方が、昨年の参加者名簿にいらっしゃいます。ご本人でしたら会社名をお選びください。']),
      h('div', { class: 'choices' }, cands.map(function (c) {
        return h('button', { class: 'choice', onclick: function () { pickCandidate(c); } }, [h('span', { class: 'mark' }), h('span', { class: 'txt' }, [name + ' 様', h('span', { class: 'desc' }, [c.company + (c.title ? ' ／ ' + c.title : '')])])]);
      })),
      h('div', { class: 'actions', style: 'margin-top:14px' }, [
        h('button', { class: 'btn ghost sub', onclick: backFn }, ['戻る']),
        h('button', { class: 'btn ghost', onclick: function () { payload.force_new = true; render(card([h('p', null, [h('span', { class: 'spinner' }), '送信中です…'])])); requestCode(payload, backFn); } }, ['いいえ、初めての参加です'])
      ])
    ]));
  }

  function screenCode(sent, payload, backFn) {
    var input = h('input', { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '6', class: 'code', autocomplete: 'one-time-code', placeholder: '000000' });
    var msg = h('div');
    var go = h('button', { class: 'btn primary', onclick: function () {
      var code = input.value.replace(/\D/g, ''); if (code.length !== 6) { msg.innerHTML = ''; msg.appendChild(err('6桁の数字を入力してください')); return; }
      busy(go, true); msg.innerHTML = '';
      api('verifyCode', { code_id: sent.code_id, code: code }).then(function (r) {
        busy(go, false);
        if (!r.ok) { msg.appendChild(err(r.message)); return; }
        stopTimer();
        history.replaceState(null, '', location.pathname + '?p=' + r.p);
        state.token = r.p; loadContext();
      });
    } }, ['認証する']);
    input.addEventListener('input', function () { if (input.value.replace(/\D/g, '').length === 6) go.click(); });
    // 60秒待って届かなければ、再送か事務局連絡へ
    var wait = h('p', { class: 'muted' }, ['通常は1分以内に届きます。届かない場合は迷惑メールフォルダもご確認ください。']);
    var late = h('div', { style: 'display:none' }, [
      h('p', { class: 'err' }, ['まだ届いていませんか？']),
      h('div', { class: 'actions' }, [
        h('button', { class: 'btn ghost', onclick: function () {
          render(card([h('h2', null, ['認証コードを再送しています']), h('p', null, [h('span', { class: 'spinner' }), '数秒お待ちください…'])]));
          api('sendCode', payload).then(function (r) { if (!r.ok) { render(card([h('h2', null, ['送信できませんでした']), err(r.message), h('div', { class: 'actions' }, [h('button', { class: 'btn ghost', onclick: backFn }, ['戻る'])])])); return; } screenCode(r, payload, backFn); });
        } }, ['もう一度送る']),
        h('button', { class: 'btn ghost', onclick: function () { openContact('認証コードが届きません（' + sent.masked_email + ' 宛て）。'); } }, ['事務局に連絡'])
      ]),
      h('p', { class: 'muted' }, ['遅れて届いたコードも、10分以内であればそのまま使えます。'])
    ]);
    var left = 60, timer = null;
    var count = h('span', null, ['']);
    function stopTimer() { if (timer) clearInterval(timer); timer = null; }
    function tick() {
      if (left <= 0) { stopTimer(); wait.style.display = 'none'; late.style.display = ''; return; }
      count.textContent = '（あと ' + left + ' 秒お待ちください）'; left--;
    }
    wait.appendChild(count); tick(); timer = setInterval(tick, 1000);
    render(card([
      h('h2', null, ['認証コードを入力してください']),
      h('p', null, [sent.masked_email + ' 宛てに6桁のコードをお送りしました。' + (sent.deduped ? '（先ほどのコードがそのまま使えます）' : '')]),
      h('div', { class: 'q' }, [input]), msg,
      h('div', { class: 'actions' }, [h('button', { class: 'btn ghost sub', onclick: function () { stopTimer(); backFn(); } }, ['戻る']), go]),
      wait, late
    ]));
    setTimeout(function () { input.focus(); }, 50);
  }

  // ---------------------------------------------------------------- 本人リンク以降
  function loadContext() {
    render(card([h('p', null, [h('span', { class: 'spinner' }), '読み込み中…'])]));
    api('getContext', { p: state.token }).then(function (r) {
      if (!r.ok) { render(card([h('h2', null, ['リンクを確認できません']), h('p', null, [r.message]), h('button', { class: 'btn ghost', onclick: function () { location.href = location.pathname; } }, ['最初から登録する'])])); return; }
      state.ctx = r; state.profileUpdates = {};
      if (r.pending) { screenPending(); return; }
      state.answers = Object.assign({}, r.answers || {});
      if (r.server_draft && Number(r.server_draft.base_version) === Number(r.version || 0)) state.answers = Object.assign({}, state.answers, r.server_draft.answers); // 別の端末で入力途中の内容
      var draft = loadDraft();
      if (draft && Object.keys(draft).length) state.answers = Object.assign({}, state.answers, draft);
      state.sections = SECTIONS.filter(function (s) { var ph = r.phases['phase' + s.phase]; return ph && ph.open; });
      screenProfile();
    });
  }

  function screenPending() {
    var pr = state.ctx.profile;
    render(card([
      h('h2', null, [pr.status === '却下' ? 'ご登録について' : 'お申し込みを受け付けました']),
      profileBox(),
      pr.status === '却下'
        ? h('p', null, ['恐れ入りますが、事務局までお問い合わせください。'])
        : h('p', null, ['ただいま事務局で確認しています。確認が済みましたら、ご登録用のリンクをメールでお送りします。いましばらくお待ちください。']),
      h('div', { class: 'actions' }, [h('button', { class: 'btn ghost', onclick: function () { openContact(''); } }, ['事務局に連絡する'])])
    ]));
  }

  function profileBox() {
    var pr = state.ctx.profile, u = state.profileUpdates || {};
    return h('div', { class: 'profile' }, [h('div', { class: 'name' }, [(u['氏名'] || pr.name) + ' 様']), h('div', null, [u['会社'] !== undefined ? u['会社'] : pr.company]), h('div', { class: 'muted' }, [(u['役職'] !== undefined ? u['役職'] : pr.title) || ''])]);
  }

  function screenProfile() {
    var ctx = state.ctx, pr = ctx.profile;
    var locked = ctx.edit_locked || !state.sections.length;
    var hasAnswer = ctx.version > 0;
    var kids = [profileBox()];
    if (pr.status === '承認待ち') kids.push(h('p', { class: 'muted' }, ['ご登録内容は事務局で確認のうえ、改めてご案内します。']));
    if (locked) {
      kids.unshift(h('h2', null, ['ご登録内容']));
      kids.push(h('p', null, ['回答の受付は終了しました。変更は事務局へご連絡ください。']));
      kids.push(reviewList(false));
    } else {
      kids.unshift(h('h2', null, [hasAnswer ? 'ご登録内容の確認・変更' : 'ご本人の確認']));
      var newlyOpened = state.sections.filter(function (s) { return s.phase === 2 && !(ctx.phase_done && ctx.phase_done.phase2); });
      kids.push(h('p', { class: 'muted' }, [hasAnswer ? '前回のご回答が入っています。変更したい項目だけ直してください。' : '上記の方のご登録でしたら「登録をはじめる」を押してください。秘書の方も、ご本人と同じように登録・変更ができます。']));
      if (hasAnswer && newlyOpened.length) kids.push(h('p', null, ['新しい項目「' + newlyOpened.map(function (s) { return s.title; }).join('・') + '」が追加されています。']));
      kids.push(h('div', { class: 'actions' }, [
        h('button', { class: 'btn primary', onclick: function () { state.stepIdx = 0; if (hasAnswer) screenReview(); else screenStep(); } }, [hasAnswer ? '内容を確認する' : '登録をはじめる'])
      ]));
      kids.push(h('p', { style: 'margin-top:14px' }, [h('button', { class: 'link', onclick: screenEditProfile }, ['会社名・役職が変わった方はこちらで修正'])]));
      if (ctx.server_draft) kids.push(h('p', { class: 'muted' }, ['入力途中の内容が保存されています。続きからご入力いただけます。']));
      kids.push(h('p', { class: 'muted', style: 'margin-top:14px' }, ['別の方の登録をする場合は ', h('button', { class: 'link', onclick: function () { location.href = location.pathname; } }, ['こちら']), ' から登録してください。']));
    }
    render(card(kids));
  }

  function screenEditProfile() {
    var pr = state.ctx.profile, u = state.profileUpdates || {};
    var f = { name: h('input', { type: 'text' }), company: h('input', { type: 'text' }), title: h('input', { type: 'text' }) };
    f.name.value = u['氏名'] || pr.name || ''; f.company.value = u['会社'] !== undefined ? u['会社'] : (pr.company || ''); f.title.value = u['役職'] !== undefined ? u['役職'] : (pr.title || '');
    var row = function (label, el) { return h('div', { class: 'q' }, [h('label', { class: 'label' }, [label]), el]); };
    render(card([
      h('h2', null, ['お名前・会社名・役職の修正']),
      h('p', { class: 'muted' }, ['修正した内容は、登録の送信時に反映されます。']),
      row('お名前', f.name), row('会社名', f.company), row('役職', f.title),
      h('div', { class: 'actions' }, [
        h('button', { class: 'btn ghost sub', onclick: screenProfile }, ['戻る']),
        h('button', { class: 'btn primary', onclick: function () {
          var n = {};
          if (f.name.value.trim() && f.name.value.trim() !== pr.name) n['氏名'] = f.name.value.trim();
          if (f.company.value.trim() !== (pr.company || '')) n['会社'] = f.company.value.trim();
          if (f.title.value.trim() !== (pr.title || '')) n['役職'] = f.title.value.trim();
          state.profileUpdates = n; screenProfile();
        } }, ['この内容にする'])
      ])
    ]));
  }

  // ---- 設問ステップ
  function visibleQuestions(sec) { return sec.questions.filter(function (q) { return !q.showIf || q.showIf(state.answers); }); }

  // 表示するセクション（「今回は不参加」なら日程だけ）
  function secs() { return state.sections.filter(function (x) { return x.id === 'attendance' || state.answers.attendance !== 'absent'; }); }

  function screenStep() {
    var sec = secs()[state.stepIdx];
    var body = h('div');
    var msg = h('div');
    function draw() {
      body.innerHTML = '';
      if (sec.intro) body.appendChild(h('p', { class: 'muted' }, [sec.intro]));
      visibleQuestions(sec).forEach(function (q) { body.appendChild(renderQuestion(q, draw)); });
      if (next) next.textContent = state.stepIdx + 1 < secs().length ? '次へ' : '確認へ';
    }
    var next = null;
    next = h('button', { class: 'btn primary', onclick: function () {
      var missing = visibleQuestions(sec).filter(function (q) { return !q.optional && isEmpty(state.answers[q.id]); });
      msg.innerHTML = '';
      if (missing.length) { msg.appendChild(err('「' + missing[0].label + '」を' + (missing[0].options ? 'お選び' : 'ご入力') + 'ください')); return; }
      var bad = visibleQuestions(sec).filter(function (q) { return q.type === 'email' && state.answers[q.id] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.answers[q.id]); });
      if (bad.length) { msg.appendChild(err('メールアドレスの形式をご確認ください')); return; }
      saveDraft(); saveServerDraft();
      if (state.stepIdx + 1 < secs().length) { state.stepIdx++; screenStep(); } else screenReview();
    } }, [state.stepIdx + 1 < secs().length ? '次へ' : '確認へ']);
    draw();
    var back = h('button', { class: 'btn ghost sub', onclick: function () { saveDraft(); if (state.stepIdx === 0) screenProfile(); else { state.stepIdx--; screenStep(); } } }, ['戻る']);
    render(card([
      progress(), h('h2', null, [sec.title + (sec.phase === 2 ? ' ' : '')]), body, msg,
      h('div', { class: 'actions' }, [back, next])
    ]));
  }

  function progress() {
    return h('div', { class: 'progress' }, secs().map(function (s, i) { return h('span', { class: i < state.stepIdx ? 'done' : (i === state.stepIdx ? 'cur' : '') }); }));
  }

  function renderQuestion(q, redraw) {
    var a = state.answers;
    var wrap = h('div', { class: 'q' });
    wrap.appendChild(h('span', { class: 'label' }, [q.label, q.optional ? h('span', { class: 'opt' }, ['任意']) : null]));
    if (q.hint) wrap.appendChild(h('div', { class: 'hint' }, [q.hint]));
    if (q.type === 'radio' || q.type === 'check') {
      var multi = q.type === 'check';
      var cur = multi ? (Array.isArray(a[q.id]) ? a[q.id] : []) : a[q.id];
      var box = h('div', { class: 'choices' + (q.row ? ' row' : '') });
      q.options.forEach(function (o) {
        var sel = multi ? cur.indexOf(o.v) >= 0 : cur === o.v;
        box.appendChild(h('button', { class: 'choice' + (sel ? ' sel' : '') + (multi ? ' box' : ''), type: 'button', 'aria-label': o.t, 'aria-pressed': sel ? 'true' : 'false', onclick: function () {
          if (multi) { var arr = cur.slice(); var i = arr.indexOf(o.v); if (i >= 0) arr.splice(i, 1); else arr.push(o.v); a[q.id] = arr; }
          else a[q.id] = o.v;
          redraw();
        } }, [h('span', { class: 'mark' }, [sel ? '✓' : '']), h('span', { class: 'txt' }, [o.t, o.d ? h('span', { class: 'desc' }, [o.d]) : null])]));
      });
      wrap.appendChild(box);
    } else if (q.type === 'textarea') {
      var ta = h('textarea', { placeholder: q.placeholder || '' }); ta.value = a[q.id] || '';
      ta.addEventListener('input', function () { a[q.id] = ta.value; });
      wrap.appendChild(ta);
    } else {
      var inp = h('input', { type: q.type === 'email' ? 'email' : (q.type === 'tel' ? 'tel' : 'text'), placeholder: q.placeholder || '', autocomplete: q.type === 'email' ? 'email' : 'off' }); inp.value = a[q.id] || '';
      inp.addEventListener('input', function () { a[q.id] = inp.value; });
      wrap.appendChild(inp);
    }
    return wrap;
  }

  function isEmpty(v) { return v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length); }

  // ---- 確認・送信
  function labelOf(q, v) {
    if (isEmpty(v)) return '';
    if (q.options) {
      var arr = Array.isArray(v) ? v : [v];
      return arr.map(function (x) { var o = q.options.filter(function (o) { return o.v === x; })[0]; return o ? o.t : x; }).join('、');
    }
    return String(v);
  }
  function summaryRows() {
    var rows = [];
    secs().forEach(function (sec) { visibleQuestions(sec).forEach(function (q) { var v = labelOf(q, state.answers[q.id]); if (v) rows.push({ key: q.id, label: q.label, value: v }); }); });
    return rows;
  }
  function reviewList(editable) {
    var el = h('div', { class: 'review' });
    secs().forEach(function (sec, i) {
      var head = h('div', { class: 'sec' }, [h('h3', null, [sec.title]), editable ? h('button', { class: 'link', onclick: function () { state.stepIdx = i; screenStep(); } }, ['変更']) : null]);
      var dl = h('dl');
      visibleQuestions(sec).forEach(function (q) { var v = labelOf(q, state.answers[q.id]); dl.appendChild(h('dt', null, [q.label])); dl.appendChild(h('dd', null, [v || '（未回答）'])); });
      el.appendChild(head); el.appendChild(dl);
    });
    return el;
  }

  function screenReview() {
    var msg = h('div');
    var send = h('button', { class: 'btn primary', onclick: function () {
      // 必須チェック（全セクション）
      for (var i = 0; i < secs().length; i++) {
        var miss = visibleQuestions(secs()[i]).filter(function (q) { return !q.optional && isEmpty(state.answers[q.id]); });
        if (miss.length) { state.stepIdx = i; screenStep(); return; }
      }
      busy(send, true); msg.innerHTML = '';
      var phase = secs().some(function (s) { return s.phase === 2; }) && state.ctx.phases.phase2.open ? '2' : '1';
      var pu = state.profileUpdates || {};
      api('saveAnswers', { p: state.token, phase: phase, answers: state.answers, base_version: state.ctx.version, summary: summaryRows(), profile_updates: pu, base_url: location.origin + location.pathname }).then(function (r) {
        busy(send, false);
        if (!r.ok) { msg.appendChild(err(r.message)); if (r.error === 'conflict') setTimeout(function () { location.reload(); }, 2500); return; }
        clearDraft(); state.ctx.version = r.version; state.ctx.server_draft = null;
        if (pu['氏名']) state.ctx.profile.name = pu['氏名']; if (pu['会社'] !== undefined) state.ctx.profile.company = pu['会社']; if (pu['役職'] !== undefined) state.ctx.profile.title = pu['役職']; state.profileUpdates = {}; state.ctx.answers = Object.assign({}, state.answers);
        screenDone(r);
      });
    } }, [state.ctx.version > 0 ? '変更を送信する' : '登録する']);
    render(card([
      h('h2', null, ['内容をご確認ください']), h('p', { class: 'err' }, ['まだ登録は完了していません。内容を確認して、下の「' + (state.ctx.version > 0 ? '変更を送信する' : '登録する') + '」を押してください。']), profileBox(), reviewList(true), msg,
      h('div', { class: 'actions', style: 'margin-top:18px' }, [h('button', { class: 'btn ghost sub', onclick: function () { state.stepIdx = secs().length - 1; screenStep(); } }, ['戻る']), send])
    ]));
  }

  function screenDone(r) {
    var ev = state.ctx.event, a = state.answers;
    var absent = a.attendance === 'absent';
    var kids = [h('h2', null, [r.unchanged ? '変更はありませんでした' : (absent ? 'ご回答ありがとうございました' : (r.version > 1 ? '変更を受け付けました' : 'ご登録ありがとうございました'))])];
    if (absent && !r.unchanged) kids.push(h('p', null, ['「今回は不参加」として承りました。']));
    if (r.mailed) kids.push(h('p', null, ['確認メールを ' + r.mailed_to + ' 宛てにお送りしました。']));
    if (r.rejected && r.rejected.length) kids.push(h('p', { class: 'err' }, ['締切を過ぎた項目（' + r.rejected.length + '件）は変更されていません。変更が必要な場合は事務局へご連絡ください。']));
    else if (!r.unchanged) kids.push(h('p', { class: 'muted' }, ['メールアドレスが未登録のため確認メールは送られません。このページの内容を控えてください。']));
    var d = dates(a, ev);
    if (d) {
      kids.push(h('p', { style: 'margin-top:14px' }, [h('b', null, ['カレンダーに追加'])]));
      kids.push(h('div', { class: 'cal' }, [
        h('a', { href: gcal(d, ev), target: '_blank', rel: 'noopener' }, ['Google カレンダー']),
        h('a', { href: 'ics/' + icsName(d), download: 'niseko2027.ics' }, ['iPhone / Outlook（.ics）'])
      ]));
    }
    if (!state.ctx.phases.phase2.open && !absent) kids.push(h('p', { class: 'muted' }, ['交通・スキー・お食事などの「ニセコでの過ごし方」は、後日あらためて同じリンクでお伺いします。']));
    kids.push(h('p', { class: 'muted', style: 'margin-top:14px' }, ['内容の変更は、このページのリンク（確認メールにも記載）からいつでもできます。']));
    kids.push(h('div', { class: 'actions' }, [h('button', { class: 'btn ghost', onclick: screenProfile }, ['登録内容を見る'])]));
    render(card(kids));
  }

  // ---- モーダル（事務局に連絡／秘書へ引き継ぐ）
  function modal(title, bodyNodes) {
    var ov = h('div', { class: 'overlay' });
    var close = function () { if (ov.parentNode) ov.parentNode.removeChild(ov); };
    var box = h('div', { class: 'modal', role: 'dialog', 'aria-label': title }, [h('div', { class: 'modal-head' }, [h('h2', null, [title]), h('button', { class: 'link', onclick: close }, ['閉じる'])])].concat(bodyNodes(close)));
    ov.appendChild(box); ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.body.appendChild(ov);
  }

  function openContact(prefill) {
    var pr = state.ctx && state.ctx.profile;
    modal('事務局に連絡', function (close) {
      var f = { name: h('input', { type: 'text', placeholder: '例：山田 太郎', autocomplete: 'name' }), company: h('input', { type: 'text', placeholder: '例：株式会社〇〇' }),
        reply: h('input', { type: 'text', placeholder: 'メールアドレスまたはお電話番号' }), message: h('textarea', { placeholder: 'お困りの内容・ご質問をお書きください' }) };
      if (pr) { f.name.value = pr.name || ''; f.company.value = pr.company || ''; }
      f.message.value = prefill || '';
      var msg = h('div');
      var row = function (label, el) { return h('div', { class: 'q' }, [h('label', { class: 'label' }, [label]), el]); };
      var send = h('button', { class: 'btn primary', onclick: function () {
        msg.innerHTML = '';
        if (!f.name.value.trim() || !f.reply.value.trim() || !f.message.value.trim()) { msg.appendChild(err('お名前・ご連絡先・内容をご入力ください')); return; }
        busy(send, true);
        var h2 = document.querySelector('#app h2, #app h1');
        api('contact', { p: state.token || '', name: f.name.value.trim(), company: f.company.value.trim(), reply_to: f.reply.value.trim(), message: f.message.value.trim(), screen: h2 ? h2.textContent : '' }).then(function (r) {
          busy(send, false);
          if (!r.ok) { msg.appendChild(err(r.message)); return; }
          box.innerHTML = ''; box.appendChild(h('p', { class: 'ok' }, ['事務局へお送りしました（受付番号 ' + r.id + '）。担当者より折り返しご連絡いたします。'])); box.appendChild(h('div', { class: 'actions' }, [h('button', { class: 'btn ghost', onclick: close }, ['閉じる'])]));
        });
      } }, ['送信する']);
      var box = h('div', null, [h('p', { class: 'muted' }, ['事務局の担当者より、メールまたはお電話で折り返しご連絡します。']), row('お名前', f.name), row('会社名', f.company), row('ご連絡先', f.reply), row('内容', f.message), msg, h('div', { class: 'actions' }, [send])]);
      return [box];
    });
  }

  window.nisekoOpenContact = function () { openContact(''); };

  // ---- カレンダー
  function dates(a, ev) {
    if (a.attendance === 'full') return { start: ev.start, end: ev.end };
    if (a.attendance === 'two_nights' && a.two_nights_start) { var st = a.two_nights_start; var en = addDays(st, 2); return { start: st, end: en }; }
    return null;
  }
  function addDays(s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function gcal(d, ev) {
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(ev.title) +
      '&dates=' + d.start.replace(/-/g, '') + '/' + addDays(d.end, 1).replace(/-/g, '') + '&location=' + encodeURIComponent(ev.location) + '&details=' + encodeURIComponent(ev.title + '（' + ev.location + '）');
  }
  function icsName(d) { return d.start === '2027-02-18' && d.end === '2027-02-21' ? 'full.ics' : 'n' + d.start.slice(5).replace('-', '') + '.ics'; }

  // ---- 下書き（端末内のみ）
  function dkey() { return 'niseko2027:' + state.token; }
  function saveDraft() { try { sessionStorage.setItem(dkey(), JSON.stringify({ base_version: state.ctx ? state.ctx.version : 0, answers: state.answers })); } catch (e) {} }
  function loadDraft() {
    try {
      var d = JSON.parse(sessionStorage.getItem(dkey()) || 'null');
      if (!d) return null;
      if (d.answers === undefined) return d; // 旧形式
      if (state.ctx && Number(d.base_version) !== Number(state.ctx.version)) return null; // 登録済みの内容より古い下書きは捨てる
      return d.answers;
    } catch (e) { return null; }
  }
  var draftTimer = null;
  function saveServerDraft() { // 端末をまたいで続きから入力できるよう、各画面の「次へ」でサーバーにも預ける（待たない）
    if (!state.token) return;
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(function () { api('saveDraft', { p: state.token, answers: state.answers }); }, 300);
  }
  function clearDraft() { try { sessionStorage.removeItem(dkey()); } catch (e) {} }

  boot();
})();
