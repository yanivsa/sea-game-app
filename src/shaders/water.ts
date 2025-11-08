import * as THREE from 'three'

export const createWaterMaterial = () => {
  const uniforms = {
    uTime: { value: 0 },
    uColorDeep: { value: new THREE.Color(0x06254d) },
    uColorShallow: { value: new THREE.Color(0x0e6aa8) },
    uFoamColor: { value: new THREE.Color(0xffffff) },
    uOpacity: { value: 0.82 },
  }

  const vertexShader = /* glsl */ `
    uniform float uTime;
    varying vec3 vPos;
    varying vec3 vNormal;
    void main() {
      vPos = position;
      vec3 transformed = position;
      float wave1 = sin((position.x + uTime * 1.2) * 1.2) * 0.08;
      float wave2 = sin((position.y + uTime * 0.8) * 1.6) * 0.05;
      float wave3 = cos((position.x - position.y + uTime * 0.6) * 1.4) * 0.04;
      transformed.z += wave1 + wave2 + wave3;
      vec3 newPosition = transformed;
      vNormal = normalize(normal + vec3(wave1 * 0.3, wave2 * 0.3, 1.0));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `

  const fragmentShader = /* glsl */ `
    uniform vec3 uColorDeep;
    uniform vec3 uColorShallow;
    uniform vec3 uFoamColor;
    uniform float uOpacity;
    varying vec3 vPos;
    varying vec3 vNormal;
    void main() {
      float depth = smoothstep(-2.0, 2.0, vPos.y);
      vec3 baseColor = mix(uColorDeep, uColorShallow, depth);
      float fresnel = pow(1.0 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 2.0);
      float foam = smoothstep(0.0, 0.3, abs(vPos.y)) * 0.4;
      vec3 color = mix(baseColor, uFoamColor, foam + fresnel * 0.5);
      gl_FragColor = vec4(color, uOpacity);
    }
  `

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  })
}
