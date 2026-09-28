(function (global) {
  var PURPLE = [179 / 255, 136 / 255, 1];
  var CYAN = [61 / 255, 1, 242 / 255];
  var MAGENTA = [1, 43 / 255, 214 / 255];
  var ACID = [230 / 255, 1, 61 / 255];

  var ACCENT = {
    home: PURPLE,
    music: ACID,
    gallery: MAGENTA,
    about: CYAN,
    links: CYAN,
    guestbook: PURPLE
  };

  var VERT = [
    "attribute vec2 a_pos;",
    "void main(){gl_Position=vec4(a_pos,0.0,1.0);}"
  ].join("");

  var FRAG = [
    "precision mediump float;",
    "uniform vec2 u_resolution;",
    "uniform float u_time;",
    "uniform vec2 u_pointer;",
    "uniform vec3 u_accent;",
    "uniform float u_margin;",
    "float hash(vec2 p){",
    "vec2 q=fract(p*vec2(0.1031,0.11369));",
    "q+=dot(q,q.yx+19.19);",
    "return fract(q.x*q.y);",
    "}",
    "vec3 fieldAt(vec2 frag){",
    "vec2 uv=frag/u_resolution;",
    "vec3 bg=vec3(0.0275,0.0235,0.0431);",
    "vec3 bg2=vec3(0.0706,0.0588,0.0941);",
    "float plate=step(0.56,uv.x)*step(uv.x,0.96)*step(0.04,uv.y);",
    "vec3 col=mix(bg,mix(bg2,u_accent,0.16),plate);",
    "float stripe=step(0.62,fract(uv.y*11.0));",
    "col=mix(col,u_accent,stripe*0.07);",
    "float line=max(step(0.96,fract(uv.x*36.0)),step(0.96,fract(uv.y*20.0)));",
    "col=mix(col,u_accent,line*0.14);",
    "float left=step(frag.x,u_margin);",
    "float right=step(u_resolution.x-u_margin,frag.x);",
    "col=mix(col,u_accent,clamp(left+right,0.0,1.0));",
    "float notch=step(u_resolution.x-u_margin,frag.x)*step(frag.y,u_margin);",
    "col=mix(col,bg,notch);",
    "float hair=step(u_resolution.x-u_margin-3.0,frag.x)*step(frag.x,u_resolution.x-u_margin);",
    "col=mix(col,vec3(0.239,1.0,0.949),hair*(1.0-notch));",
    "return col;",
    "}",
    "void main(){",
    "vec2 frag=gl_FragCoord.xy;",
    "vec3 col=fieldAt(frag);",
    "float cycle=mod(u_time,6.2);",
    "float on=step(cycle,0.28);",
    "float tearY=hash(vec2(floor(u_time/6.2),2.7))*u_resolution.y;",
    "tearY+=(u_pointer.y-0.5)*10.0;",
    "if(on>0.5 && abs(frag.y-tearY)<7.0){",
    "float shift=8.0+(u_pointer.x-0.5)*10.0;",
    "vec3 r=fieldAt(frag+vec2(shift+5.0,0.0));",
    "vec3 g=fieldAt(frag+vec2(shift,0.0));",
    "vec3 b=fieldAt(frag+vec2(shift-5.0,0.0));",
    "col=vec3(r.r,g.g,b.b);",
    "}",
    "float grain=hash(frag+vec2(floor(u_time*12.0),4.2));",
    "col+=(grain-0.5)*0.045;",
    "vec2 uv=frag/u_resolution;",
    "float vig=smoothstep(0.95,0.42,length(uv-0.5));",
    "col*=mix(0.82,1.0,vig);",
    "gl_FragColor=vec4(col,1.0);",
    "}"
  ].join("");

  function compile(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function bufferSize() {
    var cssW = Math.max(window.innerWidth || 480, 1);
    var cssH = Math.max(window.innerHeight || 270, 1);
    var w = Math.round(Math.max(192, Math.min(480, cssW * 0.5)));
    var h = Math.round(w * cssH / cssW);
    h = Math.max(1, Math.min(854, h));
    return [w, h];
  }

  function marginFor(width) {
    var cssW = Math.max(window.innerWidth || 1, 1);
    var content = Math.min(1120, cssW - 32);
    var side = Math.max(0, (cssW - content) / 2);
    var scale = width / cssW;
    return Math.min(side * scale * 0.92, width * 0.18);
  }

  function startSignalField(canvas) {
    if (!canvas || !canvas.getContext) return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

    var gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power"
    });
    if (!gl) return false;

    var released = false;
    function release() {
      if (released) return;
      released = true;
      canvas.classList.remove("is-field");
      var ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
    }

    try {
      var vs = compile(gl, gl.VERTEX_SHADER, VERT);
      var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) {
        release();
        return false;
      }
      var program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        release();
        return false;
      }
      gl.useProgram(program);

      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, 1, 1
      ]), gl.STATIC_DRAW);
      var pos = gl.getAttribLocation(program, "a_pos");
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

      var loc = {
        resolution: gl.getUniformLocation(program, "u_resolution"),
        time: gl.getUniformLocation(program, "u_time"),
        pointer: gl.getUniformLocation(program, "u_pointer"),
        accent: gl.getUniformLocation(program, "u_accent"),
        margin: gl.getUniformLocation(program, "u_margin")
      };

      var page = document.body.getAttribute("data-page") || "home";
      var accent = ACCENT[page] || PURPLE;
      var pointer = [0.5, 0.5];
      var t0 = 0;
      var raf = 0;

      function resize() {
        var size = bufferSize();
        if (canvas.width !== size[0] || canvas.height !== size[1]) {
          canvas.width = size[0];
          canvas.height = size[1];
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(loc.resolution, canvas.width, canvas.height);
        gl.uniform3f(loc.accent, accent[0], accent[1], accent[2]);
        gl.uniform1f(loc.margin, marginFor(canvas.width));
      }

      function draw(now) {
        if (!t0) t0 = now;
        gl.uniform1f(loc.time, (now - t0) * 0.001);
        gl.uniform2f(loc.pointer, pointer[0], pointer[1]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      function loop(now) {
        draw(now);
        raf = global.requestAnimationFrame(loop);
      }

      function onPointer(event) {
        var w = global.innerWidth || 1;
        var h = global.innerHeight || 1;
        pointer[0] = event.clientX / w;
        pointer[1] = event.clientY / h;
      }

      function onVisibility() {
        if (document.hidden) {
          if (raf) global.cancelAnimationFrame(raf);
          raf = 0;
          return;
        }
        if (!raf) raf = global.requestAnimationFrame(loop);
      }

      resize();
      canvas.classList.add("is-field");
      global.addEventListener("pointermove", onPointer, { passive: true });
      global.addEventListener("resize", resize);
      document.addEventListener("visibilitychange", onVisibility);
      canvas.addEventListener("webglcontextlost", function (event) {
        event.preventDefault();
        if (raf) global.cancelAnimationFrame(raf);
        raf = 0;
      });
      if (!document.hidden) raf = global.requestAnimationFrame(loop);
      return true;
    } catch (err) {
      release();
      return false;
    }
  }

  global.purpleglitchField = startSignalField;
})(window);
