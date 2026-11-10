import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const tmp = new THREE.Matrix4();

// Wraps scenery that mostly never moves. Shortly after it appears, every mesh that stayed still is
// found, and all that share a material are drawn as one mesh: far fewer draw calls for the phone.
// Meshes that move, can be tapped, or use their own shader tweak are left exactly as they were.
export default function StaticBatch({ children, settle = 1500 }) {
  const group = useRef();
  useEffect(() => {
    const g = group.current;
    const before = new Map();
    const made = [];
    const hidden = [];
    g.updateWorldMatrix(true, true);
    g.traverse((o) => {
      if (o.isMesh && !o.isInstancedMesh) before.set(o, o.matrixWorld.clone());
    });
    const shown = (o) => {
      for (let p = o; p && p !== g; p = p.parent) if (!p.visible) return false;
      return true;
    };
    const timer = setTimeout(() => {
      const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
      const sets = new Map();
      before.forEach((m0, o) => {
        const mat = o.material;
        if (!o.parent || Array.isArray(mat) || !mat.visible || !shown(o)) return;
        if (o.__r3f?.eventCount || Object.hasOwn(mat, 'onBeforeCompile')) return;
        if (!o.matrixWorld.equals(m0) || o.matrixWorld.determinant() < 0) return;
        const geo = o.geometry;
        const key = `${mat.uuid}|${Object.keys(geo.attributes).sort().join()}|${!!geo.index}`;
        if (!sets.has(key)) sets.set(key, { mat, list: [] });
        sets.get(key).list.push(o);
      });
      sets.forEach(({ mat, list }) => {
        if (list.length < 2) return;
        const parts = list.map((o) => o.geometry.clone().applyMatrix4(tmp.multiplyMatrices(inv, o.matrixWorld)));
        const merged = mergeGeometries(parts);
        parts.forEach((p) => p.dispose());
        if (!merged) return;
        const mesh = new THREE.Mesh(merged, mat);
        g.add(mesh);
        made.push(mesh);
        list.forEach((o) => {
          o.visible = false;
          hidden.push(o);
        });
      });
    }, settle);
    return () => {
      clearTimeout(timer);
      hidden.forEach((o) => (o.visible = true));
      made.forEach((m) => {
        g.remove(m);
        m.geometry.dispose();
      });
    };
  }, []);
  return <group ref={group}>{children}</group>;
}
