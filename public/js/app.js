// Поведение интерфейса без библиотек. Сайт полностью работает и без этого файла:
// здесь только улучшения — анимации, 3D-наклон, прогресс загрузки файлов.
(() => {
  const doc = document.documentElement;
  doc.classList.remove('no-js');
  doc.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;

  // Шапка: тень и плотный фон после прокрутки
  const header = document.querySelector('[data-header]');
  const onScroll = () => {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 8);
      header.classList.toggle('is-solid', y > 40);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Мобильное меню закрывается по Escape и при переходе по ссылке
  const menu = document.querySelector('.menu');
  if (menu) {
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary')?.focus(); } });
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { menu.open = false; }));
  }

  // Заголовок: слова поднимаются по очереди
  document.querySelectorAll('[data-split]').forEach((el) => {
    if (reduce) return;
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    el.classList.add('split');
  });

  // Появление при прокрутке, с задержкой внутри группы
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const groups = new Map();
    reveals.forEach((el) => {
      const p = el.parentElement;
      const n = groups.get(p) || 0;
      el.style.setProperty('--stagger', Math.min(n, 8));
      groups.set(p, n + 1);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  // Счётчики [data-count="10"]
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const fmt = new Intl.NumberFormat('ru-RU');
    const co = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target; co.unobserve(el);
        const to = Number(el.dataset.count); const suffix = el.dataset.suffix || '';
        if (reduce) { el.textContent = fmt.format(to) + suffix; return; }
        const t0 = performance.now(); const dur = 1400;
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur); const v = Math.round(to * (1 - Math.pow(1 - k, 3)));
          el.textContent = fmt.format(v) + suffix;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => co.observe(el));
  }

  // 3D-наклон карточек и подсветка под курсором
  if (fine && !reduce) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const max = Number(card.dataset.tilt) || 8;
      if (!card.querySelector('.tilt-shine')) { const s = document.createElement('span'); s.className = 'tilt-shine'; s.setAttribute('aria-hidden', 'true'); card.append(s); }
      let raf = 0;
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width; const y = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.classList.add('is-tilting');
          card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) translateY(-4px)`;
          card.style.setProperty('--mx', `${x * 100}%`); card.style.setProperty('--my', `${y * 100}%`);
        });
      });
      card.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); card.classList.remove('is-tilting'); card.style.transform = ''; });
    });
    document.querySelectorAll('.spot').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--sx', `${e.clientX - r.left}px`); el.style.setProperty('--sy', `${e.clientY - r.top}px`);
      });
    });
    // Параллакс 3D-сцены за курсором
    document.querySelectorAll('[data-stage]').forEach((stage) => {
      const inner = stage.querySelector('.stage-inner');
      const host = stage.closest('section') || stage;
      host.addEventListener('pointermove', (e) => {
        const r = host.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5;
        inner.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 10}deg)`;
      });
      host.addEventListener('pointerleave', () => { inner.style.transform = ''; });
    });
  }

  // Параллакс при прокрутке [data-parallax="0.15"] и заполнение линии этапов
  const par = [...document.querySelectorAll('[data-parallax]')];
  const lines = [...document.querySelectorAll('.steps--line')];
  if (!reduce && (par.length || lines.length)) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      par.forEach((el) => {
        const r = el.getBoundingClientRect();
        const k = Number(el.dataset.parallax) || 0.1;
        el.style.translate = `0 ${((r.top + r.height / 2) - vh / 2) * -k}px`;
      });
      lines.forEach((el) => {
        const r = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.3)));
        el.style.setProperty('--p', p.toFixed(3));
      });
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // Бегущая строка: пауза, когда её не видно (экономия батареи)
  document.querySelectorAll('.ticker-track').forEach((t) => {
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(([e]) => { t.style.animationPlayState = e.isIntersecting ? '' : 'paused'; }).observe(t);
  });

  // Загрузка файлов: перетаскивание и прогресс
  document.querySelectorAll('[data-upload]').forEach((form) => {
    const drop = form.querySelector('.drop');
    const input = form.querySelector('input[type=file]');
    const name = form.querySelector('[data-file-name]');
    const bar = form.querySelector('.progress span');
    const msg = form.querySelector('[data-upload-msg]');
    const max = Number(form.dataset.max || 0);
    const show = () => { if (name) name.textContent = input.files[0] ? `${input.files[0].name} · ${(input.files[0].size / 1048576).toFixed(1)} МБ` : ''; };
    input?.addEventListener('change', show);
    if (drop) {
      ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
      drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.length) { input.files = e.dataTransfer.files; show(); } });
    }
    form.addEventListener('submit', (e) => {
      if (!input?.files?.[0] || !window.XMLHttpRequest) return;
      if (max && input.files[0].size > max) { e.preventDefault(); if (msg) { msg.hidden = false; msg.textContent = `Файл больше ${Math.round(max / 1048576)} МБ. Сожмите его или разделите на части.`; } return; }
      e.preventDefault();
      const xhr = new XMLHttpRequest();
      xhr.open('POST', form.action);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.upload.onprogress = (ev) => { if (ev.lengthComputable && bar) bar.style.width = `${(ev.loaded / ev.total) * 100}%`; };
      xhr.onload = () => {
        let data = {};
        try { data = JSON.parse(xhr.responseText); } catch { /* ответ не JSON */ }
        if (xhr.status >= 200 && xhr.status < 300 && data.ok) { window.location.assign(data.redirect || window.location.href); return; }
        if (msg) { msg.hidden = false; msg.textContent = data.error || 'Не удалось загрузить файл. Проверьте соединение и попробуйте ещё раз.'; }
        if (bar) bar.style.width = '0';
      };
      xhr.onerror = () => { if (msg) { msg.hidden = false; msg.textContent = 'Нет соединения с сервером. Попробуйте ещё раз.'; } if (bar) bar.style.width = '0'; };
      xhr.send(new FormData(form));
    });
  });

  // Защита от двойной отправки форм
  document.querySelectorAll('form[method=post]').forEach((f) => {
    if (f.hasAttribute('data-upload')) return;
    f.addEventListener('submit', () => { const b = f.querySelector('button[type=submit]'); if (b) setTimeout(() => { b.disabled = true; }, 0); });
  });
})();
