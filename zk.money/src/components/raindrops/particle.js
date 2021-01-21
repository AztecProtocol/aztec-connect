import * as THREE from 'three';
import { clamp } from './utils/calc';

export default class Particle {
  constructor(config, world) {
    this.world = world;

    this.group = config.group;
    this.x = config.x;
    this.y = config.y;
    this.z = config.z;
    this.size = config.size;
    this.color = config.color;
    this.opacity = config.opacity;

    this.base = new THREE.Vector3(config.x, config.y, config.z);
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.lerpFactor = 0.4;
    this.dampFactor = 0.3;

    this.createMesh();
  }

  createMesh() {
    this.geometry = this.world.sphereGeometry;

    this.material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: this.opacity,
      depthTest: false,
      precision: 'lowp',
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);

    this.mesh.position.x = this.x;
    this.mesh.position.y = this.y;
    this.mesh.position.z = this.z;

    this.mesh.scale.set(this.size, this.size, this.size);

    this.group.add(this.mesh);
  }

  update() {
    const scale = 0.08 + Math.abs(this.velocity.y) / 25;
    this.mesh.scale.set(scale, scale, scale);

    const opacity = this.opacity + Math.abs(this.velocity.y) / 1;
    this.mesh.material.opacity = clamp(opacity, 0.1, 1);

    this.velocity.y += (this.base.y - this.mesh.position.y) * this.lerpFactor;
    this.velocity.multiplyScalar(this.dampFactor);
    this.mesh.position.add(this.velocity);
  }
}
