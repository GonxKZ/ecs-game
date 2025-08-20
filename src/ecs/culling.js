/**
 * Sistema de Frustum Culling para ECS
 * Optimiza rendimiento determinando qué objetos son visibles para la cámara
 * Reduce significativamente el número de draw calls
 */

export class CullingSystem {
  constructor(camera) {
    this.camera = camera;
    this.name = 'Culling';
    this.lastExecutionTime = 0;

    // Frustum para cálculos de culling
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();

    // Estadísticas de culling
    this.stats = {
      totalEntities: 0,
      visibleEntities: 0,
      culledEntities: 0,
      frustumTests: 0,
      distanceTests: 0,
      occlusionTests: 0
    };

    // Configuración de culling
    this.config = {
      enableDistanceCulling: true,
      enableOcclusionCulling: false,
      maxDistance: 1000,
      minDistance: 1,
      enableLodCulling: true,
      lodDistances: [50, 150, 500] // Distancias para niveles de detalle
    };

    // Cache de AABBs para evitar recálculos
    this.aabbCache = new Map();
    this.aabbCacheTimeout = 1000; // ms

    // Pool de objetos para reutilización
    this.tempVector = new THREE.Vector3();
    this.tempBox = new THREE.Box3();
    this.tempSphere = new THREE.Sphere();
  }

  update(deltaTime, world) {
    const startTime = performance.now();

    // Actualizar frustum
    this.updateFrustum();

    // Reset estadísticas
    this.resetStats();

    // Realizar culling en entidades renderizables
    this.performCulling(world);

    this.lastExecutionTime = performance.now() - startTime;
  }

  updateFrustum() {
    // Actualizar matriz de proyección-pantalla
    this.projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );

    // Actualizar frustum
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
    this.stats.frustumTests++;
  }

  resetStats() {
    this.stats.totalEntities = 0;
    this.stats.visibleEntities = 0;
    this.stats.culledEntities = 0;
  }

  performCulling(world) {
    // Obtener entidades con componentes de rendering y culling
    const renderableEntities = world.queryEntities({
      components: ['Transform', 'RenderMesh']
    });

    this.stats.totalEntities = renderableEntities.size;

    for (const entityId of renderableEntities) {
      const visible = this.isEntityVisible(entityId, world);

      // Actualizar componente de visibilidad
      const renderMesh = world.getComponent(entityId, 'RenderMesh');
      if (renderMesh) {
        renderMesh.visible = visible;

        // Actualizar estadísticas
        if (visible) {
          this.stats.visibleEntities++;
        } else {
          this.stats.culledEntities++;
        }
      }

      // Aplicar LOD si está habilitado
      if (this.config.enableLodCulling) {
        this.updateEntityLOD(entityId, world);
      }
    }
  }

  isEntityVisible(entityId, world) {
    const transform = world.getComponent(entityId, 'Transform');
    const renderMesh = world.getComponent(entityId, 'RenderMesh');

    if (!transform || !renderMesh) return false;

    // 1. Test de frustum culling
    if (!this.testFrustumCulling(entityId, transform, renderMesh)) {
      return false;
    }

    // 2. Test de distancia culling
    if (this.config.enableDistanceCulling) {
      if (!this.testDistanceCulling(transform)) {
        return false;
      }
    }

    // 3. Test de oclusión (si está habilitado)
    if (this.config.enableOcclusionCulling) {
      if (!this.testOcclusionCulling(entityId)) {
        return false;
      }
    }

    return true;
  }

  testFrustumCulling(entityId, transform, renderMesh) {
    // Obtener o calcular AABB de la entidad
    const aabb = this.getEntityAABB(entityId, transform, renderMesh);

    if (!aabb) return true; // Si no hay AABB, asumir visible

    // Test de intersección con frustum
    const isVisible = this.frustum.intersectsBox(aabb);

    return isVisible;
  }

  testDistanceCulling(transform) {
    this.stats.distanceTests++;

    // Calcular distancia desde la cámara
    this.tempVector.set(transform.position_x, transform.position_y, transform.position_z);
    const distance = this.camera.position.distanceTo(this.tempVector);

    // Verificar rango de distancia
    return distance >= this.config.minDistance && distance <= this.config.maxDistance;
  }

  testOcclusionCulling(entityId) {
    this.stats.occlusionTests++;

    // Implementación simplificada de occlusion culling
    // En un motor real, esto usaría occlusion queries de GPU
    // o algoritmos como CHC (Coherent Hierarchical Culling)

    // Por ahora, solo verificar si la entidad está detrás de otras
    // (implementación placeholder)
    return true;
  }

  getEntityAABB(entityId, transform, renderMesh) {
    // Verificar cache primero
    const cached = this.aabbCache.get(entityId);
    if (cached && performance.now() - cached.timestamp < this.aabbCacheTimeout) {
      return cached.aabb;
    }

    // Calcular AABB basado en tipo de geometría
    let aabb = null;

    switch (renderMesh.geometryType) {
      case 'sphere':
        const radius = renderMesh.radius || 0.5;
        const center = new THREE.Vector3(transform.position_x, transform.position_y, transform.position_z);
        const sphere = new THREE.Sphere(center, radius);
        aabb = new THREE.Box3().setFromCenterAndSize(center, new THREE.Vector3(radius * 2, radius * 2, radius * 2));
        break;

      case 'cube':
        const halfSize = new THREE.Vector3(
          (renderMesh.width || 1) * 0.5,
          (renderMesh.height || 1) * 0.5,
          (renderMesh.depth || 1) * 0.5
        );
        const min = new THREE.Vector3(
          transform.position_x - halfSize.x,
          transform.position_y - halfSize.y,
          transform.position_z - halfSize.z
        );
        const max = new THREE.Vector3(
          transform.position_x + halfSize.x,
          transform.position_y + halfSize.y,
          transform.position_z + halfSize.z
        );
        aabb = new THREE.Box3(min, max);
        break;

      case 'cylinder':
        // Aproximar con AABB
        const cylRadius = renderMesh.radius || 0.5;
        const cylHeight = renderMesh.height || 1;
        aabb = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(transform.position_x, transform.position_y, transform.position_z),
          new THREE.Vector3(cylRadius * 2, cylHeight, cylRadius * 2)
        );
        break;

      case 'plane':
        // AABB muy delgado para planos
        const planeWidth = renderMesh.width || 1;
        const planeHeight = renderMesh.height || 1;
        aabb = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(transform.position_x, transform.position_y, transform.position_z),
          new THREE.Vector3(planeWidth, planeHeight, 0.01)
        );
        break;

      default:
        // AABB por defecto
        aabb = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(transform.position_x, transform.position_y, transform.position_z),
          new THREE.Vector3(1, 1, 1)
        );
    }

    // Aplicar escala al AABB
    if (aabb && (transform.scale_x !== 1 || transform.scale_y !== 1 || transform.scale_z !== 1)) {
      const center = aabb.getCenter(new THREE.Vector3());
      const size = aabb.getSize(new THREE.Vector3());
      size.multiply(new THREE.Vector3(transform.scale_x, transform.scale_y, transform.scale_z));
      aabb.setFromCenterAndSize(center, size);
    }

    // Cachear AABB
    if (aabb) {
      this.aabbCache.set(entityId, {
        aabb: aabb,
        timestamp: performance.now()
      });
    }

    return aabb;
  }

  updateEntityLOD(entityId, world) {
    const transform = world.getComponent(entityId, 'Transform');
    if (!transform) return;

    // Calcular distancia a cámara
    this.tempVector.set(transform.position_x, transform.position_y, transform.position_z);
    const distance = this.camera.position.distanceTo(this.tempVector);

    // Determinar nivel de LOD
    let lodLevel = 0; // Alta calidad por defecto

    for (let i = 0; i < this.config.lodDistances.length; i++) {
      if (distance > this.config.lodDistances[i]) {
        lodLevel = i + 1;
      }
    }

    // Actualizar componente de LOD si existe
    const lodComponent = world.getComponent(entityId, 'LOD');
    if (lodComponent) {
      lodComponent.currentLevel = lodLevel;
      lodComponent.distance = distance;
    }

    // Aplicar LOD a renderizado
    this.applyLODRendering(entityId, lodLevel, world);
  }

  applyLODRendering(entityId, lodLevel, world) {
    const renderMesh = world.getComponent(entityId, 'RenderMesh');
    if (!renderMesh) return;

    // Ajustar calidad de rendering basado en LOD
    switch (lodLevel) {
      case 0: // Alta calidad
        renderMesh.detailLevel = 1.0;
        break;
      case 1: // Media calidad
        renderMesh.detailLevel = 0.7;
        break;
      case 2: // Baja calidad
        renderMesh.detailLevel = 0.4;
        break;
      default: // Muy baja calidad o culled
        renderMesh.detailLevel = 0.1;
    }
  }

  // Métodos de configuración
  setMaxDistance(distance) {
    this.config.maxDistance = distance;
  }

  setLodDistances(distances) {
    this.config.lodDistances = distances;
  }

  enableOcclusionCulling(enabled) {
    this.config.enableOcclusionCulling = enabled;
  }

  // Métodos de optimización
  clearCache() {
    this.aabbCache.clear();
  }

  updateCacheTimeout(timeout) {
    this.aabbCacheTimeout = timeout;
  }

  // Obtener estadísticas
  getStats() {
    return {
      ...this.stats,
      cullEfficiency: this.stats.totalEntities > 0 ?
        (this.stats.culledEntities / this.stats.totalEntities * 100).toFixed(1) : 0,
      config: { ...this.config }
    };
  }

  // Debug visualization
  createDebugVisualization() {
    // Crear helpers visuales para debug
    const frustumHelper = new THREE.CameraHelper(this.camera);
    frustumHelper.visible = false;

    const statsDisplay = document.createElement('div');
    statsDisplay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
    `;

    this.debugHelpers = {
      frustum: frustumHelper,
      statsDisplay
    };

    // Actualizar display de estadísticas
    setInterval(() => {
      if (this.debugHelpers) {
        const stats = this.getStats();
        this.debugHelpers.statsDisplay.innerHTML = `
          <div>Culling Stats:</div>
          <div>Total: ${stats.totalEntities}</div>
          <div>Visible: ${stats.visibleEntities}</div>
          <div>Culled: ${stats.culledEntities}</div>
          <div>Efficiency: ${stats.cullEfficiency}%</div>
        `;
      }
    }, 100);

    return this.debugHelpers;
  }

  toggleDebugVisualization(visible) {
    if (this.debugHelpers) {
      this.debugHelpers.frustum.visible = visible;
      this.debugHelpers.statsDisplay.style.display = visible ? 'block' : 'none';
    }
  }
}

/**
 * Componente para información de LOD
 */
export const LODComponent = {
  currentLevel: 'int32', // 0 = alta, 1 = media, 2 = baja
  distance: 'float32', // Distancia actual a cámara
  lastUpdate: 'float32' // Timestamp de última actualización
};

/**
 * Utilidades para culling
 */
export class CullingUtils {
  /**
   * Crear grupos de culling para optimización espacial
   */
  static createCullingGroups(world, groupSize = 50) {
    const entities = world.queryEntities({
      components: ['Transform', 'RenderMesh']
    });

    const groups = [];
    let currentGroup = [];

    for (const entityId of entities) {
      currentGroup.push(entityId);

      if (currentGroup.length >= groupSize) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Calcular AABB óptimo para grupo de entidades
   */
  static calculateGroupAABB(group, world) {
    if (group.length === 0) return null;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const entityId of group) {
      const transform = world.getComponent(entityId, 'Transform');
      const renderMesh = world.getComponent(entityId, 'RenderMesh');

      if (!transform || !renderMesh) continue;

      // Calcular bounds aproximados
      const size = Math.max(
        renderMesh.width || 1,
        renderMesh.height || 1,
        renderMesh.depth || 1,
        renderMesh.radius || 0.5
      );

      minX = Math.min(minX, transform.position_x - size);
      minY = Math.min(minY, transform.position_y - size);
      minZ = Math.min(minZ, transform.position_z - size);
      maxX = Math.max(maxX, transform.position_x + size);
      maxY = Math.max(maxY, transform.position_y + size);
      maxZ = Math.max(maxZ, transform.position_z + size);
    }

    return new THREE.Box3(
      new THREE.Vector3(minX, minY, minZ),
      new THREE.Vector3(maxX, maxY, maxZ)
    );
  }

  /**
   * Optimizar orden de renderizado para minimizar cambios de estado
   */
  static optimizeRenderOrder(entities, world) {
    // Ordenar por material, luego por geometría, luego por distancia
    return entities.sort((a, b) => {
      const meshA = world.getComponent(a, 'RenderMesh');
      const meshB = world.getComponent(b, 'RenderMesh');
      const matA = world.getComponent(a, 'MaterialRef');
      const matB = world.getComponent(b, 'MaterialRef');

      // Primero por material
      if (matA && matB) {
        const matCompare = matA.materialType.localeCompare(matB.materialType);
        if (matCompare !== 0) return matCompare;
      }

      // Luego por geometría
      if (meshA && meshB) {
        const geoCompare = meshA.geometryType.localeCompare(meshB.geometryType);
        if (geoCompare !== 0) return geoCompare;
      }

      // Finalmente por distancia a cámara
      const transformA = world.getComponent(a, 'Transform');
      const transformB = world.getComponent(b, 'Transform');
      if (transformA && transformB) {
        // Simplificación: ordenar por Z
        return transformA.position_z - transformB.position_z;
      }

      return 0;
    });
  }
}
