// Product window: gallery, description, options, quantity and "order in Telegram".
// Any element with data-product="<id>" opens it. Links like page/#product=<id> open it directly.
(function () {
  const base = new URL('img/', document.currentScript.src).href;
  const { products, telegram } = window.NANA;
  const fmt = (n) => n.toLocaleString('uk-UA') + ' грн';
  const ask = (p) => p == null;
  const bagIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';
  const tgIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 4 2.5 11.2c-.9.4-.9 1.5 0 1.8l4.6 1.5 1.8 5.6c.2.7 1.1.9 1.6.4l2.6-2.4 4.7 3.5c.6.4 1.4.1 1.6-.6L22.4 5.3c.2-.9-.6-1.6-1.4-1.3zM9.8 14.4l-.4 3.6-1.4-4.4 9.8-6.2z"/></svg>';

  const root = document.createElement('div');
  root.className = 'pm';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `<div class="pm__backdrop" data-close></div>
    <div class="pm__dialog" role="dialog" aria-modal="true" aria-labelledby="pmTitle" tabindex="-1"></div>`;
  document.body.appendChild(root);
  const dialog = root.querySelector('.pm__dialog');

  let state = null; // { id, p, img, opt, qty }
  let lastFocus = null;

  function priceOf() {
    const v = state.p.options?.values[state.opt];
    return v?.price ?? state.p.price;
  }
  const sizeName = () => state.p.sizes?.values[state.size]?.name;

  function render() {
    const { p } = state;
    const g = p.gallery || [p.img];
    const unit = priceOf();
    const showOld = p.oldPrice && unit === p.price;
    dialog.innerHTML = `
      <button class="pm__close" data-close aria-label="Закрити">×</button>
      <div class="pm__gallery">
        <div class="pm__main">
          ${g.map((src, i) => `<img src="${base + src}" alt="${p.title} — фото ${i + 1}" class="${i === state.img ? 'is-active' : ''}">`).join('')}
          ${g.length > 1 ? `<button class="pm__arrow pm__arrow--prev" data-step="-1" aria-label="Попереднє фото">‹</button>
          <button class="pm__arrow pm__arrow--next" data-step="1" aria-label="Наступне фото">›</button>
          <span class="pm__counter">${state.img + 1} / ${g.length}</span>` : ''}
        </div>
        ${g.length > 1 ? `<div class="pm__thumbs">${g.map((src, i) => `<button class="pm__thumb ${i === state.img ? 'is-active' : ''}" data-img="${i}" aria-label="Фото ${i + 1}"><img src="${base + src}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="pm__info">
        <p class="pm__eyebrow">${p.collection}</p>
        <h2 class="pm__title" id="pmTitle">${p.title}</h2>
        <div class="pm__price">${ask(unit) ? '<span class="pm__ask">Ціна за запитом</span>' : fmt(unit)}${showOld ? `<s>${fmt(p.oldPrice)}</s><span class="pm__badge">−${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : ''}</div>
        <p class="pm__short">${p.short}</p>
        ${p.options ? `<div><p class="pm__label">${p.options.label}${p.options.values.length > 1 ? ` <span class="pm__count">· ${p.options.values.length}</span>` : ''}: <b>${p.options.values[state.opt].name}</b></p><div class="pm__chips">${p.options.values.map((v, i) => `<button class="pm__chip ${i === state.opt ? 'is-active' : ''}" data-opt="${i}">${v.name}</button>`).join('')}</div></div>` : ''}
        ${p.sizes ? `<div><p class="pm__label">${p.sizes.label}</p><div class="pm__chips">${p.sizes.values.map((v, i) => `<button class="pm__chip ${i === state.size ? 'is-active' : ''}" data-size="${i}">${v.name}</button>`).join('')}</div></div>` : ''}
        <div class="pm__buy">
          <div class="pm__qty"><button data-qty="-1" aria-label="Менше">−</button><span aria-live="polite">${state.qty}</span><button data-qty="1" aria-label="Більше">+</button></div>
          ${window.NanaCart
            ? `<button class="pm__order" data-tocart>${bagIcon}${state.added ? 'Додано ✓ · Відкрити кошик' : ask(unit) ? 'Додати до запиту' : `У кошик · ${fmt(unit * state.qty)}`}</button>
        </div>
        <a class="pm__order pm__order--ghost" href="https://t.me/${telegram}" target="_blank" rel="noopener" data-order>${tgIcon}${ask(unit) ? 'Дізнатися ціну в Telegram' : 'Швидке замовлення в Telegram'}</a>`
            : `<a class="pm__order" href="https://t.me/${telegram}" target="_blank" rel="noopener" data-order>${tgIcon}Замовити в Telegram${ask(unit) ? '' : ' · ' + fmt(unit * state.qty)}</a>
        </div>`}
        <p class="pm__hint" data-hint>${ask(unit) ? 'Ціни уточнюємо індивідуально: роздріб і опт. Відкриємо чат і скопіюємо текст із цим товаром.' : window.NanaCart ? 'Швидке замовлення: відкриємо чат і скопіюємо текст із цим товаром.' : 'Відкриється чат із нами, текст замовлення скопіюємо автоматично.'}</p>
        <div class="pm__perks"><span>📦 Відправка Новою поштою по всій Україні</span><span>🛡️ Пакуємо кераміку в кілька шарів</span><span>🤝 Для магазинів — оптові ціни</span></div>
        <div><p class="pm__label">Опис</p><p class="pm__desc">${p.description}</p></div>
        <table class="pm__specs"><tbody>${p.specs.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody></table>
      </div>`;
  }

  function setImg(i) {
    const n = (state.p.gallery || [1]).length;
    state.img = (i + n) % n;
    dialog.querySelectorAll('.pm__main img').forEach((el, k) => el.classList.toggle('is-active', k === state.img));
    dialog.querySelectorAll('.pm__thumb').forEach((el, k) => el.classList.toggle('is-active', k === state.img));
    const c = dialog.querySelector('.pm__counter'); if (c) c.textContent = `${state.img + 1} / ${n}`;
  }

  function orderText() {
    const v = state.p.options?.values[state.opt];
    const opts = [v?.name, sizeName()].filter(Boolean).join(', ');
    const u = priceOf();
    return `Вітаю! ${ask(u) ? 'Підкажіть, будь ласка, ціну:' : 'Хочу замовити:'}\n• ${state.p.title}${opts ? ` (${opts})` : ''}\n• Кількість: ${state.qty} шт.${ask(u) ? '' : `\n• Сума: ${fmt(u * state.qty)}`}\n\nПосилання: ${location.origin + location.pathname}#product=${state.id}`;
  }

  function open(id, { push = true } = {}) {
    const p = products[id]; if (!p) return;
    lastFocus = document.activeElement;
    state = { id, p, img: 0, opt: 0, size: 0, qty: 1 };
    render();
    root.classList.add('is-open'); root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pm-lock');
    dialog.scrollTop = 0; dialog.focus({ preventScroll: true });
    if (push && location.hash !== '#product=' + id) history.pushState(null, '', '#product=' + id);
  }

  function close({ push = true } = {}) {
    if (!state) return;
    root.classList.remove('is-open'); root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pm-lock');
    state = null;
    if (push && location.hash.startsWith('#product=')) history.pushState(null, '', location.pathname + location.search);
    lastFocus?.focus?.({ preventScroll: true });
  }

  // open from any card
  document.addEventListener('click', (e) => {
    if (root.contains(e.target)) return;
    const card = e.target.closest('[data-product]');
    if (!card || e.target.closest('button, a:not([data-product])')) return;
    if (card.dataset.dragged === '1') { card.dataset.dragged = ''; return; } // option 2: was a drag, not a click
    e.preventDefault();
    open(card.dataset.product);
  });
  document.addEventListener('keydown', (e) => {
    const card = e.target.closest?.('[data-product]');
    if (card && !state && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(card.dataset.product); return; }
    if (!state) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') setImg(state.img + 1);
    if (e.key === 'ArrowLeft') setImg(state.img - 1);
  });

  // interactions inside the window
  root.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-close],[data-step],[data-img],[data-opt],[data-size],[data-qty],[data-order],[data-tocart]');
    if (!t || !state) return;
    if (t.dataset.close !== undefined) return close();
    if (t.dataset.tocart !== undefined) {
      if (state.added) return window.NanaCart.open();
      window.NanaCart.add(state.id, state.opt, state.qty, { silent: true, size: state.size });
      state.added = true; const keep = state.img; render(); setImg(keep); return;
    }
    if (t.dataset.step) return setImg(state.img + +t.dataset.step);
    if (t.dataset.img) return setImg(+t.dataset.img);
    if (t.dataset.opt) {
      state.opt = +t.dataset.opt; state.added = false;
      const jump = state.p.options.values[state.opt].img;
      const keepImg = jump ?? state.img;
      render(); setImg(keepImg); return;
    }
    if (t.dataset.size) { state.size = +t.dataset.size; state.added = false; const keep = state.img; render(); setImg(keep); return; }
    if (t.dataset.qty) { state.added = false; state.qty = Math.min(99, Math.max(1, state.qty + +t.dataset.qty)); const keep = state.img; render(); setImg(keep); return; }
    if (t.dataset.order !== undefined) {
      try { await navigator.clipboard.writeText(orderText()); dialog.querySelector('[data-hint]').textContent = '✓ Текст замовлення скопійовано — вставте його в чат.'; }
      catch { dialog.querySelector('[data-hint]').textContent = 'Напишіть у чат назву товару та кількість — ми все оформимо.'; }
    }
  });

  // swipe in gallery
  let sx = null;
  root.addEventListener('pointerdown', (e) => { if (e.target.closest('.pm__main')) sx = e.clientX; });
  root.addEventListener('pointerup', (e) => { if (sx !== null && state) { const dx = e.clientX - sx; if (Math.abs(dx) > 40) setImg(state.img + (dx < 0 ? 1 : -1)); } sx = null; });

  // deep links
  const fromHash = () => { const m = location.hash.match(/^#product=([\w-]+)/); m ? open(m[1], { push: false }) : close({ push: false }); };
  addEventListener('popstate', fromHash);
  fromHash();

  window.NanaProduct = { open, close };
})();
