import * as THREE from 'three';

/**
 * Physics Debug Visualization System
 * Visualiza colisionadores, normales de contacto, raycasts y otros elementos de debug físico
 */

export class PhysicsDebugSystem {
  constructor(scene, physicsSystem, physicsSyncSystem) {
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.physicsSyncSystem = physicsSyncSystem;
    this.name = 'PhysicsDebug';
    this.lastExecutionTime = 0;

    // Elementos de debug
    this.debugElements = {
      colliders: new Map(),
      contactNormals: [],
      raycasts: [],
      boundingBoxes: new Map(),
      velocityVectors: new Map(),
      forceVectors: new Map()
    };

    // Información de debug
    this.debugInfo = {
      entityCount: 0,
      totalColliders: 0,
      visibleColliders: 0
    };

    // Configuración de visualización
    this.config = {
      showColliders: true,
      showContactNormals: true,
      showBoundingBoxes: false,
      showVelocityVectors: false,
      showForceVectors: false,
      showRaycasts: true,
      colliderColor: 0x00ff88,
      contactNormalColor: 0xff4444,
      boundingBoxColor: 0x4444ff,
      velocityVectorColor: 0x00ffff,
      forceVectorColor: 0xffaa00,
      raycastColor: 0xffff00,
      vectorScale: 0.1,
      normalLength: 0.5
    };

    // Materiales reutilizables
    this.materials = {
      collider: new THREE.MeshBasicMaterial({
        color: this.config.colliderColor,
        wireframe: true,
        transparent: true,
        opacity: 0.3
      }),
      contactNormal: new THREE.LineBasicMaterial({
        color: this.config.contactNormalColor
      }),
      boundingBox: new THREE.LineBasicMaterial({
        color: this.config.boundingBoxColor
      }),
      velocityVector: new THREE.LineBasicMaterial({
        color: this.config.velocityVectorColor
      }),
      forceVector: new THREE.LineBasicMaterial({
        color: this.config.forceVectorColor
      }),
      raycast: new THREE.LineBasicMaterial({
        color: this.config.raycastColor
      })
    };

    this.name = 'PhysicsDebug';
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    const startTime = performance.now();

    // Limpiar elementos anteriores
    this.clearDebugElements();

    // Actualizar visualización según configuración
    if (this.config.showColliders) {
      this.updateColliderVisualization(world);
    }

    if (this.config.showContactNormals) {
      this.updateContactNormals(world);
    }

    if (this.config.showBoundingBoxes) {
      this.updateBoundingBoxes(world);
    }

    if (this.config.showVelocityVectors) {
      this.updateVelocityVectors(world);
    }

    if (this.config.showForceVectors) {
      this.updateForceVectors(world);
    }

    if (this.config.showRaycasts) {
      this.updateRaycasts(world);
    }

    this.lastExecutionTime = performance.now() - startTime;
  }

  updateColliderVisualization(world) {
    // Visualizar todos los colisionadores
    // Usar world para obtener información adicional de las entidades si es necesario
    const entityCount = world.entities.size;
    this.debugInfo.entityCount = entityCount;

    for (const [entityId, rapierBody] of this.physicsSystem.entityRigidBodies) {
      const colliders = rapierBody.colliders();

      colliders.forEach((collider, index) => {
        const debugKey = `${entityId}_${index}`;
        let debugMesh = this.debugElements.colliders.get(debugKey);

        if (!debugMesh) {
          debugMesh = this.createColliderDebugMesh(collider, entityId);
          if (debugMesh) {
            this.debugElements.colliders.set(debugKey, debugMesh);
            this.scene.add(debugMesh);
          }
        }

        // Actualizar posición y rotación
        if (debugMesh) {
          this.updateDebugMeshTransform(debugMesh, collider);
        }
      });
    }
  }

  createColliderDebugMesh(collider, entityId) {
    const RAPIER = this.physicsSystem.RAPIER;

    let geometry;
    const shapeType = collider.shape.type;

    switch (shapeType) {
      case RAPIER.ShapeType.Ball: {
        const radius = collider.shape.radius;
        geometry = new THREE.SphereGeometry(radius, 8, 6);
        break;
      }

      case RAPIER.ShapeType.Cuboid: {
        const halfExtents = collider.shape.halfExtents;
        geometry = new THREE.BoxGeometry(
          halfExtents.x * 2,
          halfExtents.y * 2,
          halfExtents.z * 2
        );
        break;
      }

      case RAPIER.ShapeType.Cylinder: {
        const cylinderRadius = collider.shape.radius;
        const cylinderHeight = collider.shape.halfHeight * 2;
        geometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 8);
        break;
      }

      case RAPIER.ShapeType.Capsule: {
        const capsuleRadius = collider.shape.radius;
        const capsuleHeight = collider.shape.halfHeight * 2;
        // Crear geometría de cápsula aproximada
        geometry = new THREE.CapsuleGeometry(capsuleRadius, capsuleHeight, 4, 8);
        break;

      default: {
        // Geometría por defecto
        geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      }
    }

    if (geometry) {
      const mesh = new THREE.Mesh(geometry, this.materials.collider);
      mesh.userData.entityId = entityId;
      mesh.userData.collider = collider;
      return mesh;
    }

    return null;
  }

  updateDebugMeshTransform(debugMesh, collider) {
    const translation = collider.translation();
    const rotation = collider.rotation();

    debugMesh.position.set(translation.x, translation.y, translation.z);

    // Convertir quaternion a Euler
    const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    debugMesh.setRotationFromQuaternion(quaternion);
  }

  updateContactNormals(world) {
    // Visualizar normales de contacto de colisiones recientes
    const recentCollisions = world.eventBus ? this.getRecentCollisions(world) : [];

    recentCollisions.forEach((collision, index) => {
      const normalLine = this.createContactNormalLine(collision);
      if (normalLine) {
        this.debugElements.contactNormals.push(normalLine);
        this.scene.add(normalLine);
      }
    });
  }

  createContactNormalLine(collision) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      collision.point.x, collision.point.y, collision.point.z,
      collision.point.x + collision.normal.x * this.config.normalLength,
      collision.point.y + collision.normal.y * this.config.normalLength,
      collision.point.z + collision.normal.z * this.config.normalLength
    ]);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const line = new THREE.Line(geometry, this.materials.contactNormal);
    line.userData.collision = collision;

    return line;
  }

  getRecentCollisions(world) {
    // En una implementación real, esto vendría del event bus
    // Por ahora, simular algunas colisiones de ejemplo
    return [
      {
        point: { x: 0, y: 1, z: 0 },
        normal: { x: 0, y: 1, z: 0 },
        entityA: 1,
        entityB: 2
      }
    ];
  }

  updateBoundingBoxes(world) {
    // Visualizar bounding boxes de entidades físicas
    for (const [entityId, rapierBody] of this.physicsSystem.entityRigidBodies) {
      const debugKey = `bbox_${entityId}`;
      let bboxLines = this.debugElements.boundingBoxes.get(debugKey);

      if (!bboxLines) {
        bboxLines = this.createBoundingBoxLines(rapierBody, entityId);
        this.debugElements.boundingBoxes.set(debugKey, bboxLines);
        this.scene.add(bboxLines);
      }

      // Actualizar posición de la bounding box
      const translation = rapierBody.translation();
      bboxLines.position.set(translation.x, translation.y, translation.z);
    }
  }

  createBoundingBoxLines(rapierBody, entityId) {
    // Crear representación wireframe de la AABB
    const aabb = rapierBody.aabb();
    const geometry = new THREE.BoxGeometry(
      aabb.maxs.x - aabb.mins.x,
      aabb.maxs.y - aabb.mins.y,
      aabb.maxs.z - aabb.mins.z
    );

    const edges = new THREE.EdgesGeometry(geometry);
    const lines = new THREE.LineSegments(edges, this.materials.boundingBox);

    // Centrar en el origen del body
    const centerX = (aabb.maxs.x + aabb.mins.x) / 2;
    const centerY = (aabb.maxs.y + aabb.mins.y) / 2;
    const centerZ = (aabb.maxs.z + aabb.mins.z) / 2;
    lines.position.set(centerX, centerY, centerZ);

    lines.userData.entityId = entityId;
    return lines;
  }

  updateVelocityVectors(world) {
    // Visualizar vectores de velocidad
    for (const [entityId, rapierBody] of this.physicsSystem.entityRigidBodies) {
      if (rapierBody.bodyType() !== this.physicsSystem.RAPIER.RigidBodyType.Dynamic) continue;

      const debugKey = `velocity_${entityId}`;
      let velocityLine = this.debugElements.velocityVectors.get(debugKey);

      if (!velocityLine) {
        velocityLine = new THREE.Line(new THREE.BufferGeometry(), this.materials.velocityVector);
        this.debugElements.velocityVectors.set(debugKey, velocityLine);
        this.scene.add(velocityLine);
      }

      this.updateVectorLine(velocityLine, rapierBody.translation(), rapierBody.linvel(), entityId);
    }
  }

  updateForceVectors(world) {
    // Visualizar vectores de fuerza (simplificado)
    // En una implementación real, trackear las fuerzas aplicadas
  }

  updateVectorLine(line, position, vector, entityId) {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    if (length < 0.01) {
      line.visible = false;
      return;
    }

    line.visible = true;

    // Normalizar vector y escalar
    const normalizedVector = {
      x: vector.x / length,
      y: vector.y / length,
      z: vector.z / length
    };

    const scaledLength = length * this.config.vectorScale;

    // Actualizar geometría de la línea
    const positions = new Float32Array([
      position.x, position.y, position.z,
      position.x + normalizedVector.x * scaledLength,
      position.y + normalizedVector.y * scaledLength,
      position.z + normalizedVector.z * scaledLength
    ]);

    line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    line.geometry.attributes.position.needsUpdate = true;

    line.userData.entityId = entityId;
    line.userData.vector = vector;
  }

  updateRaycasts(world) {
    // Visualizar raycasts recientes
    // En una implementación real, trackear raycasts desde el sistema
  }

  clearDebugElements() {
    // Ocultar o remover elementos de debug según configuración
    Object.values(this.debugElements).forEach(elementMap => {
      if (elementMap instanceof Map) {
        elementMap.forEach(element => {
          if (element) element.visible = false;
        });
      } else if (Array.isArray(elementMap)) {
        elementMap.forEach(element => {
          if (element) element.visible = false;
        });
      }
    });
  }

  // API de configuración
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.updateMaterials();
    console.log('🔧 Configuración de Physics Debug actualizada:', this.config);
  }

  updateMaterials() {
    this.materials.collider.color.setHex(this.config.colliderColor);
    this.materials.contactNormal.color.setHex(this.config.contactNormalColor);
    this.materials.boundingBox.color.setHex(this.config.boundingBoxColor);
    this.materials.velocityVector.color.setHex(this.config.velocityVectorColor);
    this.materials.forceVector.color.setHex(this.config.forceVectorColor);
    this.materials.raycast.color.setHex(this.config.raycastColor);
  }

  // Métodos de utilidad
  toggleColliders() {
    this.config.showColliders = !this.config.showColliders;
    return this.config.showColliders;
  }

  toggleContactNormals() {
    this.config.showContactNormals = !this.config.showContactNormals;
    return this.config.showContactNormals;
  }

  toggleBoundingBoxes() {
    this.config.showBoundingBoxes = !this.config.showBoundingBoxes;
    return this.config.showBoundingBoxes;
  }

  toggleVelocityVectors() {
    this.config.showVelocityVectors = !this.config.showVelocityVectors;
    return this.config.showVelocityVectors;
  }

  // Debug overlay
  createDebugOverlay() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 50px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 11px;
      z-index: 1000;
      border-radius: 5px;
    `;

    setInterval(() => {
      overlay.innerHTML = `
        <div><strong>🔧 Physics Debug</strong></div>
        <div>Colliders: ${this.debugElements.colliders.size}</div>
        <div>Contact Normals: ${this.debugElements.contactNormals.length}</div>
        <div>Velocity Vectors: ${this.debugElements.velocityVectors.size}</div>
        <div>Bounding Boxes: ${this.debugElements.boundingBoxes.size}</div>
      `;
    }, 200);

    document.body.appendChild(overlay);
    return overlay;
  }

  // Cleanup
  dispose() {
    // Remover todos los elementos de debug de la escena
    Object.values(this.debugElements).forEach(elementMap => {
      if (elementMap instanceof Map) {
        elementMap.forEach(element => {
          if (element) this.scene.remove(element);
        });
        elementMap.clear();
      } else if (Array.isArray(elementMap)) {
        elementMap.forEach(element => {
          if (element) this.scene.remove(element);
        });
        elementMap.length = 0;
      }
    });

    // Dispose materials
    Object.values(this.materials).forEach(material => {
      material.dispose();
    });
  }

  // Obtener estadísticas
  getStats() {
    return {
      visibleColliders: this.debugElements.colliders.size,
      contactNormals: this.debugElements.contactNormals.length,
      velocityVectors: this.debugElements.velocityVectors.size,
      boundingBoxes: this.debugElements.boundingBoxes.size,
      config: { ...this.config }
    };
  }
}
