let timeSpeed = 1.0;
let showTrails = true;
let viewMode = 'perspective';

// Sliders & Buttons
let speedSlider, gravitySlider, trailBtn, viewSelect;

// Textures Look-up Table
let textures = {};

// Celestial Bodies
let sun;
let planets = [];

// Stars background
let starCount = 300;
let starField = [];

function preload() {
  // Load local texture JPEG assets
  textures.sun = loadImage('images/sun.jpg');
  textures.mercury = loadImage('images/mercury.jpg');
  textures.venus = loadImage('images/venus.jpg');
  textures.earth = loadImage('images/earth.jpg');
  textures.mars = loadImage('images/mars.jpg');
  textures.jupiter = loadImage('images/jupiter.jpg');
  textures.saturn = loadImage('images/saturnmap.jpg');
  textures.moon = loadImage('images/moon.jpg');
}

function setup() {
  const holder = document.getElementById('p5-canvas-holder');
  const w = holder ? (holder.clientWidth || 560) : 560;
  let canvasSize = p5.prototype.min(w, 560);
  const canvas = createCanvas(canvasSize, canvasSize, WEBGL);
  canvas.parent('p5-canvas-holder');
  
  // Bind UI controllers
  speedSlider = select('#speedSlider');
  gravitySlider = select('#gravitySlider');
  trailBtn = select('#trailBtn');
  viewSelect = select('#viewSelect');
  
  trailBtn.mousePressed(() => {
    showTrails = !showTrails;
    if (showTrails) {
      trailBtn.addClass('active');
    } else {
      trailBtn.removeClass('active');
      for (let p of planets) p.trail = [];
    }
  });
  
  viewSelect.changed(() => {
    viewMode = viewSelect.value();
  });
  
  // Initialize fixed background space stars in 3D
  for (let i = 0; i < starCount; i++) {
    starField.push(p5.Vector.random3D().mult(random(400, 800)));
  }
  
  // Define central massive star (Sun)
  // Constructor: (mass, size, color, hasRings, textureAsset)
  sun = new CelestialBody(1500, 36, color(45, 95, 100), false, textures.sun);
  
  // Define orbiting planets
  // Constructor: (mass, size, dist, speed, color, hasRings, textureAsset)
  // Distances and speeds are computed to satisfy Keplerian circular orbit velocity: v = sqrt(G * M / r)
  let G_init = 1.5;
  let M_sun = 1500;
  
  // 1. Mercury (Rust Orange)
  planets.push(new CelestialBody(5, 6, 75, calculateOrbitSpeed(G_init, M_sun, 75), color(20, 80, 85), false, textures.mercury));
  
  // 2. Venus (Soft Amber)
  planets.push(new CelestialBody(10, 10, 115, calculateOrbitSpeed(G_init, M_sun, 115), color(40, 60, 90), false, textures.venus));
  
  // 3. Earth (Cyan Blue)
  planets.push(new CelestialBody(12, 11, 160, calculateOrbitSpeed(G_init, M_sun, 160), color(200, 85, 80), false, textures.earth));
  
  // 4. Mars (Red Crimson)
  planets.push(new CelestialBody(8, 8, 205, calculateOrbitSpeed(G_init, M_sun, 205), color(10, 90, 85), false, textures.mars));
  
  // 5. Jupiter (Banded Beige)
  planets.push(new CelestialBody(45, 18, 255, calculateOrbitSpeed(G_init, M_sun, 255), color(35, 45, 75), true, textures.jupiter));
}

function draw() {
  // Clear space background
  background('#07080c');
  
  // 1. Setup lights (WebGL shaders)
  // Ambient glow in deep space
  ambientLight(270, 40, 20);
  
  // Directional backlight to catch sphere curves
  directionalLight(0, 0, 40, 0.5, 0.5, -0.5);
  
  // Intense point light emanating from the Sun's center
  pointLight(45, 20, 100, 0, 0, 0); 
  
  // 2. Configure camera views
  let statsSpan = document.getElementById('canvasStats');
  if (viewMode === 'perspective') {
    // Enable mouse dragging rotation & scrolling zoom in WEBGL
    orbitControl(2, 2, 0.1);
    if (statsSpan) statsSpan.innerHTML = `<i class="fas fa-sync"></i> Camera: Free Orbit | Rendering: 3D WebGL`;
  } else if (viewMode === 'top') {
    // Lock camera above looking down
    camera(0, -500, 1, 0, 0, 0, 0, 0, -1);
    if (statsSpan) statsSpan.innerHTML = `<i class="fas fa-sync"></i> Camera: Heliocentric Top-Down`;
  } else if (viewMode === 'side') {
    // Lock camera in the ecliptic plane looking sideways
    camera(500, 0, 0, 0, 0, 0, 0, -1, 0);
    if (statsSpan) statsSpan.innerHTML = `<i class="fas fa-sync"></i> Camera: Ecliptic Side Profile`;
  }
  
  // 3. Draw starry space background
  drawStarField();
  
  // 4. Update & Draw Sun
  push();
  noStroke();
  emissiveMaterial(45, 20, 100); // Glowing effect
  if (textures.sun) {
    texture(textures.sun);
  } else {
    fill(45, 80, 100);
  }
  rotateY(frameCount * 0.005);
  sphere(sun.size);
  pop();
  
  // 5. Update & Draw orbiting planets
  let dt = (deltaTime / 1000) * (speedSlider ? parseFloat(speedSlider.value()) : 1.0);
  let G = gravitySlider ? parseFloat(gravitySlider.value()) : 1.5;
  
  // Update sidebar slider labels
  let speedVal = document.getElementById('speedVal');
  if (speedVal) speedVal.textContent = (speedSlider ? parseFloat(speedSlider.value()) : 1.0).toFixed(1) + "x";
  
  let gravityVal = document.getElementById('gravityVal');
  if (gravityVal) gravityVal.textContent = G.toFixed(2);
  
  for (let p of planets) {
    p.update(G, sun, dt);
    p.show();
  }
}

function calculateOrbitSpeed(G, M, r) {
  // Keplerian circular velocity formula: v = sqrt(G * M / r)
  return Math.sqrt((G * M) / r);
}

function drawStarField() {
  push();
  stroke(0, 0, 90, 80);
  strokeWeight(1.2);
  for (let s of starField) {
    point(s.x, s.y, s.z);
  }
  pop();
}

// ----------------------------------------------------
// Celestial Body (Planet) Class
// ----------------------------------------------------
class CelestialBody {
  constructor(mass, size, distOrX, ySpeed, colorVal, hasRings, textureAsset) {
    this.mass = mass;
    this.size = size;
    this.color = colorVal;
    this.hasRings = hasRings;
    this.texture = textureAsset;
    
    // Position vector (placed along X axis initially)
    if (ySpeed === undefined) {
      // Sun constructor
      this.pos = createVector(0, 0, 0);
      this.vel = createVector(0, 0, 0);
    } else {
      // Planet constructor
      this.pos = createVector(distOrX, 0, 0);
      // Velocity vector (perpendicular along Y axis in orbital plane)
      this.vel = createVector(0, ySpeed, 0);
    }
    
    this.trail = [];
    this.orbitRotation = random(0, TWO_PI);
  }
  
  update(G, attractor, dt) {
    // 1. Calculate Newtonian gravity force: F = G * M * m / r^2
    let forceVec = p5.Vector.sub(attractor.pos, this.pos);
    let d = forceVec.mag();
    
    if (d > 5) { // Prevent division by zero close to Sun
      let fMag = (G * attractor.mass * this.mass) / (d * d);
      forceVec.normalize().mult(fMag);
      
      // Acceleration vector: a = F / m
      let acc = p5.Vector.div(forceVec, this.mass);
      
      // Euler-Cromer integration step
      this.vel.add(p5.Vector.mult(acc, dt));
      this.pos.add(p5.Vector.mult(this.vel, dt));
    }
    
    // 2. Manage Orbit Trails
    if (showTrails) {
      if (frameCount % 2 === 0) {
        this.trail.push(this.pos.copy());
        if (this.trail.length > 180) {
          this.trail.shift();
        }
      }
    }
    
    this.orbitRotation += 0.01;
  }
  
  show() {
    push();
    
    // 1. Draw Orbit Trails
    if (showTrails && this.trail.length > 1) {
      noFill();
      stroke(this.color);
      strokeWeight(0.8);
      beginShape();
      for (let pos of this.trail) {
        vertex(pos.x, pos.y, pos.z);
      }
      endShape();
    }
    
    // 2. Draw Planet Sphere
    translate(this.pos.x, this.pos.y, this.pos.z);
    rotateY(this.orbitRotation);
    
    noStroke();
    
    if (this.texture) {
      texture(this.texture);
    } else {
      fill(this.color);
      specularMaterial(this.color);
      shininess(12);
    }
    sphere(this.size);
    
    // 3. Draw Earth's Moon Sub-orbit (if this body is Earth)
    if (this.texture === textures.earth) {
      push();
      // Orbiting angle
      let moonAngle = frameCount * 0.03;
      let mDist = 20;
      translate(mDist * cos(moonAngle), 0, mDist * sin(moonAngle));
      
      if (textures.moon) {
        texture(textures.moon);
      } else {
        fill(0, 0, 75);
        specularMaterial(0, 0, 75);
      }
      sphere(this.size * 0.35); // Moon is ~35% size of Earth
      pop();
    }
    
    // 4. Draw Planet Rings (if applicable, e.g., Saturn)
    if (this.hasRings) {
      push();
      // Tilt the rings slightly
      rotateX(PI / 2.5);
      stroke(this.color);
      strokeWeight(2.5);
      noFill();
      // Rings drawn as concentric circles
      ellipse(0, 0, this.size * 2.8, this.size * 2.8);
      ellipse(0, 0, this.size * 3.3, this.size * 3.3);
      pop();
    }
    
    pop();
  }
}
