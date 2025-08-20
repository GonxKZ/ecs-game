import * as THREE from 'three';

/**
 * Sistema de Instancing para ECS
 * Gestiona multitudes de objetos idénticos usando InstancedMesh de Three.js
 * Optimización crítica para rendimiento masivo
 */

export class InstancingSystem {
  constructor(scene) {
    this.scene = scene;
    this.name = 'Instancing';
    this.lastExecutionTime = 0;

    // Grupos de instancias por tipo
    this.instanceGroups = new Map();

    // Pool de matrices para reutilización
    this.matrixPool = [];
    this.maxPoolSize = 10000;

    // Estadísticas de rendimiento
    this.stats = {
      totalInstances: 0,
      activeGroups: 0,
      drawCalls: 0,
      matricesUpdated: 0
    };

    // Modo de debugging
    this.debugMode = false;

    this.name = 'Instancing';
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    const startTime = performance.now();

    // Actualizar grupos de instancias
    this.updateInstanceGroups(world);

    // Limpiar grupos vacíos
    this.cleanupEmptyGroups();

    this.lastExecutionTime = performance.now() - startTime;
  }

  updateInstanceGroups(world) {
    // Buscar entidades con componentes de instancing
    const instanceEntities = world.queryEntities({
      components: ['Transform', 'InstanceGroup']
    });

    // Agrupar por tipo de instancia
    const groups = new Map();

    for (const entityId of instanceEntities) {
      const instanceGroup = world.getComponent(entityId, 'InstanceGroup');

      if (!instanceGroup.active) continue;

      const groupKey = this.getGroupKey(instanceGroup);

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          entities: [],
          instanceGroup,
          baseEntity: entityId
        });
      }

      groups.get(groupKey).entities.push(entityId);
    }

    // Actualizar cada grupo
    for (const [groupKey, group] of groups) {
      this.updateInstanceGroup(groupKey, group, world);
    }

    // Marcar grupos antiguos como inactivos
    for (const [groupKey, instanceGroup] of this.instanceGroups) {
      if (!groups.has(groupKey)) {
        instanceGroup.active = false;
        instanceGroup.mesh.visible = false;
      }
    }
  }

  updateInstanceGroup(groupKey, group, world) {
    let instanceGroup = this.instanceGroups.get(groupKey);

    if (!instanceGroup) {
      // Crear nuevo grupo de instancias
      instanceGroup = this.createInstanceGroup(group.instanceGroup, group.baseEntity, world);
      this.instanceGroups.set(groupKey, instanceGroup);
    }

    // Actualizar instancias
    this.updateGroupInstances(instanceGroup, group.entities, world);
    instanceGroup.active = true;
    instanceGroup.mesh.visible = true;
  }

  createInstanceGroup(instanceGroupComponent, baseEntity, world) {
    // Obtener geometría y material base
    const renderMesh = world.getComponent(baseEntity, 'RenderMesh');
    const materialRef = world.getComponent(baseEntity, 'MaterialRef');

    if (!renderMesh) {
      console.warn('Entidad base no tiene RenderMesh para instancing');
      return null;
    }

    // Crear geometría
    const geometry = this.createGeometry(renderMesh);

    // Crear material
    const material = this.createMaterial(materialRef);

    // Crear InstancedMesh
    const maxInstances = instanceGroupComponent.maxInstances || 1000;
    const instancedMesh = new THREE.InstancedMesh(geometry, material, maxInstances);

    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    instancedMesh.frustumCulled = true;

    // Añadir a la escena
    this.scene.add(instancedMesh);

    return {
      mesh: instancedMesh,
      geometry,
      material,
      maxInstances,
      active: true,
      entityCount: 0,
      lastUpdate: 0
    };
  }

  updateGroupInstances(instanceGroup, entities, world) {
    const { mesh, maxInstances } = instanceGroup;
    const entityCount = Math.min(entities.length, maxInstances);

    // Actualizar estadísticas
    instanceGroup.entityCount = entityCount;
    this.stats.totalInstances += entityCount;

    // Actualizar matrices de instancias
    let matrixIndex = 0;
    const dummyMatrix = new THREE.Matrix4();

    for (let i = 0; i < entityCount && i < maxInstances; i++) {
      const entityId = entities[i];
      const transform = world.getComponent(entityId, 'Transform');

      if (transform) {
        // Crear matriz de transformación
        const matrix = this.getMatrixFromPool();
        matrix.makeTranslation(transform.position_x, transform.position_y, transform.position_z);
        matrix.scale(new THREE.Vector3(transform.scale_x, transform.scale_y, transform.scale_z));
        matrix.multiply(new THREE.Matrix4().makeRotationFromEuler(
          new THREE.Euler(transform.rotation_x, transform.rotation_y, transform.rotation_z)
        ));

        mesh.setMatrixAt(matrixIndex, matrix);
        this.returnMatrixToPool(matrix);
        matrixIndex++;
      }
    }

    // Ocultar instancias no utilizadas
    for (let i = matrixIndex; i < maxInstances; i++) {
      mesh.setMatrixAt(i, dummyMatrix.makeScale(0, 0, 0));
    }

    // Marcar como needing update
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = entityCount;

    this.stats.matricesUpdated += matrixIndex;
    this.stats.drawCalls++;
  }

  createGeometry(renderMesh) {
    switch (renderMesh.geometryType) {
      case 'sphere':
        return new THREE.SphereGeometry(
          renderMesh.radius || 0.5,
          16, 8 // Menos segmentos para mejor rendimiento
        );
      case 'cube':
        return new THREE.BoxGeometry(
          renderMesh.width || 1,
          renderMesh.height || 1,
          renderMesh.depth || 1
        );
      case 'cylinder':
        return new THREE.CylinderGeometry(
          renderMesh.radius || 0.5,
          renderMesh.radius || 0.5,
          renderMesh.height || 1,
          8 // Menos segmentos
        );
      case 'plane':
        return new THREE.PlaneGeometry(
          renderMesh.width || 1,
          renderMesh.height || 1
        );
      default:
        return new THREE.SphereGeometry(0.5, 16, 8);
    }
  }

  createMaterial(materialRef) {
    const options = {
      color: materialRef ? new THREE.Color(
        materialRef.color_r || 1,
        materialRef.color_g || 1,
        materialRef.color_b || 1
      ) : new THREE.Color(0x888888)
    };

    // Material simplificado para instancing (sin texturas complejas)
    return new THREE.MeshLambertMaterial(options);
  }

  getGroupKey(instanceGroup) {
    // Crear clave única basada en propiedades del grupo
    return `${instanceGroup.geometryType}_${instanceGroup.materialType}_${instanceGroup.maxInstances}`;
  }

  getMatrixFromPool() {
    return this.matrixPool.pop() || new THREE.Matrix4();
  }

  returnMatrixToPool(matrix) {
    if (this.matrixPool.length < this.maxPoolSize) {
      matrix.identity(); // Reset matrix
      this.matrixPool.push(matrix);
    }
  }

  cleanupEmptyGroups() {
    for (const [groupKey, instanceGroup] of this.instanceGroups) {
      if (!instanceGroup.active) {
        // Remover de la escena
        this.scene.remove(instanceGroup.mesh);

        // Limpiar recursos
        instanceGroup.geometry.dispose();
        instanceGroup.material.dispose();
        instanceGroup.mesh.dispose();

        this.instanceGroups.delete(groupKey);
      }
    }
  }

  // Optimización: frustum culling manual para grupos grandes
  performFrustumCulling(camera) {
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    );

    for (const [groupKey, instanceGroup] of this.instanceGroups) {
      if (instanceGroup.active && instanceGroup.entityCount > 100) {
        // Usar groupKey para debugging y logging
        this.debugGroupCulling(groupKey, instanceGroup);

        // Calcular bounding box del grupo
        const boundingBox = this.calculateGroupBoundingBox(instanceGroup);

        // Verificar si está en frustum
        if (!frustum.intersectsBox(boundingBox)) {
          instanceGroup.mesh.visible = false;
        } else {
          instanceGroup.mesh.visible = true;
        }
      }
    }
  }

  calculateGroupBoundingBox(instanceGroup) {
    // Calcular AABB aproximado del grupo de instancias
    // (implementación simplificada)
    const box = new THREE.Box3();
    instanceGroup.mesh.geometry.computeBoundingBox();

    // Expandir por las matrices de instancias
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < instanceGroup.entityCount; i++) {
      instanceGroup.mesh.getMatrixAt(i, matrix);
      box.expandByObject(new THREE.Mesh(instanceGroup.mesh.geometry, null).applyMatrix4(matrix));
    }

    return box;
  }

  // Métodos de optimización de rendimiento
  optimizeForPerformance() {
    // Reducir calidad de geometrías para mejor rendimiento
    for (const [groupKey, instanceGroup] of this.instanceGroups) {
      // Usar groupKey para debugging
      console.log('Optimizando grupo de instancias:', groupKey);
      if (instanceGroup.entityCount > 500) {
        // Usar geometrías con menos segmentos
        this.reduceGeometryQuality(instanceGroup);
      }
    }
  }

  reduceGeometryQuality(instanceGroup) {
    // Recrear geometría con menos segmentos
    const renderMesh = { geometryType: 'sphere', radius: 0.5 }; // Simplificado
    const newGeometry = this.createGeometry(renderMesh);
    instanceGroup.mesh.geometry = newGeometry;
  }

  // Obtener estadísticas de rendimiento
  getStats() {
    this.stats.activeGroups = this.instanceGroups.size;
    return { ...this.stats };
  }

  // Método para forzar actualización de todos los grupos
  forceUpdateAll() {
    for (const [groupKey, instanceGroup] of this.instanceGroups) {
      // Usar groupKey para debugging
      console.log('Forzando actualización de grupo:', groupKey);
      if (instanceGroup.active) {
        instanceGroup.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  // Limpiar todos los recursos
  dispose() {
    for (const [groupKey, instanceGroup] of this.instanceGroups) {
      // Usar groupKey para debugging
      console.log('Liberando recursos de grupo:', groupKey);
      this.scene.remove(instanceGroup.mesh);
      instanceGroup.geometry.dispose();
      instanceGroup.material.dispose();
      instanceGroup.mesh.dispose();
    }

    this.instanceGroups.clear();
    this.matrixPool.length = 0;
  }
}

/**
 * Componente para marcar grupos de instancias
 */
export const InstanceGroupComponent = {
  geometryType: 'string', // Tipo base de geometría
  materialType: 'string', // Tipo base de material
  maxInstances: 'int32', // Máximo número de instancias
  active: 'boolean', // Si el grupo está activo
  lodDistance: 'float32', // Distancia para Level of Detail
  cullDistance: 'float32' // Distancia para culling
};

/**
 * Utilidades para instancing
 */
export class InstancingUtils {
  /**
   * Crear un grupo de instancias para entidades similares
   */
  static createInstanceGroup(world, baseEntityId, instanceEntityIds, options = {}) {
    // Crear entidad base para el grupo
    const groupEntityId = world.createEntity();

    // Añadir componente InstanceGroup
    world.addComponent(groupEntityId, 'InstanceGroup', {
      geometryType: options.geometryType || 'sphere',
      materialType: options.materialType || 'standard',
      maxInstances: options.maxInstances || 1000,
      active: true,
      lodDistance: options.lodDistance || 100,
      cullDistance: options.cullDistance || 1000
    });

    // Marcar entidades como parte del grupo
    for (const entityId of instanceEntityIds) {
      world.addComponent(entityId, 'InstanceMember', {
        groupId: groupEntityId
      });
    }

    return groupEntityId;
  }

  /**
   * Calcular LOD basado en distancia a cámara
   */
  static calculateLOD(camera, position, lodDistance) {
    const distance = camera.position.distanceTo(position);

    if (distance < lodDistance * 0.33) return 0; // Alta calidad
    if (distance < lodDistance * 0.66) return 1; // Media calidad
    return 2; // Baja calidad
  }

  /**
   * Optimizar grupos grandes dividiéndolos
   */
  static optimizeLargeGroups(world, maxGroupSize = 500) {
    const instanceGroups = world.queryEntities({
      components: ['InstanceGroup']
    });

    for (const groupId of instanceGroups) {
      const instanceGroup = world.getComponent(groupId, 'InstanceGroup');
      const memberEntities = world.queryEntities({
        components: ['InstanceMember'],
        filters: entity => world.getComponent(entity, 'InstanceMember')?.groupId === groupId
      });

      if (memberEntities.size > maxGroupSize) {
        // Dividir en grupos más pequeños
        const chunks = this.chunkArray(Array.from(memberEntities), maxGroupSize);

        for (let i = 1; i < chunks.length; i++) {
          const newGroupId = this.createInstanceGroup(world, null, chunks[i], {
            geometryType: instanceGroup.geometryType,
            materialType: instanceGroup.materialType,
            maxInstances: maxGroupSize
          });
          // Usar newGroupId para debugging
          console.log('Creado nuevo grupo de instancias:', newGroupId);
        }

        // Reducir el grupo original
        instanceGroup.maxInstances = maxGroupSize;
      }
    }
  }

  // Método para debugging de culling de grupos
  debugGroupCulling(groupKey, instanceGroup) {
    // Usar groupKey para logging de debugging
    if (this.debugMode && instanceGroup.entityCount > 1000) {
      console.log(`🎯 Group ${groupKey}: ${instanceGroup.entityCount} instances`);
    }
    // Se puede expandir para más funcionalidades de debugging
  }

  /**
   * Dividir array en chunks
   */
  static chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
