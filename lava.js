const NUM_WAVES = 400;
const STEPS_PER_DIM = 200;
const LAVA_WIDTH = 8.0;
const LAVA_DEPTH = 3.0;
const LAVA_MIN_X = defaultEye[0] - 0.5 * LAVA_WIDTH;
const LAVA_MAX_X = LAVA_MIN_X + LAVA_WIDTH;
const LAVA_MIN_Z = defaultEye[2] - 0.5 * LAVA_DEPTH - 1.0;
const LAVA_MAX_Z = LAVA_MIN_Z + LAVA_DEPTH;

const VIEW_MIN_DEPTH = defaultEye[0];
const VIEW_MAX_DEPTH = LAVA_DEPTH;
const VIEW_WIDTH_MIN_DELTA = 1.0;
const VIEW_WIDTH_MAX_DELTA = 4.0;

// Lava shader parameters
var lavaVPosAttribLoc;
var lavaEyePositionULoc;
var lavaVNormAttribLoc;
var lavaMMatrixULoc;
var lavaPVMMatrixULoc;
var lavaLightPositionULoc;
var lavaAmbientULoc;
var lavaDiffuseULoc;
var lavaSpecularULoc;
var lavaShininessULoc;
var Lava_Blinn_PhongULoc;
var lavaTexToggleUniform;
var lavaAlphaUniform;
var wavePosUniform;
var lavaSinValueUniform;

var waveRotationUniform;
var waveLengthUniform;
var waveWidthUniform;

var lavaTexture1;
var lavaTexture2;
var heightTexture;
var sinValue;

function pickRandomPointInView(position) {
  var z = LAVA_MAX_Z - (Math.random() * LAVA_DEPTH);
  var slope = (VIEW_WIDTH_MIN_DELTA - VIEW_WIDTH_MAX_DELTA) / LAVA_DEPTH;
  var minX = (defaultEye[0] - VIEW_MIN_DEPTH) - slope * z;
  var range = Math.abs(defaultEye[0] - minX) * 2;
  var x = minX + (Math.random() * range);
  vec3.set(position, x, 0.0, z);
}

function TinyWave() {
  this.position = vec3.fromValues(0.5, 0.0, -0.5);

  this.length;
  this.width;
  this.rotation;
  this.defHeight;
  this.defWidth;
  this.defLength;
  this.height;
  this.offset = Math.floor(Math.random() * 360) * Math.PI * 2.0;
  
  this.update = function(timePassed) {
    var sinV = Math.sin((sinValue + this.offset) / 30.0);
    this.height = this.defHeight * sinV;
    this.width = this.defHeight + 0.1 * this.height;
    this.length = this.defLength + 0.1 * this.height;
    
    if ((this.height >= -0.01 && this.height <= 0.01) && Math.random() > 0.1) {
      this.randomize();
    }
  }
  this.randomize = function() {
    //this.position[0] = (LAVA_MAX_X - LAVA_MIN_X) * Math.random() + LAVA_MIN_X;
    //this.position[2] = (LAVA_MAX_Z - LAVA_MIN_Z) * Math.random() + LAVA_MIN_Z;
    pickRandomPointInView(this.position);
    this.defHeight = 0.2 + Math.random() * 0.1;
    this.width = 0.1 + Math.random() * 0.1;
    this.defWidth = this.width;
    this.length = 0.1 + 0.1 * Math.random();
    this.defLength = this.length;
    this.rotation = Math.PI * 2 * Math.random();
  }
  this.randomize();
}

function Bubble() {
  this.position = vec3.fromValues(0.5, 0.0, -0.5);

  this.length;
  this.width;
  this.rotation;
  this.defHeight;
  this.defWidth;
  this.defLength;
  this.height;
  this.offset = Math.random() * Math.PI * 2.0;
  
  this.update = function(timePassed) {
    this.height = this.defHeight * Math.sin((sinValue + this.offset));
    this.width = Math.abs(this.height) / 2;
    this.length = Math.abs(this.height) / 2;
    
    if ((this.height >= -0.005 && this.height <= 0.005) && Math.random() > 0.2) {
      this.randomize();
    }
  }
  this.randomize = function() {
    this.position[0] = (LAVA_MAX_X - LAVA_MIN_X) * Math.random() + LAVA_MIN_X;
    this.position[2] = (LAVA_MAX_Z - LAVA_MIN_Z) * Math.random() + LAVA_MIN_Z;
    
    this.defHeight = 0.1 + Math.random() * 0.1;
    this.width = 0.1 + Math.random() * 0.1;
    this.defWidth = this.width;
    this.length = 0.1 + 0.1 * Math.random();
    this.defLength = this.length;
    this.rotation = Math.PI * 2 * Math.random();
  }
  this.randomize();
}

function Wave() {
  this.direction = vec3.create();
  this.position = vec3.create();
  this.velocity = vec3.create();
  
  this.initialize = function() {
    this.speed = (0.005 * Math.random() + 0.005) / 30.0;
    this.height = 0.3 + Math.random() * 0.1;
    this.length = 0.1 + Math.random() * 0.1;
    this.width = Math.random() / 2.0 + this.length;
    this.defHeight = this.height;
    this.offset = Math.floor(Math.random() * 360);
    
    var coinFlip = Math.random() > 0.5;
    var x, xDir;
    var z, zDir;
    if (coinFlip) {
        x = -0.6 - this.width;
        xDir = 1;
    }
    else {
      x = 1.6 - this.width;
      xDir = -1;
    }
    coinFlip = Math.random() > 0.5;
    if (coinFlip) {
        z = 0.2 + this.width;
        zDir = -1;
    }
    else {
      z = -1.7 - this.width;
      zDir = 1;
    }
    
    
    this.position = vec3.fromValues(x, 0.0, z);
    vec3.normalize(this.direction, vec3.fromValues(( 0.1 + Math.random()) * xDir, 0.0, (0.1 + Math.random())* zDir));
    //vec3.scale(this.velocity, this.direction, this.speed);
    this.rotation = Math.atan2(-this.direction[0], this.direction[2]);
  }
  
  this.update = function(timePassed) {
    var temp = vec3.create();
    this.height = this.defHeight + this.defHeight * Math.sin(Date.now() / 10 % 360 * Math.PI / 180 + this.offset);
    vec3.scale(temp, this.direction, this.speed *timePassed);
    vec3.add(this.position, this.position, temp);
    
    var xOut = (this.position[0] + this.width < -0.6 || this.position[0] - this.width > 1.6);
    var zOut = (this.position[2] - this.width > 0.2 || this.position[2] + this.width < -1.7);
    
    if (xOut && zOut) {
      this.initialize();
    }
  }
  
  this.initialize();
}

function getWaveWidths() {
  return getWaveValueArray("width");
}

function getWaveLengths() {
  return getWaveValueArray("length");
}

function getWaveRotations() {
  return getWaveValueArray("rotation");
}
function getWavePositionArray() {
  var arr = [];
  for (var i = 0; i < lavaWaves.length; i++) {
    var p = lavaWaves[i].position;
    arr.push(p[0], lavaWaves[i].height, p[2]);
  }
  return arr;
}

function getWaveValueArray(name) {
  var arr = [];
  for (var i = 0; i < lavaWaves.length; i++) {
    arr.push(lavaWaves[i][name]);
  }
  return arr;
}

function getHeightOfLava(pos) {

  var idleChange = 0.0;
  var heightChange = 0.0;
  var shortHeight = 0.0;
  
  for (var i = 0; i < NUM_WAVES; i++) {
    var waveHeight = lavaWaves[i].height;
    var dx = pos[0] - lavaWaves[i].position[0];
    var dz = pos[2] - lavaWaves[i].position[2];
    
    var cosT = Math.cos(lavaWaves[i].rotation);
    var sinT = Math.sin(lavaWaves[i].rotation);
    
    var x = cosT * dx + sinT * dz;
    var z = -1.0 * sinT * dx + cosT * dz;
    
    var insideSqrt = 1.0 - x * x / (lavaWaves[i].width * lavaWaves[i].width) - z * z / (lavaWaves[i].length * lavaWaves[i].length);
    
    if (insideSqrt >= 0.0) {
      var y = waveHeight * waveHeight * Math.sqrt(insideSqrt);
      y = Math.sign(waveHeight) * y;
      heightChange += y;
    }
    
  }
  
  return heightChange;
}

function loadLava() {
  lavaPanels = [];
  /**for (var z = -31; z < 1; z++) {
    for (var x = -10; x < 31; x++) {
      lavaPanels.push(createModelInstance("panel", x / 20.0, 0.0, z / 20.0, true));
    }
  }*/
  var zMin = LAVA_MIN_Z;
  var zMax = LAVA_MAX_Z;
  var xMin = LAVA_MIN_X;
  var xMax = LAVA_MAX_X;
  
  const xStep = (xMax - xMin) / STEPS_PER_DIM;
  const zStep = (zMax - zMin) / STEPS_PER_DIM;
  
  var vertices = [];
  
  for (var z = zMin; z < zMax; z+=zStep) {
    for (var x = xMin; x < xMax; x+=xStep) {

     vertices.push([x, 0.0, z]);
    }
  }
  var depth = 0;
  var width;
  var triangles = [];
  for (var z = 0; z < STEPS_PER_DIM - 1; z++) {
    depth++;
    width = 0;
    for (var x = 0; x < STEPS_PER_DIM - 1; x++) {
      width++;
      var vNum = STEPS_PER_DIM * z + x;
      var p1 = vNum;
      var p2 = vNum + STEPS_PER_DIM;
      var p3 = vNum + STEPS_PER_DIM + 1;
      var p4 = vNum + 1;
      triangles.push([p1, p2, p3], [p1, p4, p3]);
    }
  }
  console.log(depth + " vertices deep and " + width + " vertices wide");
  var UVs = [];
  var normals = [];
  
  for (var i = 0; i < vertices.length; i++) {
    UVs.push([0, 0]);
    normals.push([0, 1, 0]);
  }
  

  
  var lava = {};
  lava.scaling = vec3.fromValues(1, 1, 1);
  vec3.normalize(lava.scaling, lava.scaling);
  lava.translation = vec3.fromValues(0, 0, 0);
  lava.yAxis = vec3.fromValues(0, 1, 0);
  lava.xAxis = vec3.fromValues(1, 0, 0);
  lava.vertices = vertices;
  lava.triangles = triangles;
  lava.normals = normals;
  lava.uvs = UVs;
  lava.material = {"ambient": [0.1,0.1,0.1], "diffuse": [0.6,0.6,0.6], "specular": [0.3,0.3,0.3], "n": 11, "alpha": 0.9, "texture": "lava.png"};
  loadModel(lava);
  lavaPanels.push(lava);
  
  if (lavaTexture1 == undefined) {
    lavaTexture1 = addTexture(BASE_URL + "textures/" + "lava7.jpg");
  }
  if (lavaTexture2 == undefined) {
    lavaTexture2 = addTexture(BASE_URL + "textures/" + "lava3.jpg");
  }
  
  /**heightTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, heightTexture);
  
  const level = 0;
  const internalFormat = gl.ALPHA;
  const border = 0;
  const format = gl.ALPHA;
  const type = gl.FLOAT;
  const data = null;
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border,
                format, type, data);
 
  // set the filtering so we don't need mips
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  */
  
}
