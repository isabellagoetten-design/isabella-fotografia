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
        <p class="photo-editor-note">Escolha fotos diretamente do seu celular. Por enquanto, elas ficam salvas apenas neste aparelho e navegador, não para todos os visitantes.</p>
        <label for="editor-hero-main">Foto principal da capa</label>
        <input id="editor-hero-main" type="file" accept="image/*">
        <label for="editor-hero-small">Foto menor da capa</label>
        <input id="editor-hero-small" type="file" accept="image/*">
        <label for="editor-gallery">Fotos da galeria (selecione até 10)</label>
        <input id="editor-gallery" type="file" accept="image/*" multiple>
        <p class="photo-editor-help">As imagens serão ajustadas para carregar melhor no site. A publicação para todos os visitantes exige uma etapa adicional.</p>
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
    const readCompressed = file => new Promise((resolve, reject) => {
      if (!file) return resolve("");
      if (!file.type.startsWith("image/")) return reject(new Error("Escolha arquivos de imagem."));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Não foi possível ler uma das imagens."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Uma imagem não pôde ser aberta."));
        img.onload = () => {
          const max = 1400;
          const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    const getForm = () => state;
    const updateFromFiles = async () => {
      status.textContent = "Preparando imagens...";
      try {
        const next = {
          heroMain: heroMainInput.files[0] ? await readCompressed(heroMainInput.files[0]) : state.heroMain,
          heroSmall: heroSmallInput.files[0] ? await readCompressed(heroSmallInput.files[0]) : state.heroSmall,
          photos: state.photos.map(photo => ({...photo}))
        };
        if (galleryInput.files.length) {
          const files = Array.from(galleryInput.files).slice(0, 10);
          const converted = await Promise.all(files.map(readCompressed));
          next.photos = converted.map((src, index) => ({
            src,
            alt: state.photos[index]?.alt || "Fotografia de Isabella"
          }));
          while (next.photos.length < 10) {
            const index = next.photos.length;
            next.photos.push({src:"", alt:state.photos[index]?.alt || "Fotografia de Isabella"});
          }
        }
        applyState(next);
        state = next;
        status.textContent = "Prévia aplicada. Toque em “Salvar neste aparelho” para guardar.";
      } catch (error) {
        status.textContent = error.message || "Não foi possível carregar as imagens.";
      }
    };
    heroMainInput.addEventListener("change", updateFromFiles);
    heroSmallInput.addEventListener("change", updateFromFiles);
    galleryInput.addEventListener("change", updateFromFiles);
    overlay.querySelector(".photo-editor-close").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", event => { if (event.target === overlay) overlay.remove(); });
    overlay.querySelector("#editor-preview").addEventListener("click", () => {
      status.textContent = "As imagens selecionadas já aparecem na prévia.";
    });
    overlay.querySelector("#editor-save").addEventListener("click", () => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
        status.textContent = "Salvo neste aparelho e navegador. Ainda não foi publicado para os visitantes.";
      } catch {
        status.textContent = "As imagens ficaram grandes demais para o armazenamento do navegador. Tente selecionar menos fotos.";
      }
    });
    overlay.querySelector("#editor-export").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "isabella-fotografia-fotos.json";
      link.click();
      URL.revokeObjectURL(url);
      status.textContent = "Configuração exportada, mas ainda precisa ser publicada no site.";
    });
    overlay.querySelector("#editor-reset").addEventListener("click", () => {
      try { localStorage.removeItem(storageKey); } catch {}
      applyState(initialState);
      state = initialState;
      status.textContent = "Fotos originais restauradas neste navegador.";
    });
  }
})();