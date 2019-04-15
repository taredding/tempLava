function Ship(x, y, z) {
  this.speed = -0.05;

  
  this.model = createModelInstance("ship", x, y, z);
  scaleUniform(this.model, 0.5);
  this.position = this.model.translation;
  this.model.center = vec3.fromValues(0, 0, 0);
  
  this.update = function(time) {
    //var elapsedSeconds = time / 1000;
    //var z = elapsedSeconds * this.speed;
    //vec3.add(this.position, this.position, vec3.fromValues(0, 0, z));
    
    var h = getHeightOfLava(this.position);
    
    
    this.position[1] = h;
  }
  
}