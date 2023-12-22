const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl");

const vertexShaderSource = `
attribute vec4 position;
uniform mat4 u_projection;

void main() {
    gl_Position = position;
}
`;

const fragmentShaderSource = `
precision mediump float;

uniform vec2 u_canvas_resolution;
uniform vec2 u_screen_resolution;
uniform float u_time;
uniform vec2 u_mouse;

vec2 Hash(vec2 P) {
    return fract(cos(P * mat2(-64.2, 71.3, 81.4, -29.8))); 
}

float Worley(vec2 P) {
    float Dist = 1.0;
    vec2 I = floor(P);
    vec2 F = fract(P);
    
    for(int X = -1; X <= 1; X++) {
        for(int Y = -1; Y <= 1; Y++) {
            float D = distance(Hash(I + vec2(X, Y)) + vec2(X, Y), F);
            Dist = min(Dist, D);
        }
    }
    return Dist;
}

vec2 RadialShear(vec2 uv, vec2 center, float strength, vec2 offset) 
{
    vec2 delta = uv - center;
    float delta2 = dot(delta.xy, delta.xy);
    vec2 delta_offset = vec2(1.0, 1.0) * delta2 * strength;
    return uv + vec2(delta.y, -delta.x) * delta_offset + offset;
}

// Help on these functions from: https://www.shadertoy.com/view/dlScDt
float gyroid (vec3 seed) { 
    return dot(sin(seed), cos(seed.yzx)); 
}

float FBM (vec3 seed)
{
    float result = 0.0;
    float a = 0.5;
    for (int i = 0; i < 6; ++i) {
        a /= 2.0;
        seed.x += u_time * 0.01 / a;
        seed.z += result * 0.5;
        result += gyroid(seed / a) * a;
    }
    return result;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_canvas_resolution;

    vec2 screenPos = uv * u_screen_resolution;

    vec2 mouse = u_mouse;
    mouse.y = u_screen_resolution.y - mouse.y;

    // Worley
    float amp = 0.625;
    float freqTime = 0.1;
    float freqSpace = 100.0;

    vec2 timeOffset = vec2(0.0);

    timeOffset.x = -u_time;
    timeOffset.y = 0.2 * sin(u_time);

    float noise = amp * Worley(screenPos / freqSpace + freqTime * timeOffset);
    noise = pow(noise, 2.0);

    float distanceToMouse = 1.0 - (distance(screenPos, mouse) / u_screen_resolution.y);

    // FMB
    vec2 p = (2.0 * screenPos / u_canvas_resolution);
    float count = 1.0;
    float shades = 3.0;
    float shape = 2.0 * noise * abs(FBM(vec3(p * 1.5, 0.0))) - u_time * 0.1 - p.x * 0.1;
    float gradient = fract(shape * count + p.x);
    vec3 blue = vec3(0.459, 0.765, 1.0);
    vec3 tint = mix(blue * mix(0.6, 0.8, gradient), vec3(1.0), floor(pow(gradient, 4.0) * shades) / shades);
    vec3 color = mix(tint, blue * 0.2, mod(floor(shape * count), 2.0));

    // distanceToMouse = distance(screenPos, mouse);
    // // Adding circle at the mouse location for 3 seconds
    // float radius = 100.0;
    // if (distanceToMouse < radius) {
    //    float ripple = 0.5 * (sin(u_time * 5.0 - distanceToMouse * 0.1) + 1.0);
    //    ripple *= (radius - distanceToMouse) / radius;
    
    //    color = color + (vec3(1.0) - color) * ripple;
    // }

    // color.xy = mouse / u_screen_resolution.x);

    gl_FragColor = vec4(color, 1.0);
}
`;

const circleVertexShaderSource = `
attribute vec2 a_position;
uniform vec2 u_resolution;

void main() {
    vec2 clipSpace = a_position / u_resolution * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}
`;

const circleFragmentShaderSource = `
precision mediump float;
uniform vec4 u_color;

void main() {
    gl_FragColor = u_color;
}
`;

// Create shaders for the circle drawing
const circleVertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(circleVertexShader, circleVertexShaderSource);
gl.compileShader(circleVertexShader);
if (!gl.getShaderParameter(circleVertexShader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the circle vertex shader:', gl.getShaderInfoLog(circleVertexShader));
}

const circleFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(circleFragmentShader, circleFragmentShaderSource);
gl.compileShader(circleFragmentShader);
if (!gl.getShaderParameter(circleFragmentShader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the circle fragment shader:', gl.getShaderInfoLog(circleFragmentShader));
}

const circleProgram = gl.createProgram();
gl.attachShader(circleProgram, circleVertexShader);
gl.attachShader(circleProgram, circleFragmentShader);
gl.linkProgram(circleProgram);
gl.useProgram(circleProgram);
if (!gl.getProgramParameter(circleProgram, gl.LINK_STATUS)) {
    console.error('Unable to initialize the circle shader program: ', gl.getProgramInfoLog(circleProgram));
}

const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader);
if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the vertex shader:', gl.getShaderInfoLog(vertexShader));
}

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader);
if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the fragment shader:', gl.getShaderInfoLog(fragmentShader));
}

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ', gl.getProgramInfoLog(program));
}

const positionLocation = gl.getAttribLocation(program, "position");
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

gl.uniform2f(gl.getUniformLocation(program, "u_canvas_resolution"), canvas.width, canvas.height);

// Getting time and passing to the shader
let startTime = Date.now();
function animate() {
    let currentTime = Date.now();
    let elapsedTime = (currentTime - startTime) / 1000.0 + 8.0; // in seconds
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), elapsedTime);
    gl.uniform2f(gl.getUniformLocation(program, 'u_mouse'), mouse.x, mouse.y);
    gl.uniform2f(gl.getUniformLocation(program, "u_screen_resolution"), window.innerWidth, window.innerHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(animate);
}

// Handling the mouse click event
let mouse = { x: 0, y: 0 };
canvas.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
});

animate();
