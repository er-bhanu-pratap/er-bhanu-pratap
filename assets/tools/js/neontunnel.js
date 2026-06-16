/**
 * NeonTunnel - GPU Benchmark
 * Three.js WebGL volumetric tunnel with ray marching
 */

// ============================================
// GLSL FRAGMENT SHADER - NEON TUNNEL 3D
// Volumetric ray marching through wireframe tunnel
// ============================================
const fragmentShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uQuality;
  uniform float uStress;
  uniform float uCameraAngle;
  uniform float uCameraHeight;
  uniform float uCameraDistance;
  uniform vec3 uCameraTarget;
  
  varying vec2 vUv;
  
  // ============================================
  // 3D TUNNEL SCENE
  // ============================================
  
  // Rotation matrices
  vec3 rotateY(vec3 p, float a) {
    float s = sin(a), c = cos(a);
    return vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
  }
  
  vec3 rotateX(vec3 p, float a) {
    float s = sin(a), c = cos(a);
    return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
  }
  
  // Box SDF
  float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
  }
  
  // Cylinder SDF
  float sdCylinder(vec3 p, float r) {
    return length(p.xy) - r;
  }
  
  // Grid pattern on surface
  float gridPattern(vec3 p, float scale) {
    float gx = smoothstep(0.02, 0.0, abs(fract(p.x * scale) - 0.5));
    float gy = smoothstep(0.02, 0.0, abs(fract(p.y * scale) - 0.5));
    float gz = smoothstep(0.02, 0.0, abs(fract(p.z * scale) - 0.5));
    return max(max(gx, gy), gz);
  }
  
  // Heavy kernel for GPU stress (like volumeshader)
  float heavyKernel(vec3 p) {
    vec3 v = p;
    for(int i = 0; i < 6; i++) {
      float r = length(v);
      float theta = atan(v.y, v.x) * 6.0;
      float phi = acos(v.z / max(r, 0.001)) * 6.0;
      r = pow(r, 6.0);
      v = vec3(
        r * sin(phi) * cos(theta),
        r * sin(phi) * sin(theta),
        r * cos(phi)
      ) + p;
    }
    return length(v) - 3.0;
  }
  
  // ============================================
  // TUNNEL SCENE
  // ============================================
  float map(vec3 p) {
    float time = uTime * 0.5;
    
    // Fly forward through tunnel (negative Z direction)
    p.z += time * 2.0;
    
    // Create repeating tunnel segments
    float segment = floor(p.z / 4.0);
    vec3 localP = p;
    localP.z = fract(p.z / 4.0) * 4.0 - 2.0;
    
    // Rotate segment based on position
    localP = rotateY(localP, segment * 0.5 + time * 0.3);
    
    // Main tunnel cylinder
    float tunnelRadius = 2.5 + sin(segment * 0.7) * 0.3;
    float tunnel = abs(sdCylinder(localP, tunnelRadius)) - 0.1;
    
    // Inner details - floating cubes
    vec3 cubeP = rotateX(rotateY(localP, time), time * 0.5);
    float cube = sdBox(cubeP - vec3(0.0, 0.0, sin(segment) * 0.5), vec3(0.3));
    
    // Heavy kernel shapes inside
    float fractal = heavyKernel(rotateY(p - vec3(0.0, 0.0, segment * 4.0), time));
    
    // Combine
    float d = min(tunnel, cube);
    d = min(d, fractal);
    
    return d;
  }
  
  // ============================================
  // MAIN - RAY MARCHING
  // ============================================
  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= uResolution.x / uResolution.y;
    
    // Camera: flying through tunnel with interaction
    float time = uTime * 0.5;
    float dist = 0.5; // Distance traveled through tunnel
    
    // Base position moving forward
    vec3 ro = vec3(
      sin(time * 0.5) * 0.5,
      cos(time * 0.3) * 0.3,
      -time * 2.0
    );
    
    // Add user rotation control
    ro.x += sin(uCameraAngle) * uCameraDistance * 0.3;
    ro.y += sin(uCameraHeight) * uCameraDistance * 0.3;
    
    // Look direction - forward through tunnel
    vec3 lookAt = ro + vec3(0.0, 0.0, 10.0);
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);
    vec3 rd = normalize(uv.x * right + uv.y * up + forward * 1.0);
    
    // Apply user rotation to ray
    float ca = cos(uCameraAngle * 0.3);
    float sa = sin(uCameraAngle * 0.3);
    rd = vec3(
      rd.x * ca - rd.z * sa,
      rd.y,
      rd.x * sa + rd.z * ca
    );
    
    // Ray marching
    float t = 0.0;
    float tmax = 30.0;
    vec3 p;
    float minDist = 1000.0;
    int maxSteps = 100 + int(uStress * 150.0);
    bool hit = false;
    
    for(int i = 0; i < 250; i++) {
      if(i >= maxSteps) break;
      
      p = ro + rd * t;
      float d = map(p);
      minDist = min(minDist, d);
      
      if(d < 0.01) {
        hit = true;
        break;
      }
      
      if(t > tmax) break;
      t += max(d * 0.5, 0.02);
    }
    
    // Coloring
    vec3 col = vec3(0.01, 0.01, 0.02);
    
    if(hit) {
      // Calculate normal
      float e = 0.001;
      vec3 n;
      n.x = map(vec3(p.x + e, p.y, p.z)) - map(vec3(p.x - e, p.y, p.z));
      n.y = map(vec3(p.x, p.y + e, p.z)) - map(vec3(p.x, p.y - e, p.z));
      n.z = map(vec3(p.x, p.y, p.z + e)) - map(vec3(p.x, p.y, p.z - e));
      n = normalize(n);
      
      // Grid pattern for wireframe look
      float grid = gridPattern(p, 4.0);
      
      // Neon colors
      vec3 pink = vec3(0.95, 0.2, 0.7);
      vec3 cyan = vec3(0.1, 0.8, 0.9);
      vec3 purple = vec3(0.7, 0.15, 0.95);
      
      // Mix colors based on position
      float t1 = sin(p.z * 0.2 + time) * 0.5 + 0.5;
      float t2 = sin(length(p.xy) * 2.0) * 0.5 + 0.5;
      
      vec3 baseCol = mix(mix(pink, cyan, t1), purple, t2 * 0.5);
      
      // Wireframe grid
      float gridIntensity = grid * 2.0;
      vec3 gridCol = baseCol * gridIntensity;
      
      // Fill
      float diff = max(dot(n, normalize(vec3(1.0, 1.0, 1.0))), 0.0);
      vec3 fillCol = baseCol * 0.2 * diff;
      
      // Combine
      col = gridCol + fillCol;
      
      // Glow
      col += baseCol * 0.3;
      
      // Fog fade
      float fog = 1.0 - exp(-t * 0.15);
      col = mix(col, vec3(0.01, 0.01, 0.02), fog);
    }
    
    // Vignette
    float vignette = 1.0 - dot(vUv - 0.5, vUv - 0.5) * 0.6;
    col *= vignette;
    
    // Tone mapping
    col = pow(col / (1.0 + col), vec3(0.4545));
    
    gl_FragColor = vec4(col, 1.0);
  }
`;

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ============================================
// BENCHMARK APPLICATION
// ============================================
class NeonTunnel {
  constructor() {
    this.canvas = document.getElementById('glCanvas');
    // Camera interaction state (like volumeshader_bm)
    this.cameraAngle = 2.8;  // Horizontal rotation
    this.cameraHeight = 0.4;   // Vertical angle
    this.cameraDistance = 8.0; // Zoom
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    
    // Mouse/touch state
    this.isDragging = false;
    this.isRightClick = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.lastTouchDist = 0;  
    this.isRunning = false;
    this.quality = 'high'; // low, medium, high
    this.stressMode = false;
    this.stressLevel = 0;
    
    // FPS tracking
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    this.frameTime = 0;
    this.fpsHistory = [];
    
    // Quality multipliers
    this.qualitySettings = {
      low: 0.75,
      medium: 0.9,
      high: 1.0,
      ultra: 1.5
    };
    
    // CPU & Memory stress
    this.cpuWorkers = [];
    this.memoryBuffers = [];
    this.cpuStressInterval = null;
    this.memoryStressInterval = null;
    this.targetMemoryMB = 2048; // Target 2GB+ RAM usage
    this.cpuLoadThreads = 4; // Number of CPU-intensive workers
    
    this.init();
  }
  
  init() {
    try {
      console.log('NovaRender: Initializing...');
      
      // Check WebGL support
      if (!this.checkWebGL()) {
        this.showError('WebGL not supported', 'Your browser does not support WebGL, which is required for this benchmark.');
        return;
      }
      
      // Setup Three.js
      this.setupScene();
      this.setupUI();
      this.setupCPULoad();
      this.setupInteraction();
      this.start();
      
      console.log('NeonTunnel: Started successfully');
      console.log('NeonTunnel: Ray marching steps:', 100 + (this.stressMode ? 150 : 0));
      console.log('NeonTunnel: Target memory:', this.targetMemoryMB, 'MB');
      
      // Hide loading
      setTimeout(() => {
        document.getElementById('loading').classList.add('hidden');
      }, 500);
    } catch (err) {
      console.error('NeonTunnel init error:', err);
      this.showError('Initialization Failed', err.message || 'Failed to start benchmark. Check console for details.');
    }
  }
  
  // Setup mouse/touch interaction like volumeshader_bm
  setupInteraction() {
    // Clamp helper
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
    const canvas = this.canvas;
    
    // Mouse down
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.isRightClick = e.button === 2;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      e.preventDefault();
    });
    
    // Mouse up
    document.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.isRightClick = false;
    });
    
    // Mouse move
    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      
      if (this.isRightClick) {
        // Right click: pan target
        const l = this.cameraDistance * 4.0 / (window.innerWidth + window.innerHeight);
        this.cameraTarget.x += l * (-dx * Math.sin(this.cameraAngle) - dy * Math.sin(this.cameraHeight) * Math.cos(this.cameraAngle));
        this.cameraTarget.y += l * (dy * Math.cos(this.cameraHeight));
        this.cameraTarget.z += l * (dx * Math.cos(this.cameraAngle) - dy * Math.sin(this.cameraHeight) * Math.sin(this.cameraAngle));
      } else {
        // Left click: rotate
        this.cameraAngle += dx * 0.005;
        this.cameraHeight += dy * 0.005;
        this.cameraHeight = clamp(this.cameraHeight, -1.5, 1.5);
      }
      
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });
    
    // Mouse wheel: zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance *= Math.exp(e.deltaY * 0.001);
      this.cameraDistance = clamp(this.cameraDistance, 2.0, 50.0);
    }, { passive: false });
    
    // Touch support
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        // Two finger pinch
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && this.isDragging) {
        const dx = e.touches[0].clientX - this.lastMouseX;
        const dy = e.touches[0].clientY - this.lastMouseY;
        
        this.cameraAngle += dx * 0.005;
        this.cameraHeight += dy * 0.005;
        this.cameraHeight = clamp(this.cameraHeight, -1.5, 1.5);
        
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        // Pinch to zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (this.lastTouchDist > 0) {
          this.cameraDistance *= this.lastTouchDist / dist;
          this.cameraDistance = clamp(this.cameraDistance, 2.0, 50.0);
        }
        this.lastTouchDist = dist;
      }
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
      this.isDragging = false;
      if (e.touches.length < 2) {
        this.lastTouchDist = 0;
      }
    });
    
    // Context menu for right click
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
  
  setupCPULoad() {
    this.cpuWorkers = [];
    this.workerCount = navigator.hardwareConcurrency || 4;
    
    // Create inline Web Worker for CPU burn
    const workerScript = `
      self.onmessage = function(e) {
        const { iterations, stress } = e.data;
        let result = 0;
        
        // Aggressive CPU burn - tight loop with heavy math
        for (let i = 0; i < iterations; i++) {
          // Fibonacci-like recursive calculation (simulated iteratively)
          let a = 1, b = 1;
          for (let j = 0; j < 1000; j++) {
            let temp = a + b;
            a = b;
            b = temp;
            result += Math.sin(b) * Math.cos(b) * Math.tan(b % 1.57 + 0.1);
          }
          
          // Heavy floating point operations
          let x = i;
          for (let k = 0; k < 500; k++) {
            x = Math.sqrt(Math.abs(x * x - k));
            x = Math.pow(x, 1.01);
            x = Math.log(Math.abs(x) + 1.001);
            result += x;
          }
          
          // Prevent optimization with volatile memory access pattern
          if (i % 1000 === 0) {
            self.postMessage({ type: 'ping', result: result });
          }
        }
        
        self.postMessage({ type: 'done', result: result });
      };
    `;
    
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    // Spawn workers for each CPU core
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(workerUrl);
      worker.onmessage = (e) => {
        if (e.data.type === 'done') {
          // Restart worker immediately for continuous load
          if (this.isRunning) {
            this.startWorker(worker);
          }
        }
      };
      this.cpuWorkers.push(worker);
    }
    
    // Start all workers
    this.cpuWorkers.forEach(w => this.startWorker(w));
    
    // Memory allocation loop - NO LIMIT, keeps allocating
    this.memoryStressInterval = setInterval(() => {
      if (this.isRunning) {
        this.allocateMemoryChunk();
      }
    }, 50);
    
    // Additional main-thread CPU burn
    this.mainThreadBurn();
  }
  
  startWorker(worker) {
    const iterations = this.stressMode ? 5000000 : 1000000; // 5M or 1M iterations
    worker.postMessage({ iterations, stress: this.stressMode });
  }
  
  // Main thread CPU burn (additional to workers)
  mainThreadBurn() {
    const burn = () => {
      if (!this.isRunning) {
        setTimeout(burn, 100);
        return;
      }
      
      const start = performance.now();
      let ops = 0;
      
      // Burn CPU for ~16ms (one frame)
      while (performance.now() - start < 16) {
        // Heavy math operations
        let x = Math.random() * 1000000;
        for (let i = 0; i < 1000; i++) {
          x = Math.sqrt(x * x + i);
          x = Math.sin(x) * Math.cos(x) + Math.tan(x % 1.57 + 0.001);
          x = Math.pow(Math.abs(x), 1.001);
          x = Math.log(x + 1.0001);
          ops++;
        }
      }
      
      // Schedule next burn
      setTimeout(burn, 0);
    };
    
    burn();
  }
  
  // Allocate large memory chunks
  allocateMemoryChunk() {
    try {
      // Allocate 40MB chunks
      const chunkSize = 40 * 1024 * 1024 / 8; // 40MB in Float64Array elements
      const buffer = new Float64Array(chunkSize);
      
      // Fill with data to ensure it's allocated
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.random();
      }
      
      this.memoryBuffers.push(buffer);
      
      // Keep accessing memory to prevent optimization
      setInterval(() => {
        if (buffer.length > 0) {
          let sum = 0;
          for (let i = 0; i < Math.min(10000, buffer.length); i++) {
            sum += buffer[i] * Math.random();
          }
        }
      }, 50);
      
    } catch (e) {
      console.log('Memory allocation limit reached');
    }
  }
  
  // Get current memory usage estimate
  getMemoryUsage() {
    const bufferMB = this.memoryBuffers.reduce((sum, buf) => sum + buf.length * 8 / (1024 * 1024), 0);
    return Math.round(bufferMB);
  }
  
  checkWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }
  
  setupScene() {
    try {
      console.log('Setting up scene...');
    // Scene
    this.scene = new THREE.Scene();
    
    // Create large offscreen render targets to consume GPU memory
    this.createGPUMemoryPressure();
    
    // Camera (orthographic for full-screen quad)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 10);
    this.camera.position.z = 1;
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.updateResolution();
    
    // Shader material with error handling
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uQuality: { value: 1.0 },
        uStress: { value: 0.0 },
        uCameraAngle: { value: 2.8 },
        uCameraHeight: { value: 0.4 },
        uCameraDistance: { value: 8.0 },
        uCameraTarget: { value: new THREE.Vector3(0, 0, 0) }
      }
    });
    
    // Force shader compilation and check for errors
    this.renderer.compile(this.scene, this.camera);
    const gl = this.renderer.getContext();
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      console.error('WebGL Error during compile:', error);
      this.showError('Shader Error', 'WebGL error code: ' + error);
    }
    
    // Full-screen quad
    const geometry = new THREE.PlaneGeometry(2 * aspect, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
    
    // Handle resize
    window.addEventListener('resize', () => this.onResize());
    
    } catch (err) {
      console.error('setupScene error:', err);
      this.showError('Scene Setup Failed', err.message);
    }
  }
  
  updateResolution() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const qualityMult = this.qualitySettings[this.quality];
    const width = Math.floor(window.innerWidth * qualityMult);
    const height = Math.floor(window.innerHeight * qualityMult);
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(dpr);
  }
  
  onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.updateProjectionMatrix();
    
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(2 * aspect, 2);
    }
    
    this.updateResolution();
    this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  }
  
  setupUI() {
    // Start/Stop button
    const toggleBtn = document.getElementById('toggleBenchmark');
    toggleBtn.addEventListener('click', () => this.toggle());
    
    // Quality buttons
    document.querySelectorAll('.quality-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const q = e.target.dataset.quality;
        this.setQuality(q);
        
        // Update active state
        document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });
    
    // Stress mode toggle
    const stressToggle = document.getElementById('stressToggle');
    stressToggle.addEventListener('click', () => {
      this.stressMode = !this.stressMode;
      stressToggle.classList.toggle('active', this.stressMode);
      
      if (this.stressMode) {
        // Aggressive resource allocation when stress mode enabled
        this.enterStressMode();
      } else {
        this.stressLevel = 0;
      }
    });
    
    // Auto-detect button
    document.getElementById('autoDetect').addEventListener('click', () => this.autoDetect());
  }
  
  setQuality(quality) {
    this.quality = quality;
    
    // When ultra, increase memory pressure
    if (quality === 'ultra') {
      this.allocateMoreMemory();
    }
    
    this.updateResolution();
    this.updateStats();
  }
  
  // Allocate additional memory chunks for ultra mode - NO LIMIT
  allocateMoreMemory() {
    // Allocate 20 more 40MB chunks (800MB)
    for (let i = 0; i < 20; i++) {
      setTimeout(() => this.allocateMemoryChunk(), i * 50);
    }
  }
  
  // Enter maximum stress mode - allocate everything
  enterStressMode() {
    console.log('Stress Mode: MAXIMUM');
    
    // Rapidly allocate memory - NO LIMIT until crash
    let allocations = 0;
    const stressAlloc = setInterval(() => {
      if (!this.stressMode || allocations >= 100) {
        clearInterval(stressAlloc);
        console.log('Stress Mode: Allocated', this.getMemoryUsage(), 'MB RAM');
        return;
      }
      this.allocateMemoryChunk();
      allocations++;
    }, 30);
    
    // Restart all workers with max iterations
    this.cpuWorkers.forEach(w => {
      w.terminate();
    });
    
    // Recreate workers with higher stress
    setTimeout(() => {
      this.cpuWorkers.forEach(w => this.startWorker(w));
    }, 100);
    
    // Force ultra quality if not already
    if (this.quality !== 'ultra') {
      this.setQuality('ultra');
      document.querySelectorAll('.quality-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.quality === 'ultra');
      });
    }
  }
  
  stop() {
    this.isRunning = false;
    document.getElementById('toggleBenchmark').textContent = 'Start';
    
    // Terminate all workers
    this.cpuWorkers.forEach(w => w.terminate());
    this.cpuWorkers = [];
  }
  
  toggle() {
    if (this.isRunning) {
      this.stop();
    } else {
      this.isRunning = true;
      const btn = document.getElementById('toggleBenchmark');
      btn.textContent = 'Stop';
      btn.classList.toggle('btn-primary', false);
      btn.classList.toggle('btn-secondary', true);
      
      // Restart workers
      this.cpuWorkers.forEach(w => this.startWorker(w));
      this.animate();
    }
  }
  
  start() {
    this.isRunning = true;
    document.getElementById('toggleBenchmark').textContent = 'Stop';
    this.animate();
  }
  
  stop() {
    this.isRunning = false;
    document.getElementById('toggleBenchmark').textContent = 'Start';
  }
  
  // Create GPU memory pressure with large textures and buffers
  createGPUMemoryPressure() {
    // Create large DataTexture to consume GPU VRAM
    const size = 4096; // 4K texture
    const data = new Uint8Array(size * size * 4);
    
    // Fill with random data to ensure allocation
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.floor(Math.random() * 256);
    }
    
    // Create multiple large textures
    this.largeTextures = [];
    const textureCount = 8; // 8 * (4096*4096*4) = ~512MB GPU memory
    
    for (let i = 0; i < textureCount; i++) {
      const texture = new THREE.DataTexture(
        new Uint8Array(data),
        size,
        size,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
      );
      texture.needsUpdate = true;
      this.largeTextures.push(texture);
    }
    
    // Create large vertex buffers
    this.largeGeometries = [];
    const vertexCount = 1000000; // 1 million vertices
    
    for (let i = 0; i < 4; i++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(vertexCount * 3);
      const colors = new Float32Array(vertexCount * 3);
      const uvs = new Float32Array(vertexCount * 2);
      
      for (let j = 0; j < positions.length; j++) {
        positions[j] = Math.random() * 100 - 50;
      }
      for (let j = 0; j < colors.length; j++) {
        colors[j] = Math.random();
      }
      for (let j = 0; j < uvs.length; j++) {
        uvs[j] = Math.random();
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      
      this.largeGeometries.push(geometry);
    }
    
    // Create multiple render targets for framebuffer memory
    this.renderTargets = [];
    const targetCount = 4;
    
    for (let i = 0; i < targetCount; i++) {
      const target = new THREE.WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight,
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
          stencilBuffer: false
        }
      );
      this.renderTargets.push(target);
    }
    
    console.log('GPU memory pressure created: ~' + (textureCount * 64 + targetCount * 16) + 'MB textures + buffers');
  }
  
  animate() {
    if (!this.isRunning) return;
    
    requestAnimationFrame(() => this.animate());
    
    const now = performance.now();
    const delta = now - this.lastTime;
    
    // Update shader uniforms
    this.material.uniforms.uTime.value = now * 0.001;
    this.material.uniforms.uCameraAngle.value = this.cameraAngle;
    this.material.uniforms.uCameraHeight.value = this.cameraHeight;
    this.material.uniforms.uCameraDistance.value = this.cameraDistance;
    this.material.uniforms.uCameraTarget.value.copy(this.cameraTarget);
    
    // Update stress level
    if (this.stressMode) {
      this.stressLevel = Math.min(this.stressLevel + 0.001, 1.0);
    }
    this.material.uniforms.uStress.value = this.stressLevel;
    
    // Render
    this.renderer.render(this.scene, this.camera);
    
    // Force GPU synchronization - makes benchmark more accurate and stressful
    const gl = this.renderer.getContext();
    gl.finish();
    
    // Calculate FPS
    this.frameCount++;
    if (delta >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.frameTime = Math.round(delta / this.frameCount);
      this.fpsHistory.push(this.fps);
      if (this.fpsHistory.length > 60) this.fpsHistory.shift();
      
      this.frameCount = 0;
      this.lastTime = now;
      
      this.updateStats();
    }
  }
  
  updateStats() {
    // FPS display
    const fpsEl = document.getElementById('fpsValue');
    fpsEl.textContent = this.fps + ' FPS';
    fpsEl.className = 'stat-value ' + (this.fps >= 55 ? 'fps-high' : this.fps >= 30 ? 'fps-med' : 'fps-low');
    
    // Frame time
    document.getElementById('frameTimeValue').textContent = this.frameTime + ' ms';
    
    // RAM usage
    const ramMB = this.getMemoryUsage();
    const ramEl = document.getElementById('ramValue');
    if (ramEl) ramEl.textContent = ramMB + ' MB';
    
    // Resolution
    const dpr = Math.min(window.devicePixelRatio, 2);
    const mult = this.qualitySettings[this.quality];
    const w = Math.floor(window.innerWidth * mult);
    const h = Math.floor(window.innerHeight * mult);
    document.getElementById('resolutionValue').textContent = w + '×' + h + ' (@' + dpr.toFixed(1) + 'x)';
    
    // Rating
    let rating = 'Low';
    let perfClass = 'low';
    if (this.fps >= 55) {
      rating = 'High';
      perfClass = 'high';
    } else if (this.fps >= 30) {
      rating = 'Medium';
      perfClass = 'medium';
    }
    document.getElementById('ratingValue').textContent = rating;
    
    // Performance bar
    const avgFPS = this.fpsHistory.length > 0 
      ? this.fpsHistory.reduce((a,b) => a+b, 0) / this.fpsHistory.length 
      : this.fps;
    const percent = Math.min((avgFPS / 60) * 100, 100);
    document.getElementById('perfFill').style.width = percent + '%';
    document.getElementById('perfFill').className = 'perf-fill ' + perfClass;
  }
  
  async autoDetect() {
    const btn = document.getElementById('autoDetect');
    const originalText = btn.textContent;
    btn.textContent = 'Testing...';
    btn.disabled = true;
    
    // Test each quality level for 1 second
    const qualities = ['low', 'medium', 'high', 'ultra'];
    const results = [];
    
    for (const q of qualities) {
      this.setQuality(q);
      this.fpsHistory = [];
      
      // Wait 1 second to collect data
      await new Promise(r => setTimeout(r, 1000));
      
      const avgFPS = this.fpsHistory.length > 0
        ? this.fpsHistory.reduce((a,b) => a+b, 0) / this.fpsHistory.length
        : this.fps;
      results.push({ quality: q, fps: avgFPS });
    }
    
    // Find best quality that maintains 45+ fps
    let bestQuality = 'low';
    for (const r of results) {
      if (r.fps >= 45) {
        bestQuality = r.quality;
      }
    }
    
    this.setQuality(bestQuality);
    
    // Update UI
    document.querySelectorAll('.quality-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.quality === bestQuality);
    });
    
    btn.textContent = 'Set: ' + bestQuality.charAt(0).toUpperCase() + bestQuality.slice(1);
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
  }
  
  showError(title, message) {
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorOverlay').classList.add('visible');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.neonTunnel = new NeonTunnel();
});
