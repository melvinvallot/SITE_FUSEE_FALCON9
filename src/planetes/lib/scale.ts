/**
 * Échelle de la scène 3D. Les vraies distances sont impossibles à montrer
 * (Neptune est 30 fois plus loin du Soleil que la Terre) : les rayons des orbites
 * sont « compressés », mais les angles et les durées restent ceux du calcul réel.
 */
export const ORBIT_SCALE = 38;
export const ORBIT_POWER = 0.55;

/** Rayon dans la scène d'une distance au Soleil exprimée en UA. */
export const sceneRadius = (au: number) => ORBIT_SCALE * Math.pow(Math.max(au, 0), ORBIT_POWER);

/**
 * Position dans la scène : le plan des orbites est le plan horizontal (x, z) et
 * les planètes tournent dans le sens inverse des aiguilles d'une montre vues de dessus.
 */
export function scenePosition(au: number, angle: number, out: [number, number, number] = [0, 0, 0]) {
  const r = sceneRadius(au);
  out[0] = r * Math.cos(angle);
  out[1] = 0;
  out[2] = -r * Math.sin(angle);
  return out;
}
