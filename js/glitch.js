(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = document.getElementById("signal-clock");
  const hex = document.getElementById("signal-hex");
  const wipe = document.querySelector(".wipe");

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function tickClock() {
    if (!clock) return;
    const now = new Date();
    clock.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
  }

  function tickHex() {
    if (!hex || document.hidden) return;
    hex.textContent = "0x" + Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, "0");
  }

  tickClock();
  tickHex();
  window.setInterval(tickClock, 1000);
  window.setInterval(tickHex, 700);

  if (reduce) {
    if (wipe) wipe.remove();
    return;
  }

  const canvas = document.getElementById("noise");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d", { alpha: true });
    const width = 128;
    const height = 72;
    canvas.width = width;
    canvas.height = height;
    window.setInterval(function () {
      if (document.hidden) return;
      const image = ctx.createImageData(width, height);
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = Math.random() > 0.84 ? 48 : 0;
      }
      ctx.putImageData(image, 0, 0);
    }, 120);
  }

  const word = document.getElementById("wordmark");
  if (word) {
    window.setInterval(function () {
      word.classList.add("is-glitching");
      window.setTimeout(function () {
        word.classList.remove("is-glitching");
      }, 380);
    }, 4200);
  }

  if (wipe) {
    const bars = wipe.querySelectorAll("i");
    const last = bars[bars.length - 1];
    if (last) {
      last.addEventListener("animationend", function () {
        wipe.remove();
      });
    }
  }
})();
