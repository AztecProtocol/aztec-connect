import * as THREE from 'three';
import { rand } from './utils/calc';
import { inOutSine } from './utils/ease';

export default class Ripple {
  constructor({ group, array, x, y, z, strength, threshold, growth, decay }, world) {
    this.world = world;

    this.array = array;
    this.group = group;
    this.sphere = new THREE.Sphere(new THREE.Vector3(x, y, z), 0);
    this.strength = strength ? strength : rand(10, 15);
    this.threshold = threshold ? threshold : rand(4, 8);
    this.growth = growth > 0 ? growth : rand(0.1, 0.4);
    this.life = 1;
    this.decay = decay ? decay : rand(0.01, 0.02);
    this.influence = new THREE.Vector3();
    this.geometry = new THREE.CircleGeometry(5, 50);
    this.geometry.vertices.shift();
    this.geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));

    this.material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthTest: false,
      precision: 'lowp',
    });
    this.mesh = new THREE.LineLoop(this.geometry, this.material);
    this.mesh.position.x = this.sphere.center.x;
    this.mesh.position.y = 0;
    this.mesh.position.z = this.sphere.center.z;
    this.group.add(this.mesh);
  }

  getInfluenceVector(vec) {
    this.influence.set(0, 0, 0);
    let distance = this.sphere.distanceToPoint(vec);

    if (distance <= this.threshold) {
      let ease = inOutSine(this.threshold - distance, 0, 1, this.threshold);
      let power = this.strength * ease * this.life;
      this.influence.addVectors(vec, this.sphere.center).multiplyScalar(power);
    }

    return this.influence;
  }

  update(i) {
    this.sphere.radius += this.growth * this.life * this.world.deltaTimeNormal;
    this.life -= this.decay * this.world.deltaTimeNormal;

    this.mesh.position.y = (1 - this.life) * -3;
    let newScale = 0.001 + this.sphere.radius;
    this.mesh.scale.set(newScale, newScale, newScale);
    this.mesh.material.opacity = this.life / 3;

    if (this.life <= 0) {
      this.destroy(i);
    }
  }

  destroy(i) {
    this.geometry.dispose();
    this.material.dispose();
    this.group.remove(this.mesh);
    this.array.splice(i, 1);
  }
}
