// Яндекс Метрика: подключается, только если задан YANDEX_METRIKA_ID. Счётчик передаётся через data-id.
(function () {
  var s = document.currentScript;
  var id = Number(s && s.dataset.id);
  if (!id) return;
  window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
  window.ym.l = Date.now();
  var t = document.createElement('script');
  t.async = true;
  t.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.appendChild(t);
  window.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true });
})();
