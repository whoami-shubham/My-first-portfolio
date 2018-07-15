window.onload = init;

function init() {
  var root = new THREERoot({
    createCameraControls:false,
    fov:10
  });
  root.renderer.setClearColor(0xffffff);
	root.renderer.setPixelRatio(window.devicePixelRatio || 1);
  root.camera.position.set(0, 0, 1400);

  var textAnimation = createTextAnimation();
  root.scene.add(textAnimation);

  var tween = TweenMax.fromTo(textAnimation, 4,
    {animationProgress:0},
    {animationProgress:1, ease:Power1.easeInOut, repeat:-1, yoyo:true}
  );
  createTweenScrubber(tween);
}

function createTweenScrubber(tween, seekSpeed) {
  seekSpeed = seekSpeed || 0.001;

  function stop() {
    TweenMax.to(tween, 2, {timeScale:0});
  }

  function resume() {
    TweenMax.to(tween, 2, {timeScale:1});
  }

  function seek(dx) {
    var progress = tween.progress();
    var p = THREE.Math.clamp((progress + (dx * seekSpeed)), 0, 1);

    tween.progress(p);
  }

  var _cx = 0;

  // desktop
  var mouseDown = false;
  document.body.style.cursor = 'pointer';

  window.addEventListener('mousedown', function(e) {
    mouseDown = true;
    document.body.style.cursor = 'ew-resize';
    _cx = e.clientX;
    stop();
  });
  window.addEventListener('mouseup', function(e) {
    mouseDown = false;
    document.body.style.cursor = 'pointer';
    resume();
  });
  window.addEventListener('mousemove', function(e) {
    if (mouseDown === true) {
      var cx = e.clientX;
      var dx = cx - _cx;
      _cx = cx;

      seek(dx);
    }
  });
  // mobile
  window.addEventListener('touchstart', function(e) {
    _cx = e.touches[0].clientX;
    stop();
    e.preventDefault();
  });
  window.addEventListener('touchend', function(e) {
    resume();
    e.preventDefault();
  });
  window.addEventListener('touchmove', function(e) {
    var cx = e.touches[0].clientX;
    var dx = cx - _cx;
    _cx = cx;

    seek(dx);
    e.preventDefault();
  });
}

function createTextAnimation() {
  var geometry = generateTextGeometry("Hey, I'm Shubham. ;) ", {
    size:40,
    height:0,
    font:'droid sans',
    weight:'bold',
    bevelSize:0.75,
    style:'normal',
    bevelThickness:0.50,
    bevelEnabled:true,
    anchor:{x:0.5, y:0.5, z:0.5}
  });

  THREE.BAS.Utils.separateFaces(geometry);

  return new TextAnimation(geometry);
}

function generateTextGeometry(text, params) {
  var geometry = new THREE.TextGeometry(text, params);

  geometry.computeBoundingBox();

  geometry.userData = {};
  geometry.userData.size = {
    width: geometry.boundingBox.max.x - geometry.boundingBox.min.x,
    height: geometry.boundingBox.max.y - geometry.boundingBox.min.y,
    depth: geometry.boundingBox.max.z - geometry.boundingBox.min.z
  };

  var anchorX = geometry.userData.size.width * -params.anchor.x;
  var anchorY = geometry.userData.size.height * -params.anchor.y;
  var anchorZ = geometry.userData.size.depth * -params.anchor.z;
  var matrix = new THREE.Matrix4().makeTranslation(anchorX, anchorY, anchorZ);

  geometry.applyMatrix(matrix);

  return geometry;
}

////////////////////
// CLASSES
////////////////////

function TextAnimation(textGeometry) {
  var bufferGeometry = new THREE.BAS.ModelBufferGeometry(textGeometry);

  var aAnimation = bufferGeometry.createAttribute('aAnimation', 2);
  var aControl0 = bufferGeometry.createAttribute('aControl0', 3);
  var aControl1 = bufferGeometry.createAttribute('aControl1', 3);
  var aEndPosition = bufferGeometry.createAttribute('aEndPosition', 3);

  var faceCount = bufferGeometry.faceCount;
  var i, i2, i3, i4, v;

  var size = textGeometry.userData.size;
  var length = new THREE.Vector3(size.width, size.height, size.depth).multiplyScalar(0.5).length();
  var maxDelay = length * 0.06;

  this.animationDuration = maxDelay + 4 + 1;
  this._animationProgress = 0;

  for (i = 0, i2 = 0, i3 = 0, i4 = 0; i < faceCount; i++, i2 += 6, i3 += 9, i4 += 12) {
    var face = textGeometry.faces[i];
    var centroid = THREE.BAS.Utils.computeCentroid(textGeometry, face);
    var dirX = centroid.x > 0 ? 1 : -1;
    var dirY = centroid.y > 0 ? 1 : -1;

    // animation
    var delay = centroid.length() * THREE.Math.randFloat(0.03, 0.06);
    var duration = THREE.Math.randFloat(2, 4);

    for (v = 0; v < 6; v += 2) {
      aAnimation.array[i2 + v    ] = delay + Math.random();
      aAnimation.array[i2 + v + 1] = duration;
    }

    // ctrl
    var c0x = THREE.Math.randFloat(0, 30) * dirX;
    var c0y = THREE.Math.randFloat(60, 120) * dirY;
    var c0z = THREE.Math.randFloat(-20, 20);

    var c1x = THREE.Math.randFloat(30, 60) * dirX;
    var c1y = THREE.Math.randFloat(0, 60) * dirY;
    var c1z = THREE.Math.randFloat(-20, 20);

    for (v = 0; v < 9; v += 3) {
      aControl0.array[i3 + v    ] = c0x;
      aControl0.array[i3 + v + 1] = c0y;
      aControl0.array[i3 + v + 2] = c0z;

      aControl1.array[i3 + v    ] = c1x;
      aControl1.array[i3 + v + 1] = c1y;
      aControl1.array[i3 + v + 2] = c1z;
    }
  }

  var material = new THREE.BAS.BasicAnimationMaterial({
      shading: THREE.FlatShading,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: {type: 'f', value: 0}
      },
      shaderFunctions: [
        THREE.BAS.ShaderChunk['cubic_bezier']
      ],
      shaderParameters: [
        'uniform float uTime;',
        'attribute vec2 aAnimation;',
        'attribute vec3 aControl0;',
        'attribute vec3 aControl1;',
        'attribute vec3 aEndPosition;'
      ],
      shaderVertexInit: [
        'float tDelay = aAnimation.x;',
        'float tDuration = aAnimation.y;',
        'float tTime = clamp(uTime - tDelay, 0.0, tDuration);',
        'float tProgress = tTime / tDuration;'
      ],
      shaderTransformPosition: [
        'vec3 tPosition = transformed;',
        'tPosition *= 1.0 - tProgress;',
        'tPosition += cubicBezier(transformed, aControl0, aControl1, aEndPosition, tProgress);',
        'transformed = tPosition;'
      ]
    },
    {
      diffuse: 0x0000ff
    }
  );

  THREE.Mesh.call(this, bufferGeometry, material);

  this.frustumCulled = false;
}
TextAnimation.prototype = Object.create(THREE.Mesh.prototype);
TextAnimation.prototype.constructor = TextAnimation;

Object.defineProperty(TextAnimation.prototype, 'animationProgress', {
  get: function() {
    return this._animationProgress;
  },
  set: function(v) {
    this._animationProgress = v;
    this.material.uniforms['uTime'].value = this.animationDuration * v;
  }
});

function THREERoot(params) {
  params = utils.extend({
    antialias:false,

    fov:60,
    zNear:1,
    zFar:10000,

    createCameraControls:true
  }, params);

  this.renderer = new THREE.WebGLRenderer({
    antialias:params.antialias
  });
  document.getElementById('three-container').appendChild(this.renderer.domElement);
  //var width = document.getElementById('three-container').offsetWidth;
    //var height = document.getElementById('three-container').offsetHeight;
    
  this.camera = new THREE.PerspectiveCamera(
    params.fov,
    window.innerWidth /window.innerHeight,
    params.zNear,
    params.zfar
  );

  this.scene = new THREE.Scene();

  if (params.createCameraControls) {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
  }

  this.resize = this.resize.bind(this);
  this.tick = this.tick.bind(this);

  this.resize();
  this.tick();

  window.addEventListener('resize', this.resize, false);
}
THREERoot.prototype = {
  tick: function() {
    this.update();
    this.render();
    requestAnimationFrame(this.tick);
  },
  update: function() {
    this.controls && this.controls.update();
  },
  render: function() {
    this.renderer.render(this.scene, this.camera);
  },

  resize: function() {
    var width = document.getElementById('three-container').offsetWidth;
    var height = document.getElementById('three-container').offsetHeight;
    this.camera.aspect = width /height;
    
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width,height);
  }  
}; 

////////////////////
// UTILS
////////////////////

var utils = {
  extend:function(dst, src) {
    for (var key in src) {
      dst[key] = src[key];
    }

    return dst;
  }
};