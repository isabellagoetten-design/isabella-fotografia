(() => {
  const config = window.ISABELLA_SUPABASE_CONFIG || {};
  const bucket = "isabella-fotografia";
  const params = new URLSearchParams(window.location.search);

  function publicUrl(client, path) {
    return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function loadCloudPhotos(client) {
    try {
      const { data, error } = await client.storage.from(bucket).list("", { limit: 100 });
      if (error) return;
      const names = new Set((data || []).map(item => item.name));
      const main = document.querySelector(".hero-photo-main img");
      const small = document.querySelector(".hero-photo-small img");
      if (main && names.has("hero-main.jpg")) main.src = publicUrl(client, "hero-main.jpg");
      if (small && names.has("hero-small.jpg")) small.src = publicUrl(client, "hero-small.jpg");
      const gallery = Array.from(document.querySelectorAll(".gallery .gallery-item img"));
      gallery.forEach((img, index) => {
        const name = "gallery-" + String(index + 1).padStart(2, "0") + ".jpg";
        if (names.has(name)) img.src = publicUrl(client, name);
      });
    } catch (error) {
      console.warn("Não foi possível carregar as fotos online.", error);
    }
  }

  function openCloudEditor(client) {
    if (document.querySelector("#cloud-photo-editor")) return;
    const overlay = document.createElement("div");
    overlay.id = "cloud-photo-editor";
    overlay.innerHTML = `
      <section class="cloud-photo-panel" role="dialog" aria-modal="true" aria-labelledby="cloud-photo-title">
        <button type="button" class="cloud-photo-close" aria-label="Fechar">×</button>
        <p class="photo-editor-kicker">ÁREA PRIVADA</p>
        <h2 id="cloud-photo-title">Publicar fotografias</h2>
        <p class="photo-editor-note">Entre com o usuário criado no Supabase. As fotos enviadas aqui serão exibidas para todos os visitantes.</p>
        <form id="cloud-photo-login">
          <label for="cloud-photo-email">E-mail</label>
          <input id="cloud-photo-email" type="email" autocomplete="username" required>
          <label for="cloud-photo-password">Senha</label>
          <input id="cloud-photo-password" type="password" autocomplete="current-password" required>
          <button type="submit" class="cloud-photo-primary">Entrar</button>
        </form>
        <div id="cloud-photo-tools" hidden>
          <p class="photo-editor-note">Selecione a foto e publique. As imagens são otimizadas antes do envio.</p>
          <label for="cloud-hero-main">Foto principal da capa</label>
          <input id="cloud-hero-main" type="file" accept="image/jpeg,image/png,image/webp,image/avif">
          <button type="button" data-upload="hero-main.jpg" data-input="cloud-hero-main" class="cloud-photo-primary">Publicar foto principal</button>
          <label for="cloud-hero-small">Foto menor da capa</label>
          <input id="cloud-hero-small" type="file" accept="image/jpeg,image/png,image/webp,image/avif">
          <button type="button" data-upload="hero-small.jpg" data-input="cloud-hero-small" class="cloud-photo-primary">Publicar foto menor</button>
          <label for="cloud-gallery">Fotos da galeria (selecione até 10)</label>
          <input id="cloud-gallery" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple>
          <button type="button" id="cloud-gallery-upload" class="cloud-photo-primary">Publicar galeria</button>
          <button type="button" id="cloud-photo-logout" class="cloud-photo-secondary">Sair</button>
        </div>
        <p id="cloud-photo-status" aria-live="polite"></p>
      </section>`;
    document.body.appendChild(overlay);
    const status = overlay.querySelector("#cloud-photo-status");
    const loginForm = overlay.querySelector("#cloud-photo-login");
    const tools = overlay.querySelector("#cloud-photo-tools");

    const showSession = session => {
      loginForm.hidden = !!session;
      tools.hidden = !session;
      if (session) status.textContent = "Acesso autorizado. As próximas publicações serão globais.";
    };

    overlay.querySelector(".cloud-photo-close").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", event => { if (event.target === overlay) overlay.remove(); });

    loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      status.textContent = "Verificando acesso...";
      const { data, error } = await client.auth.signInWithPassword({
        email: overlay.querySelector("#cloud-photo-email").value.trim(),
        password: overlay.querySelector("#cloud-photo-password").value
      });
      if (error) {
        status.textContent = "Não foi possível entrar. Confira o e-mail, a senha e o usuário criado no Supabase.";
        return;
      }
      showSession(data.session);
    });

    async function compress(file) {
      if (!file || !file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
          img.onload = () => {
            const max = 1800;
            const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Falha ao preparar a imagem.")), "image/jpeg", 0.86);
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    async function upload(inputId, path) {
      const input = overlay.querySelector("#" + inputId);
      const file = input.files && input.files[0];
      if (!file) { status.textContent = "Escolha uma foto primeiro."; return; }
      status.textContent = "Preparando e enviando a foto...";
      try {
        const blob = await compress(file);
        const { error } = await client.storage.from(bucket).upload(path, blob, {
          contentType: "image/jpeg",
          upsert: true,
          cacheControl: "60"
        });
        if (error) throw error;
        await loadCloudPhotos(client);
        status.textContent = "Foto publicada para todos os visitantes.";
        input.value = "";
      } catch (error) {
        console.error(error);
        status.textContent = "Falha ao publicar. Verifique as políticas SQL, o login e o bucket no Supabase.";
      }
    }

    overlay.querySelectorAll("[data-upload]").forEach(button => {
      button.addEventListener("click", () => upload(button.dataset.input, button.dataset.upload));
    });
    overlay.querySelector("#cloud-gallery-upload").addEventListener("click", async () => {
      const input = overlay.querySelector("#cloud-gallery");
      const files = Array.from(input.files || []).slice(0, 10);
      if (!files.length) { status.textContent = "Selecione uma ou mais fotos para a galeria."; return; }
      status.textContent = "Enviando fotos da galeria...";
      try {
        for (let i = 0; i < files.length; i++) {
          const blob = await compress(files[i]);
          const path = "gallery-" + String(i + 1).padStart(2, "0") + ".jpg";
          const { error } = await client.storage.from(bucket).upload(path, blob, {
            contentType: "image/jpeg",
            upsert: true,
            cacheControl: "60"
          });
          if (error) throw error;
        }
        await loadCloudPhotos(client);
        status.textContent = "Galeria publicada para todos os visitantes.";
        input.value = "";
      } catch (error) {
        console.error(error);
        status.textContent = "Falha ao publicar a galeria. Confira as políticas SQL e o bucket.";
      }
    });
    overlay.querySelector("#cloud-photo-logout").addEventListener("click", async () => {
      await client.auth.signOut();
      showSession(null);
      status.textContent = "Você saiu da área privada.";
    });

    client.auth.getSession().then(({ data }) => showSession(data.session));
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const ready = config.url && config.anonKey &&
      !config.url.includes("COLE_AQUI") && !config.anonKey.includes("COLE_AQUI") &&
      window.supabase && typeof window.supabase.createClient === "function";
    if (!ready) {
      if (params.get("editor") === "cloud") {
        alert("A integração Supabase ainda precisa ser configurada em js/supabase-config.js. Veja SUPABASE_SETUP.md no repositório.");
      }
      return;
    }
    const client = window.supabase.createClient(config.url, config.anonKey);
    await loadCloudPhotos(client);
    if (params.get("editor") === "cloud") openCloudEditor(client);
  });
})();