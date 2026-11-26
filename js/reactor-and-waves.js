(function (global) {
  'use strict';

  var CIPHER = global.CIPHER;

  function buildMark6ReactorSvg(uidPrefix) {
    var p = String(uidPrefix || 'mk6');
    var cx = 130;
    var cy = 130;

    function polar(r, deg) {
      var rad = (deg * Math.PI) / 180;
      return {
        x: (cx + r * Math.cos(rad)).toFixed(2),
        y: (cy + r * Math.sin(rad)).toFixed(2)
      };
    }

    var socketsMarkup = '';
    var coilsMarkup = '';
    var strutsMarkup = '';
    for (var i = 0; i < 8; i++) {
      var aStart = i * 45 - 15.5;
      var aEnd = i * 45 + 15.5;
      var sO1 = polar(73, aStart - 1.4);
      var sO2 = polar(73, aEnd + 1.4);
      var sI2 = polar(46, aEnd);
      var sI1 = polar(46, aStart);
      var sd =
        'M ' + sO1.x + ' ' + sO1.y +
        ' A 73 73 0 0 1 ' + sO2.x + ' ' + sO2.y +
        ' L ' + sI2.x + ' ' + sI2.y +
        ' A 46 46 0 0 0 ' + sI1.x + ' ' + sI1.y + ' Z';
      socketsMarkup += '<path d="' + sd + '" fill="#02060c" stroke="#1e293b" stroke-width="1.2" />';

      var o1 = polar(69.5, aStart);
      var o2 = polar(69.5, aEnd);
      var i2 = polar(48.5, aEnd - 1.2);
      var i1 = polar(48.5, aStart + 1.2);
      var d =
        'M ' + o1.x + ' ' + o1.y +
        ' A 69.5 69.5 0 0 1 ' + o2.x + ' ' + o2.y +
        ' L ' + i2.x + ' ' + i2.y +
        ' A 48.5 48.5 0 0 0 ' + i1.x + ' ' + i1.y + ' Z';
      coilsMarkup +=
        '<path d="' + d + '" fill="url(#' + p + 'CoilGrad)" stroke="#e0f9ff" stroke-opacity="0.72" stroke-width="0.8" />';

      var divAng = i * 45 + 22.5;
      var d1 = polar(45, divAng);
      var d2 = polar(76, divAng);
      strutsMarkup +=
        '<line x1="' + d1.x + '" y1="' + d1.y + '" x2="' + d2.x + '" y2="' + d2.y + '" stroke="#070c14" stroke-width="4.5" />' +
        '<line x1="' + d1.x + '" y1="' + d1.y + '" x2="' + d2.x + '" y2="' + d2.y + '" stroke="#3b5270" stroke-opacity="0.65" stroke-width="1.2" />';
    }

    var ticksMarkup = '';
    for (var t = 0; t < 16; t++) {
      var ang = t * 22.5;
      var p1 = polar(78, ang);
      var p2 = polar(87, ang);
      ticksMarkup +=
        '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y + '" stroke="#020617" stroke-width="1.8" stroke-opacity="0.85" />' +
        '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y + '" stroke="#3b5270" stroke-width="0.6" stroke-opacity="0.45" />';
    }

    var emittersMarkup = '';
    var cardinals = [-90, 0, 90, 180];
    for (var e = 0; e < cardinals.length; e++) {
      var ep = polar(83, cardinals[e]);
      emittersMarkup +=
        '<circle cx="' + ep.x + '" cy="' + ep.y + '" r="5.2" fill="#070c14" stroke="#334155" stroke-width="1" />' +
        '<circle cx="' + ep.x + '" cy="' + ep.y + '" r="4.2" fill="#00d2ff" fill-opacity="0.55" filter="url(#' + p + 'Bloom)" />' +
        '<circle cx="' + ep.x + '" cy="' + ep.y + '" r="2" fill="#ffffff" />';
    }

    return (
      '<svg viewBox="0 0 260 260" class="w-full h-full" fill="none" aria-hidden="true">' +
      '<defs>' +
      '<filter id="' + p + 'Bloom" x="-45%" y="-45%" width="190%" height="190%">' +
      '<feGaussianBlur stdDeviation="4.8" result="blur" />' +
      '<feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>' +
      '</filter>' +
      '<radialGradient id="' + p + 'Ambient" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="#00d2ff" stop-opacity="0.44" />' +
      '<stop offset="52%" stop-color="#0369a1" stop-opacity="0.18" />' +
      '<stop offset="100%" stop-color="#000000" stop-opacity="0" />' +
      '</radialGradient>' +
      '<linearGradient id="' + p + 'HousingMetal" x1="12%" y1="8%" x2="88%" y2="92%">' +
      '<stop offset="0%" stop-color="#3b5270" />' +
      '<stop offset="22%" stop-color="#182436" />' +
      '<stop offset="48%" stop-color="#2d3e56" />' +
      '<stop offset="74%" stop-color="#0c1320" />' +
      '<stop offset="100%" stop-color="#070c14" />' +
      '</linearGradient>' +
      '<linearGradient id="' + p + 'InnerBevelMetal" x1="85%" y1="15%" x2="15%" y2="85%">' +
      '<stop offset="0%" stop-color="#2d3e56" />' +
      '<stop offset="45%" stop-color="#0c1320" />' +
      '<stop offset="100%" stop-color="#3b5270" />' +
      '</linearGradient>' +
      '<linearGradient id="' + p + 'Sheen" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.22" />' +
      '<stop offset="40%" stop-color="#e0f2fe" stop-opacity="0" />' +
      '<stop offset="100%" stop-color="#94a3b8" stop-opacity="0.10" />' +
      '</linearGradient>' +
      '<radialGradient id="' + p + 'CoilGrad" cx="50%" cy="50%" r="56%">' +
      '<stop offset="0%" stop-color="#ffffff" />' +
      '<stop offset="38%" stop-color="#38e8ff" />' +
      '<stop offset="72%" stop-color="#00d2ff" />' +
      '<stop offset="100%" stop-color="#0369a1" />' +
      '</radialGradient>' +
      '<radialGradient id="' + p + 'TriCoreGrad" cx="50%" cy="42%" r="60%">' +
      '<stop offset="0%" stop-color="#ffffff" />' +
      '<stop offset="45%" stop-color="#bae6fd" />' +
      '<stop offset="80%" stop-color="#38e8ff" />' +
      '<stop offset="100%" stop-color="#0369a1" />' +
      '</radialGradient>' +
      '</defs>' +

      '<circle cx="130" cy="130" r="122" fill="url(#' + p + 'Ambient)" />' +

      '<g class="cipher-ring-cw">' +
      '<circle cx="130" cy="130" r="115" stroke="#00D8FF" stroke-opacity="0.32" stroke-width="1" stroke-dasharray="58 28 16 30" />' +
      '<circle cx="130" cy="130" r="105" stroke="#38BDF8" stroke-opacity="0.5" stroke-width="1.4" stroke-dasharray="76 34 22 36" />' +
      '</g>' +
      '<g class="cipher-ring-ccw">' +
      '<circle cx="130" cy="130" r="98" stroke="#00d2ff" stroke-opacity="0.28" stroke-width="1" stroke-dasharray="40 24 14 26" />' +
      '</g>' +

      '<circle cx="130" cy="130" r="92" fill="url(#' + p + 'HousingMetal)" stroke="#00d2ff" stroke-opacity="0.35" stroke-width="1.2" />' +
      '<circle cx="130" cy="130" r="90.5" stroke="url(#' + p + 'Sheen)" stroke-width="1.6" />' +
      '<circle cx="130" cy="130" r="85" stroke="#070c14" stroke-width="1.4" />' +
      '<circle cx="130" cy="130" r="76" fill="#04080f" stroke="#182436" stroke-width="1.8" />' +
      ticksMarkup +
      emittersMarkup +

      socketsMarkup +
      '<g filter="url(#' + p + 'Bloom)">' + coilsMarkup + '</g>' +
      '<g>' + coilsMarkup + '</g>' +
      strutsMarkup +

      '<circle cx="130" cy="130" r="46" fill="url(#' + p + 'InnerBevelMetal)" stroke="#38BDF8" stroke-opacity="0.45" stroke-width="1.2" />' +
      '<circle cx="130" cy="130" r="41" fill="#060c15" stroke="#020617" stroke-width="2" />' +
      '<circle cx="130" cy="130" r="39" stroke="#2d3e56" stroke-opacity="0.5" stroke-width="0.9" />' +

      '<polygon points="130,165 92,102 168,102" fill="#0c1320" stroke="#3b5270" stroke-width="1.6" />' +
      '<polygon points="130,160 97,105 163,105" fill="url(#' + p + 'TriCoreGrad)" filter="url(#' + p + 'Bloom)" stroke="#e0f9ff" stroke-width="1" />' +
      '<line x1="92" y1="102" x2="112" y2="115" stroke="#0c1320" stroke-width="3.2" />' +
      '<line x1="168" y1="102" x2="148" y2="115" stroke="#0c1320" stroke-width="3.2" />' +
      '<line x1="130" y1="165" x2="130" y2="146" stroke="#0c1320" stroke-width="3.2" />' +
      '<polygon points="130,149 109,114 151,114" fill="#070c14" stroke="#38BDF8" stroke-opacity="0.8" stroke-width="1.2" />' +
      '<polygon points="130,143 114,117 146,117" fill="#ffffff" filter="url(#' + p + 'Bloom)" />' +
      '</svg>'
    );
  }

  function buildCenterReactorSvg() {
    var wrap = document.createElement('div');
    wrap.className = 'flex items-center justify-center py-1';
    wrap.innerHTML =
      '<div class="relative w-[240px] h-[240px] md:w-[250px] md:h-[250px] lg:w-[290px] lg:h-[290px] flex items-center justify-center cipher-reactor-core">' +
      buildMark6ReactorSvg('ws') +
      '</div>';
    return wrap;
  }

  function init2DWaveFallback() {
    var dom = CIPHER.dom;
    var state = CIPHER.state;
    if (dom.waveCanvas3d) dom.waveCanvas3d.style.display = 'none';
    if (!dom.waveCanvas2d) return;
    dom.waveCanvas2d.classList.remove('hidden');
    var ctx = dom.waveCanvas2d.getContext('2d');
    if (!ctx) return;

    var parentEl = dom.waveCanvas2d.parentElement || document.body;
    function resize() {
      dom.waveCanvas2d.width = Math.max(parentEl.clientWidth, 1);
      dom.waveCanvas2d.height = Math.max(parentEl.clientHeight, 1);
    }
    resize();
    global.addEventListener('resize', resize);

    var t = 0;
    function tick() {
      global.requestAnimationFrame(tick);
      if (state.hudWaveEnabled) t += 0.02;
      var w = dom.waveCanvas2d.width;
      var h = dom.waveCanvas2d.height;
      ctx.clearRect(0, 0, w, h);

      for (var layer = 0; layer < 4; layer++) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 229, 255, ' + (0.08 + layer * 0.04) + ')';
        ctx.lineWidth = 1.2;
        for (var x = 0; x <= w; x += 14) {
          var y = h - 75 + layer * 14 + Math.sin(x * 0.012 + t + layer) * 18;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    tick();
  }

  function initWaveBackdrop() {
    var dom = CIPHER.dom;
    var state = CIPHER.state;
    if (typeof global.THREE === 'undefined' || !dom.waveCanvas3d) {
      init2DWaveFallback();
      return;
    }

    var renderer = null;
    try {
      renderer = new global.THREE.WebGLRenderer({ canvas: dom.waveCanvas3d, antialias: true, alpha: true });
    } catch (err) {
      init2DWaveFallback();
      return;
    }

    var scene = new global.THREE.Scene();
    var parentEl = dom.waveCanvas3d.parentElement || document.body;
    var w = Math.max(parentEl.clientWidth, 1);
    var h = Math.max(parentEl.clientHeight, 1);

    var camera = new global.THREE.PerspectiveCamera(48, w / h, 0.1, 100);
    camera.position.set(0, 4.2, 16);
    camera.lookAt(0, -1.6, 0);

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);

    var cols = 64;
    var rows = 22;
    var count = cols * rows;
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);

    var idx = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = (c / (cols - 1) - 0.5) * 34;
        var z = (r / (rows - 1) - 0.5) * 14;
        positions[idx * 3] = x;
        positions[idx * 3 + 1] = -3.4;
        positions[idx * 3 + 2] = z;

        var edgeFade = 1 - Math.abs(c / (cols - 1) - 0.5) * 0.6;
        colors[idx * 3] = 0.0;
        colors[idx * 3 + 1] = 0.72 * edgeFade;
        colors[idx * 3 + 2] = 1.0 * edgeFade;
        idx++;
      }
    }

    var geo = new global.THREE.BufferGeometry();
    geo.setAttribute('position', new global.THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new global.THREE.BufferAttribute(colors, 3));

    var mat = new global.THREE.PointsMaterial({
      size: 0.11,
      vertexColors: true,
      transparent: true,
      opacity: 0.48,
      depthWrite: false
    });

    var points = new global.THREE.Points(geo, mat);
    scene.add(points);

    function handleResize() {
      var nw = Math.max(parentEl.clientWidth, 1);
      var nh = Math.max(parentEl.clientHeight, 1);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    }
    global.addEventListener('resize', handleResize);
    if (typeof global.ResizeObserver !== 'undefined') {
      new global.ResizeObserver(handleResize).observe(parentEl);
    }

    var t = 0;
    function animate() {
      global.requestAnimationFrame(animate);
      if (state.hudWaveEnabled) {
        t += 0.018;
      }
      var posAttr = geo.attributes.position;
      var k = 0;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = posAttr.getX(k);
          var z = posAttr.getZ(k);
          var y =
            -3.5 +
            Math.sin(x * 0.34 + t) * 0.52 +
            Math.cos(z * 0.45 + t * 0.8) * 0.38;
          posAttr.setY(k, y);
          k++;
        }
      }
      posAttr.needsUpdate = true;
      renderer.render(scene, camera);
    }
    animate();
  }

  function bindReactorTilt() {
    global.addEventListener('mousemove', function (e) {
      var state = CIPHER.state;
      var dom = CIPHER.dom;
      if (state.screen === 'intro' && dom.introReactorWrap && state.hudWaveEnabled) {
        var nx = (e.clientX / Math.max(global.innerWidth, 1) - 0.5) * 14;
        var ny = (e.clientY / Math.max(global.innerHeight, 1) - 0.5) * 12;
        dom.introReactorWrap.style.transform =
          'perspective(600px) rotateY(' + nx.toFixed(2) + 'deg) rotateX(' + (-ny).toFixed(2) + 'deg)';
      }
    });
  }

  CIPHER.buildMark6ReactorSvg = buildMark6ReactorSvg;
  CIPHER.buildCenterReactorSvg = buildCenterReactorSvg;
  CIPHER.initWaveBackdrop = initWaveBackdrop;
  CIPHER.bindReactorTilt = bindReactorTilt;
})(window);
