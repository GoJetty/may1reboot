//=require ../vendor/**/*.js

//=require utils.js
//=require three/*.js

var config = {
  earthRadius:10
};

var Globe = function() {
  this.root = new THREERoot();
  this.root.renderer.setClearColor(0x0f0f0f);
  this.root.renderer.setPixelRatio(window.devicePixelRatio || 1);

  //this.root.camera.position.z = 100;

  this.root.controls.enableKeys = false;
  this.root.controls.enableZoom = false;
  this.root.controls.enableDamping = true;
  this.root.controls.autoRotate = true;
  this.root.controls.autoRotateSpeed = -0.125;
  this.root.controls.dampingFactor = 0.20;
  this.root.controls.rotateSpeed = 0.5;

  var light = new THREE.DirectionalLight(0xffffff, 1.0);
  this.root.scene.add(this.root.camera);
  this.root.camera.add(light);

  TweenMax.set(this.root.renderer.domElement, {opacity:0});

  var loader = new THREE.TextureLoader();

  loader.load('res/tex/earth_dark.jpg', _.bind(function(texture) {
    this.processMarkerPositions(texture.image);

    this.initEarth(texture);
    this.initStars();
    this.createIntroAnimation();

  }, this));
};
Globe.prototype = {
  processMarkerPositions:function(img) {
    this.markerPositions = [];

    var cnv = document.createElement('canvas');
    var ctx = cnv.getContext('2d');

    cnv.width = img.width * 0.5;
    cnv.height = img.height * 0.5;

    ctx.drawImage(img, 0, 0, cnv.width, cnv.height);

    var data = ctx.getImageData(0, 0, cnv.width, cnv.height).data;
    var threshold = 167;

    var positions = [];

    for (var i = 0; i < data.length; i+=4) {
      var r = data[i];

      if (r > threshold) {
        var x = (i / 4) % cnv.width;
        var y = ((i / 4) / cnv.width) | 0;

        positions.push({x:x / cnv.width, y:y / cnv.height});
      }
    }

    console.log('position count', positions.length);

    for (var j = 0; j < positions.length; j++) {
      var p = positions[j];
      var lat = THREE.Math.mapLinear(p.y, 0, 1, 90, -90);
      var lon = THREE.Math.mapLinear(p.x, 0, 1, -180, 180);

      this.markerPositions[j] = utils.llToVec(lat, lon, config.earthRadius);
    }
  },

  initEarth:function(texture) {
    var geo = new THREE.SphereGeometry(config.earthRadius, 32, 32);
    var mat = new THREE.MeshPhongMaterial({
      map: texture,
      specularMap: THREE.ImageUtils.loadTexture('res/tex/earth_spec.jpg'),
      bumpMap: THREE.ImageUtils.loadTexture('res/tex/earth_bump.jpg'),
      bumpScale: 0.25,
      shininess:4
    });
    var mesh = new THREE.Mesh(geo, mat);
    this.root.scene.add(mesh);
  },

  initStars:function() {
    var prefabGeometry = new THREE.TetrahedronGeometry(0.5);
    var starSystem = new StarAnimationSystem(prefabGeometry, 2000, 100, 1000);

    TweenMax.ticker.addEventListener('tick', function() {
      starSystem.update();
    });

    this.root.scene.add(starSystem);
  },

  createIntroAnimation:function() {
    var duration = 8;
    var controls = this.root.controls;

    var tl = new TimelineMax({repeat:0});

    tl.call(function() {
      controls.enabled = false;
    });
    tl.to(this.root.renderer.domElement, 2, {opacity:1});
    tl.add(this.createMarkersAnimation(duration), 0);
    tl.add(this.createCameraAnimation(duration), 0);
    tl.call(function() {
      controls.enabled = true;
    });
  },

  createMarkersAnimation:function(duration) {
    var prefabGeometry = new THREE.SphereGeometry(0.0375, 12, 12);
    var markerSystem = new MarkerAnimationSystem(prefabGeometry, this.markerPositions);
    var animation = TweenMax.fromTo(markerSystem, duration,
      {animationProgress:0},
      {animationProgress:1, ease:Power0.easeIn}
    );

    this.root.scene.add(markerSystem);

    return animation;
  },

  createCameraAnimation:function(duration) {
    var proxy = {
      angle:Math.PI * 1.5,
      distance:100,
      height:20
    };
    var camera = this.root.camera;
    var center = new THREE.Vector3();

    var tl = new TimelineMax({
      onUpdate:function() {
        var x = Math.cos(proxy.angle) * proxy.distance;
        var y = proxy.height;
        var z = Math.sin(proxy.angle) * proxy.distance;

        camera.position.set(x, y, z);
        camera.lookAt(center);
      }
    });

    tl.to(proxy, duration, {angle:Math.PI * -1.5, distance:24, height:0, ease:Power1.easeInOut});

    return tl;
  }
};

window.globe = new Globe();
