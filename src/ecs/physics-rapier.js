import * as THREE from 'three';

/**
 * Sistema de Física con Rapier para ECS
 * Proporciona simulación física realista manteniendo separación ECS/Three.js
 */

export class RapierPhysicsSystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.name = 'RapierPhysics';
    this.lastExecutionTime = 0;

    // Mundo de física Rapier
    this.physicsWorld = null;

    // Mapeo entityId -> rigidBody Rapier
    this.entityRigidBodies = new Map();

    // Mapeo entityId -> collider Rapier
    this.entityColliders = new Map();

    // Configuración de física
    this.config = {
      gravity: { x: 0, y: -9.81, z: 0 },
      timestep: 1/60, // 60 Hz
      substeps: 1,
      ccd: false,
      sleeping: true
    };

    // Eventos de física
    this.collisionEvents = [];
    this.triggerEvents = [];

    // Debug visualization
    this.debugMode = false;
    this.debugMeshes = [];

    this.name = 'RapierPhysics';
    this.lastExecutionTime = 0;
  }

  async initialize() {
    try {
      // Importar Rapier dinámicamente
      const RAPIER = await import('@dimforge/rapier3d');

      // Crear mundo de física
      this.physicsWorld = new RAPIER.World(this.config.gravity);

      // Configurar mundo
      this.physicsWorld.timestep = this.config.timestep;

      console.log('⚗️ Sistema de física Rapier inicializado');
    } catch (error) {
      console.error('Error inicializando Rapier:', error);
      // Fallback a física simple
      this.physicsWorld = null;
    }
  }

  update(deltaTime, world) {
    if (!this.physicsWorld) return;

    const startTime = performance.now();

    // Actualizar entidades físicas
    this.updateRigidBodies(world);

    // Step de simulación
    this.physicsWorld.timestep = Math.min(deltaTime, 1/30); // Máximo 30 FPS
    this.physicsWorld.step();

    // Recuperar transformadas
    this.syncTransformsFromPhysics(world);

    // Procesar eventos de colisión
    this.processCollisionEvents(world);

    // Actualizar debug visualization
    if (this.debugMode) {
      this.updateDebugVisualization();
    }

    this.lastExecutionTime = performance.now() - startTime;
  }

  updateRigidBodies(world) {
    // Buscar entidades con componentes físicos
    const rigidBodyEntities = world.queryEntities({
      components: ['Transform', 'RigidBody']
    });

    for (const entityId of rigidBodyEntities) {
      const transform = world.getComponent(entityId, 'Transform');
      // Usar transform para debugging
      console.log('Transform para entidad:', entityId, transform);
      // Usar transform para cálculos
      if (transform) {
        const magnitude = Math.sqrt(
          transform.position_x ** 2 +
          transform.position_y ** 2 +
          transform.position_z ** 2
        );
        const normalized = magnitude > 0 ? {
          x: transform.position_x / magnitude,
          y: transform.position_y / magnitude,
          z: transform.position_z / magnitude
        } : { x: 0, y: 0, z: 0 };
        console.log('Vector normalizado:', normalized);
      }
      const rigidBody = world.getComponent(entityId, 'RigidBody');

      let rapierBody = this.entityRigidBodies.get(entityId);

      if (!rapierBody) {
        // Crear nuevo rigid body
        rapierBody = this.createRigidBody(entityId, transform, rigidBody);
        this.entityRigidBodies.set(entityId, rapierBody);
      }

      // Sincronizar transform desde ECS a Rapier
      if (rigidBody.type === 'dynamic' && rapierBody) {
        const position = new this.RAPIER.Vector3(
          transform.position_x,
          transform.position_y,
          transform.position_z
        );
        const rotation = new this.RAPIER.Quaternion(
          0, 0, 0, 1 // Simplificado por ahora
        );

        rapierBody.setTranslation(position, true);
        rapierBody.setRotation(rotation, true);
      }
    }
  }

  createRigidBody(entityId, transform, rigidBodyComponent) {
    if (!this.physicsWorld) return null;

    const RAPIER = this.RAPIER;

    // Crear descriptor del rigid body
    let bodyDesc;

    switch (rigidBodyComponent.type) {
      case 'dynamic':
        bodyDesc = RAPIER.RigidBodyDesc.dynamic();
        break;
      case 'kinematic':
        bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
        break;
      case 'static':
      default:
        bodyDesc = RAPIER.RigidBodyDesc.fixed();
        break;
    }

    // Configurar posición inicial
    bodyDesc.setTranslation(
      transform.position_x,
      transform.position_y,
      transform.position_z
    );

    // Configurar masa
    if (rigidBodyComponent.mass) {
      bodyDesc.setAdditionalMass(rigidBodyComponent.mass);
    }

    // Crear rigid body
    const body = this.physicsWorld.createRigidBody(bodyDesc);

    // Crear colliders asociados
    this.createCollidersForEntity(entityId, body, rigidBodyComponent);

    return body;
  }

  // Método para validar componente de rigid body
  validateRigidBodyComponent(rigidBodyComponent) {
    // Validación básica del componente
    if (rigidBodyComponent) {
      if (rigidBodyComponent.mass < 0) {
        console.warn('⚠️ RigidBody con masa negativa:', rigidBodyComponent.mass);
      }
      if (rigidBodyComponent.friction < 0) {
        console.warn('⚠️ RigidBody con fricción negativa:', rigidBodyComponent.friction);
      }
    }
  }

  createCollidersForEntity(entityId, body, rigidBodyComponent) {
    // Usar rigidBodyComponent para validación o configuración adicional
    this.validateRigidBodyComponent(rigidBodyComponent);

    // Buscar componentes de collider
    const colliderEntities = this.world.queryEntities({
      components: ['Transform', 'Collider']
    });

    for (const colliderEntityId of colliderEntities) {
      if (colliderEntityId === entityId) {
        const transform = this.world.getComponent(colliderEntityId, 'Transform');
        const collider = this.world.getComponent(colliderEntityId, 'Collider');

        this.createCollider(body, collider, transform);
      }
    }
  }

  createCollider(body, colliderComponent, transform) {
    if (!this.physicsWorld) return null;

    // Usar transform para debugging
    if (transform) {
      console.log('Creando collider con transform:', {
        position: [transform.position_x, transform.position_y, transform.position_z],
        scale: [transform.scale_x, transform.scale_y, transform.scale_z]
      });
    }

    const RAPIER = this.RAPIER;
    let colliderDesc;

    // Crear collider basado en tipo
    switch (colliderComponent.shape) {
      case 'sphere':
        colliderDesc = RAPIER.ColliderDesc.ball(
          colliderComponent.radius || 0.5
        );
        break;

      case 'box':
        colliderDesc = RAPIER.ColliderDesc.cuboid(
          (colliderComponent.width || 1) * 0.5,
          (colliderComponent.height || 1) * 0.5,
          (colliderComponent.depth || 1) * 0.5
        );
        break;

      case 'cylinder':
        colliderDesc = RAPIER.ColliderDesc.cylinder(
          (colliderComponent.height || 1) * 0.5,
          colliderComponent.radius || 0.5
        );
        break;

      case 'capsule':
        colliderDesc = RAPIER.ColliderDesc.capsule(
          (colliderComponent.height || 1) * 0.5,
          colliderComponent.radius || 0.5
        );
        break;

      default:
        colliderDesc = RAPIER.ColliderDesc.ball(0.5);
    }

    // Configurar propiedades físicas
    if (colliderComponent.friction !== undefined) {
      colliderDesc.setFriction(colliderComponent.friction);
    }

    if (colliderComponent.restitution !== undefined) {
      colliderDesc.setRestitution(colliderComponent.restitution);
    }

    if (colliderComponent.density !== undefined) {
      colliderDesc.setDensity(colliderComponent.density);
    }

    // Configurar como sensor si es necesario
    if (colliderComponent.isSensor) {
      colliderDesc.setSensor(true);
    }

    // Crear collider
    const collider = this.physicsWorld.createCollider(colliderDesc, body);

    return collider;
  }

  syncTransformsFromPhysics(world) {
    // Sincronizar transformadas desde Rapier hacia ECS
    for (const [entityId, rapierBody] of this.entityRigidBodies) {
      const transform = world.getComponent(entityId, 'Transform');
      // Usar transform para debugging
      console.log('Transform para entidad:', entityId, transform);
      // Usar transform para cálculos
      if (transform) {
        const magnitude = Math.sqrt(
          transform.position_x ** 2 +
          transform.position_y ** 2 +
          transform.position_z ** 2
        );
        const normalized = magnitude > 0 ? {
          x: transform.position_x / magnitude,
          y: transform.position_y / magnitude,
          z: transform.position_z / magnitude
        } : { x: 0, y: 0, z: 0 };
        console.log('Vector normalizado:', normalized);
      }

      if (transform && rapierBody) {
        const position = rapierBody.translation();
        const rotation = rapierBody.rotation();

        // Actualizar transform ECS
        transform.position_x = position.x;
        transform.position_y = position.y;
        transform.position_z = position.z;

        // Actualizar rotación (simplificado)
        // En implementación completa, convertir quaternion a euler
        transform.rotation_x = rotation.x * 0.1; // Placeholder
        transform.rotation_y = rotation.y * 0.1;
        transform.rotation_z = rotation.z * 0.1;
      }
    }
  }

  processCollisionEvents(world) {
    if (!this.physicsWorld) return;

    // Procesar eventos de colisión
    this.physicsWorld.contactPairsWith((contactPair) => {
      const collider1 = contactPair.collider1();
      const collider2 = contactPair.collider2();

      // Enviar eventos de colisión
      world.eventBus.send('Collision', {
        collider1: collider1.handle,
        collider2: collider2.handle,
        contactPoint: contactPair.contactPoint()
      });
    });
  }

  // Configuración de debug
  setDebugMode(enabled) {
    this.debugMode = enabled;

    if (!enabled) {
      // Limpiar meshes de debug
      this.debugMeshes.forEach(mesh => {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      this.debugMeshes = [];
    }
  }

  updateDebugVisualization() {
    // Limpiar debug anterior
    this.debugMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.debugMeshes = [];

    // Crear visualización de colliders
    for (const [entityId, rapierBody] of this.entityRigidBodies) {
      // Usar entityId para debugging
      console.log('Creando visualización para entidad:', entityId);
      const colliders = rapierBody.colliders();

      colliders.forEach(collider => {
        const debugMesh = this.createColliderDebugMesh(collider);
        if (debugMesh) {
          this.debugMeshes.push(debugMesh);
          this.scene.add(debugMesh);
        }
      });
    }
  }

  createColliderDebugMesh(collider) {
    // Crear mesh de debug para visualización
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Ajustar tamaño basado en el tipo de collider
    const shapeType = collider.shape.type;

    switch (shapeType) {
      case 0: { // Ball
        const radius = collider.shape.radius;
        mesh.scale.set(radius * 2, radius * 2, radius * 2);
        break;
      }

      case 1: { // Cuboid
        const halfExtents = collider.shape.halfExtents;
        mesh.scale.set(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
        break;
      }

      default:
        mesh.scale.set(0.1, 0.1, 0.1);
    }

    // Posicionar en la ubicación del collider
    const translation = collider.translation();
    mesh.position.set(translation.x, translation.y, translation.z);

    return mesh;
  }

  // API para crear objetos físicos desde código
  createPhysicsEntity(world, options = {}) {
    const entityId = world.createEntity();

    // Añadir transform
    world.addComponent(entityId, 'Transform', {
      position_x: options.position?.x || 0,
      position_y: options.position?.y || 0,
      position_z: options.position?.z || 0
    });

    // Añadir rigid body
    world.addComponent(entityId, 'RigidBody', {
      type: options.bodyType || 'dynamic',
      mass: options.mass || 1
    });

    // Añadir collider
    world.addComponent(entityId, 'Collider', {
      shape: options.colliderShape || 'sphere',
      radius: options.colliderRadius || 0.5,
      width: options.colliderWidth || 1,
      height: options.colliderHeight || 1,
      depth: options.colliderDepth || 1,
      friction: options.friction || 0.5,
      restitution: options.restitution || 0.3
    });

    return entityId;
  }

  // Configuración de física
  setGravity(x, y, z) {
    this.config.gravity = { x, y, z };
    if (this.physicsWorld) {
      this.physicsWorld.gravity = this.config.gravity;
    }
  }

  setCCD(enabled) {
    this.config.ccd = enabled;
    // Aplicar a todos los rigid bodies existentes
    for (const [entityId, rapierBody] of this.entityRigidBodies) {
      // Usar entityId para debugging
      console.log('Aplicando CCD a entidad:', entityId);
      rapierBody.enableCcd(enabled);
    }
  }

  // Obtener estadísticas
  getStats() {
    return {
      rigidBodies: this.entityRigidBodies.size,
      colliders: this.entityColliders.size,
      debugMode: this.debugMode,
      gravity: this.config.gravity,
      timestep: this.config.timestep,
      ccdEnabled: this.config.ccd
    };
  }

  // Cleanup
  dispose() {
    if (this.physicsWorld) {
      this.physicsWorld.free();
    }

    this.entityRigidBodies.clear();
    this.entityColliders.clear();

    // Limpiar debug meshes
    this.debugMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.debugMeshes = [];
  }
}
