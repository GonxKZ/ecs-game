import * as THREE from 'three';

/**
 * Sistema de Presentación ECS
 * Mapea componentes ECS puros a objetos Three.js sin que el ECS sepa de Three.js
 */

export class PresentationSystem {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    // Mapeo entityId -> objetos Three.js
    this.entityObjects = new Map();

    // Cache de recursos para evitar recrear geometrías/materiales
    this.geometryCache = new Map();
    this.materialCache = new Map();

    // Pool de objetos para reutilización
    this.objectPool = {
      meshes: [],
      materials: [],
      geometries: []
    };

    this.name = 'Presentation';
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    const startTime = performance.now();

    // Procesar entidades con componentes de renderizado
    this.updateRenderableEntities(world);
    this.updateCameraEntities(world);
    this.updateLightEntities(world);
    this.updateAnimationEntities(world, deltaTime);
    this.updateParticleEntities(world, deltaTime);

    // Limpiar entidades que ya no existen
    this.cleanupDestroyedEntities(world);

    this.lastExecutionTime = performance.now() - startTime;
  }

  updateRenderableEntities(world) {
    // Query para entidades con Transform + RenderMesh
    const renderableEntities = world.queryEntities({
      components: ['Transform', 'RenderMesh']
    });

    for (const entityId of renderableEntities) {
      const transform = world.getComponent(entityId, 'Transform');
      const renderMesh = world.getComponent(entityId, 'RenderMesh');
      const materialRef = world.getComponent(entityId, 'MaterialRef');

      if (!renderMesh.visible) {
        this.hideEntity(entityId);
        continue;
      }

      let entityObject = this.entityObjects.get(entityId);

      if (!entityObject) {
        // Crear nuevo objeto Three.js
        entityObject = this.createRenderableObject(entityId, renderMesh, materialRef);
        this.entityObjects.set(entityId, entityObject);
        this.scene.add(entityObject.mesh);
      } else {
        // Actualizar objeto existente
        this.updateRenderableObject(entityObject, renderMesh, materialRef);
      }

      // Actualizar transformación
      this.updateTransform(entityObject.mesh, transform);
    }
  }

  createRenderableObject(entityId, renderMesh, materialRef) {
    // Crear geometría
    const geometry = this.getOrCreateGeometry(renderMesh);

    // Crear material
    const material = this.getOrCreateMaterial(materialRef);

    // Crear mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.entityId = entityId;

    return { mesh, geometry, material };
  }

  updateRenderableObject(entityObject, renderMesh, materialRef) {
    // Actualizar geometría si cambió
    if (entityObject.mesh.geometry !== this.getCachedGeometry(renderMesh)) {
      const newGeometry = this.getOrCreateGeometry(renderMesh);
      entityObject.mesh.geometry = newGeometry;
    }

    // Actualizar material si cambió
    if (materialRef && entityObject.mesh.material !== this.getCachedMaterial(materialRef)) {
      const newMaterial = this.getOrCreateMaterial(materialRef);
      entityObject.mesh.material = newMaterial;
    }
  }

  getOrCreateGeometry(renderMesh) {
    const cacheKey = this.getGeometryCacheKey(renderMesh);

    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey);
    }

    let geometry;

    switch (renderMesh.geometryType) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(
          renderMesh.radius || 0.5,
          32, 16
        );
        break;
      case 'cube':
        geometry = new THREE.BoxGeometry(
          renderMesh.width || 1,
          renderMesh.height || 1,
          renderMesh.depth || 1
        );
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(
          renderMesh.radius || 0.5,
          renderMesh.radius || 0.5,
          renderMesh.height || 1,
          32
        );
        break;
      case 'plane':
        geometry = new THREE.PlaneGeometry(
          renderMesh.width || 1,
          renderMesh.height || 1
        );
        break;
      default:
        geometry = new THREE.SphereGeometry(0.5, 32, 16);
    }

    this.geometryCache.set(cacheKey, geometry);
    return geometry;
  }

  getOrCreateMaterial(materialRef) {
    if (!materialRef) {
      // Material por defecto
      return new THREE.MeshStandardMaterial({ color: 0x888888 });
    }

    const cacheKey = this.getMaterialCacheKey(materialRef);

    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey);
    }

    const options = {
      color: new THREE.Color(
        materialRef.color_r || 1,
        materialRef.color_g || 1,
        materialRef.color_b || 1
      ),
      metalness: materialRef.metalness || 0.5,
      roughness: materialRef.roughness || 0.5,
      emissive: new THREE.Color(
        materialRef.emissive_r || 0,
        materialRef.emissive_g || 0,
        materialRef.emissive_b || 0
      ),
      transparent: materialRef.transparent || false,
      opacity: materialRef.opacity !== undefined ? materialRef.opacity : 1
    };

    let material;
    switch (materialRef.materialType) {
      case 'basic':
        material = new THREE.MeshBasicMaterial(options);
        break;
      case 'phong':
        material = new THREE.MeshPhongMaterial(options);
        break;
      case 'standard':
      default:
        material = new THREE.MeshStandardMaterial(options);
    }

    this.materialCache.set(cacheKey, material);
    return material;
  }

  getGeometryCacheKey(renderMesh) {
    return `${renderMesh.geometryType}_${renderMesh.radius}_${renderMesh.width}_${renderMesh.height}_${renderMesh.depth}`;
  }

  getMaterialCacheKey(materialRef) {
    if (!materialRef) return 'default';
    return `${materialRef.materialType}_${materialRef.color_r}_${materialRef.color_g}_${materialRef.color_b}_${materialRef.metalness}_${materialRef.roughness}`;
  }

  updateTransform(mesh, transform) {
    mesh.position.set(
      transform.position_x || 0,
      transform.position_y || 0,
      transform.position_z || 0
    );

    mesh.rotation.set(
      transform.rotation_x || 0,
      transform.rotation_y || 0,
      transform.rotation_z || 0
    );

    mesh.scale.set(
      transform.scale_x || 1,
      transform.scale_y || 1,
      transform.scale_z || 1
    );
  }

  updateCameraEntities(world) {
    const cameraEntities = world.queryEntities({
      components: ['Transform', 'Camera']
    });

    for (const entityId of cameraEntities) {
      const transform = world.getComponent(entityId, 'Transform');
      const cameraComponent = world.getComponent(entityId, 'Camera');

      if (cameraComponent.isActive) {
        // Actualizar cámara principal
        this.camera.position.set(
          transform.position_x || 0,
          transform.position_y || 0,
          transform.position_z || 0
        );

        this.camera.rotation.set(
          transform.rotation_x || 0,
          transform.rotation_y || 0,
          transform.rotation_z || 0
        );

        if (cameraComponent.mode === 'perspective') {
          this.camera.fov = cameraComponent.fov || 75;
          this.camera.aspect = cameraComponent.aspect || this.camera.aspect;
          this.camera.near = cameraComponent.near || 0.1;
          this.camera.far = cameraComponent.far || 1000;
          this.camera.updateProjectionMatrix();
        }
      }
    }
  }

  updateLightEntities(world) {
    const lightEntities = world.queryEntities({
      components: ['Transform', 'Light']
    });

    for (const entityId of lightEntities) {
      const transform = world.getComponent(entityId, 'Transform');
      const lightComponent = world.getComponent(entityId, 'Light');

      let lightObject = this.entityObjects.get(entityId);

      if (!lightObject) {
        // Crear nueva luz
        lightObject = this.createLightObject(lightComponent);
        this.entityObjects.set(entityId, lightObject);
        this.scene.add(lightObject.light);
      }

      // Actualizar posición y propiedades
      lightObject.light.position.set(
        transform.position_x || 0,
        transform.position_y || 0,
        transform.position_z || 0
      );

      lightObject.light.intensity = lightComponent.intensity || 1;
      lightObject.light.color.setRGB(
        lightComponent.color_r || 1,
        lightComponent.color_g || 1,
        lightComponent.color_b || 1
      );
    }
  }

  createLightObject(lightComponent) {
    let light;

    switch (lightComponent.type) {
      case 'ambient':
        light = new THREE.AmbientLight();
        break;
      case 'directional':
        light = new THREE.DirectionalLight();
        light.castShadow = lightComponent.castShadow || true;
        break;
      case 'point':
        light = new THREE.PointLight();
        light.distance = lightComponent.range || 100;
        light.castShadow = lightComponent.castShadow || true;
        break;
      case 'spot':
        light = new THREE.SpotLight();
        light.angle = lightComponent.angle || Math.PI / 6;
        light.penumbra = lightComponent.penumbra || 0;
        light.distance = lightComponent.range || 100;
        light.castShadow = lightComponent.castShadow || true;
        break;
      default:
        light = new THREE.AmbientLight();
    }

    return { light };
  }

  updateAnimationEntities(world, deltaTime) {
    const animatedEntities = world.queryEntities({
      components: ['Animation']
    });

    for (const entityId of animatedEntities) {
      const animation = world.getComponent(entityId, 'Animation');
      const entityObject = this.entityObjects.get(entityId);

      if (!entityObject || !animation.isPlaying) continue;

      // Actualizar tiempo de animación
      animation.currentTime += deltaTime * animation.speed;

      if (animation.loop && animation.currentTime > animation.duration) {
        animation.currentTime = animation.currentTime % animation.duration;
      } else if (!animation.loop && animation.currentTime > animation.duration) {
        animation.isPlaying = false;
        animation.currentTime = animation.duration;
      }

      // Aquí se aplicaría la animación al objeto Three.js
      // (simplificado para este ejemplo)
      if (entityObject.mesh) {
        const progress = animation.currentTime / animation.duration;
        entityObject.mesh.rotation.y = progress * Math.PI * 2;
      }
    }
  }

  updateParticleEntities(world, deltaTime) {
    const particleEntities = world.queryEntities({
      components: ['Transform', 'ParticleSystem']
    });

    for (const entityId of particleEntities) {
      // Implementación de partículas simplificada
      // En un motor real, esto usaría THREE.Points o un sistema de partículas
      // Usar deltaTime para actualizar sistemas de partículas de forma frame-rate independiente
      const entityObject = this.entityObjects.get(entityId);
      const particleSystem = world.getComponent(entityId, 'ParticleSystem');

      if (entityObject && entityObject.particleSystem) {
        // Actualizar sistema de partículas
        // (implementación simplificada)
      }
    }
  }

  hideEntity(entityId) {
    const entityObject = this.entityObjects.get(entityId);
    if (entityObject && entityObject.mesh) {
      entityObject.mesh.visible = false;
    }
  }

  showEntity(entityId) {
    const entityObject = this.entityObjects.get(entityId);
    if (entityObject && entityObject.mesh) {
      entityObject.mesh.visible = true;
    }
  }

  cleanupDestroyedEntities(world) {
    // Remover objetos de entidades que ya no existen
    for (const [entityId, entityObject] of this.entityObjects) {
      if (!world.entities.has(entityId)) {
        // Remover de la escena
        if (entityObject.mesh) this.scene.remove(entityObject.mesh);
        if (entityObject.light) this.scene.remove(entityObject.light);

        // Devolver al pool si es necesario
        this.returnToPool(entityObject);

        this.entityObjects.delete(entityId);
      }
    }
  }

  returnToPool(entityObject) {
    // Implementación de object pooling para performance
    if (entityObject.mesh) {
      this.objectPool.meshes.push(entityObject.mesh);
    }
    if (entityObject.geometry) {
      this.objectPool.geometries.push(entityObject.geometry);
    }
    if (entityObject.material) {
      this.objectPool.materials.push(entityObject.material);
    }
  }

  // Método para forzar actualización de todos los objetos
  forceUpdate() {
    // Implementación para forzar actualización de toda la escena
    this.renderer.compile(this.scene, this.camera);
  }

  // Obtener estadísticas de rendimiento
  getStats() {
    return {
      entitiesRendered: this.entityObjects.size,
      geometriesCached: this.geometryCache.size,
      materialsCached: this.materialCache.size,
      poolSize: {
        meshes: this.objectPool.meshes.length,
        materials: this.objectPool.materials.length,
        geometries: this.objectPool.geometries.length
      }
    };
  }
}
