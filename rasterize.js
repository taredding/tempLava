/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
var INPUT_TRIANGLES_URL = "http://127.0.0.1/CG_PROG_5/models.json"; // triangles file loc
var BASE_URL = "http://127.0.0.1/CG_PROG_5/";

//INPUT_TRIANGLES_URL = "https://taredding.github.io/Snake3D/models.json"; // triangles file loc
//BASE_URL = "https://taredding.github.io/Snake3D/";

var defaultEye = vec3.fromValues(0.5,0.5,-0.5); // default eye position in world space
var defaultCenter = vec3.fromValues(0.5,0.5,0.5); // default view direction in world space
var defaultUp = vec3.fromValues(0,1,0); // default view up vector
var lightAmbient = vec3.fromValues(0.75,0.75,0.75); // default light ambient emission
var lightDiffuse = vec3.fromValues(0.5,0.5,0.5); // default light diffuse emission
var lightSpecular = vec3.fromValues(0.5,0.5,0.5); // default light specular emission
var lightPosition = vec3.fromValues(0.5,0.9,-.9); // default light position
var rotateTheta = Math.PI/50; // how much to rotate models by with each key press
var Blinn_Phong = true;
/* webgl and geometry data */
var gl = null; // the all powerful gl object. It's all here folks!
var inputTriangles = []; // the triangle data as loaded from input files
var numTriangleSets = 0; // how many triangle sets in input scene
var inputEllipsoids = []; // the ellipsoid data as loaded from input files
var numEllipsoids = 0; // how many ellipsoids in the input scene
var vertexBuffers = []; // this contains vertex coordinate lists by set, in triples
var normalBuffers = []; // this contains normal component lists by set, in triples
var triSetSizes = []; // this contains the size of each triangle set
var triangleBuffers = []; // lists of indices into vertexBuffers by set, in triples
var viewDelta = -.05; // how much to displace view with each key press

/* shader parameter locations */
var vPosAttribLoc; // where to put position for vertex shader
var mMatrixULoc; // where to put model matrix for vertex shader
var pvmMatrixULoc; // where to put project model view matrix for vertex shader
var ambientULoc; // where to put ambient reflecivity for fragment shader
var diffuseULoc; // where to put diffuse reflecivity for fragment shader
var specularULoc; // where to put specular reflecivity for fragment shader
var shininessULoc; // where to put specular exponent for fragment shader
var Blinn_PhongULoc;
var muted = true;
var uvAttrib;

/* interaction variables */
var Eye = vec3.clone(defaultEye); // eye position in world space
var Center = vec3.clone(defaultCenter); // view direction in world space
var Up = vec3.clone(defaultUp); // view up vector in world space

var textures = [];
var uvBuffers = [];
var texToggleUniform;
var texToggle = false;

var alphaUniform;

var modelInstances = [];
var grid;

var snakeHead;
var player2;
var enemyHead;
var apple;
var gameover;
var p2Win;
var p1Win;
var isGameOver = false;

var now,delta,then = Date.now();
var interval = 1000/30;
var counter = 0;

var is2Player = false;

var audio_eat = new Audio('audio/bite.wav');
audio_eat.muted = true;

var audio_bump = new Audio('audio/die.wav');
audio_bump.volume = 0.5;
audio_bump.muted = true;

var music = new Audio('audio/music.mp3');
music.volume = 0.1;
music.loop = true;
music.muted = true;

var audio_clock = new Audio('audio/clock.wav');
audio_clock.muted = true;

audio_pup = new Audio('audio/powerup.wav');
audio_pup.muted = true;

audio_pdown = new Audio('audio/powerdown.wav');
audio_pdown.muted = true;

audio_explode = new Audio('audio/explode.wav');
audio_explode.muted = true;

const TIME_PER_UPDATE = Math.floor(1000.0 / 60);


var p1Score = 0;
var p2Score = 0;

var score1Multiplier = 1;
var score2Multiplier = 1;
var scoremult;

var dynamicCamera = false;

var timers = [];

var lightPositionULoc;

const DEF_MOVE_FRAME = 4;
var MOVE_FRAME = DEF_MOVE_FRAME;
var SLITHER_RESET_FRAME = 10;
var gameSpeed = 1.0;
var speedSlider = document.getElementById("speed");
var fpsIndicator = document.getElementById("fps");
var fpsIndicatorSmooth = document.getElementById("fpsSmooth");

var gameUpdateIndicator = document.getElementById("gameLogicTime");
var renderUpdateIndicator = document.getElementById("renderTime");

var isP1Win;
var isP2Win;

    // set up needed view params
    var lookAt = vec3.create(), viewRight = vec3.create(), temp = vec3.create(); // lookat, right & temp vectors
    lookAt = vec3.normalize(lookAt,vec3.subtract(temp,Center,Eye)); // get lookat vector
    viewRight = vec3.normalize(viewRight,vec3.cross(temp,lookAt,Up)); // get view right vector

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input json file

// does stuff when keys are pressed
function handleKeyDown(event) {
    
    const modelEnum = {TRIANGLES: "triangles", ELLIPSOID: "ellipsoid"}; // enumerated model type
    const dirEnum = {NEGATIVE: -1, POSITIVE: 1}; // enumerated rotation direction
    
    function highlightModel(modelType,whichModel) {
        if (handleKeyDown.modelOn != null)
            handleKeyDown.modelOn.on = false;
        handleKeyDown.whichOn = whichModel;
        if (modelType == modelEnum.TRIANGLES)
            handleKeyDown.modelOn = modelInstances[whichModel]; 
        else
            handleKeyDown.modelOn = inputEllipsoids[whichModel]; 
        handleKeyDown.modelOn.on = true; 
    } // end highlight model
    
    function translateModel(offset) {
        if (handleKeyDown.modelOn != null)
            vec3.add(handleKeyDown.modelOn.translation,handleKeyDown.modelOn.translation,offset);
    } // end translate model

    function rotateModel(axis,direction) {
        if (handleKeyDown.modelOn != null) {
            var newRotation = mat4.create();

            mat4.fromRotation(newRotation,direction*rotateTheta,axis); // get a rotation matrix around passed axis
            vec3.transformMat4(handleKeyDown.modelOn.xAxis,handleKeyDown.modelOn.xAxis,newRotation); // rotate model x axis tip
            vec3.transformMat4(handleKeyDown.modelOn.yAxis,handleKeyDown.modelOn.yAxis,newRotation); // rotate model y axis tip
        } // end if there is a highlighted model
    } // end rotate model
    

    
    // highlight static variables
    handleKeyDown.whichOn = handleKeyDown.whichOn == undefined ? -1 : handleKeyDown.whichOn; // nothing selected initially
    handleKeyDown.modelOn = handleKeyDown.modelOn == undefined ? null : handleKeyDown.modelOn; // nothing selected initially

    switch (event.code) {
        
        // model selection
        case "Space": 
            if (handleKeyDown.modelOn != null)
                handleKeyDown.modelOn.on = false; // turn off highlighted model
            handleKeyDown.modelOn = null; // no highlighted model
            handleKeyDown.whichOn = -1; // nothing highlighted
            break;
        case "ArrowRight":
            snakeHead.bufferHeadAction(3);
            break;
        case "ArrowLeft":
            snakeHead.bufferHeadAction(1);
            break;
        case "ArrowUp":
            snakeHead.bufferHeadAction(0);
            break;        
        case "ArrowDown":
            snakeHead.bufferHeadAction(2);
            break;
        case "KeyH":
            player2.bufferHeadAction(3);
            break;
        case "KeyF":
            player2.bufferHeadAction(1);
            break;
        case "KeyT":
            player2.bufferHeadAction(0);
            break;        
        case "KeyG":
            player2.bufferHeadAction(2);
            break;
        case "KeyC":
            dynamicCamera = !dynamicCamera;
            if (!dynamicCamera) {
              Center = vec3.clone(defaultCenter);
              Eye = vec3.clone(defaultEye);
            }
            break;
        case "KeyM":
          muted = !muted;
          music.muted = muted;
          audio_eat.muted = muted;
          audio_bump.muted = muted;
          audio_clock.muted = muted;
          audio_pup.muted = muted;
          audio_pdown.muted = muted;
          audio_explode.muted = muted;
          if (muted == false) {
            music.play();
          }
          break;
            
        // view change
        case "KeyA": // translate view left, rotate left with shift
            Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,viewDelta));
            if (!event.getModifierState("Shift"))
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,viewDelta));
            break;
        case "KeyD": // translate view right, rotate right with shift
            Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,-viewDelta));
            if (!event.getModifierState("Shift"))
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,-viewDelta));
            break;
        case "KeyS": // translate view backward, rotate up with shift
            if (event.getModifierState("Shift")) {
                Center = vec3.add(Center,Center,vec3.scale(temp,Up,viewDelta));
                Up = vec3.cross(Up,viewRight,vec3.subtract(lookAt,Center,Eye)); /* global side effect */
            } else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,-viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,-viewDelta));
            } // end if shift not pressed
            break;
        case "KeyW": // translate view forward, rotate down with shift
            if (event.getModifierState("Shift")) {
                Center = vec3.add(Center,Center,vec3.scale(temp,Up,-viewDelta));
                Up = vec3.cross(Up,viewRight,vec3.subtract(lookAt,Center,Eye)); /* global side effect */
            } else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,viewDelta));
            } // end if shift not pressed
            break;
        case "KeyQ": // translate view up, rotate counterclockwise with shift
            if (event.getModifierState("Shift"))
                Up = vec3.normalize(Up,vec3.add(Up,Up,vec3.scale(temp,viewRight,-viewDelta)));
            else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,Up,viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,Up,viewDelta));
            } // end if shift not pressed
            break;
        case "KeyE": // translate view down, rotate clockwise with shift
            if (event.getModifierState("Shift"))
                Up = vec3.normalize(Up,vec3.add(Up,Up,vec3.scale(temp,viewRight,viewDelta)));
            else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,Up,-viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,Up,-viewDelta));
            } // end if shift not pressed
            break;
        case "KeyB":
            if (!event.getModifierState("Shift"))
                texToggle = !texToggle;
            break;
        case "Escape": // reset view to default
            is2Player = false;
            setUpBoard();
            break;
        case "KeyR": // reset view to default
            is2Player = true;
            setUpBoard();
            break;
            
        // model transformation
        case "KeyK": // translate left, rotate left with shift
            if (event.getModifierState("Shift"))
                rotateModel(Up,dirEnum.NEGATIVE);
            else
                translateModel(vec3.scale(temp,viewRight,viewDelta));
            break;
        case "Semicolon": // translate right, rotate right with shift
            if (event.getModifierState("Shift"))
                rotateModel(Up,dirEnum.POSITIVE);
            else
                translateModel(vec3.scale(temp,viewRight,-viewDelta));
            break;
        case "KeyL": // translate backward, rotate up with shift
            if (event.getModifierState("Shift"))
                rotateModel(viewRight,dirEnum.POSITIVE);
            else
                translateModel(vec3.scale(temp,lookAt,-viewDelta));
            break;
        case "KeyO": // translate forward, rotate down with shift
            if (event.getModifierState("Shift"))
                rotateModel(viewRight,dirEnum.NEGATIVE);
            else
                translateModel(vec3.scale(temp,lookAt,viewDelta));
            break;
        case "KeyI": // translate up, rotate counterclockwise with shift 
            if (event.getModifierState("Shift"))
                rotateModel(lookAt,dirEnum.POSITIVE);
            else
                translateModel(vec3.scale(temp,Up,viewDelta));
            break;
        case "KeyP": // translate down, rotate clockwise with shift
            if (event.getModifierState("Shift"))
                rotateModel(lookAt,dirEnum.NEGATIVE);
            else
                translateModel(vec3.scale(temp,Up,-viewDelta));
            break;
        case "KeyB":
        		Blinn_Phong = !Blinn_Phong;
        	break;
        case "KeyN":
        		handleKeyDown.modelOn.material.n = (handleKeyDown.modelOn.material.n + 1)%20;
        		console.log(handleKeyDown.modelOn.material.n);
        	break;
        case "Numpad1":
        		vec3.add(handleKeyDown.modelOn.material.ambient, handleKeyDown.modelOn.material.ambient, vec3.fromValues(0.1,0.1,0.1));
        		if(handleKeyDown.modelOn.material.ambient[0] > 1.0)
        			handleKeyDown.modelOn.material.ambient[0] = 0;
        		if(handleKeyDown.modelOn.material.ambient[1] > 1.0)
        			handleKeyDown.modelOn.material.ambient[1] = 0;
        		if(handleKeyDown.modelOn.material.ambient[2] > 1.0)
        			handleKeyDown.modelOn.material.ambient[2] = 0;
        		console.log(handleKeyDown.modelOn.material.ambient);
        	break;
        case "Numpad2":        		 
        		vec3.add(handleKeyDown.modelOn.material.diffuse, handleKeyDown.modelOn.material.diffuse, vec3.fromValues(0.1,0.1,0.1));
        		if(handleKeyDown.modelOn.material.diffuse[0] > 1.0)
        			handleKeyDown.modelOn.material.diffuse[0] = 0;
        		if(handleKeyDown.modelOn.material.diffuse[1] > 1.0)
        			handleKeyDown.modelOn.material.diffuse[1] = 0;
        		if(handleKeyDown.modelOn.material.diffuse[2] > 1.0)
        			handleKeyDown.modelOn.material.diffuse[2] = 0;
        		console.log(handleKeyDown.modelOn.material.diffuse);
        	break;
         case "Numpad3":        		 
        		vec3.add(handleKeyDown.modelOn.material.specular, handleKeyDown.modelOn.material.specular, vec3.fromValues(0.1,0.1,0.1));
        		if(handleKeyDown.modelOn.material.specular[0] > 1.0)
        			handleKeyDown.modelOn.material.specular[0] = 0;
        		if(handleKeyDown.modelOn.material.specular[1] > 1.0)
        			handleKeyDown.modelOn.material.specular[1] = 0;
        		if(handleKeyDown.modelOn.material.specular[2] > 1.0)
        			handleKeyDown.modelOn.material.specular[2] = 0;
        		console.log(handleKeyDown.modelOn.material.specular);
        	break;
        case "Backspace": // reset model transforms to default
            for (var whichTriSet=0; whichTriSet<numTriangleSets; whichTriSet++) {
                vec3.set(modelInstances[whichTriSet].translation,0,0,0);
                vec3.set(modelInstances[whichTriSet].xAxis,1,0,0);
                vec3.set(modelInstances[whichTriSet].yAxis,0,1,0);
            } // end for all triangle sets
            for (var whichEllipsoid=0; whichEllipsoid<numEllipsoids; whichEllipsoid++) {
                vec3.set(inputEllipsoids[whichEllipsoid].translation,0,0,0);
                vec3.set(inputEllipsoids[whichTriSet].xAxis,1,0,0);
                vec3.set(inputEllipsoids[whichTriSet].yAxis,0,1,0);
            } // end for all ellipsoids
            break;
    } // end switch
} // end handleKeyDown

// set up the webGL environment
function setupWebGL() {
    
    // Set up keys
    document.onkeydown = handleKeyDown; // call this when key pressed
    
     // create a webgl canvas and set it up
     var webGLCanvas = document.getElementById("myWebGLCanvas"); // create a webgl canvas
     gl = webGLCanvas.getContext("webgl"); // get a webgl object from it
     try {
       if (gl == null) {
         throw "unable to create gl context -- is your browser gl ready?";
       } else {
         //gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
         gl.clearDepth(1.0); // use max when we clear the depth buffer
         gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
       }
     } // end try
     
    
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL

// read models in, load them into webgl buffers
function loadModel(model) {

    
    

    try {
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var vtxToAdd; // vtx coords to add to the coord array
        var normToAdd; // vtx normal to add to the coord array
        var triToAdd; // tri indices to add to the index array
        var maxCorner = vec3.fromValues(Number.MIN_VALUE,Number.MIN_VALUE,Number.MIN_VALUE); // bbox corner
        var minCorner = vec3.fromValues(Number.MAX_VALUE,Number.MAX_VALUE,Number.MAX_VALUE); // other corner
        var whichSet = inputTriangles.length;
        inputTriangles.push(model);
        inputTriangles[whichSet].textureNumber = whichSet;
        inputTriangles[whichSet].realTextureNumber = whichSet;
        inputTriangles[whichSet].instanceNumber = whichSet;
        
        // set up hilighting, modeling translation and rotation
        inputTriangles[whichSet].center = vec3.fromValues(0,0,0);  // center point of tri set
        inputTriangles[whichSet].on = false; // not highlighted
        inputTriangles[whichSet].translation = vec3.fromValues(0,0,0); // no translation
        inputTriangles[whichSet].xAxis = vec3.fromValues(1,0,0); // model X axis
        inputTriangles[whichSet].yAxis = vec3.fromValues(0,1,0); // model Y axis 

        // set up the vertex and normal arrays, define model center and axes
        inputTriangles[whichSet].glVertices = []; // flat coord list for webgl
        inputTriangles[whichSet].glNormals = []; // flat normal list for webgl
        
        inputTriangles[whichSet].gluvs = [];
        
        var numVerts = inputTriangles[whichSet].vertices.length; // num vertices in tri set
        for (whichSetVert=0; whichSetVert<numVerts; whichSetVert++) { // verts in set
            vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert]; // get vertex to add
            normToAdd = inputTriangles[whichSet].normals[whichSetVert]; // get normal to add
            
            uvsToAdd = inputTriangles[whichSet].uvs[whichSetVert];
            
            inputTriangles[whichSet].glVertices.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]); // put coords in set coord list
            inputTriangles[whichSet].glNormals.push(normToAdd[0],normToAdd[1],normToAdd[2]); // put normal in set coord list
            
            inputTriangles[whichSet].gluvs.push(uvsToAdd[0], uvsToAdd[1]);
            
            vec3.max(maxCorner,maxCorner,vtxToAdd); // update world bounding box corner maxima
            vec3.min(minCorner,minCorner,vtxToAdd); // update world bounding box corner minima
            vec3.add(inputTriangles[whichSet].center,inputTriangles[whichSet].center,vtxToAdd); // add to ctr sum
        } // end for vertices in set
        vec3.scale(inputTriangles[whichSet].center,inputTriangles[whichSet].center,1/numVerts); // avg ctr sum

        // send the vertex coords and normals to webGL
        vertexBuffers[whichSet] = gl.createBuffer(); // init empty webgl set vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichSet]); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].glVertices),gl.STATIC_DRAW); // data in
        normalBuffers[whichSet] = gl.createBuffer(); // init empty webgl set normal component buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[whichSet]); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].glNormals),gl.STATIC_DRAW); // data in
        
        uvBuffers.push(gl.createBuffer());
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffers[whichSet]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[whichSet].gluvs), gl.STATIC_DRAW);
        
        // set up the triangle index array, adjusting indices across sets
        inputTriangles[whichSet].glTriangles = []; // flat index list for webgl
        triSetSizes[whichSet] = inputTriangles[whichSet].triangles.length; // number of tris in this set
        for (whichSetTri=0; whichSetTri<triSetSizes[whichSet]; whichSetTri++) {
            triToAdd = inputTriangles[whichSet].triangles[whichSetTri]; // get tri to add
            inputTriangles[whichSet].glTriangles.push(triToAdd[0],triToAdd[1],triToAdd[2]); // put indices in set list
        } // end for triangles in set

        // send the triangle indices to webGL
        triangleBuffers.push(gl.createBuffer()); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichSet]); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(inputTriangles[whichSet].glTriangles),gl.STATIC_DRAW); // data in
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end load models
function createModelInstance(name, i, j) {
  var loc = vec3.create();
  if (i == undefined || j == undefined) {
    loc = vec3.fromValues(0.0, 0.0, 0.0);
  }
  else {
    gridToCoord(loc, i, j);
  }
  var oldSet = getModelByName(name);
  var set = Object.assign({}, oldSet);
  var nextLen = modelInstances.length;
  set.instanceNumber = nextLen;
  set.translation = loc;
  set.material = Object.assign({}, oldSet.material);
  set.material.ambient = oldSet.material.ambient.slice();
  set.material.diffuse = oldSet.material.diffuse.slice();
  set.material.specular = oldSet.material.specular.slice();
  set.yAxis = vec3.fromValues(0, 1, 0);
  set.xAxis = vec3.fromValues(1, 0, 0);
  set.scaling = vec3.clone(set.scaling);
  modelInstances.push(set);
  numTriangleSets = modelInstances.length;
  return set;
}

function scaleModel(model, x, y, z) {
  vec3.set(model.scaling, x * model.scaling[0], y * model.scaling[1], z * model.scaling [2]);
}
function scaleUniform(model, val) {
  scaleModel(model, val, val, val);
}
function rotateY (model, amount) {
  var rotato = mat4.create();
  mat4.fromRotation(rotato, amount, vec3.fromValues(0, 0, 1));
  vec3.transformMat4(model.yAxis, model.yAxis, rotato);
  vec3.transformMat4(model.xAxis,model.xAxis, rotato);
}
// get the file from the passed URL
function getFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return httpReq.response; 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input json file


function setUpBoard() {
  score1Multiplier = 1;
  score2Multiplier = 1;
  slowDown = false;
  isP1Win = false;
  isP2Win = false;

  MOVE_FRAME = 15;
  SLITHER_RESET_FRAME = 13;
  gameSpeed = DEF_MOVE_FRAME / MOVE_FRAME;
  expP1Seg = null;
  expP2Seg = null;
  for (var i = 0; i < timers.length; i++) {
    clearTimeout(timers[i]);
  }
  isGameOver = false;
  player2 = null;
  enemyHead = null;
  modelInstances = [];
  p1Score = 0;
  p2Score = 0;
  updateScore();
  // Load Background
  var temp = createModelInstance("background");
  vec3.set(temp.translation, 0.5, 0.5, 0.1);
  scaleUniform(temp, 1.0 / 0.025);
  
  gameover = createModelInstance("gameover");
  p1Win = createModelInstance("p1Win");
  p2Win = createModelInstance("p2Win");
  gameover.translation = vec3.fromValues(0.25, 0.4, 0.0);
  gameover.material.alpha = 0.0;
  p1Win.translation = vec3.fromValues(0.25, 0.4, 0.0);
  p1Win.material.alpha = 0.0;
  p2Win.translation = vec3.fromValues(0.25, 0.4, 0.0);
  p2Win.material.alpha = 0.0;
  grid = [];
  for (var i = 0; i < GRID_WIDTH; i++) {
    grid.push([]);
    for (var j = 0; j < GRID_HEIGHT; j++) {
      var wall = null;
      if (i == 0 || j == 0 || i == GRID_WIDTH - 1 || j == GRID_WIDTH - 1) {
        wall = "wall";
        var next = createModelInstance("wall", i, j);
        
        var ambFlex = -0.6 + (Math.random());
        next.material.ambient[0] += ambFlex / 2.0;
        next.material.ambient[1] += ambFlex / 2.0;
        next.material.ambient[2] += ambFlex / 2.0;
        next.material.diffuse[0] += ambFlex;
        next.material.diffuse[1] += ambFlex;
        next.material.diffuse[2] += ambFlex;
        next.material.specular[0] += ambFlex;
        next.material.specular[1] += ambFlex;
        next.material.specular[2] += ambFlex;
        var rand = Math.random()/15.0;
        next.translation[2] += rand;
        if (i == 0 || i == GRID_WIDTH - 1) {
          rotateY(next, Math.PI / 2);
        }
      }
      grid[i].push(wall);
    }
  }
  createModelInstance("wall", 5, 5);
  grid[5][5] = "wall";
  var temp = createModelInstance("wall", 5, 5);
  temp.translation[2] -= 0.025;
  temp.translation[1] -= 0.03;
  temp.translation[0] -= 0.03;
  var rotato = mat4.create();
  mat4.fromRotation(rotato, (Math.PI/4), vec3.fromValues(0, 0, 1));
  vec3.transformMat4(temp.yAxis, temp.yAxis, rotato);
  vec3.transformMat4(temp.xAxis, temp.xAxis, rotato);
  mat4.fromRotation(rotato, (Math.PI/2), vec3.fromValues(1, 0, 0));
  vec3.transformMat4(temp.yAxis, temp.yAxis, rotato);
  vec3.transformMat4(temp.xAxis, temp.xAxis, rotato);
  temp = createModelInstance("wall", 14, 14);
  temp = createModelInstance("wall", 14, 14);
  grid[14][14] = "wall";
  temp.translation[2] -= 0.1;
  
  temp = createModelInstance("wall", 8, 10);
  grid[8][10] = "wall";
  
  temp = createModelInstance("wall", 8, 12);
  grid[8][12] = "wall";
  
  temp = createModelInstance("wall", 8, 11);
  mat4.fromRotation(rotato, (Math.PI/2), vec3.fromValues(0, 1, 0));
  vec3.transformMat4(temp.yAxis, temp.yAxis, rotato);
  vec3.transformMat4(temp.xAxis, temp.xAxis, rotato);
  
  mat4.fromRotation(rotato, (Math.PI/7), vec3.fromValues(1, 0, 0));
  vec3.transformMat4(temp.yAxis, temp.yAxis, rotato);
  vec3.transformMat4(temp.xAxis, temp.xAxis, rotato);
  temp.translation[2] -= 0.025;
  temp.translation[1] -= 0.006;
  temp.translation[0] += 0.04;
  
  temp = createModelInstance("wall", 15, 3);
  grid[15][3] = "wall";
  
  temp = createModelInstance("wall", 14, 2);
  grid[14][2] = "wall";
  
  
  if (is2Player) {
    dynamicCamera = false;
    Eye = vec3.clone(defaultEye);
    Center = vec3.clone(defaultCenter);
    player2 = new Segment(4, 13, true, true, true);
    player2.isHead = true;
    player2.addChild();
    player2.addChild();
    player2.addChild();
    player2.model.material.ambient = [0.6,0.6,0.6];
  }
  else {
    dynamicCamera = true;
    enemyHead = new Segment(4, 12, false, false, true);
    enemyHead.isHead = true;
    enemyHead.addChild();
    enemyHead.addChild();
    enemyHead.addChild();
  }
  snakeHead = new Segment(4, 3, true, false, true);
  snakeHead.isHead = true;
  snakeHead.addChild();
  snakeHead.addChild();
  snakeHead.addChild();
  snakeHead.model.material.ambient = [0.6,0.6,0.6];
  
  //spawnEnemy();
  apple = new Apple();
  
  scoremult = new PowerUp("scoremult", 0, 20000);
  scoremult.model.material.alpha = 1.0;
  clock = new PowerUp("clock", 1, 10000);
  clock.model.material.alpha = 1.0;
  
}

function Apple() {
  this.model = createModelInstance("apple", 18, 18);
  this.shadow = createModelInstance("appleshadow", 18, 18);
  vec3.set(this.model.yAxis, 0, 1, 0);
  vec3.set(this.model.xAxis, 1, 0, 0);
  var rotato = mat4.create();
  mat4.fromScaling(rotato, vec3.fromValues(0.5, 0.5, 0.5));
  vec3.transformMat4(this.model.yAxis, this.model.yAxis, rotato);
  vec3.transformMat4(this.model.xAxis, this.model.xAxis, rotato);
  rotato = mat4.create();
  mat4.fromRotation(rotato, (Math.PI/4), vec3.fromValues(0, 0, 1));
  vec3.transformMat4(this.model.yAxis, this.model.yAxis, rotato);
  vec3.transformMat4(this.model.xAxis, this.model.xAxis, rotato);
  rotato = mat4.create();
  mat4.fromRotation(rotato, (Math.PI/4), vec3.fromValues(0, 1, 0));
  vec3.transformMat4(this.model.yAxis, this.model.yAxis, rotato);
  vec3.transformMat4(this.model.xAxis, this.model.xAxis, rotato);
  
  this.move = function() {
    do {
      this.j = getRandGridLoc();
      this.i = getRandGridLoc();
    } while (grid[this.i][this.j] != null);
    grid[this.i][this.j] = "apple";
    gridToCoord(this.model.translation, this.i, this.j);
    gridToCoord(this.shadow.translation, this.i, this.j);
  }
  this.frameNum = Math.floor(Math.random() * 60);
  this.update = function() {
    
    var rotato = mat4.create();
    mat4.fromRotation(rotato, (Math.PI) * 0.01, vec3.fromValues(0, 0, 1));
    vec3.transformMat4(this.model.yAxis, this.model.yAxis, rotato);
    vec3.transformMat4(this.model.xAxis, this.model.xAxis, rotato);
    this.frameNum++;
    this.model.translation[2] = -0.05 + (Math.sin(0.15 * this.frameNum) / 60);
    var scal = this.model.translation[2];
    rotato = mat4.create();
    vec3.set(this.shadow.yAxis, 0, 1, 0);
    vec3.set(this.shadow.xAxis, 1, 0, 0);
    mat4.fromScaling(rotato, vec3.fromValues(1.0/(scal * 25), 1.0/(scal * 25), 1.0));
    vec3.transformMat4(this.shadow.yAxis, this.shadow.yAxis, rotato);
    vec3.transformMat4(this.shadow.xAxis, this.shadow.xAxis, rotato);
  }
  this.move();
}


function PowerUp(type, num, interval) {
  this.model = createModelInstance(type, 17, 17);
  this.shadow = createModelInstance("blueshadow", 17, 17);
  this.interval = interval;
  this.num = num;
  this.type = type;
  vec3.set(this.model.yAxis, 0, 1, 0);
  vec3.set(this.model.xAxis, 1, 0, 0);
  var rotato = mat4.create();
  mat4.fromScaling(rotato, vec3.fromValues(0.5, 0.5, 0.5));
  vec3.transformMat4(this.model.yAxis, this.model.yAxis, rotato);
  vec3.transformMat4(this.model.xAxis, this.model.xAxis, rotato);
  rotato = mat4.create();
  mat4.fromRotation(rotato, (Math.PI/4), vec3.fromValues(0, 0, 1));
  vec3.transformMat4(this.model.yAxis, this.model.yAxis, rotato);
  vec3.transformMat4(this.model.xAxis, this.model.xAxis, rotato);
  rotato = mat4.create();
  mat4.fromRotation(rotato, (Math.PI/4), vec3.fromValues(0, 1, 0));
  vec3.transformMat4(this.model.yAxis, this.model.yAxis, rotato);
  vec3.transformMat4(this.model.xAxis, this.model.xAxis, rotato);
  
  this.move = function() {
    do {
      this.j = getRandGridLoc();
      this.i = getRandGridLoc();
    } while (grid[this.i][this.j] != null);
    grid[this.i][this.j] = this.type;
    gridToCoord(this.model.translation, this.i, this.j);
    gridToCoord(this.shadow.translation, this.i, this.j);
  }
  
  this.consumeMult = function() {
    audio_pup.currentTime = 0;
    audio_pup.play();
    this.model.material.alpha = 0;
    this.shadow.material.alpha = 0;
    timers.push(setTimeout(function(){reappear(0);}, this.interval));
  }
  this.consumeClock = function() {
    this.model.material.alpha = 0;
    this.shadow.material.alpha = 0;
    timers.push(setTimeout(function(){reappear(1)}, this.interval));
  }
  
  function reappear(thing) {
    if (thing == 0) {
      scoremult.model.material.alpha = 1.0;
      scoremult.shadow.material.alpha = 0.2;
      scoremult.move();
      console.log("mult on the move");
    }
    else if (thing==1){
      clock.model.material.alpha = 1.0;
      clock.shadow.material.alpha = 0.2;
      clock.move();
    }
    
  }
  
  this.frameNum = Math.floor(Math.random() * 60);
  this.update = function() {
    var rotato = mat4.create();
    mat4.fromRotation(rotato, (Math.PI) * 0.01, vec3.fromValues(0, 0, 1));
    vec3.transformMat4(this.model.yAxis, this.model.yAxis, rotato);
    vec3.transformMat4(this.model.xAxis, this.model.xAxis, rotato);
    this.frameNum++;
    this.model.translation[2] = -0.05 + (Math.sin(0.1 * this.frameNum) / 60);
    var scal = this.model.translation[2];
    rotato = mat4.create();
    vec3.set(this.shadow.yAxis, 0, 1, 0);
    vec3.set(this.shadow.xAxis, 1, 0, 0);
    mat4.fromScaling(rotato, vec3.fromValues(1.0/(scal * 25), 1.0/(scal * 25), 1.0));
    vec3.transformMat4(this.shadow.yAxis, this.shadow.yAxis, rotato);
    vec3.transformMat4(this.shadow.xAxis, this.shadow.xAxis, rotato);
  }
  this.move();
}



function getRandGridLoc() {
  return 1 + Math.floor(Math.random() * (GRID_HEIGHT - 2));
}

function Segment(i, j, isP, isP2, isHead, avoidSpawn) {
  this.childNum = 0;
  const UP = 0;
  const RIGHT = 3;
  const DOWN = 2;
  const LEFT = 1;
  this.isExploding = false;
  var DELTA = 1.0 / MOVE_FRAME;
  this.isAlive = true;
  this.j = j;
  this.i = i;
  this.isHead = false;
  this.slitherFrame = 0;
  if (isHead) {
    this.isHead = true;
  }
  this.isP2 = isP2;
  
  this.isPlayer = isP;
  
  this.iDir = 0;
  this.jDir = 0;
  
  this.nextDir = 1;
  this.curDir = 1;
  
  this.canBuffer = true;
  console.log("spawning " + i + " " + j);
  grid[i][j] = "snake";

  if (isP) {
    if (isP2) {
      if (this.isHead) {
        this.model = createModelInstance("snakehead2", i, j);
      }
      else {
        this.model = createModelInstance("snake2", i, j);
      }
    }
    else {
      if (this.isHead) {
        this.model = createModelInstance("snakehead", i, j);
      }
      else {
        this.model = createModelInstance("snake", i, j);
      }
    }
  }
  else {
    if (this.isHead) {
      this.model = createModelInstance("snakehead3", i, j);
    }
    else {
      this.model = createModelInstance("snake3", i, j);
    }
  }
  this.model.translation[2] = 0.07;
  this.model.isP = isP;
  this.child = null;
  this.explosionFactor = 1.0;
  this.frameNum = 0;
  this.bufferActionForce = function(dir) {
    this.nextDir = dir;
    if (dir == UP) {
      this.iDir = 1;
      this.jDir = 0;
    }
    else if (dir == RIGHT) {
      this.iDir = 0;
      this.jDir = -1;
    }
    else if (dir == DOWN) {
      this.iDir = -1;
      this.jDir = 0;
    }
    else if (dir == LEFT) {
      this.iDir = 0;
      this.jDir = 1;
    }
    else {
      console.log("Incorrect direction buffer attempt: " + dir);
    }
    this.canBuffer = false;
    if (this.model) {
      //vec3.set(this.model.yAxis, 0, 1, 0);
      //vec3.set(this.model.xAxis, 1, 0, 0);
      rotateY(this.model, (Math.PI/2)*(this.nextDir - this.curDir));
      
    }
  }
  this.bufferAction = function(dir) {
    if (!this.canBuffer || this.curDir == dir && this.isAlive) {return;}
    this.bufferActionForce(dir);
  }
  this.bufferHeadAction = function(dir) {
    if (Math.abs(dir - this.curDir) == 2) {return;}
    this.bufferAction(dir);
  }
  this.update = function() {
    this.frameNum++;
    if (this.isExploding) {
      this.model.realTextureNumber = textures.length - 1 - (Math.floor(gameSpeed *this.frameNum) % 3);
      if (this.model.material.alpha > 0) {
        var prevScaling = 1.0/this.explosionFactor;
        this.explosionFactor += 0.1;
        var nextScaling = prevScaling * this.explosionFactor;
        scaleUniform(this.model, nextScaling);
      }
      if (this.child) {
        this.child.update();
      }
    }
    if (!this.isAlive) { return;}
    //console.log(this.frameNum);
    gridToCoord(this.model.translation, this.i + (this.iDir * this.frameNum * DELTA), this.j + (this.jDir * this.frameNum * DELTA));
    /**if (this.isHead) {
      var translate = this.model.translation;
      vec3.set(translate, translate[0] - this.jDir * 0.005, translate[1] - this.iDir * 0.002, translate[2]);
    }*/
    if (!this.isHead) {
      var translate = this.model.translation;
      var slither = vec3.create();
      
      var slitherAmount = Math.sin((this.slitherFrame + this.childNum * 6) / (2*Math.PI)) * this.frameNum / 100;
      gridToCoord(slither,  this.jDir * slitherAmount, this.iDir * slitherAmount);
      translate[0] += slither[0];
      translate[1] += slither[1];
      this.slitherFrame++;
    }
    if (this.frameNum >= MOVE_FRAME) {
      this.frameNum = 0;
      this.changeLoc();
      if (this.isHead && !this.isPlayer) {
        var roll = Math.floor(Math.random()*4);
        // avoid walls
        var next = this.curDir;
        if (roll == 0) {
          roll = Math.floor(Math.random()*4)
          if (this.curDir == UP || this.curDir == DOWN) {
            if (roll < 2) {
              next = LEFT;
            }
            else {
              next = RIGHT;
            }
          }
          else {
            if (roll < 2) {
              next = UP;
            }
            else {
              next = DOWN;
            }
          }
        }
        next = this.dirAvoidWall(next);
        this.bufferHeadAction(next);
      }
      //this.model.translation = gridToCoord(this.i + (this.iDir * this.frameNum * DELTA), this.j + (this.jDir * this.frameNum * DELTA));
    }
    if (this.child) {
      this.child.update();
      if (this.isAlive) {
        this.child.bufferAction(this.curDir);
      }
    }
    vec3.set(this.model.yAxis, 0, 1, 0);
    vec3.set(this.model.xAxis, 1, 0, 0);
    rotateY(this.model, (Math.PI/2)*(this.nextDir));
  }
  this.dirAvoidWall = function(dir) {
    var above = this.dangerAbove();
    var below = this.dangerBelow();
    var left = this.dangerLeft();
    var right = this.dangerRight();
    if (dir == UP && above) {
      if (left) {
        if (right) {
          return DOWN;
        }
        return RIGHT;
      }
      return LEFT;
    }
    else if (dir == DOWN && below) {
      if (right) {
        if (left) {
          return DOWN;
        }
        return LEFT;
      }
      return RIGHT;
    }
    else if (dir == LEFT && left) {
      if (above) {
        if (below) {
          return RIGHT;
        }
        return DOWN;
      }
      return UP;
    }
    else if (dir == RIGHT && right) {
      if (below) {
        if (above) {
          return LEFT;
        }
        return UP;
      }
      return DOWN;
    }
    return dir;
    
  }
  
  this.dangerAhead = function(iDif, jDif) {
    var i = this.i + iDif;
    var j = this.j + jDif;
    if (i <= 0) {
      return true;
    }
    
    var thing = grid[i][j];
    if (thing === "wall" || thing === "snake") {
        return true;
    }
    return false;
  }
  this.dangerAbove = function() {return this.dangerAhead(1, 0);};
  this.dangerBelow = function() {return this.dangerAhead(-1, 0);};
  this.dangerLeft = function() {return this.dangerAhead(0, 1);};
  this.dangerRight = function() {return this.dangerAhead(0, -1);};
  
  this.deleteSnake= function() {
    //this.deleteSegments();
    for (var i = 0; i < modelInstances.length; i++) {
      if(modelInstances[i].name === "snake3" || modelInstances[i].name === "snakehead3" || modelInstances[i].name === "snaketail3") {
        modelInstances.splice(i, 1);
        i--;
      }
    }
    //spawnEnemy();
  }
  this.deleteSegments = function() {
    this.model = null;
    if(this.child) {
      this.child.deleteSegments();
    }
    this.child = null;
    grid[this.i][this.j] = null;
  }

    
  this.changeLoc = function() {
    DELTA = 1.0 / MOVE_FRAME;
    var thing = grid[this.i + this.iDir][this.j + this.jDir];
    if (thing === "apple") {
      if(this.isPlayer) {
        if (this.isP2) {
          p2Score+= 1 * score2Multiplier;
          updateScore();
        }
        else {
          p1Score+= 1 * score2Multiplier;
          updateScore();
        }
      }
      audio_eat.currentTime = 0;
      audio_eat.play();
      apple.move();
      grid[this.i + this.iDir][this.j + this.jDir] = null;
      this.addChild();
      
      console.log("apple");
    }
    
    if (thing === "scoremult") {
      scoremult.consumeMult();
      if(this.isPlayer) {
        if (this.isP2) {
          player2.model.material.ambient = [1.0,0.0,0.0];
          score2Multiplier = 2;
          timers.push(setTimeout(function() {
            score2Multiplier = 1;
            audio_pdown.currentTime = 0;
            audio_pdown.play();
            player2.model.material.ambient = [0.6,0.6,0.6];
          }, 10000));
        }
        else {
          score2Multiplier = 2;
          snakeHead.model.material.ambient = [1.0,0.1,0.1];
          timers.push(setTimeout(function() {
            score1Multiplier = 1;
            audio_pdown.currentTime = 0;
            audio_pdown.play();
            snakeHead.model.material.ambient = [0.6,0.6,0.6];
          }, 10000));
        }
      }
      audio_eat.currentTime = 0;
      audio_eat.play();
      grid[this.i + this.iDir][this.j + this.jDir] = null;
      console.log("scoremultiplier");
    }
    
    if (thing === "clock") {
      clock.consumeClock();
      slowDown = true;
      timers.push(setTimeout(function() {
        slowDown = false;
      }, 4000));
      audio_clock.currentTime = 0;
      audio_clock.play();
      grid[this.i + this.iDir][this.j + this.jDir] = null;
      console.log("clock");
    }
    
    if (this.isHead) {
      if (thing === "wall" || thing === "snake") {
        console.log("Hit " + thing + " " + this.i + " " + this.j);
        audio_bump.currentTime = 0;
        audio_bump.play();
        this.isAlive = false;
        var child = this.child;
        
        while (child) {
          child.isAlive = false;
          child = child.child;
        }
        if (this.isPlayer) {
          if (this.isP2) {
            explodeP2();
            
          }
          else {
            explodeP1();
          }
          if (!isGameOver) {
            isGameOver = true;
            dynamicCamera = false;
            Eye = vec3.clone(defaultEye);
            Center = vec3.clone(defaultCenter);
            if (this.isPlayer) {
              if (this.isP2) {
                isP2Win = false;
                isP1Win = true;
              }
              else {
                isP1Win = false;
                isP2Win = true;
              }
            }
          }
        }
        else {
          explodeEnemy();
        }
        return;
      }
    }
    this.canBuffer = true;
    this.curDir = this.nextDir;
    if (this.isHead || this.child == null) {
      grid[this.i][this.j] = null;
    }
    this.i = this.i + this.iDir;
    this.j = this.j + this.jDir;
    grid[this.i][this.j] = "snake";
   
    
    //console.log("SnakePos: " + this.i + " " + this.j);
    //this.model.translation = gridToCoord(this.i, this.j);

  };
  
  this.bufferUp = function() {this.bufferAction(UP)};
  this.bufferRight = function() {this.bufferAction(RIGHT)};
  this.bufferDown = function() {this.bufferAction(DOWN)};
  this.bufferLeft = function() {this.bufferAction(LEFT)};
  this.bufferAction(UP);
  
  this.addChild = function() {
    if (this.child) {
      this.child.addChild();
    }
    else {
      this.child = new Segment(this.i - 1, this.j, this.isPlayer, this.isP2, false);
      //rotateY(this.child.model, (Math.PI/2)*(this.curDir));
      this.child.childNum = this.childNum + 1;
      var childModel = this.child.model;
      if (this.isHead) {
        this.child.model.material.alpha = 0.0;
        var modelName = "snaketail";
        
        if(this.isP2) {
          modelName = "snaketail2";
        }
        else if (!this.isPlayer) {
          modelName = "snaketail3";
        }
        
        this.child.model = createModelInstance(modelName, this.child.i, this.child.j);
        this.child.model.translation[2] = 0.07;
      }
      else {
        var temp = this.child.model;
        this.child.model = this.model;
        this.model = temp;
        gridToCoord(this.child.model.translation, this.child.i + (this.child.iDir * this.child.frameNum * DELTA), this.child.j + (this.child.jDir * this.child.frameNum * DELTA));
        
      }
      this.child.frameNum = this.frameNum;
    }
  }
}

var expP1Seg = null;
function explodeP1() {
  if (expP1Seg == null) {
    expP1Seg = snakeHead;
  }
  else {
    expP1Seg.model.material.alpha = 0.0;
    grid[expP1Seg.i][expP1Seg.j] = null;
    expP1Seg = expP1Seg.child;
  }
  if (expP1Seg != null) {
    audio_explode.currentTime = 0;
    audio_explode.play();
    expP1Seg.model.material.ambient = [1.0, 1.0, 1.0];
    expP1Seg.model.material.diffuse = [1.0, 1.0, 1.0];
    expP1Seg.model.material.specular = [1.0, 1.0, 1.0];
    expP1Seg.isExploding = true;
    timers.push(setTimeout(explodeP1, 300 ));
  }
  else {
    if (player2 == null) {
      gameover.material.alpha = 1.0;
    }
    else if (isP2Win) {
      p2Win.material.alpha = 1.0;
    }
    else if (isP1Win) {
      p1Win.material.alpha = 1.0;
    }
  }
}

var expP2Seg = null;
function explodeP2() {
  if (expP2Seg == null) {
    expP2Seg = player2;
  }
  else {
    expP2Seg.model.material.alpha = 0.0;
    grid[expP2Seg.i][expP2Seg.j] = null;
    expP2Seg = expP2Seg.child;
  }
  if (expP2Seg != null) {
    audio_explode.currentTime = 0;
    audio_explode.play();
    expP2Seg.model.material.ambient = [1.0, 1.0, 1.0];
    expP2Seg.model.material.diffuse = [1.0, 1.0, 1.0];
    expP2Seg.model.material.specular = [1.0, 1.0, 1.0];
    expP2Seg.isExploding = true;
    timers.push(setTimeout(explodeP2, 300 ));
  }
  else {
    if (isP2Win) {
      p2Win.material.alpha = 1.0;
    }
    else if (isP1Win) {
      p1Win.material.alpha = 1.0;
    }
  }
}

var expESeg = null;
function explodeEnemy() {
  if (expESeg == null) {
    expESeg = enemyHead;
  }
  else {
    expESeg.model.material.alpha = 0.0;
    grid[expESeg.i][expESeg.j] = null;
    expESeg = expESeg.child;
  }
  if (expESeg != null) {
    audio_explode.currentTime = 0;
    audio_explode.play();
    expESeg.model.material.ambient = [1.0, 1.0, 1.0];
    expESeg.model.material.diffuse = [1.0, 1.0, 1.0];
    expESeg.model.material.specular = [1.0, 1.0, 1.0];
    expESeg.isExploding = true;
    timers.push(setTimeout(explodeEnemy, 300));
  }
  else {
    enemyHead.deleteSnake();
    spawnEnemy();
  }
}

function spawnEnemy() {
  var i;
  var j;
  do {
    i = getRandGridLoc();
    if (i < 2) {
      i = 2;
    }
    j = getRandGridLoc();
  } while(grid[i][j] != null);
  enemyHead = new Segment(i, j, false, false, true);
  enemyHead.isHead = true;
  enemyHead.addChild();
  enemyHead.addChild();
}
function gridToCoord(vec, i, j) {
  var y = i * (1.0 / GRID_WIDTH);
  var x = j * (1.0 / GRID_WIDTH);
  vec[0] = x;
  vec[1] = y;
}

function getModelByName(name) {
  for (var i = 0; i < inputTriangles.length; i++) {
    if (name === inputTriangles[i].name) {
      return inputTriangles[i];
    }
  }
  throw new Error("Couldn't find model with name: " + name);
}


function handleImageLoad(texture, myImage) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  myImage.addEventListener('load', function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                  gl.RGBA, gl.UNSIGNED_BYTE, myImage);
    if (isPow2(myImage.width) && isPow2(myImage.height)) {
       gl.generateMipmap(gl.TEXTURE_2D);
    } else {
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  });
}

// setup the webGL shaders
function setupShaders() {
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 aVertexPosition; // vertex position
        attribute vec3 aVertexNormal; // vertex normal
        attribute vec2 a_uv;
        
        
        uniform mat4 umMatrix; // the model matrix
        uniform mat4 upvmMatrix; // the project view model matrix
        
        varying vec3 vWorldPos; // interpolated world position of vertex
        varying vec3 vVertexNormal; // interpolated normal for frag shader
        
        varying vec2 uv;

        void main(void) {
            
            // vertex position
            vec4 vWorldPos4 = umMatrix * vec4(aVertexPosition, 1.0);
            vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
            gl_Position = upvmMatrix * vec4(aVertexPosition, 1.0);

            // vertex normal (assume no non-uniform scale)
            vec4 vWorldNormal4 = umMatrix * vec4(aVertexNormal, 0.0);
            vVertexNormal = normalize(vec3(vWorldNormal4.x,vWorldNormal4.y,vWorldNormal4.z)); 
            uv = a_uv;
        }
    `;
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float; // set float to medium precision

        // eye location
        uniform vec3 uEyePosition; // the eye's position in world
        
        // light properties
        uniform vec3 uLightAmbient; // the light's ambient color
        uniform vec3 uLightDiffuse; // the light's diffuse color
        uniform vec3 uLightSpecular; // the light's specular color
        uniform vec3 uLightPosition; // the light's position
        uniform bool texToggle;
        uniform float alpha;
        
        // material properties
        uniform vec3 uAmbient; // the ambient reflectivity
        uniform vec3 uDiffuse; // the diffuse reflectivity
        uniform vec3 uSpecular; // the specular reflectivity
        uniform float uShininess; // the specular exponent
        uniform bool Blinn_Phong;  // Blinn_Phong x Phong toggle
        // geometry properties
        varying vec3 vWorldPos; // world xyz of fragment
        varying vec3 vVertexNormal; // normal of fragment
        uniform sampler2D u_texture;
        varying vec2 uv;
        
        
        void main(void) {
        
            // ambient term
            vec3 ambient = uAmbient*uLightAmbient; 
            
            // diffuse term
            vec3 normal = normalize(vVertexNormal); 
            vec3 light = normalize(uLightPosition - vWorldPos);
            float lambert = max(0.0,dot(normal,light));
            vec3 diffuse = uDiffuse*uLightDiffuse*lambert; // diffuse term
            
            // specular term
            vec3 eye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(light+eye);
            float ndotLight = 2.0*dot(normal, light);
            vec3 reflectVec = normalize(ndotLight*normal - light);
            float highlight = 0.0;
            if(Blinn_Phong)
           	 	highlight = pow(max(0.0,dot(normal,halfVec)),uShininess);
           	else 
           		highlight = pow(max(0.0,dot(normal,reflectVec)),uShininess);

            vec3 specular = uSpecular*uLightSpecular*highlight; // specular term
            
            // combine to output color
            vec3 colorOut = vec3(ambient + diffuse + specular);
            vec4 texColor = texture2D(u_texture, uv);
            
            gl_FragColor = vec4(texColor.rgb * colorOut, texColor.a * alpha);
            
            
        }
    `;
    
    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                
                // locate and enable vertex attributes
                vPosAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexPosition"); // ptr to vertex pos attrib
                gl.enableVertexAttribArray(vPosAttribLoc); // connect attrib to array
                vNormAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexNormal"); // ptr to vertex normal attrib
                gl.enableVertexAttribArray(vNormAttribLoc); // connect attrib to array
                
                uvAttrib = gl.getAttribLocation(shaderProgram, "a_uv");
                gl.enableVertexAttribArray(uvAttrib);
                
                // locate vertex uniforms
                mMatrixULoc = gl.getUniformLocation(shaderProgram, "umMatrix"); // ptr to mmat
                pvmMatrixULoc = gl.getUniformLocation(shaderProgram, "upvmMatrix"); // ptr to pvmmat
                
                // locate fragment uniforms
                var eyePositionULoc = gl.getUniformLocation(shaderProgram, "uEyePosition"); // ptr to eye position
                var lightAmbientULoc = gl.getUniformLocation(shaderProgram, "uLightAmbient"); // ptr to light ambient
                var lightDiffuseULoc = gl.getUniformLocation(shaderProgram, "uLightDiffuse"); // ptr to light diffuse
                var lightSpecularULoc = gl.getUniformLocation(shaderProgram, "uLightSpecular"); // ptr to light specular
                lightPositionULoc = gl.getUniformLocation(shaderProgram, "uLightPosition"); // ptr to light position
                ambientULoc = gl.getUniformLocation(shaderProgram, "uAmbient"); // ptr to ambient
                diffuseULoc = gl.getUniformLocation(shaderProgram, "uDiffuse"); // ptr to diffuse
                specularULoc = gl.getUniformLocation(shaderProgram, "uSpecular"); // ptr to specular
                shininessULoc = gl.getUniformLocation(shaderProgram, "uShininess"); // ptr to shininess
                Blinn_PhongULoc = gl.getUniformLocation(shaderProgram, "Blinn_Phong");
                
                texToggleUniform = gl.getUniformLocation(shaderProgram, "texToggle");
                
                alphaUniform = gl.getUniformLocation(shaderProgram, "alpha");
                
                // pass global constants into fragment uniforms
                gl.uniform3fv(eyePositionULoc,Eye); // pass in the eye's position
                gl.uniform3fv(lightAmbientULoc,lightAmbient); // pass in the light's ambient emission
                gl.uniform3fv(lightDiffuseULoc,lightDiffuse); // pass in the light's diffuse emission
                gl.uniform3fv(lightSpecularULoc,lightSpecular); // pass in the light's specular emission
                gl.uniform3fv(lightPositionULoc,lightPosition); // pass in the light's position
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders


var lastFPS = 0;
var updateNum = 0;
function updateFPS(elapsedTime) {
  elapsedTime = elapsedTime / 1000;
  updateNum++;
  if (updateNum % 60 == 0) {
    updateNum = 0;
    var temp = 1.0 / lastFPS;
    fpsIndicatorSmooth.innerHTML = temp.toFixed(1);
  }
  var temp = 1.0/elapsedTime;
  fpsIndicator.innerHTML = temp.toFixed(1);
  lastFPS = lastFPS * 0.9 + 0.1 * elapsedTime
  
}


var lastRenderTime = 0;
var lastGameUpdateTime = 0;
updaterNum = 0;
function updateTimers(gameTime, renderTime) {
  lastGameUpdateTime = 0.9 * lastGameUpdateTime + 0.1 * gameTime;
  lastRenderTime = 0.9 * lastGameUpdateTime + 0.1 * renderTime;
  updaterNum++;
  if (updaterNum % 30 == 0) {
    updaterNum = 0;
    gameUpdateIndicator.innerHTML = lastGameUpdateTime.toFixed(5);
    renderUpdateIndicator.innerHTML = lastRenderTime.toFixed(5);
  }
}

// render the loaded model
var startTime = Date.now();
var endTime = Date.now();
var lastUpdateTime = Date.now();
timeSinceLastUpdate = 0;
function renderModels() {
    var gUpdateTime = Date.now();
    
    timeSinceLastUpdate += Date.now() - lastUpdateTime;
    var numUpdates = timeSinceLastUpdate / TIME_PER_UPDATE;
    for (var i = 0; i < numUpdates; i++) {
      updateGame();
    }
    timeSinceLastUpdate = timeSinceLastUpdate % TIME_PER_UPDATE;
    
    lastUpdateTime = Date.now();
    gUpdateTime = Date.now() - gUpdateTime;
    var renderUpdateTime = Date.now();
    gl.uniform3fv(lightPositionULoc,lightPosition);
      // construct the model transform matrix, based on model state
      function makeModelTransform(currModel) {
          var zAxis = vec3.create(), sumRotation = mat4.create(), temp = mat4.create(), negCtr = vec3.create();

          // move the model to the origin
          mat4.fromTranslation(mMatrix,vec3.negate(negCtr,currModel.center)); 
          
          // scale
          mat4.multiply(mMatrix,mat4.fromScaling(temp,currModel.scaling),mMatrix); // S(1.2) * T(-ctr)
          
          // rotate the model to current interactive orientation
          vec3.normalize(zAxis,vec3.cross(zAxis,currModel.xAxis,currModel.yAxis)); // get the new model z axis
          mat4.set(sumRotation, // get the composite rotation
              currModel.xAxis[0], currModel.yAxis[0], zAxis[0], 0,
              currModel.xAxis[1], currModel.yAxis[1], zAxis[1], 0,
              currModel.xAxis[2], currModel.yAxis[2], zAxis[2], 0,
              0, 0,  0, 1);
          mat4.multiply(mMatrix,sumRotation,mMatrix); // R(ax) * S(1.2) * T(-ctr)
          
          // translate back to model center
          mat4.multiply(mMatrix,mat4.fromTranslation(temp,currModel.center),mMatrix); // T(ctr) * R(ax) * S(1.2) * T(-ctr)

          // translate model to current interactive orientation
          mat4.multiply(mMatrix,mat4.fromTranslation(temp,currModel.translation),mMatrix); // T(pos)*T(ctr)*R(ax)*S(1.2)*T(-ctr)
          
      } // end make model transform
      
      function renderTriangles(transparent, mask) {
        if (transparent) {
          gl.depthMask(false);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        else {
          gl.depthMask(true);
        }
        
        // render each triangle set
        var currSet; // the tri set and its material properties
        for (var whichTriSet=0; whichTriSet<modelInstances.length; whichTriSet++) {
            var textureNumber = modelInstances[whichTriSet].textureNumber;
            var instanceNumber = whichTriSet;
            
            var thisInstance = modelInstances[whichTriSet];
            currSet = modelInstances[instanceNumber];
            if (currSet.material.alpha >= 1.0 && !transparent || currSet.material.alpha < 1.0 && transparent) {
              // make model transform, add to view project
              makeModelTransform(thisInstance);
              mat4.multiply(pvmMatrix,pvMatrix,mMatrix); // project * view * model
              gl.uniformMatrix4fv(mMatrixULoc, false, mMatrix); // pass in the m matrix
              gl.uniformMatrix4fv(pvmMatrixULoc, false, pvmMatrix); // pass in the hpvm matrix
              
              
              
              // reflectivity: feed to the fragment shader
              gl.uniform3fv(ambientULoc,currSet.material.ambient); // pass in the ambient reflectivity
              gl.uniform3fv(diffuseULoc,currSet.material.diffuse); // pass in the diffuse reflectivity
              gl.uniform3fv(specularULoc,currSet.material.specular); // pass in the specular reflectivity
              gl.uniform1f(shininessULoc,currSet.material.n); // pass in the specular exponent
              gl.uniform1i(Blinn_PhongULoc, Blinn_Phong);
              // vertex buffer: activate and feed into vertex shader
              gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[textureNumber]); // activate
              gl.vertexAttribPointer(vPosAttribLoc,3,gl.FLOAT,false,0,0); // feed
              gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[textureNumber]); // activate
              gl.vertexAttribPointer(vNormAttribLoc,3,gl.FLOAT,false,0,0); // feed
              
              gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffers[textureNumber]);
              gl.vertexAttribPointer(uvAttrib, 2, gl.FLOAT, false, 0, 0);
              
              gl.uniform1f(alphaUniform, currSet.material.alpha);
              
              gl.activeTexture(gl.TEXTURE0);
              gl.bindTexture(gl.TEXTURE_2D, textures[thisInstance.realTextureNumber]);
              
              gl.uniform1i(texToggleUniform, texToggle);
              // triangle buffer: activate and render
              gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[textureNumber]); // activate
              gl.drawElements(gl.TRIANGLES,3*triSetSizes[textureNumber],gl.UNSIGNED_SHORT,0); // render
            
            }

            
        } // end for each triangle set
        
      }
      
      // var hMatrix = mat4.create(); // handedness matrix
      var pMatrix = mat4.create(); // projection matrix
      var vMatrix = mat4.create(); // view matrix
      var mMatrix = mat4.create(); // model matrix
      var pvMatrix = mat4.create(); // hand * proj * view matrices
      var pvmMatrix = mat4.create(); // hand * proj * view * model matrices
      

      
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
      
      // set up projection and view
      // mat4.fromScaling(hMatrix,vec3.fromValues(-1,1,1)); // create handedness matrix
      mat4.perspective(pMatrix,0.5*Math.PI,1,0.1,10); // create projection matrix
      mat4.lookAt(vMatrix,Eye,Center,Up); // create view matrix
      mat4.multiply(pvMatrix,pvMatrix,pMatrix); // projection
      mat4.multiply(pvMatrix,pvMatrix,vMatrix); // projection * view
      renderTriangles(false, true);
      renderTriangles(true, false);
      renderUpdateTime = Date.now() - renderUpdateTime;
      endTime = Date.now();
      updateFPS((endTime - startTime));
      updateTimers(gUpdateTime, renderUpdateTime);
      startTime = endTime;
      window.requestAnimationFrame(renderModels); // set up frame render callback
    
} // end render model

function isPow2(value) {
    return (value & (value - 1)) == 0;
}

function updateScore() {
  document.getElementById("p1Score").innerHTML = p1Score;
  document.getElementById("p2Score").innerHTML = p2Score;
}

 var frameNum = 0;
 var slowDown = false;
 function updateGame() {
   frameNum++;
   if (!slowDown || (slowDown && frameNum % 2 == 0)) {
     vec3.set(lightPosition, apple.model.translation[0], apple.model.translation[1], apple.model.translation[2]);
     if (dynamicCamera) {
        var camDif = .03/MOVE_FRAME * snakeHead.frameNum * snakeHead.iDir;
        
        vec3.set(Eye, snakeHead.model.translation[0], snakeHead.model.translation[1] - .2, Math.min(-.4 + .03*snakeHead.i + camDif, -0.1));
        vec3.set(Center, snakeHead.model.translation[0], snakeHead.model.translation[1], snakeHead.model.translation[2]);
      }
      if (!is2Player) {
        enemyHead.update();
      }
      else {
        player2.update();
      }
      snakeHead.update();
      apple.update();
      scoremult.update();
      clock.update();
   }
 }
 
function loadModelFromObj(url, desc) {
  var str = getFile(url, desc) + "";
  var file = str.split("\n");
  
  var model = {};
  model.name = desc;
  model.material = {"ambient": [0.5,0.5,0.5], "diffuse": [0.6,0.4,0.4], "specular": [0.3,0.3,0.3], "n": 11, "alpha": 1.0, "texture": "snakeHeadUV.png"}
  model.vertices = [];
  model.normals = [];
  model.uvs = [];
  model.triangles = [];
  model.v = [];
  model.vn = [];
  model.vt = [];
  model.texture = "royal_wall.jpg";
  model.scaling = vec3.fromValues(1.0, 1.0, 1.0);
  for (var i = 0; i < file.length; i++) {
    var nextLine = file[i].split(" ");
    
    if (nextLine[0] === "v") {
      var v = [];
      v.push(parseFloat(nextLine[1]), parseFloat(nextLine[2]), parseFloat(nextLine[3]));
      model.v.push(v);
    }
    else if(nextLine[0] === "vt") {
      var vt = [];
      vt.push(parseFloat(nextLine[1]), parseFloat(nextLine[2]));
      model.vt.push(vt);
    }
    else if(nextLine[0] === "vn") {
      var vn = [];
      vn.push(parseFloat(nextLine[1]), parseFloat(nextLine[2]), parseFloat(nextLine[3]));
      model.vn.push(vn);
    }
    else if(nextLine[0] === "f") {
      var triangles = [];
      for (var j = 1; j < 4; j++) { 
        var vals = nextLine[j].split("/");
        
        var vIndex = parseInt(vals[0]) - 1;
        var uvIndex = parseInt(vals[1]) - 1;
        var nIndex = parseInt(vals[2]) - 1;
        
        if (!vIndex || !uvIndex || !nIndex) {
          console.log("Indices: " + vIndex + " " + uvIndex + " " + nIndex);
        }
        
        if (!model.v[vIndex] || !model.vt[uvIndex] || !model.vn[nIndex]) {
          console.log("Missing something, look here: "  +"Indices: " + vIndex + " " + uvIndex + " " + nIndex + " vals: " + model.v[vIndex] + " " + model.vt[uvIndex] + " " + model.vn[nIndex]);
        }
        
        model.vertices.push(model.v[vIndex]);
        triangles.push(model.vertices.length - 1);
        model.uvs.push(model.vt[uvIndex]);
        model.normals.push(model.vn[nIndex]);
      }
      model.triangles.push(triangles);
    }
  }
  console.log(model);
  loadModel(model);
  scaleUniform(model, 0.025);
  return model;
} 
function addTexture(resourceURL) {
  var whichSet = textures.length;
  textures.push(gl.createTexture());
  gl.bindTexture(gl.TEXTURE_2D, textures[whichSet]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 200, 0, 255]));
  var myImage = new Image();
  myImage.crossOrigin = "Anonymous";
  myImage.src = resourceURL;
  handleImageLoad(textures[whichSet], myImage);
}
function loadResources() {
  var resources = getJSONFile(BASE_URL + "resources.json", "resources");
  
  var modelInfo = resources;
  
  for (var i = 0; i < modelInfo.length; i++) {
    var nextModelInfo = modelInfo[i];
    var nextPos = inputTriangles.length;
    
    var nextModel = loadModelFromObj(BASE_URL + "models/" + nextModelInfo.model, nextModelInfo.name);
    inputTriangles[nextPos].name = nextModelInfo.name;
    inputTriangles[nextPos].material = nextModelInfo.material;
    vec3.set(inputTriangles[nextPos].center, 0.0, 0.0, 0.0);
    addTexture(BASE_URL + "textures/" + nextModelInfo.material.texture);
  }
}


function main() {
  setupWebGL(); // set up the webGL environment
  //loadModels(); // load in the models from tri file
  
  loadResources();
  
  setupShaders(); // setup the webGL shaders
  setUpBoard();
  renderModels(); // draw the triangles using webGL
} // end main
