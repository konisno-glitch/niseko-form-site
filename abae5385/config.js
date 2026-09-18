// 環境設定：hostname で API の向き先を切り替える
(function () {
  var h = location.hostname;
  var cfg = {
    // 本番（CXO倶楽部 Workspace アカウントでデプロイした Apps Script の /exec URL）
    prod: { api: 'https://script.google.com/macros/s/REPLACE_PROD_DEPLOYMENT_ID/exec', k: 'REPLACE_PROD_SECRET' },
    // テスト（小西さん Gmail アカウントでデプロイした /exec URL）
    test: { api: 'https://script.google.com/macros/s/AKfycbw7_X7ussUPrxCZHx4gi3j-L-bxQcfNYPnGswowTk_kU9P81EXiEHn999GnzwYu861C/exec', k: 'OfqHf8cWrEByYsZjO_V35hdNPgana5Ct' }
  };
  if (h === 'localhost' || h === '127.0.0.1') cfg.test = { api: '/api', k: 'local' }; // ローカル模擬API（tools/mock_server.js）
  window.NISEKO_CONFIG = (h === 'form.niseko-forum.com') ? cfg.prod : cfg.test;
  window.NISEKO_CONFIG.env = (h === 'form.niseko-forum.com') ? 'prod' : 'test';
})();
