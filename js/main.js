(() => {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach(item => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(item => observer.observe(item));
  }

  // Editor por endereço especial: /?editor=atelier
  const params = new URLSearchParams(window.location.search);
  if (params.get("editor") === "atelier") {
    openPhotoEditor();
  }

  const gallery = document.querySelector(".gallery");
  const heroMain = document.querySelector(".hero-photo-main img");
  const heroSmall = document.querySelector(".hero-photo-small img");
  const defaultState = () => ({
    heroMain: heroMain?.getAttribute("src") || "",
    heroSmall: heroSmall?.getAttribute("src") || "",
    photos: Array.from(gallery?.querySelectorAll("img") || []).map(img => ({
      src: img.getAttribute("src") || "",
      alt: img.getAttribute("alt") || ""
    }))
  });
  const storageKey = "isabella-fotografia-editor-v1";
  const loadState = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : defaultState();
    } catch { return defaultState(); }
  };
  const initialState = defaultState();
  let state = loadState();

  function applyState(next) {
    if (heroMain && next.heroMain) heroMain.src = next.heroMain;
    if (heroSmall && next.heroSmall) heroSmall.src = next.heroSmall;
    const current = Array.from(gallery?.querySelectorAll(".gallery-item") || []);
    (next.photos || []).forEach((photo, index) => {
      const figure = current[index];
      const img = figure?.querySelector("img");
      if (img) {
        if (photo.src) img.src = photo.src;
        else img.removeAttribute("src");
        if (typeof photo.alt === "string") img.alt = photo.alt;
      }
      if (figure) figure.hidden = !photo.src;
    });
    state = next;
  }
  applyState(state);

  function openPhotoEditor() {
    if (document.querySelector("#photo-editor-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "photo-editor-overlay";
    overlay.innerHTML = `
      <section class="photo-editor" role="dialog" aria-modal="true" aria-labelledby="photo-editor-title">
        <button class="photo-editor-close" type="button" aria-label="Fechar editor">×</button>
        <p class="photo-editor-kicker">ÁREA DA CRIADORA</p>
        <h2 id="photo-editor-title">Editar fotografias</h2>
        <p class="photo-editor-note">Cole links diretos de imagens públicas. As alterações ficam salvas apenas neste aparelho e navegador; ainda não são publicadas para os visitantes.</p>
        <label for="editor-hero-main">Foto principal da capa</label>
        <input id="editor-hero-main" type="url" placeholder="https://...">
        <label for="editor-hero-small">Foto menor da capa</label>
        <input id="editor-hero-small" type="url" placeholder="https://...">
        <label for="editor-gallery">Galeria (um link por linha, até 10 fotos)</label>
        <textarea id="editor-gallery" rows="7" spellcheck="false"></textarea>
        <p class="photo-editor-help">Use links diretos terminados em .jpg, .png ou .webp, ou links públicos que abram a própria imagem. Para remover uma foto, deixe a linha vazia. A galeria mantém os espaços existentes.</p>
        <div class="photo-editor-actions">
          <button type="button" id="editor-preview">Aplicar prévia</button>
          <button type="button" id="editor-save">Salvar neste aparelho</button>
          <button type="button" id="editor-export">Exportar configuração</button>
          <button type="button" id="editor-reset" class="secondary">Restaurar fotos originais</button>
        </div>
        <p id="editor-status" aria-live="polite"></p>
      </section>`;
    document.body.appendChild(overlay);
    const original = initialState;
    const heroMainInput = overlay.querySelector("#editor-hero-main");
    const heroSmallInput = overlay.querySelector("#editor-hero-small");
    const galleryInput = overlay.querySelector("#editor-gallery");
    const status = overlay.querySelector("#editor-status");
    const getForm = () => ({
      heroMain: heroMainInput.value.trim() || original.heroMain,
      heroSmall: heroSmallInput.value.trim() || original.heroSmall,
      photos: galleryInput.value.split("\\n").slice(0, 10).map((src, index) => ({
        src: src.trim(),
        alt: state.photos[index]?.alt || original.photos[index]?.alt || "Fotografia de Isabella"
      }))
    });
    heroMainInput.value = state.heroMain;
    heroSmallInput.value = state.heroSmall;
    galleryInput.value = state.photos.map(photo => photo.src).join("\n");

    overlay.querySelector(".photo-editor-close").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", event => { if (event.target === overlay) overlay.remove(); });
    overlay.querySelector("#editor-preview").addEventListener("click", () => {
      const next = getForm();
      applyState(next);
      status.textContent = "Prévia aplicada. Ainda não foi publicada.";
    });
    overlay.querySelector("#editor-save").addEventListener("click", () => {
      const next = getForm();
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        applyState(next);
        status.textContent = "Salvo neste aparelho e navegador. Outros visitantes não verão estas alterações.";
      } catch {
        status.textContent = "Não foi possível salvar neste navegador. Tente exportar a configuração.";
      }
    });
    overlay.querySelector("#editor-export").addEventListener("click", () => {
      const next = getForm();
      const blob = new Blob([JSON.stringify(next, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "isabella-fotografia-fotos.json";
      link.click();
      URL.revokeObjectURL(url);
      status.textContent = "Configuração exportada. Ela ainda precisa ser publicada no site.";
    });
    overlay.querySelector("#editor-reset").addEventListener("click", () => {
      try { localStorage.removeItem(storageKey); } catch {}
      const fresh = initialState;
      applyState(fresh);
      heroMainInput.value = fresh.heroMain;
      heroSmallInput.value = fresh.heroSmall;
      galleryInput.value = fresh.photos.map(photo => photo.src).join("\n");
      status.textContent = "Fotos originais restauradas neste navegador.";
    });
    heroMainInput.focus();
  }
})();