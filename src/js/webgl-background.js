export function initWebGLBackground() {
  const canvas = document.querySelector("#webgl-bg");
  if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas?.classList.add("is-unavailable");
    return;
  }

  const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false });
  if (!gl) {
    canvas.classList.add("is-unavailable");
    return;
  }

  const vertex = `#version 300 es
    in vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }`;

  const fragment = `#version 300 es
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    out vec4 outColor;

    float line(vec2 p, vec2 a, vec2 b) {
      vec2 pa = p - a;
      vec2 ba = b - a;
      float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      return smoothstep(0.018, 0.0, length(pa - ba * h));
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec2 p = uv * 2.0 - 1.0;
      p.x *= resolution.x / resolution.y;
      float t = time * 0.08;
      float glow = 0.0;
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        vec2 a = vec2(sin(t + fi * 1.7), cos(t * 0.7 + fi * 1.1)) * 0.62;
        vec2 b = vec2(cos(t * 0.9 + fi * 1.3), sin(t + fi * 0.8)) * 0.62;
        glow += line(p, a, b) * 0.18;
      }
      float node = smoothstep(0.045, 0.0, length(fract((uv + vec2(t * 0.03, 0.0)) * 8.0) - 0.5)) * 0.05;
      vec3 ink = vec3(0.18, 0.17, 0.15);
      vec3 wine = vec3(0.46, 0.14, 0.19);
      outColor = vec4(mix(ink, wine, uv.x), clamp(glow + node, 0.0, 0.24));
    }`;

  const program = createProgram(gl, vertex, fragment);
  if (!program) {
    canvas.classList.add("is-unavailable");
    return;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, "position");
  const resolution = gl.getUniformLocation(program, "resolution");
  const time = gl.getUniformLocation(program, "time");
  gl.useProgram(program);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const draw = (now) => {
    resize();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform1f(time, now * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}
