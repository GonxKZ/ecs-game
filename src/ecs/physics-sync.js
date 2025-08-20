/**
 * PhysicsSyncSystem - Sincronización entre ECS y Rapier
 * Maneja la comunicación bidireccional entre componentes ECS y objetos físicos Rapier
 */

export class PhysicsSyncSystem {
  constructor(rapierSystem) {
    this.rapierSystem = rapierSystem;
    this.name = 'PhysicsSync';
    this.lastExecutionTime = 0;

    // Estado de sincronización
    this.syncState = {
      ecsToPhysics: 0, // Contador de sincronizaciones ECS -> Physics
      physicsToEcs: 0, // Contador de sincronizaciones Physics -> ECS
      lastSyncTime: 0,
      averageSyncTime: 0
    };

    // Configuración de sincronización
    this.config = {
      positionSync: true,
      rotationSync: true,
      velocitySync: true,
      forceSync: true,
      sleepingSync: true,
      interpolation: false // Para client-side prediction
    };

    this.name = 'PhysicsSync';
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    const startTime = performance.now();

    if (!this.rapierSystem.physicsWorld) return;

    // Fase 1: Sincronizar ECS -> Physics (input)
    this.syncEcsToPhysics(world);

    // Fase 2: Step de simulación física (ejecutado por RapierPhysicsSystem)

    // Fase 3: Sincronizar Physics -> ECS (output)
    this.syncPhysicsToEcs(world);

    // Fase 4: Procesar eventos físicos
    this.processPhysicsEvents(world);

    this.syncState.lastSyncTime = performance.now() - startTime;
    this.updateAverageSyncTime(this.syncState.lastSyncTime);
  }

  syncEcsToPhysics(world) {
    // Sincronizar transformadas ECS hacia Rapier
    const syncableEntities = world.queryEntities({
      components: ['Transform', 'RigidBody']
    });

    for (const entityId of syncableEntities) {
      const transform = world.getComponent(entityId, 'Transform');
      const rigidBody = world.getComponent(entityId, 'RigidBody');

      const rapierBody = this.rapierSystem.entityRigidBodies.get(entityId);

      if (!rapierBody || !transform) continue;

      // Sincronizar posición
      if (this.config.positionSync) {
        const position = new this.rapierSystem.RAPIER.Vector3(
          transform.position_x,
          transform.position_y,
          transform.position_z
        );
        rapierBody.setTranslation(position, true);
      }

      // Sincronizar rotación
      if (this.config.rotationSync) {
        // Convertir Euler angles a quaternion
        const quaternion = new this.rapierSystem.RAPIER.Quaternion(0, 0, 0, 1);
        // Implementación simplificada - en producción usar conversión completa
        rapierBody.setRotation(quaternion, true);
      }

      // Aplicar fuerzas si hay componente Physics
      const physics = world.getComponent(entityId, 'Physics');
      if (physics && this.config.forceSync) {
        this.applyForcesToBody(rapierBody, physics);
      }

      // Sincronizar sleeping state
      if (this.config.sleepingSync) {
        if (physics?.sleeping && rapierBody.isSleeping()) {
          rapierBody.wakeUp();
        }
      }

      this.syncState.ecsToPhysics++;
    }
  }

  syncPhysicsToEcs(world) {
    // Sincronizar resultados de simulación de vuelta a ECS
    for (const [entityId, rapierBody] of this.rapierSystem.entityRigidBodies) {
      const transform = world.getComponent(entityId, 'Transform');
      const physics = world.getComponent(entityId, 'Physics');

      if (!transform) continue;

      // Recuperar posición
      if (this.config.positionSync) {
        const position = rapierBody.translation();
        transform.position_x = position.x;
        transform.position_y = position.y;
        transform.position_z = position.z;
      }

      // Recuperar rotación
      if (this.config.rotationSync) {
        const rotation = rapierBody.rotation();
        // Convertir quaternion a Euler (simplificado)
        transform.rotation_x = rotation.x;
        transform.rotation_y = rotation.y;
        transform.rotation_z = rotation.z;
      }

      // Recuperar velocidad si hay componente Physics
      if (physics && this.config.velocitySync) {
        const linVel = rapierBody.linvel();
        const angVel = rapierBody.angvel();

        physics.velocity_x = linVel.x;
        physics.velocity_y = linVel.y;
        physics.velocity_z = linVel.z;
        physics.angular_x = angVel.x;
        physics.angular_y = angVel.y;
        physics.angular_z = angVel.z;
      }

      this.syncState.physicsToEcs++;
    }
  }

  applyForcesToBody(rapierBody, physics) {
    // Aplicar fuerzas acumuladas
    if (physics.velocity_x || physics.velocity_y || physics.velocity_z) {
      const force = new this.rapierSystem.RAPIER.Vector3(
        physics.velocity_x * physics.mass || 0,
        physics.velocity_y * physics.mass || 0,
        physics.velocity_z * physics.mass || 0
      );
      rapierBody.addForce(force, true);
    }

    // Aplicar impulsos
    if (physics.acceleration_x || physics.acceleration_y || physics.acceleration_z) {
      const impulse = new this.rapierSystem.RAPIER.Vector3(
        physics.acceleration_x || 0,
        physics.acceleration_y || 0,
        physics.acceleration_z || 0
      );
      rapierBody.applyImpulse(impulse, true);
    }

    // Reset forces después de aplicar
    physics.velocity_x = 0;
    physics.velocity_y = 0;
    physics.velocity_z = 0;
    physics.acceleration_x = 0;
    physics.acceleration_y = 0;
    physics.acceleration_z = 0;
  }

  processPhysicsEvents(world) {
    // Procesar eventos de física y convertirlos a eventos ECS
    const collisionEvents = this.rapierSystem.collisionEvents;
    const triggerEvents = this.rapierSystem.triggerEvents;

    // Procesar colisiones
    for (const event of collisionEvents) {
      // Convertir evento Rapier a evento ECS
      world.eventBus.send('Collision', {
        entityA: this.getEntityFromCollider(event.colliderA),
        entityB: this.getEntityFromCollider(event.colliderB),
        contactPoint: event.contactPoint,
        impulse: event.impulse
      });
    }

    // Procesar triggers
    for (const event of triggerEvents) {
      world.eventBus.send('Trigger', {
        entityA: this.getEntityFromCollider(event.colliderA),
        entityB: this.getEntityFromCollider(event.colliderB),
        triggerType: event.triggerType
      });
    }

    // Limpiar eventos procesados
    collisionEvents.length = 0;
    triggerEvents.length = 0;
  }

  getEntityFromCollider(collider) {
    // Buscar entidad que tenga este collider
    for (const [entityId, rapierBody] of this.rapierSystem.entityRigidBodies) {
      const colliders = rapierBody.colliders();
      for (const bodyCollider of colliders) {
        if (bodyCollider === collider) {
          return entityId;
        }
      }
    }
    return null;
  }

  updateAverageSyncTime(syncTime) {
    const alpha = 0.1; // Smoothing factor
    this.syncState.averageSyncTime =
      this.syncState.averageSyncTime * (1 - alpha) + syncTime * alpha;
  }

  // API para debugging y control
  setSyncConfig(config) {
    this.config = { ...this.config, ...config };
    console.log('🔄 Configuración de PhysicsSync actualizada:', this.config);
  }

  getSyncStats() {
    return {
      ...this.syncState,
      config: { ...this.config }
    };
  }

  // Métodos para manipulación directa de física desde ECS
  applyForce(entityId, force) {
    const rapierBody = this.rapierSystem.entityRigidBodies.get(entityId);
    if (rapierBody) {
      const rapierForce = new this.rapierSystem.RAPIER.Vector3(force.x, force.y, force.z);
      rapierBody.addForce(rapierForce, true);
    }
  }

  applyImpulse(entityId, impulse) {
    const rapierBody = this.rapierSystem.entityRigidBodies.get(entityId);
    if (rapierBody) {
      const rapierImpulse = new this.rapierSystem.RAPIER.Vector3(impulse.x, impulse.y, impulse.z);
      rapierBody.applyImpulse(rapierImpulse, true);
    }
  }

  setVelocity(entityId, velocity) {
    const rapierBody = this.rapierSystem.entityRigidBodies.get(entityId);
    if (rapierBody) {
      const rapierVelocity = new this.rapierSystem.RAPIER.Vector3(velocity.x, velocity.y, velocity.z);
      rapierBody.setLinvel(rapierVelocity, true);
    }
  }

  setPosition(entityId, position) {
    const rapierBody = this.rapierSystem.entityRigidBodies.get(entityId);
    if (rapierBody) {
      const rapierPosition = new this.rapierSystem.RAPIER.Vector3(position.x, position.y, position.z);
      rapierBody.setTranslation(rapierPosition, true);
    }
  }

  // Sistema de interpolación para client-side prediction
  enableInterpolation(enabled) {
    this.config.interpolation = enabled;
    console.log(`📊 Interpolación ${enabled ? 'habilitada' : 'deshabilitada'}`);
  }

  // Métodos para queries físicas
  raycast(origin, direction, maxDistance = 100) {
    if (!this.rapierSystem.physicsWorld) return null;

    const rapierOrigin = new this.rapierSystem.RAPIER.Vector3(origin.x, origin.y, origin.z);
    const rapierDir = new this.rapierSystem.RAPIER.Vector3(direction.x, direction.y, direction.z);

    const hit = this.rapierSystem.physicsWorld.castRay(
      rapierOrigin,
      rapierDir,
      maxDistance,
      true, // Solid
      undefined, // Filter
      undefined // Groups
    );

    if (hit) {
      return {
        hit: true,
        distance: hit.distance,
        point: hit.point,
        normal: hit.normal,
        entityId: this.getEntityFromCollider(hit.collider)
      };
    }

    return { hit: false };
  }

  // Configuración de CCD (Continuous Collision Detection)
  setCCD(entityId, enabled) {
    const rapierBody = this.rapierSystem.entityRigidBodies.get(entityId);
    if (rapierBody) {
      rapierBody.enableCcd(enabled);
      console.log(`🎯 CCD ${enabled ? 'habilitado' : 'deshabilitado'} para entidad ${entityId}`);
    }
  }

  // Debug helpers
  createPhysicsDebugOverlay() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 11px;
      z-index: 1000;
      max-width: 300px;
    `;

    setInterval(() => {
      const stats = this.getSyncStats();
      overlay.innerHTML = `
        <div><strong>🔗 Physics Sync</strong></div>
        <div>ECS→Physics: ${stats.ecsToPhysics}</div>
        <div>Physics→ECS: ${stats.physicsToEcs}</div>
        <div>Sync Time: ${stats.averageSyncTime.toFixed(2)}ms</div>
        <div>Interpolation: ${stats.config.interpolation ? 'ON' : 'OFF'}</div>
      `;
    }, 100);

    document.body.appendChild(overlay);
    return overlay;
  }
}
