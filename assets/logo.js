// Shared Nana Ceramics logo, redrawn from the Instagram avatar.
// Usage: <span class="nana-logo" data-variant="dark|light"></span>  (needs the "Great Vibes" + "Montserrat" Google fonts)
(function () {
  const mark = (stroke) => `
    <svg class="nana-logo__mark" viewBox="0 0 64 72" aria-hidden="true">
      <path d="M30 2v26M50 2v30" stroke="${stroke}" stroke-width="1" fill="none" opacity=".55"/>
      <path d="M8 40h34l-4 22H12z" stroke="${stroke}" stroke-width="1" fill="none" opacity=".55"/>
      <path d="M22 18h22l-4 30h-14z" fill="#B4532A"/>
      <path d="M22 18h22v3H22z" fill="#8E3D1C"/>
      <path d="M50 30c3 0 3 4 3 6 6 3 9 9 9 15 0 9-6 17-12 17s-12-8-12-17c0-6 3-12 9-15 0-2 0-6 3-6z" fill="#D2A05C"/>
      <path d="M44 50c1 6 4 11 6 12" stroke="#B8843F" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    </svg>`;
  document.querySelectorAll('.nana-logo').forEach((el) => {
    const light = el.dataset.variant === 'light';
    const ink = light ? '#fff' : '#1d1a17';
    el.innerHTML = `
      <span class="nana-logo__text">
        <span class="nana-logo__script" style="color:${ink}">Nana</span>
        <span class="nana-logo__sans" style="color:${light ? 'rgba(255,255,255,.85)' : '#4a4540'}">ceramics</span>
      </span>${mark(ink)}`;
    el.setAttribute('aria-label', 'Nana Ceramics');
    el.setAttribute('role', 'img');
  });
})();
