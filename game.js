var ships = [];
var frameNum = 0;
var slowDown = false;
function updateGame(elapsedTime) {
  frameNum++;
  
  for (var i = 0; i < lavaWaves.length; i++) {
    lavaWaves[i].update(elapsedTime);
  }
  for (var i = 0; i < ships.length; i++) {
    ships[i].update(elapsedTime);
  }
  player.update(elapsedTime);
}

function setupGame() {
  modelInstances = [];
  lavaPanels = [];
  lavaWaves = [];
  ships = [];
  for (var i = 0; i < NUM_WAVES - 13; i++) {
    lavaWaves.push(new TinyWave());
  }
  for (var i = 0; i < 13; i++) {
    lavaWaves.push(new Wave());
  }

  for (i = 0; i < 10; i++) {
    for (var j = 0; j < 10; j++) {
      ships.push(new Ship(0.0 + j * 0.2, 0.0, -1 + i * 0.1));
    }
  }
  player = new Ship(0.5, 0.5, 0.0);
  
  
  
  loadLava();
}

function main() {
  setupWebGL(); // set up the webGL environment
  //loadModels(); // load in the models from tri file
  loadResources();
  setupShaders(); // setup the webGL shaders
  setupGame();
  renderModels(); // draw the triangles using webGL
} // end main
