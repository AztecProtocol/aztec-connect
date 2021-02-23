import * as THREE from 'three';
import { rand, randInt, rangeMap } from './utils/calc';
import { inExpo } from './utils/ease';

import { breakpoints } from '../../styles';

import Particle from './particle';
import Ripple from './ripple';

export default class World {
  constructor(canvas, prepareEnter = false) {
    this.sphereGeometry = new THREE.SphereBufferGeometry(1, 40, 16);
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.camera = new THREE.PerspectiveCamera(40, 300, 40, 100000);
    this.base = null;
    this.center = null;
    this.enterBase = null;
    this.enterCenter = null;
    this.exitBase = null;
    this.exitCenter = null;

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
    });

    this.prepareEnter = prepareEnter;

    this.entering = false;
    this.enterProgress = 0;
    this.enterRate = 0.042;
    this.onEnter = null;

    this.exiting = false;
    this.exitProgress = 0;
    this.exitRate = 0.02;
    this.onExit = null;

    this.request = null;
    this.stopped = false;

    this.duration = 6000;
    this.timescale = 0.5;

    this.cols = 100;
    this.rows = 110;

    this.enableRipple = true;
    this.ripples = [];

    this.tick = 0;
    this.dropTick = 20;
    this.dropTickMin = 15;
    this.dropTickMax = 40;

    this.positionCamera();
    this.initParticles();
    this.resize();
    this.advanceTime();
    this.paint();
  }

  positionCamera() {
    this.enterBase = new THREE.Vector3(-38, 28, -46);
    this.enterCenter = new THREE.Vector3(6, -12, -106);

    this.base = new THREE.Vector3(-38, 18, -36);
    this.center = new THREE.Vector3(6, -12, -106);

    this.exitBase = new THREE.Vector3(-38, 2, -40);
    this.exitCenter = new THREE.Vector3(-60, -2, -60);

    let initialBase;
    let initialCenter;
    if (this.prepareEnter) {
      initialBase = this.enterBase;
      initialCenter = this.enterCenter;
    } else {
      initialBase = this.base;
      initialCenter = this.center;
    }

    this.camera.position.x = initialBase.x;
    this.camera.position.y = initialBase.y;
    this.camera.position.z = initialBase.z;
    this.camera.lookAt(initialCenter);
  }

  initParticles() {
    this.particles = [];
    this.particleGroup = new THREE.Object3D();
    this.particleGroup.scale.set(1, 1, 1);

    const distToOrigin = (x, y) => Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    const maxDist = distToOrigin(this.cols, this.rows);
    const baseRange = {
      min: 0,
      max: maxDist,
    };
    const opacityRange = {
      min: 0,
      max: 0.4,
    };

    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows; row++) {
        const x = col - this.cols / 2;
        const y = 0;
        const z = -row;
        const distance = distToOrigin(x, z);
        const opacity = rangeMap(maxDist - distance, baseRange, opacityRange);

        this.particles.push(
          new Particle(
            {
              group: this.particleGroup,
              x,
              y,
              z,
              size: 0.1,
              color: 0xffffff,
              opacity,
            },
            this,
          ),
        );
      }
    }

    this.scene.add(this.particleGroup);
  }

  reset() {
    this.exiting = false;
    this.exitProgress = 0;
    this.tick = 0;
    this.positionCamera();
  }

  advanceTime() {
    this.deltaTimeMilliseconds = this.clock.getDelta() * this.timescale * 1000;
    this.deltaTimeNormal = this.deltaTimeMilliseconds / (1000 / 60);
  }

  createRipple({ x, y = -0.1, z, strength = rand(7, 12), threshold, growth, decay }) {
    this.ripples.push(
      new Ripple(
        {
          array: this.ripples,
          group: this.particleGroup,
          x,
          y,
          z,
          strength,
          threshold,
          growth,
          decay,
        },
        this,
      ),
    );
  }

  updateRipples() {
    let i = this.ripples.length;
    while (i--) {
      this.ripples[i].update(i);
    }
  }

  updateParticles() {
    let i = this.particles.length;
    while (i--) {
      this.particles[i].update();
    }

    if (this.entering && this.enterProgress < 1) {
      this.enterProgress += this.enterRate * this.deltaTimeNormal;
      if (this.enterProgress > 1) {
        this.enterProgress = 1;
        this.prepareEnter = false;
        this.entering = false;
        if (this.onEnter) {
          this.onEnter();
          this.onEnter = null;
        }
      }
    }

    if (this.exiting) {
      this.exitProgress += this.exitRate * this.deltaTimeNormal;
      if (this.exitProgress >= 1) {
        this.exitProgress = 1;
        if (this.onExit) {
          this.onExit();
          this.onExit = null;
        }
      }
    }

    if (this.enableRipple && this.tick >= this.dropTick) {
      const dropAtLeft = this.ripples.length % 2;
      const closeToCenter = rand(0, 2) > 1;
      const boundary = closeToCenter ? ((this.cols / 2) * 2) / 3 : this.cols / 2;
      this.createRipple({
        x: dropAtLeft ? rand(-boundary, 0) : rand(0, boundary),
        z: rand(-this.rows, 0),
      });
      this.dropTick = randInt(this.dropTickMin, this.dropTickMax);
      this.tick = 0;
    }

    this.updateRipples();

    i = this.particles.length;
    while (i--) {
      let j = this.ripples.length;
      while (j--) {
        let particle = this.particles[i];
        let ripple = this.ripples[j];
        let influence = ripple.getInfluenceVector(particle.base);
        influence.setX(0);
        influence.setZ(0);
        particle.velocity.add(influence);
      }
    }

    this.tick += this.deltaTimeNormal;

    if (this.entering) {
      const progress = inExpo(this.enterProgress, 0, 1, 1);

      this.camera.position.x -= (this.camera.position.x - this.base.x) * progress;
      this.camera.position.y -= (this.camera.position.y - this.base.y) * progress;
      this.camera.position.z -= (this.camera.position.z - this.base.z) * progress;

      this.currentEnterCenter.x -= (this.currentEnterCenter.x - this.center.x) * progress;
      this.currentEnterCenter.y -= (this.currentEnterCenter.y - this.center.y) * progress;
      this.currentEnterCenter.z -= (this.currentEnterCenter.z - this.center.z) * progress;
      this.camera.lookAt(this.currentEnterCenter);
    }

    if (this.exiting) {
      const progress = inExpo(this.exitProgress, 0, 1, 1);

      this.camera.position.x -= (this.camera.position.x - this.exitBase.x) * progress;
      this.camera.position.y -= (this.camera.position.y - this.exitBase.y) * progress;
      this.camera.position.z -= (this.camera.position.z - this.exitBase.z) * progress;

      this.currentExitCenter.x -= (this.currentExitCenter.x - this.exitCenter.x) * progress;
      this.currentExitCenter.y -= (this.currentExitCenter.y - this.exitCenter.y) * progress;
      this.currentExitCenter.z -= (this.currentExitCenter.z - this.exitCenter.z) * progress;
      this.camera.lookAt(this.currentExitCenter);
    }
  }

  enter = callback => {
    if (!this.prepareEnter || this.entering) return;

    this.currentEnterCenter = this.enterCenter.clone();
    this.onEnter = callback;
    this.entering = true;
  };

  exit = callback => {
    if (this.exiting) return;

    this.currentExitCenter = this.center.clone();
    this.onExit = callback;
    this.exiting = true;

    const { x, z } = this.exitBase;
    this.createRipple({
      x,
      z,
      strength: 36,
      threshold: 12,
      growth: 0.2,
      decay: 0.01,
    });
  };

  resize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.enableRipple = this.width >= parseInt(breakpoints.s);
    this.dpr = window.devicePixelRatio > 1 ? 2 : 1;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.width, this.height);
  };

  stop = () => {
    this.stopped = true;
    this.clock.stop();
    cancelAnimationFrame(this.request);
  };

  paint = () => {
    if (this.stopped) return;
    this.advanceTime();
    this.updateParticles();
    this.renderer.render(this.scene, this.camera);

    this.request = window.requestAnimationFrame(this.paint);
  };
}
