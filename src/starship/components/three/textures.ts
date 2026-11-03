import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type BufferGeometry, type Texture } from 'three';

/**
 * Textures procédurales dessinées dans un canvas : aucune image à
 * télécharger. Elles sont créées une seule fois puis partagées.
 */
const cache = new Map<string, Texture>();

function make(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Générateur pseudo-aléatoire déterministe (même rendu à chaque chargement). */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Taille d'un motif de texture, en unités de scène (UV exprimées en unités). */
export const STEEL_TILE = { u: 4, v: 3.6 };
export const TILE_TILE = { u: 1.2, v: 1.04 };

/**
 * Acier inoxydable brossé : anneaux soudés tous les 1,8 m, légères
 * variations de teinte d'un anneau à l'autre et de panneau à panneau.
 */
export function steelTexture(): Texture {
  return make('steel', 512, 512, (ctx) => {
    const rnd = random(7);
    const W = 512;
    const H = 512;
    ctx.fillStyle = '#d9dcdf';
    ctx.fillRect(0, 0, W, H);
    const rings = 8;
    const panels = 4;
    for (let r = 0; r < rings; r++) {
      for (let p = 0; p < panels; p++) {
        const tone = 205 + Math.floor(rnd() * 34);
        ctx.fillStyle = `rgb(${tone},${tone + 2},${tone + 4})`;
        ctx.fillRect((p * W) / panels, (r * H) / rings, W / panels, H / rings);
      }
    }
    // Brossage vertical très fin.
    for (let i = 0; i < 1400; i++) {
      const x = rnd() * W;
      const a = 0.03 + rnd() * 0.05;
      ctx.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(60,64,70,${a})`;
      ctx.fillRect(x, 0, 1, H);
    }
    // Soudures horizontales et verticales.
    for (let r = 0; r <= rings; r++) {
      const y = (r * H) / rings;
      ctx.fillStyle = 'rgba(70,72,76,0.55)';
      ctx.fillRect(0, y - 1.5, W, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(0, y + 1.5, W, 1);
    }
    for (let r = 0; r < rings; r++) {
      for (let p = 0; p < panels; p++) {
        const x = (p * W) / panels + (r % 2) * (W / panels / 2);
        ctx.fillStyle = 'rgba(80,82,86,0.4)';
        ctx.fillRect(x - 1, (r * H) / rings, 2, H / rings);
      }
    }
  });
}

/** Tuiles hexagonales du bouclier thermique, avec joints et teintes variées. */
export function tileTexture(): Texture {
  return make('tiles', 512, 444, (ctx) => {
    const rnd = random(11);
    const cols = 12;
    const w = 512 / cols; // largeur d'une colonne d'hexagones
    const size = w / Math.sqrt(3);
    const rowH = size * 1.5;
    const rows = Math.round(444 / rowH);
    ctx.fillStyle = '#0b0c0e';
    ctx.fillRect(0, 0, 512, 444);
    for (let row = -1; row <= rows + 1; row++) {
      for (let col = -1; col <= cols + 1; col++) {
        const cx = col * w + (row % 2 ? w / 2 : 0);
        const cy = row * rowH;
        const tone = 30 + Math.floor(rnd() * 22);
        ctx.fillStyle = `rgb(${tone},${tone},${tone + 3})`;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k + Math.PI / 6;
          const px = cx + Math.cos(a) * (size - 1.6);
          const py = cy + Math.sin(a) * (size - 1.6);
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  });
}

/** Halo radial doux, pour le sol éclairé et les lampes. */
export function glowTexture(inner: string, mid: string): Texture {
  return make(`glow-${inner}-${mid}`, 256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, inner);
    g.addColorStop(0.4, mid);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}

/** Béton du pas de tir, légèrement taché. */
export function concreteTexture(): Texture {
  return make('concrete', 512, 512, (ctx) => {
    const rnd = random(23);
    ctx.fillStyle = '#7a7d80';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) {
      const t = 90 + Math.floor(rnd() * 60);
      ctx.fillStyle = `rgba(${t},${t},${t + 2},0.25)`;
      const s = 1 + rnd() * 4;
      ctx.fillRect(rnd() * 512, rnd() * 512, s, s);
    }
    ctx.strokeStyle = 'rgba(40,42,45,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 128, 0);
      ctx.lineTo(i * 128, 512);
      ctx.moveTo(0, i * 128);
      ctx.lineTo(512, i * 128);
      ctx.stroke();
    }
  });
}

/**
 * Exprime les UV d'une géométrie en unités de scène, divisées par la taille
 * du motif : la texture garde la même échelle quelle que soit la pièce.
 */
export function scaleUv<G extends BufferGeometry>(geometry: G, width: number, height: number, tile: { u: number; v: number }): G {
  const uv = geometry.getAttribute('uv');
  if (!uv) return geometry;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) * width) / tile.u, (uv.getY(i) * height) / tile.v);
  }
  uv.needsUpdate = true;
  return geometry;
}

/**
 * Givre sur les réservoirs cryogéniques (masque d'opacité) : plaques
 * irrégulières, coulures verticales, bords effilochés en haut et en bas.
 */
export function frostTexture(): Texture {
  return make(
    'frost',
    256,
    512,
    (ctx) => {
      const rnd = random(31);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 256, 512);
      // Voile de base, plus dense au centre de la bande.
      const g = ctx.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.06, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.75)');
      g.addColorStop(0.94, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 512);
      // Plaques de givre plus épaisses.
      for (let i = 0; i < 260; i++) {
        const x = rnd() * 256;
        const y = 20 + rnd() * 472;
        const r = 4 + rnd() * 18;
        const a = 0.08 + rnd() * 0.22;
        const p = ctx.createRadialGradient(x, y, 0, x, y, r);
        p.addColorStop(0, `rgba(255,255,255,${a})`);
        p.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = p;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // Coulures de condensation.
      for (let i = 0; i < 90; i++) {
        const x = rnd() * 256;
        const y = rnd() * 400;
        ctx.fillStyle = `rgba(255,255,255,${0.1 + rnd() * 0.25})`;
        ctx.fillRect(x, y, 1 + rnd() * 2, 30 + rnd() * 110);
      }
      // Zones dégagées (soudures plus chaudes).
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(0,0,0,${0.15 + rnd() * 0.3})`;
        ctx.fillRect(rnd() * 256, rnd() * 512, 6 + rnd() * 30, 2 + rnd() * 5);
      }
    },
    false,
  );
}
