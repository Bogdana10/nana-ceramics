// Cart drawer: items → contact & delivery → order sent to Telegram.
// Elements: [data-cart-open] opens it, [data-cart-count] shows the number of items.
// <body data-cart-fab="off"> hides the floating cart button (option 1 has a cart icon in the header).
(function () {
  const base = new URL('img/', document.currentScript.src).href;
  const { products, telegram } = window.NANA;
  const FREE_SHIPPING = window.NANA.freeShipping ?? 2000; // TODO: confirm free-delivery threshold with the client
  const KEY = 'nana-cart-v1';
  const fmt = (n) => n.toLocaleString('uk-UA') + ' грн';
  const tgIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 4 2.5 11.2c-.9.4-.9 1.5 0 1.8l4.6 1.5 1.8 5.6c.2.7 1.1.9 1.6.4l2.6-2.4 4.7 3.5c.6.4 1.4.1 1.6-.6L22.4 5.3c.2-.9-.6-1.6-1.4-1.3zM9.8 14.4l-.4 3.6-1.4-4.4 9.8-6.2z"/></svg>';
  const bagIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';
  const vaseArt = '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M38 14h20M41 14v10c-12 6-18 16-18 30 0 16 11 28 25 28s25-12 25-28c0-14-6-24-18-30V14"/><path d="M28 48c12 5 28 5 40 0" opacity=".5"/><path d="M48 24c-6-8-14-10-18-6M48 24c4-9 12-12 17-9" opacity=".6"/></svg>';

  // ---------- state ----------
  let lines = [];
  try { lines = JSON.parse(localStorage.getItem(KEY)) || []; } catch {}
  lines = lines.filter((l) => products[l.id]);
  let step = 'cart'; // cart | checkout | done
  let delivery = 'Відділення Нової пошти';
  let form = { name: '', phone: '', city: '', comment: '' };
  let lastOrder = '';

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {} };
  const unitPrice = (l) => products[l.id].options?.values[l.opt]?.price ?? products[l.id].price;
  const optName = (l) => [products[l.id].options?.values[l.opt]?.name, products[l.id].sizes?.values[l.size || 0]?.name].filter(Boolean).join(', ');
  const hasAsk = () => lines.some((l) => unitPrice(l) == null);
  const money = (n) => (n == null ? 'ціна за запитом' : fmt(n));
  const totalLabel = () => (hasAsk() ? (total() ? fmt(total()) + ' + запит' : 'за запитом') : fmt(total()));
  const count = () => lines.reduce((s, l) => s + l.qty, 0);
  const total = () => lines.reduce((s, l) => s + (unitPrice(l) ?? 0) * l.qty, 0);

  // ---------- DOM ----------
  const root = document.createElement('div');
  root.className = 'cart'; root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `<div class="cart__backdrop" data-c="close"></div>
    <aside class="cart__panel" role="dialog" aria-modal="true" aria-label="Кошик" tabindex="-1"></aside>`;
  document.body.appendChild(root);
  const panel = root.querySelector('.cart__panel');

  const toast = document.createElement('div');
  toast.className = 'cart-toast'; toast.setAttribute('role', 'status');
  document.body.appendChild(toast);

  if (document.body.dataset.cartFab !== 'off') {
    const fab = document.createElement('button');
    fab.className = 'cart-fab'; fab.setAttribute('data-cart-open', ''); fab.setAttribute('aria-label', 'Відкрити кошик');
    fab.innerHTML = bagIcon + '<span data-cart-count>0</span>';
    document.body.appendChild(fab);
  }

  function syncBadges(bump) {
    const n = count();
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = n;
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
    document.querySelector('.cart-fab')?.classList.toggle('has-items', n > 0);
  }

  function stepsBar() {
    const i = { cart: 0, checkout: 1, done: 2 }[step];
    return `<div class="cart__steps">${['Кошик', 'Доставка', 'Готово'].map((s, k) => `<span class="${k <= i ? 'is-on' : ''}">${k + 1}. ${s}</span>`).join('')}</div>`;
  }

  function render() {
    const n = count();
    const head = `<div class="cart__head"><h2 class="cart__title">${step === 'checkout' ? 'Оформлення' : 'Кошик'}${n ? `<small>${n} шт.</small>` : ''}</h2><button class="cart__x" data-c="close" aria-label="Закрити">×</button></div>`;

    if (step === 'done') {
      panel.innerHTML = head + stepsBar() + `<div class="cart__body"><div class="cart__done">
          <div class="tick">✓</div><h3>Дякуємо за замовлення!</h3>
          <p>Ми відкрили чат у Telegram і скопіювали текст замовлення — просто вставте його та надішліть. Відповімо найближчим часом.</p>
          <pre>${lastOrder.replace(/</g, '&lt;')}</pre>
        </div></div>
        <div class="cart__foot">
          <a class="cart__btn" href="https://t.me/${telegram}" target="_blank" rel="noopener" data-c="copy">${tgIcon}Відкрити Telegram ще раз</a>
          <button class="cart__btn cart__btn--ghost" data-c="close">Повернутися до покупок</button>
        </div>`;
      return;
    }

    if (!lines.length) {
      panel.innerHTML = head + `<div class="cart__body"><div class="cart__empty">${vaseArt}<h3>Кошик поки порожній</h3><p>Оберіть вазу чи горщик — і вони чекатимуть на вас тут.</p><button class="cart__btn" data-c="close" style="max-width:240px">До каталогу</button></div>${upsell()}</div>`;
      return;
    }

    if (step === 'checkout') {
      const btn = (v) => `<button type="button" class="${v === delivery ? 'is-active' : ''}" data-c="delivery" data-v="${v}">${v}</button>`;
      panel.innerHTML = head + stepsBar() + `<div class="cart__body"><form class="cart__form" novalidate>
          <label>Ім'я та прізвище<input name="name" autocomplete="name" value="${esc(form.name)}" placeholder="Олена Коваль"></label>
          <label>Телефон<input name="phone" type="tel" autocomplete="tel" value="${esc(form.phone)}" placeholder="+380"></label>
          <div><p style="margin:0 0 8px;font-size:13px;font-weight:600">Доставка</p><div class="cart__seg">${btn('Відділення Нової пошти')}${btn('Поштомат')}${btn("Кур'єр")}</div></div>
          <label>${delivery === "Кур'єр" ? 'Місто та адреса' : 'Місто та номер відділення'}<input name="city" value="${esc(form.city)}" placeholder="${delivery === "Кур'єр" ? 'Київ, вул. Саксаганського 12' : 'Київ, №25'}"></label>
          <label>Коментар <span style="font-weight:400;opacity:.6">(необов'язково)</span><textarea name="comment" placeholder="Подарункова упаковка, побажання щодо кольору…">${esc(form.comment)}</textarea></label>
          <div class="cart__review"><b>${n} шт.</b> · ${hasAsk() ? 'ціни для товарів «за запитом» менеджер надішле в чаті' : `на суму <b>${fmt(total())}</b> · ${total() >= FREE_SHIPPING ? 'доставка безкоштовна' : 'доставка за тарифами перевізника'}`}</div>
        </form></div>
        <div class="cart__foot">
          <div class="cart__total"><span>${hasAsk() ? 'Сума' : 'До сплати'}</span><b>${totalLabel()}</b></div>
          <a class="cart__btn" href="https://t.me/${telegram}" target="_blank" rel="noopener" data-c="send">${tgIcon}${hasAsk() ? 'Надіслати запит у Telegram' : 'Надіслати замовлення в Telegram'}</a>
          <button class="cart__btn cart__btn--ghost" data-c="back">← Назад до кошика</button>
          <p class="cart__note">Оплата після підтвердження замовлення менеджером</p>
        </div>`;
      return;
    }

    const left = FREE_SHIPPING - total();
    panel.innerHTML = head + stepsBar() + `<div class="cart__body">
        ${lines.map((l, i) => { const p = products[l.id]; return `
          <div class="ci">
            <div class="ci__img" data-c="view" data-id="${l.id}"><img src="${base + p.img}" alt="${p.title}"></div>
            <div><p class="ci__name" data-c="view" data-id="${l.id}">${p.title}</p>${optName(l) ? `<div class="ci__opt">${optName(l)}</div>` : ''}<div class="ci__opt">${unitPrice(l) == null ? 'ціна за запитом' : fmt(unitPrice(l)) + ' / шт.'}</div>
              <div class="ci__qty"><button data-c="qty" data-i="${i}" data-d="-1" aria-label="Менше">−</button><span>${l.qty}</span><button data-c="qty" data-i="${i}" data-d="1" aria-label="Більше">+</button></div></div>
            <div class="ci__right"><span class="ci__sum">${unitPrice(l) == null ? '—' : fmt(unitPrice(l) * l.qty)}</span><button class="ci__rm" data-c="rm" data-i="${i}">Видалити</button></div>
          </div>`; }).join('')}
        ${hasAsk() ? '<div class="cart__progress">Ціни на вироби з каталогу уточнюємо індивідуально — для роздрібу та опту. Надішліть запит, і менеджер відповість у Telegram.</div>' : `<div class="cart__progress">${left > 0 ? `Додайте ще на <b>${fmt(left)}</b> — і доставка буде безкоштовною` : '🎉 Доставка для вас безкоштовна'}<div class="cart__bar"><i style="width:${Math.min(100, total() / FREE_SHIPPING * 100)}%"></i></div></div>`}
        ${upsell()}
      </div>
      <div class="cart__foot">
        <div class="cart__total"><span>Разом</span><b>${totalLabel()}</b></div>
        <button class="cart__btn" data-c="checkout">${hasAsk() ? 'Оформити запит' : 'Оформити замовлення'}</button>
        <p class="cart__note">Відправляємо щодня · надійно пакуємо кераміку</p>
      </div>`;
  }

  const upOrder = Object.keys(products).sort(() => Math.random() - .5);
  function upsell() {
    const inCart = new Set(lines.map((l) => l.id));
    const ids = upOrder.filter((id) => !inCart.has(id)).slice(0, 2);
    if (!ids.length) return '';
    return `<div class="cart__upsell"><h4>${lines.length ? 'Додайте до замовлення' : 'Вам може сподобатись'}</h4><div class="cart__ups">${ids.map((id) => { const p = products[id]; return `
      <div class="up"><img src="${base + p.img}" alt=""><div><b>${p.title.replace(/^(Новорічна ваза|Ваза-бюст|Ваза|Горщик) /, '')}</b>${money(p.price)}</div><button data-c="add" data-id="${id}" aria-label="Додати ${p.title}">+</button></div>`; }).join('')}</div></div>`;
  }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  function orderText() {
    const items = lines.map((l) => `• ${products[l.id].title}${optName(l) ? ` (${optName(l)})` : ''} × ${l.qty}${unitPrice(l) == null ? ' (ціна за запитом)' : ` = ${fmt(unitPrice(l) * l.qty)}`}`).join('\n');
    return `Вітаю! ${hasAsk() ? 'Запит' : 'Нове замовлення'} з сайту:\n${items}\n\nРазом: ${totalLabel()}\n\nІм'я: ${form.name}\nТелефон: ${form.phone}\nДоставка: ${delivery}, ${form.city}${form.comment ? `\nКоментар: ${form.comment}` : ''}`;
  }

  // ---------- API ----------
  function add(id, opt = 0, qty = 1, { silent = false, size = 0 } = {}) {
    if (!products[id]) return;
    const l = lines.find((x) => x.id === id && x.opt === opt && (x.size || 0) === size);
    l ? (l.qty = Math.min(99, l.qty + qty)) : lines.push({ id, opt, size, qty });
    save(); syncBadges(true);
    if (step === 'done') step = 'cart';
    if (root.classList.contains('is-open')) render();
    else if (!silent) showToast(id);
  }

  let tt;
  function showToast(id) {
    const p = products[id];
    toast.innerHTML = `<img src="${base + p.img}" alt=""><span>Додано в кошик</span><button data-cart-open>Відкрити</button>`;
    toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  let lastFocus;
  function open() {
    window.NanaProduct?.close();
    if (step === 'done' && lines.length) step = 'cart';
    lastFocus = document.activeElement;
    render(); toast.classList.remove('show');
    root.classList.add('is-open'); root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-lock'); panel.focus({ preventScroll: true });
  }
  function close() {
    root.classList.remove('is-open'); root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-lock');
    if (step === 'done') step = 'cart';
    lastFocus?.focus?.({ preventScroll: true });
  }

  // ---------- events ----------
  document.addEventListener('click', (e) => { if (e.target.closest('[data-cart-open]')) { e.preventDefault(); open(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('is-open')) close(); });

  panel.addEventListener('input', (e) => { if (e.target.name) { form[e.target.name] = e.target.value; e.target.classList.remove('is-err'); } });

  root.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-c]'); if (!t) return;
    const c = t.dataset.c, i = +t.dataset.i;
    if (c === 'close') return close();
    if (c === 'qty') { lines[i].qty += +t.dataset.d; if (lines[i].qty < 1) lines.splice(i, 1); save(); syncBadges(); return render(); }
    if (c === 'rm') { lines.splice(i, 1); save(); syncBadges(); return render(); }
    if (c === 'add') return add(t.dataset.id);
    if (c === 'view') { close(); return window.NanaProduct?.open(t.dataset.id); }
    if (c === 'checkout') { step = 'checkout'; render(); return panel.querySelector('input')?.focus(); }
    if (c === 'back') { step = 'cart'; return render(); }
    if (c === 'delivery') { delivery = t.dataset.v; return render(); }
    if (c === 'send') {
      const bad = ['name', 'phone', 'city'].filter((k) => !form[k].trim() || (k === 'phone' && form[k].replace(/\D/g, '').length < 10));
      if (bad.length) {
        e.preventDefault();
        bad.forEach((k) => panel.querySelector(`[name=${k}]`).classList.add('is-err'));
        return panel.querySelector(`[name=${bad[0]}]`).focus();
      }
      // the link itself opens Telegram (keeps the user gesture); we copy the order text alongside
      lastOrder = orderText();
      try { await navigator.clipboard.writeText(lastOrder); } catch {}
      lines = []; save(); syncBadges(); step = 'done'; return render();
    }
    if (c === 'copy') { try { await navigator.clipboard.writeText(lastOrder); } catch {} }
  });

  syncBadges();
  window.NanaCart = { add, open, close, count };
})();
