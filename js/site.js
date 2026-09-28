(function () {
  const LANG_KEY = "purpleglitch-lang";
  const INTRO_KEY = "purpleglitch-intro";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let lang = document.documentElement.getAttribute("data-lang") === "es" ? "es" : "en";
  let copy = { en: {}, es: {} };
  let introDone = false;

  function t(key) {
    const table = copy[lang] || {};
    if (table[key] != null) return table[key];
    if (copy.en && copy.en[key] != null) return copy.en[key];
    return null;
  }

  function applyCopy() {
    document.documentElement.lang = lang;
    document.documentElement.setAttribute("data-lang", lang);
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const value = t(el.getAttribute("data-i18n"));
      if (value == null) return;
      el.textContent = value;
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        const idx = pair.indexOf(":");
        if (idx < 0) return;
        const attr = pair.slice(0, idx).trim();
        const key = pair.slice(idx + 1).trim();
        const value = t(key);
        if (value != null) el.setAttribute(attr, value);
      });
    });
    const title = t(document.body.getAttribute("data-title-key"));
    if (title) document.title = title;
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      const on = btn.getAttribute("data-set-lang") === lang;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function setLang(next) {
    lang = next === "es" ? "es" : "en";
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {}
    applyCopy();
  }

  function safeUrl(url) {
    if (!url || typeof url !== "string" || !url.trim()) return "";
    try {
      const u = new URL(url.trim(), window.location.href);
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch (e) {}
    return "";
  }

  function toEmbed(service, url) {
    const safe = safeUrl(url);
    if (!safe) return "";
    if (service === "spotify") {
      const u = new URL(safe);
      if (u.hostname === "open.spotify.com") {
        let path = u.pathname.replace(/^\/intl-[a-z]{2}(?=\/)/i, "");
        if (path.indexOf("/embed/") !== 0) {
          path = "/embed" + (path.charAt(0) === "/" ? path : "/" + path);
        }
        u.pathname = path;
        u.search = "";
        u.hash = "";
        return u.href;
      }
    }
    if (service === "soundcloud") {
      const u = new URL(safe);
      const host = u.hostname.replace(/^www\./, "");
      if (host === "w.soundcloud.com") return safe;
      if (host === "soundcloud.com") {
        const player = new URL("https://w.soundcloud.com/player/");
        player.searchParams.set("url", "https://soundcloud.com" + u.pathname);
        player.searchParams.set("color", "#e6ff3d");
        player.searchParams.set("auto_play", "false");
        player.searchParams.set("hide_related", "true");
        player.searchParams.set("show_comments", "false");
        player.searchParams.set("show_user", "true");
        player.searchParams.set("show_reposts", "false");
        player.searchParams.set("show_teaser", "false");
        player.searchParams.set("visual", "false");
        return player.href;
      }
    }
    return safe;
  }

  function makePlayer(src, title) {
    const frame = document.createElement("iframe");
    frame.src = src;
    frame.title = title;
    frame.loading = "lazy";
    frame.setAttribute("allow", "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture");
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    return frame;
  }

  function bandcampPlayer(album) {
    return "https://bandcamp.com/EmbeddedPlayer/album=" + encodeURIComponent(album.id) + "/size=large/bgcol=120f18/linkcol=e6ff3d/tracklist=false/artwork=small/transparent=true/";
  }

  function renderBandcamp(slot, albums) {
    const list = document.createElement("div");
    list.className = "catalog";
    albums.forEach(function (album, index) {
      if (!album || !/^\d+$/.test(String(album.id || ""))) return;
      const item = document.createElement("article");
      item.className = "release";
      const head = document.createElement("div");
      head.className = "release-head";
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = String(index + 1).padStart(2, "0");
      const link = document.createElement("a");
      link.className = "hit";
      link.href = safeUrl(album.url) || "https://didacvm.bandcamp.com/";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = album.title || "Album";
      head.append(num, link);
      item.append(head, makePlayer(bandcampPlayer(album), album.title || "Bandcamp"));
      list.appendChild(item);
    });
    if (!list.childElementCount) return false;
    slot.replaceChildren(list);
    return true;
  }

  function renderMusic(site) {
    const root = document.getElementById("music-root");
    if (!root) return;
    const embeds = (site && site.embeds) || {};
    root.querySelectorAll("[data-embed]").forEach(function (block) {
      const service = block.getAttribute("data-embed");
      const slot = block.querySelector("[data-slot]");
      if (!slot) return;
      if (service === "bandcamp" && renderBandcamp(slot, (site && site.bandcamp) || [])) return;
      const url = toEmbed(service, embeds[service] || "");
      if (!url) return;
      slot.replaceChildren(makePlayer(url, service.charAt(0).toUpperCase() + service.slice(1)));
    });
  }

  function renderLinks(site) {
    const root = document.getElementById("links-root");
    const empty = document.getElementById("links-empty");
    if (!root || !empty) return;
    const profiles = (site && site.profiles) || [];
    const live = profiles.filter(function (profile) {
      return profile && safeUrl(profile.url || "");
    });
    root.querySelectorAll(".profile").forEach(function (node) {
      node.remove();
    });
    if (!live.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    live.forEach(function (profile, index) {
      const link = document.createElement("a");
      link.className = "profile hit";
      link.href = safeUrl(profile.url);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = String(index + 1).padStart(2, "0");
      const label = document.createElement("span");
      label.className = "profile-label";
      label.textContent = profile.label || profile.id || "Link";
      const go = document.createElement("span");
      go.setAttribute("aria-hidden", "true");
      go.textContent = "↗";
      link.append(num, label, go);
      root.appendChild(link);
    });
  }

  function renderGallery(items) {
    const root = document.getElementById("gallery-root");
    const empty = document.getElementById("gallery-empty");
    if (!root || !empty) return;
    const list = (Array.isArray(items) ? items : []).filter(function (item) {
      return item && safeUrl(item.src);
    });
    const instagram = document.getElementById("instagram-shell");
    if (!list.length) {
      empty.hidden = Boolean(instagram);
      root.replaceChildren();
      return;
    }
    empty.hidden = true;
    const grid = document.createElement("div");
    grid.className = "gallery-grid";
    list.forEach(function (item) {
      const shot = document.createElement("figure");
      shot.className = "shot";
      const frame = document.createElement("div");
      frame.className = "shot-frame";
      frame.tabIndex = 0;
      const src = safeUrl(item.src);
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      if (item.title) frame.setAttribute("aria-label", item.title);
      frame.appendChild(img);
      for (let i = 0; i < 6; i += 1) {
        const band = document.createElement("span");
        band.className = "slice";
        band.setAttribute("aria-hidden", "true");
        band.style.top = (i / 6) * 100 + "%";
        band.style.height = 100 / 6 + "%";
        const slice = document.createElement("img");
        slice.src = src;
        slice.alt = "";
        const shift = (i % 2 === 0 ? -1 : 1) * (6 + i * 3);
        slice.style.setProperty("--shift", shift + "px");
        slice.style.top = i * -100 + "%";
        band.appendChild(slice);
        frame.appendChild(band);
      }
      shot.appendChild(frame);
      if (item.title) {
        const caption = document.createElement("figcaption");
        caption.textContent = item.title;
        shot.appendChild(caption);
      }
      grid.appendChild(shot);
    });
    root.replaceChildren(grid);
  }

  function renderInstagram(site) {
    const frame = document.getElementById("instagram-frame");
    const open = document.getElementById("instagram-open");
    const shell = document.getElementById("instagram-shell");
    const embed = safeUrl((site && site.instagram) || "") || "https://www.instagram.com/purple.gl1tch/embed/";
    const profile = embed.replace(/\/embed\/?$/, "/") || "https://www.instagram.com/purple.gl1tch/";
    if (frame) frame.src = embed;
    if (open) open.href = profile;
    if (shell) shell.hidden = false;
  }

  function renderGuestbook(site) {
    const frame = document.getElementById("guestbook-frame");
    const open = document.getElementById("guestbook-open");
    const url = safeUrl((site && site.guestbook) || "") || "https://purpleglitch.atabook.org/";
    if (frame) frame.src = url;
    if (open) open.href = url;
  }

  function setBlocked(blocked) {
    document.querySelectorAll(".top, #content, .micro").forEach(function (el) {
      if (blocked) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
  }

  function dismissIntro() {
    if (introDone) return;
    introDone = true;
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch (e) {}
    const intro = document.getElementById("intro");
    if (intro) intro.remove();
    setBlocked(false);
    if (!reduce) document.documentElement.classList.add("play-wipe");
    const main = document.getElementById("content");
    if (main) main.focus();
  }

  function setupIntro() {
    const intro = document.getElementById("intro");
    if (!intro || document.documentElement.classList.contains("skip-intro") || reduce) {
      if (intro) intro.remove();
      introDone = true;
      return;
    }
    setBlocked(true);
    const skip = intro.querySelector(".intro-skip");
    if (skip) {
      skip.focus();
      skip.addEventListener("click", dismissIntro);
    }
    document.addEventListener("keydown", function (event) {
      if (introDone) return;
      if (event.key === "Escape" || event.key === "Enter") {
        event.preventDefault();
        dismissIntro();
      }
    });
    window.setTimeout(dismissIntro, 2800);
  }

  document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLang(btn.getAttribute("data-set-lang"));
    });
  });

  function setupChat() {
    const openBtn = document.querySelector("[data-chat-open]");
    const pop = document.getElementById("chat-pop");
    const closeBtn = pop && pop.querySelector("[data-chat-close]");
    const frame = pop && pop.querySelector("[data-chat-frame]");
    if (!openBtn || !pop || !closeBtn || !frame) return;

    let lastFocus = null;

    function openChat() {
      lastFocus = document.activeElement;
      if (!frame.getAttribute("src")) {
        const src = frame.getAttribute("data-src");
        if (src) frame.src = src;
      }
      pop.hidden = false;
      openBtn.setAttribute("aria-expanded", "true");
      if (introDone) setBlocked(true);
      closeBtn.focus();
    }

    function closeChat() {
      if (pop.hidden) return;
      pop.hidden = true;
      openBtn.setAttribute("aria-expanded", "false");
      if (introDone) setBlocked(false);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    openBtn.addEventListener("click", openChat);
    closeBtn.addEventListener("click", closeChat);
    pop.addEventListener("click", function (event) {
      if (event.target === pop) closeChat();
    });
    document.addEventListener("keydown", function (event) {
      if (pop.hidden || event.key !== "Escape") return;
      event.preventDefault();
      closeChat();
    });
  }

  async function init() {
    let site = {};
    let gallery = [];
    try {
      const results = await Promise.all([
        fetch("data/copy.json"),
        fetch("data/site.json"),
        fetch("data/gallery.json")
      ]);
      if (results[0].ok) copy = await results[0].json();
      if (results[1].ok) site = await results[1].json();
      if (results[2].ok) gallery = await results[2].json();
    } catch (e) {}
    renderMusic(site);
    renderLinks(site);
    renderGallery(gallery);
    renderInstagram(site);
    renderGuestbook(site);
    applyCopy();
    document.documentElement.classList.add("i18n-ready");
  }

  setupIntro();
  setupChat();
  init();
})();
