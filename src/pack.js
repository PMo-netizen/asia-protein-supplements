const PARTS = {
  "pack-tin": 2,
  "pack-range": 5,
  "use-pour": 8,
  "shelf-tins": 49,
};

function stemFromSrc(src) {
  const m = String(src || "").match(/([^/]+)\.jpg(?:\?|#|$)/);
  return m ? m[1] : "";
}

function jpegUrl(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
}

async function loadB64(stem) {
  const n = PARTS[stem];
  if (!n) return "";
  const prefix = `public/images/${stem}.jpg.b64.part`;
  const chunks = await Promise.all(
    Array.from({ length: n }, (_, i) => {
      const part = String(i).padStart(2, "0");
      return fetch(prefix + part).then((r) => (r.ok ? r.text() : ""));
    })
  );
  return chunks.join("").replace(/\s+/g, "");
}

async function hydrateImg(img) {
  if (img.dataset.packReady === "1") return;
  const stem = stemFromSrc(img.getAttribute("src") || "");
  if (!PARTS[stem]) return;
  img.dataset.packReady = "1";
  try {
    const b64 = await loadB64(stem);
    if (!b64) {
      img.dataset.packReady = "";
      return;
    }
    img.src = jpegUrl(b64);
  } catch {
    img.dataset.packReady = "";
  }
}

export function hydratePackShots() {
  document.querySelectorAll('img[src*="public/images/"][src$=".jpg"]').forEach((img) => {
    hydrateImg(img);
  });
}
