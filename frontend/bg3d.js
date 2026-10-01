/**
 * LexShield AI — Interactive 3D WebGL Background Scene
 * Uses Three.js to render floating geometric legal nodes, rotating wireframe shields,
 * and a responsive particle constellation with mouse parallax.
 */

(function () {
  'use strict';

  let scene, camera, renderer;
  let particleSystem, particlePositions, particleVelocities, particleCount = 120;
  let lineGeometry, lineMesh;
  let floatingShapes = [];
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  let windowHalfX = window.innerWidth / 2;
  let windowHalfY = window.innerHeight / 2;
  let currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';

  // Initialize 3D Canvas
  function init3D() {
    const canvas = document.getElementById('bg3dCanvas');
    if (!canvas) return;

    if (typeof THREE === 'undefined') {
      console.warn('Three.js not loaded. Falling back to 2D canvas.');
      init2DFallback(canvas);
      return;
    }

    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
      camera.position.z = 400;

      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Create Particle Constellation
      const geometry = new THREE.BufferGeometry();
      particlePositions = new Float32Array(particleCount * 3);
      particleVelocities = [];

      for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 800;
        const y = (Math.random() - 0.5) * 800;
        const z = (Math.random() - 0.5) * 600;

        particlePositions[i * 3] = x;
        particlePositions[i * 3 + 1] = y;
        particlePositions[i * 3 + 2] = z;

        particleVelocities.push({
          x: (Math.random() - 0.5) * 0.4,
          y: (Math.random() - 0.5) * 0.4,
          z: (Math.random() - 0.5) * 0.4
        });
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

      // Particle texture/material
      const particleMaterial = new THREE.PointsMaterial({
        color: currentTheme === 'light' ? 0x2563eb : 0x3b82f6,
        size: 4,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      });

      particleSystem = new THREE.Points(geometry, particleMaterial);
      scene.add(particleSystem);

      // Floating 3D Geometric Objects (Wireframe Icosahedrons & Torus Knots)
      const shapesMaterial = new THREE.MeshBasicMaterial({
        color: currentTheme === 'light' ? 0x6366f1 : 0x8b5cf6,
        wireframe: true,
        transparent: true,
        opacity: currentTheme === 'light' ? 0.25 : 0.35
      });

      // Shape 1: Large Icosahedron (Shield Core)
      const icoGeo = new THREE.IcosahedronGeometry(75, 1);
      const icoMesh = new THREE.Mesh(icoGeo, shapesMaterial);
      icoMesh.position.set(-220, 80, -100);
      scene.add(icoMesh);
      floatingShapes.push({ mesh: icoMesh, rotX: 0.003, rotY: 0.005, floatSpeed: 0.008, baseY: 80 });

      // Shape 2: Octahedron (Legal Node)
      const octGeo = new THREE.OctahedronGeometry(50, 0);
      const octMesh = new THREE.Mesh(octGeo, shapesMaterial);
      octMesh.position.set(240, -90, -80);
      scene.add(octMesh);
      floatingShapes.push({ mesh: octMesh, rotX: -0.004, rotY: 0.006, floatSpeed: 0.01, baseY: -90 });

      // Shape 3: Dodecahedron
      const dodGeo = new THREE.DodecahedronGeometry(40, 0);
      const dodMesh = new THREE.Mesh(dodGeo, shapesMaterial);
      dodMesh.position.set(0, -150, -150);
      scene.add(dodMesh);
      floatingShapes.push({ mesh: dodMesh, rotX: 0.005, rotY: -0.003, floatSpeed: 0.006, baseY: -150 });

      // Event Listeners
      window.addEventListener('resize', onWindowResize);
      document.addEventListener('mousemove', onDocumentMouseMove);

      // Theme Observer
      const observer = new MutationObserver(updateThemeColors);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      // Start animation loop
      animate();

    } catch (e) {
      console.warn('WebGL initialization failed. Falling back to 2D canvas.', e);
      init2DFallback(canvas);
    }
  }

  function updateThemeColors() {
    currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    if (!particleSystem) return;

    const isLight = currentTheme === 'light';
    particleSystem.material.color.setHex(isLight ? 0x2563eb : 0x3b82f6);
    particleSystem.material.opacity = isLight ? 0.6 : 0.8;

    floatingShapes.forEach(item => {
      item.mesh.material.color.setHex(isLight ? 0x4f46e5 : 0x8b5cf6);
      item.mesh.material.opacity = isLight ? 0.2 : 0.35;
    });
  }

  function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) * 0.2;
    mouseY = (event.clientY - windowHalfY) * 0.2;
  }

  let clock = 0;
  function animate() {
    requestAnimationFrame(animate);
    clock += 0.015;

    // Smooth mouse parallax interpolation
    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    camera.position.x = targetX;
    camera.position.y = -targetY;
    camera.lookAt(scene.position);

    // Update particle positions
    const positions = particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += particleVelocities[i].x;
      positions[i * 3 + 1] += particleVelocities[i].y;
      positions[i * 3 + 2] += particleVelocities[i].z;

      // Bounce off boundaries
      if (Math.abs(positions[i * 3]) > 400) particleVelocities[i].x *= -1;
      if (Math.abs(positions[i * 3 + 1]) > 400) particleVelocities[i].y *= -1;
      if (Math.abs(positions[i * 3 + 2]) > 300) particleVelocities[i].z *= -1;
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;

    // Rotate and float shapes
    floatingShapes.forEach((item, idx) => {
      item.mesh.rotation.x += item.rotX;
      item.mesh.rotation.y += item.rotY;
      item.mesh.position.y = item.baseY + Math.sin(clock + idx) * 15;
    });

    renderer.render(scene, camera);
  }

  // 2D Canvas Fallback (if WebGL is disabled or Three.js CDN fails)
  function init2DFallback(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles = [];
    const count = 50;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    function draw2D() {
      ctx.clearRect(0, 0, width, height);
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      ctx.fillStyle = isLight ? 'rgba(37, 99, 235, 0.4)' : 'rgba(59, 130, 246, 0.5)';

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });

      requestAnimationFrame(draw2D);
    }
    draw2D();
  }

  // Run on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init3D);
  } else {
    init3D();
  }
})();
