import { useEffect, useMemo } from 'react';
import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Euler,
  Matrix4,
  Quaternion,
  TorusGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { isLowPower } from '../../../lib/device';

/**
 * Micro-détails (rivets, colliers, grilles d'aération, joints…) : affichés
 * seulement sur les appareils puissants. Les téléphones gardent les détails
 * de taille moyenne, qui suffisent à leur écran.
 */
export const FINE = !isLowPower();

type Vec = readonly [number, number, number];

const tmp = { m: new Matrix4(), q: new Quaternion(), e: new Euler(), p: new Vector3(), s: new Vector3() };

/**
 * Assemble de nombreuses petites pièces en une seule géométrie : un seul
 * appel de dessin par matériau, quel que soit le nombre de détails.
 */
export class Kit {
  private parts: BufferGeometry[] = [];

  /** Ajoute une géométrie, déplacée, tournée (angles d'Euler XYZ) et mise à l'échelle. */
  add(g: BufferGeometry, pos: Vec = [0, 0, 0], rot: Vec = [0, 0, 0], scale: Vec = [1, 1, 1]): this {
    tmp.e.set(rot[0], rot[1], rot[2]);
    tmp.q.setFromEuler(tmp.e);
    tmp.m.compose(tmp.p.set(...pos), tmp.q, tmp.s.set(...scale));
    g.applyMatrix4(tmp.m);
    this.parts.push(g);
    return this;
  }

  box(size: Vec, pos: Vec, rot: Vec = [0, 0, 0]): this {
    return this.add(new BoxGeometry(...size), pos, rot);
  }

  /** Cylindre d'axe y. */
  cyl(rTop: number, rBottom: number, h: number, pos: Vec, rot: Vec = [0, 0, 0], seg = 12, open = false): this {
    return this.add(new CylinderGeometry(rTop, rBottom, h, seg, 1, open), pos, rot);
  }

  /** Cordon circulaire horizontal (soudure, collier), sur un arc éventuel partant de +x. */
  ring(radius: number, tube: number, y: number, arc = Math.PI * 2, startAngle = 0, seg = 72, cx = 0, cz = 0): this {
    const g = new TorusGeometry(radius, tube, 4, seg, arc);
    // Le tore est dans le plan xy : on le couche dans xz.
    g.rotateX(-Math.PI / 2);
    g.rotateY(startAngle);
    return this.add(g, [cx, y, cz]);
  }

  capsule(r: number, len: number, pos: Vec, rot: Vec = [0, 0, 0], scale: Vec = [1, 1, 1]): this {
    return this.add(new CapsuleGeometry(r, len, 4, 12), pos, rot, scale);
  }

  /**
   * Pièce posée sur une coque de rayon `r` à l'angle `a` (repère des coques :
   * x = r·sin a, z = r·cos a). Dans le repère de la pièce, +z sort de la coque.
   */
  onHull(g: BufferGeometry, a: number, y: number, r: number, local: Vec = [0, 0, 0], rot: Vec = [0, 0, 0]): this {
    g.rotateX(rot[0]);
    g.rotateY(rot[1]);
    g.rotateZ(rot[2]);
    g.translate(local[0], local[1], local[2] + r);
    g.rotateY(a);
    g.translate(0, y, 0);
    this.parts.push(g);
    return this;
  }

  get empty(): boolean {
    return this.parts.length === 0;
  }

  /**
   * Fusionne les pièces. Avec `tile`, les UV sont recalculées par projection
   * selon l'axe dominant de la normale : la texture garde son échelle réelle.
   */
  build(tile?: { u: number; v: number }): BufferGeometry {
    if (!this.parts.length) return new BufferGeometry();
    // Toutes les pièces doivent avoir les mêmes attributs et la même indexation.
    const indexed = this.parts.every((g) => g.index);
    const parts = this.parts.map((g) => {
      const n = indexed ? g : g.index ? g.toNonIndexed() : g;
      for (const name of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(name)) n.deleteAttribute(name);
      return n;
    });
    const merged = mergeGeometries(parts, false) ?? new BufferGeometry();
    if (tile) projectUv(merged, tile);
    this.parts.forEach((g) => g.dispose());
    parts.forEach((g) => g.dispose());
    this.parts = [];
    return merged;
  }
}

/** Construit une fois un jeu de géométries fusionnées et les libère au démontage. */
export function useKits<K extends string>(build: () => Record<K, BufferGeometry>): Record<K, BufferGeometry> {
  const set = useMemo(build, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => Object.values<BufferGeometry>(set).forEach((g) => g.dispose()), [set]);
  return set;
}

/** Angle, dans le repère du lanceur, de la face tournée vers la tour (–x de la scène). */
export const towerAngle = (stackYaw: number): number => Math.atan2(-Math.cos(stackYaw), -Math.sin(stackYaw));

/** UV par projection planaire selon l'axe dominant de la normale de chaque sommet. */
export function projectUv(g: BufferGeometry, tile: { u: number; v: number }): void {
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const uv = g.getAttribute('uv');
  if (!pos || !nor || !uv) return;
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (ay >= ax && ay >= az) uv.setXY(i, x / tile.u, z / tile.v);
    else if (ax >= az) uv.setXY(i, z / tile.u, y / tile.v);
    else uv.setXY(i, x / tile.u, y / tile.v);
  }
  uv.needsUpdate = true;
}
