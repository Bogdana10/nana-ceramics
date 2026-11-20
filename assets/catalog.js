// Full catalogue block: type tabs + product grid. Shared by all options.
// Usage: <div data-catalog></div> (optional data-catalog-types="vase,pot" to limit tabs, data-catalog-start="pot").
// Cards carry data-product, so product-modal.js opens them. Theme with --cat-* variables (see catalog.css).
(function () {
  const N = window.NANA;
  const base = new URL('img/', document.currentScript.src).href;
  const P = N.products;
  const cut = (p) => { const i = p.options?.values[0]?.img; return i != null ? p.gallery[i] : p.img; };
  const mood = (p) => p.gallery?.[0] || p.img;
  const plural = (n, a, b, c) => n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c;

  function card(id) {
    const p = P[id];
    const colors = p.options?.label === 'Колір' ? p.options.values.length : 0;
    const sizes = p.sizes?.values.length || 0;
    const meta = [colors > 1 && `${colors} ${plural(colors, 'колір', 'кольори', 'кольорів')}`, sizes > 1 && `${sizes} ${plural(sizes, 'розмір', 'розміри', 'розмірів')}`].filter(Boolean).join(' · ');
    const c = cut(p), m = mood(p);
    const isCut = c !== m;
    return `<article class="cat-card" data-product="${id}" tabindex="0" aria-label="${p.title} — відкрити">
      <div class="cat-card__img${isCut ? ' is-cut' : ''}">
        <img src="${base + c}" alt="${p.title}" loading="lazy">
        ${isCut ? `<img class="cat-card__mood" src="${base + m}" alt="" loading="lazy">` : ''}
        ${colors > 1 ? `<span class="cat-card__dots">${p.options.values.slice(0, 5).map((v) => `<i style="background-image:url('${base + p.gallery[v.img]}')"></i>`).join('')}${colors > 5 ? `<em>+${colors - 5}</em>` : ''}</span>` : ''}
      </div>
      <h3 class="cat-card__title">${p.title}</h3>
      ${meta ? `<p class="cat-card__meta">${meta}</p>` : ''}
      <p class="cat-card__price${p.price == null ? ' is-ask' : ''}">${N.priceLabel(p)}</p>
    </article>`;
  }

  document.querySelectorAll('[data-catalog]').forEach((root) => {
    const types = (root.dataset.catalogTypes || 'vase,pot,gift,xmas').split(',');
    let cur = root.dataset.catalogStart || 'all';
    const count = (t) => N.byType(t).length;
    const total = types.reduce((s, t) => s + count(t), 0);
    root.classList.add('cat');
    root.innerHTML = `<div class="cat__tabs" role="tablist">
        <button role="tab" data-t="all">Усі <sup>${total}</sup></button>
        ${types.map((t) => `<button role="tab" data-t="${t}">${N.types[t]} <sup>${count(t)}</sup></button>`).join('')}
      </div>
      <div class="cat__grid"></div>
      <p class="cat__note">Ціни на вироби з каталогу — за запитом: окремо для роздрібу та опту. Додайте товари до запиту або напишіть нам.</p>`;
    const grid = root.querySelector('.cat__grid');
    function show(t) {
      cur = t;
      root.querySelectorAll('[data-t]').forEach((b) => b.setAttribute('aria-selected', b.dataset.t === t));
      const ids = t === 'all' ? types.flatMap((x) => N.byType(x)) : N.byType(t);
      grid.innerHTML = ids.map(card).join('');
    }
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) show(b.dataset.t); });
    show(cur);
    root.nanaShow = show;
  });

  // links like <a data-catalog-go="pot"> switch the tab and scroll to the catalogue
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-catalog-go]'); if (!a) return;
    const root = document.querySelector('[data-catalog]'); if (!root) return;
    e.preventDefault(); root.nanaShow?.(a.dataset.catalogGo || 'all');
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  window.NanaCatalog = { card, cut, mood };
})();
