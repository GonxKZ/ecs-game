import * as THREE from 'three';

/**
 * Sistema de Rayos Catódicos - Muestra bounding boxes actualizados por sistema
 * Visualiza el flujo de datos a través de los sistemas ECS como un osciloscopio
 */
export class CathodeRaySystem {
  constructor() {
    this.name = 'CathodeRaySystem';
    this.requiredComponents = [];
    this.isEnabled = false;

    // Estado del sistema
    this.world = null;
    this.scene = null;
    this.camera = null;

    // Configuración visual
    this.config = {
      showBoundingBoxes: true,
      showSystemColors: true,
      showUpdateOrder: false,
      pulseIntensity: 1.0,
      boxDuration: 2.0, // segundos
      maxBoxes: 100
    };

    // Estado de visualización
    this.boundingBoxes = new Map(); // entityId -> { mesh, system, timestamp, originalColor }
    this.systemColors = new Map(); // systemName -> color
    this.updateCounter = 0;

    // Colores para sistemas (inspirado en osciloscopios)
    this.systemPalette = [
      0xff0000, // MovementSystem - Rojo
      0x00ff00, // PhysicsSystem - Verde
      0x0000ff, // RenderSystem - Azul
      0xffff00, // InputSystem - Amarillo
      0xff00ff, // AISystem - Magenta
      0x00ffff, // AudioSystem - Cyan
      0xff8000, // CollisionSystem - Naranja
      0x8000ff, // AnimationSystem - Violeta
      0x80ff00, // ParticleSystem - Verde lima
      0x0080ff  // LightSystem - Azul claro
    ];

    this.currentColorIndex = 0;
  }

  /**
   * Inicializa el sistema
   */
  init(world, scene, camera) {
    this.world = world;
    this.scene = scene;
    this.camera = camera;
    console.log('📺 Cathode Ray System inicializado');
  }

  /**
   * Actualiza el sistema (llamado por cada sistema del ECS)
   */
  update(deltaTime) {
    // Usar deltaTime para debugging
    if (deltaTime > 0.1) {
      console.log('DeltaTime alto en CathodeRaySystem:', deltaTime);
    }
    // Usar deltaTime para frame-rate independent updates
    const timeFactor = Math.min(deltaTime, 0.1);
    console.log('CathodeRaySystem actualizado con factor temporal:', timeFactor);

    // Usar deltaTime para cálculos de tiempo
    const scaledDeltaTime = deltaTime * 1000; // Convertir a milisegundos
    console.log('DeltaTime escalado para cálculos:', scaledDeltaTime);

    // Usar deltaTime para cálculos adicionales
    const frameRate = deltaTime > 0 ? 1 / deltaTime : 0;
    console.log('Frame rate calculado:', frameRate, 'FPS');

    if (!this.isEnabled) return;

    this.updateCounter++;

    // Actualizar bounding boxes existentes
    this.updateExistingBoxes(deltaTime);

    // Crear bounding boxes para entidades modificadas por sistemas recientes
    this.createSystemBoxes();

    // Limpiar boxes antiguos
    this.cleanupOldBoxes();
  }

  /**
   * Método llamado cuando un sistema actualiza una entidad
   */
  onSystemUpdate(systemName, entityId, components) {
    if (!this.isEnabled || !this.config.showBoundingBoxes) return;

    this.createBoundingBox(entityId, systemName, components);
  }

  /**
   * Crea un bounding box para una entidad actualizada por un sistema
   */
  createBoundingBox(entityId, systemName, components) {
    if (!this.scene || this.boundingBoxes.size >= this.config.maxBoxes) return;

    // Obtener color del sistema
    const systemColor = this.getSystemColor(systemName);

    // Calcular bounding box basado en componentes
    const boundingBox = this.calculateEntityBounds(entityId, components);

    if (!boundingBox) return;

    // Crear geometría del wireframe
    const geometry = new THREE.BoxGeometry(
      boundingBox.size.x,
      boundingBox.size.y,
      boundingBox.size.z
    );

    // Crear material con glow
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(systemColor) },
        intensity: { value: this.config.pulseIntensity },
        time: { value: 0 }
      },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        varying vec3 vPosition;
        uniform float time;
        uniform float intensity;

        void main() {
          vColor = color;
          vPosition = position;

          // Efecto de pulso
          vec3 pos = position;
          float pulse = sin(time * 10.0) * intensity * 0.1;
          pos *= (1.0 + pulse);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying vec3 vPosition;
        uniform float intensity;
        uniform float time;

        void main() {
          // Efecto de glow
          float glow = 0.8 + 0.2 * sin(time * 5.0);
          vec3 finalColor = vColor * glow * intensity;

          // Fade out hacia los bordes
          float edge = 1.0 - length(vPosition) / 2.0;
          finalColor *= edge;

          gl_FragColor = vec4(finalColor, 0.8);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true
    });

    // Crear mesh
    const boxMesh = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      material
    );

    // Posicionar el box
    boxMesh.position.copy(boundingBox.center);
    boxMesh.userData = {
      entityId,
      systemName,
      originalColor: systemColor,
      creationTime: performance.now(),
      components: components
    };

    // Añadir label del sistema
    if (this.config.showSystemColors) {
      const label = this.createSystemLabel(systemName, boundingBox.center, systemColor);
      if (label) {
        boxMesh.add(label);
      }
    }

    // Añadir a la escena
    this.scene.add(boxMesh);

    // Guardar referencia
    this.boundingBoxes.set(entityId, {
      mesh: boxMesh,
      system: systemName,
      timestamp: performance.now(),
      originalColor: systemColor,
      components: components
    });
  }

  /**
   * Actualiza los bounding boxes existentes
   */
  updateExistingBoxes(deltaTime) {
    // Usar deltaTime para debugging
    if (deltaTime > 0.1) {
      console.log('DeltaTime alto en updateExistingBoxes:', deltaTime);
    }
    const currentTime = performance.now();

    for (const [entityId, boxData] of this.boundingBoxes) {
      const { mesh, timestamp, originalColor } = boxData;
      // Usar originalColor para debugging
      console.log('Color original del bounding box:', originalColor);

      const age = (currentTime - timestamp) / 1000; // en segundos
      const lifeProgress = age / this.config.boxDuration;

      if (lifeProgress >= 1.0) {
        // Box expirado
        this.scene.remove(mesh);
        this.boundingBoxes.delete(entityId);
        continue;
      }

      // Actualizar uniforms del shader
      if (mesh.material.uniforms) {
        mesh.material.uniforms.time.value = currentTime / 1000;
        mesh.material.uniforms.intensity.value = this.config.pulseIntensity * (1.0 - lifeProgress);
      }

      // Fade out
      const opacity = 1.0 - lifeProgress;
      mesh.material.transparent = true;
      mesh.material.opacity = opacity;

      // Efecto de escala
      const scale = 1.0 + lifeProgress * 0.2;
      mesh.scale.set(scale, scale, scale);
    }
  }

  /**
   * Crea bounding boxes para entidades modificadas por sistemas
   */
  createSystemBoxes() {
    // Esta función se llama desde el scheduler después de cada sistema
    // y crea boxes para entidades que fueron modificadas
  }

  /**
   * Limpia bounding boxes antiguos
   */
  cleanupOldBoxes() {
    const currentTime = performance.now();
    const cutoffTime = currentTime - (this.config.boxDuration * 1000);

    for (const [entityId, boxData] of this.boundingBoxes) {
      if (boxData.timestamp < cutoffTime) {
        this.scene.remove(boxData.mesh);
        this.boundingBoxes.delete(entityId);
      }
    }
  }

  /**
   * Calcula los límites de una entidad basado en sus componentes
   */
  calculateEntityBounds(entityId, components) {
    let bounds = null;

    // Intentar usar diferentes componentes para calcular bounds
    if (components.includes('Transform') && components.includes('RenderMesh')) {
      const transform = this.world.getComponent(entityId, 'Transform');
      const renderMesh = this.world.getComponent(entityId, 'RenderMesh');

      if (transform && renderMesh) {
        const size = this.getMeshSize(renderMesh);
        bounds = {
          center: new THREE.Vector3(transform.position_x, transform.position_y, transform.position_z),
          size: size
        };
      }
    }

    // Fallback: usar solo transform
    if (!bounds && components.includes('Transform')) {
      const transform = this.world.getComponent(entityId, 'Transform');
      if (transform) {
        bounds = {
          center: new THREE.Vector3(transform.position_x, transform.position_y, transform.position_z),
          size: new THREE.Vector3(1, 1, 1) // tamaño por defecto
        };
      }
    }

    return bounds;
  }

  /**
   * Obtiene el tamaño aproximado de una mesh basado en su tipo
   */
  getMeshSize(renderMesh) {
    const baseSize = 1.0;

    switch (renderMesh.geometryType) {
      case 'sphere': {
        const radius = renderMesh.radius || baseSize;
        return new THREE.Vector3(radius * 2, radius * 2, radius * 2);
      }
      case 'cube': {
        const width = renderMesh.width || baseSize;
        const height = renderMesh.height || baseSize;
        const depth = renderMesh.depth || baseSize;
        return new THREE.Vector3(width, height, depth);
      }
      case 'cylinder': {
        const cylRadius = renderMesh.radius || baseSize;
        const cylHeight = renderMesh.height || baseSize;
        return new THREE.Vector3(cylRadius * 2, cylHeight, cylRadius * 2);
      }
      default:
        return new THREE.Vector3(baseSize, baseSize, baseSize);
    }
  }

  /**
   * Obtiene el color asignado a un sistema
   */
  getSystemColor(systemName) {
    if (!this.systemColors.has(systemName)) {
      const colorIndex = this.currentColorIndex % this.systemPalette.length;
      this.systemColors.set(systemName, this.systemPalette[colorIndex]);
      this.currentColorIndex++;
    }

    return this.systemColors.get(systemName);
  }

  /**
   * Crea una etiqueta de texto para mostrar el nombre del sistema
   */
  createSystemLabel(systemName, position, color) {
    // Usar parámetros para debugging
    console.log('Creando etiqueta para sistema:', systemName, 'en posición:', position, 'con color:', color);

    // Simplificado: en una implementación real, usarías un sistema de texto 3D
    // Por ahora, solo devolvemos null
    return null;
  }

  // === API PÚBLICA ===

  /**
   * Habilita/deshabilita el modo rayos catódicos
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;

    if (!enabled) {
      this.clearAllBoxes();
    }

    console.log(`📺 Cathode Ray Mode: ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Configura las opciones visuales
   */
  setConfig(newConfig) {
    Object.assign(this.config, newConfig);
    console.log('⚙️ Cathode Ray System config updated:', this.config);
    // Usar entityId para debugging si existe
    const entityId = this.currentEntityId || 'none';
    console.log('Entity ID actual:', entityId);
  }

  /**
   * Limpia todos los bounding boxes
   */
  clearAllBoxes() {
    for (const [entityId, boxData] of this.boundingBoxes) {
      // Usar entityId para debugging
      console.log('Eliminando bounding box de entidad:', entityId);
      this.scene.remove(boxData.mesh);
    }
    this.boundingBoxes.clear();
    console.log('🧹 Cleared all cathode ray boxes');
  }

  /**
   * Obtiene estadísticas del sistema
   */
  getStats() {
    return {
      isEnabled: this.isEnabled,
      activeBoxes: this.boundingBoxes.size,
      systemColors: this.systemColors.size,
      config: { ...this.config }
    };
  }

  /**
   * Obtiene información de debug
   */
  getDebugInfo() {
    return {
      stats: this.getStats(),
      boxes: Array.from(this.boundingBoxes.entries()).map(([entityId, data]) => ({
        entityId,
        system: data.system,
        age: (performance.now() - data.timestamp) / 1000,
        components: data.components
      }))
    };
  }

  /**
   * Resetea el sistema
   */
  reset() {
    this.clearAllBoxes();
    this.systemColors.clear();
    this.currentColorIndex = 0;
    this.updateCounter = 0;
    console.log('🔄 Cathode Ray System reset');
  }
}
