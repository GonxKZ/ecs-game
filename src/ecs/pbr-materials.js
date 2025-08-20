/**
 * Sistema de Materiales PBR para ECS
 * Implementa estrategia PBR coherente con texturas comprimidas y gestión sRGB
 */

export class PBRMaterialSystem {
  constructor(renderer) {
    this.renderer = renderer;

    // Configuración de tone mapping
    this.setupToneMapping();

    // Cache de materiales y texturas
    this.materialCache = new Map();
    this.textureCache = new Map();

    // Configuración PBR por defecto
    this.defaultPBRSettings = {
      metalness: 0.0,
      roughness: 0.8,
      envMapIntensity: 1.0,
      aoMapIntensity: 1.0,
      emissiveIntensity: 1.0,
      normalScale: 1.0
    };

    // Texturas de entorno para IBL
    this.environmentMaps = {
      intensity: 1.0,
      blur: 0.8
    };

    this.name = 'PBRMaterials';
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    const startTime = performance.now();

    // Actualizar materiales que requieren animación
    this.updateAnimatedMaterials(world, deltaTime);

    // Aplicar configuraciones globales PBR
    this.applyGlobalPBRSettings();

    this.lastExecutionTime = performance.now() - startTime;
  }

  setupToneMapping() {
    // Configuración de tone mapping para PBR
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Configuración de sombras PBR
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Configuración de precisión
    this.renderer.precision = 'highp';

    console.log('🎨 Tone mapping configurado para PBR');
  }

  createPBRMaterial(materialRef) {
    if (!materialRef) {
      // Material PBR por defecto
      return this.createDefaultPBRMaterial();
    }

    const cacheKey = this.getMaterialCacheKey(materialRef);

    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey);
    }

    // Crear material PBR
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(
        materialRef.color_r || 1.0,
        materialRef.color_g || 1.0,
        materialRef.color_b || 1.0
      ),
      metalness: materialRef.metalness !== undefined ? materialRef.metalness : this.defaultPBRSettings.metalness,
      roughness: materialRef.roughness !== undefined ? materialRef.roughness : this.defaultPBRSettings.roughness,
      emissive: new THREE.Color(
        materialRef.emissive_r || 0,
        materialRef.emissive_g || 0,
        materialRef.emissive_b || 0
      ),
      transparent: materialRef.transparent || false,
      opacity: materialRef.opacity !== undefined ? materialRef.opacity : 1.0,

      // Configuración de mapas
      aoMapIntensity: this.defaultPBRSettings.aoMapIntensity,
      envMapIntensity: this.environmentMaps.intensity,
      normalScale: new THREE.Vector2(this.defaultPBRSettings.normalScale),

      // Side rendering
      side: THREE.FrontSide,
      shadowSide: THREE.FrontSide
    });

    // Cargar texturas si están especificadas
    if (materialRef.textureResource) {
      this.loadTexture(materialRef.textureResource).then(texture => {
        if (texture) {
          material.map = texture;
          material.needsUpdate = true;
        }
      });
    }

    if (materialRef.normalMapResource) {
      this.loadTexture(materialRef.normalMapResource).then(texture => {
        if (texture) {
          texture.encoding = THREE.LinearEncoding;
          material.normalMap = texture;
          material.needsUpdate = true;
        }
      });
    }

    // Cachear material
    this.materialCache.set(cacheKey, material);
    return material;
  }

  createDefaultPBRMaterial() {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.8, 0.8, 0.8),
      metalness: this.defaultPBRSettings.metalness,
      roughness: this.defaultPBRSettings.roughness,
      envMapIntensity: this.environmentMaps.intensity
    });
  }

  async loadTexture(texturePath) {
    const cacheKey = texturePath;

    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey);
    }

    try {
      // Intentar cargar como KTX2 primero
      const ktx2Loader = new THREE.KTX2Loader();
      ktx2Loader.setTranscoderPath('/path/to/basis/');

      const texture = await new Promise((resolve, reject) => {
        // Simular carga de textura KTX2 (en implementación real usar loader)
        const loader = new THREE.TextureLoader();
        loader.load(
          texturePath,
          (texture) => {
            texture.encoding = THREE.sRGBEncoding;
            texture.flipY = false;
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;

            this.textureCache.set(cacheKey, texture);
            resolve(texture);
          },
          undefined,
          reject
        );
      });

      return texture;
    } catch (error) {
      console.warn(`Error cargando textura ${texturePath}:`, error);
      return null;
    }
  }

  getMaterialCacheKey(materialRef) {
    if (!materialRef) return 'default_pbr';

    return `pbr_${materialRef.materialType}_${materialRef.color_r}_${materialRef.color_g}_${materialRef.color_b}_${materialRef.metalness}_${materialRef.roughness}_${materialRef.textureResource || 'none'}`;
  }

  updateAnimatedMaterials(world, deltaTime) {
    // Actualizar materiales que requieren animación
    // (por ejemplo, materiales con tiempo animado)
    const animatedMaterials = world.queryEntities({
      components: ['MaterialRef', 'Animation']
    });

    for (const entityId of animatedMaterials) {
      const materialRef = world.getComponent(entityId, 'MaterialRef');
      const animation = world.getComponent(entityId, 'Animation');

      if (materialRef && animation && animation.isPlaying) {
        const material = this.getCachedMaterial(materialRef);
        if (material) {
          // Ejemplo: animar metalness
          const time = animation.currentTime / animation.duration;
          material.metalness = Math.sin(time * Math.PI * 2) * 0.5 + 0.5;
          material.needsUpdate = true;
        }
      }
    }
  }

  applyGlobalPBRSettings() {
    // Aplicar configuraciones globales PBR
    this.renderer.toneMappingExposure = this.environmentMaps.intensity;

    // Actualizar entorno si existe
    if (this.environmentMap) {
      this.scene.environment = this.environmentMap;
      this.scene.background = this.environmentMap;
    }
  }

  // Efectos especiales con onBeforeCompile
  createGlowMaterial(baseMaterial) {
    const material = baseMaterial.clone();

    material.onBeforeCompile = (shader) => {
      // Inyectar código de glow en el shader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vPosition;
        varying vec3 vNormal;
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vPosition = position;
        vNormal = normal;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        uniform float glowIntensity;
        uniform vec3 glowColor;
        varying vec3 vPosition;
        varying vec3 vNormal;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>

        // Efecto glow
        float fresnel = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
        vec3 glow = glowColor * glowIntensity * fresnel;
        gl_FragColor.rgb += glow;
        `
      );

      // Añadir uniforms
      shader.uniforms.glowIntensity = { value: 0.5 };
      shader.uniforms.glowColor = { value: new THREE.Color(0x00ff88) };
    };

    material.needsUpdate = true;
    return material;
  }

  createDissolveMaterial(baseMaterial) {
    const material = baseMaterial.clone();

    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        uniform float dissolveThreshold;
        uniform float dissolveEdgeWidth;
        uniform vec3 dissolveEdgeColor;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>

        // Efecto dissolve
        float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        if (noise < dissolveThreshold) {
          discard;
        }

        // Borde del dissolve
        if (noise < dissolveThreshold + dissolveEdgeWidth) {
          gl_FragColor.rgb = mix(gl_FragColor.rgb, dissolveEdgeColor, 0.8);
        }
        `
      );

      // Añadir uniforms
      shader.uniforms.dissolveThreshold = { value: 0.5 };
      shader.uniforms.dissolveEdgeWidth = { value: 0.05 };
      shader.uniforms.dissolveEdgeColor = { value: new THREE.Color(0xff4444) };
    };

    material.needsUpdate = true;
    return material;
  }

  // Utilidades para gestión de recursos
  clearCache() {
    // Limpiar materiales
    this.materialCache.forEach(material => {
      material.dispose();
    });
    this.materialCache.clear();

    // Limpiar texturas
    this.textureCache.forEach(texture => {
      texture.dispose();
    });
    this.textureCache.clear();
  }

  setEnvironmentMap(envMap) {
    this.environmentMap = envMap;
    this.scene.environment = envMap;
  }

  setToneMapping(mode, exposure = 1.0) {
    const modes = {
      'aces': THREE.ACESFilmicToneMapping,
      'cineon': THREE.CineonToneMapping,
      'linear': THREE.LinearToneMapping,
      'reinhard': THREE.ReinhardToneMapping
    };

    this.renderer.toneMapping = modes[mode] || THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = exposure;

    console.log(`🎨 Tone mapping cambiado a ${mode} con exposición ${exposure}`);
  }

  // Obtener estadísticas
  getStats() {
    return {
      materialsCached: this.materialCache.size,
      texturesCached: this.textureCache.size,
      toneMapping: this.renderer.toneMapping,
      toneMappingExposure: this.renderer.toneMappingExposure,
      outputColorSpace: this.renderer.outputColorSpace
    };
  }
}

/**
 * Utilidades para materiales PBR
 */
export class PBRUtils {
  static createPresetMaterials() {
    return {
      plastic: {
        color_r: 1.0, color_g: 1.0, color_b: 1.0,
        metalness: 0.0, roughness: 0.4
      },
      metal: {
        color_r: 0.8, color_g: 0.8, color_b: 0.9,
        metalness: 1.0, roughness: 0.2
      },
      wood: {
        color_r: 0.6, color_g: 0.3, color_b: 0.1,
        metalness: 0.0, roughness: 0.8
      },
      glass: {
        color_r: 0.9, color_g: 0.95, color_b: 1.0,
        metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.3
      },
      rubber: {
        color_r: 0.2, color_g: 0.2, color_b: 0.2,
        metalness: 0.0, roughness: 1.0
      }
    };
  }

  static validatePBRProperties(materialRef) {
    const issues = [];

    // Validar metalness
    if (materialRef.metalness < 0 || materialRef.metalness > 1) {
      issues.push('metalness debe estar entre 0 y 1');
    }

    // Validar roughness
    if (materialRef.roughness < 0 || materialRef.roughness > 1) {
      issues.push('roughness debe estar entre 0 y 1');
    }

    // Validar colores
    ['color_r', 'color_g', 'color_b'].forEach(comp => {
      if (materialRef[comp] < 0 || materialRef[comp] > 1) {
        issues.push(`${comp} debe estar entre 0 y 1`);
      }
    });

    return issues;
  }

  static getPBRRecommendations(materialType) {
    const recommendations = {
      metal: {
        metalness: [0.8, 1.0],
        roughness: [0.0, 0.3],
        tip: 'Los metales requieren metalness alto y roughness bajo'
      },
      plastic: {
        metalness: [0.0, 0.1],
        roughness: [0.3, 0.6],
        tip: 'Los plásticos tienen metalness bajo y roughness medio'
      },
      wood: {
        metalness: [0.0, 0.1],
        roughness: [0.6, 1.0],
        tip: 'La madera tiene variaciones de rugosidad altas'
      },
      fabric: {
        metalness: [0.0, 0.05],
        roughness: [0.8, 1.0],
        tip: 'Las telas son difusas con alta rugosidad'
      }
    };

    return recommendations[materialType] || {
      metalness: [0.0, 0.5],
      roughness: [0.3, 0.7],
      tip: 'Rango medio para materiales estándar'
    };
  }
}
