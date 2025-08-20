export class MovementSystem {
  constructor() {
    this.name = 'Movement';
    this.requiredComponents = ['Transform', 'Velocity'];
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    const queryId = world.createQuery(this.requiredComponents);
    const entities = world.getQueryResults(queryId);

    for (const entityId of entities) {
      const transform = world.getComponent(entityId, 'Transform');
      const velocity = world.getComponent(entityId, 'Velocity');

      if (!transform || !velocity) continue;

      // Actualizar posición lineal
      transform.position.x += velocity.linear.x * deltaTime;
      transform.position.y += velocity.linear.y * deltaTime;
      transform.position.z += velocity.linear.z * deltaTime;

      // Actualizar rotación angular
      transform.rotation.x += velocity.angular.x * deltaTime;
      transform.rotation.y += velocity.angular.y * deltaTime;
      transform.rotation.z += velocity.angular.z * deltaTime;
    }
  }
}

export class InputSystem {
  constructor() {
    this.name = 'Input';
    this.requiredComponents = ['Input'];
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    const queryId = world.createQuery(this.requiredComponents);
    const entities = world.getQueryResults(queryId);

    // En un juego real, esto vendría de eventos del teclado/ratón
    // Para demo, aplicamos una lógica simple
    for (const entityId of entities) {
      const input = world.getComponent(entityId, 'Input');

      if (!input) continue;

      // Simular input automático para demo
      if (Math.random() < 0.1) { // 10% chance per frame
        input.moveForward = !input.moveForward;
        input.moveLeft = !input.moveLeft;
      }
    }
  }
}

export class CollisionSystem {
  constructor() {
    this.name = 'Collision';
    this.requiredComponents = ['Transform', 'Collider'];
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    const queryId = world.createQuery(this.requiredComponents);
    const entities = world.getQueryResults(queryId);

    // Detección simple de colisiones para demo
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entityA = entities[i];
        const entityB = entities[j];

        const transformA = world.getComponent(entityA, 'Transform');
        const transformB = world.getComponent(entityB, 'Transform');
        const colliderA = world.getComponent(entityA, 'Collider');
        const colliderB = world.getComponent(entityB, 'Collider');

        if (this.checkCollision(transformA, colliderA, transformB, colliderB)) {
          console.log(`🔥 Colisión entre entidades ${entityA} y ${entityB}`);
        }
      }
    }
  }

  checkCollision(transformA, colliderA, transformB, colliderB) {
    if (!transformA || !transformB || !colliderA || !colliderB) return false;

    // Detección simple esfera-esfera
    const dx = transformA.position.x - transformB.position.x;
    const dy = transformA.position.y - transformB.position.y;
    const dz = transformA.position.z - transformB.position.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

    const minDistance = (colliderA.radius || 0.5) + (colliderB.radius || 0.5);
    return distance < minDistance;
  }
}

export class DamageSystem {
  constructor() {
    this.name = 'Damage';
    this.requiredComponents = ['Health'];
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    const queryId = world.createQuery(this.requiredComponents);
    const entities = world.getQueryResults(queryId);

    for (const entityId of entities) {
      const health = world.getComponent(entityId, 'Health');

      if (!health) continue;

      // Regeneración de salud
      if (health.regeneration > 0 && health.current < health.maximum) {
        health.current = Math.min(
          health.maximum,
          health.current + health.regeneration * deltaTime
        );
      }
    }
  }
}

export class AISystem {
  constructor() {
    this.name = 'AI';
    this.requiredComponents = ['AI', 'Transform'];
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    const queryId = world.createQuery(this.requiredComponents);
    const entities = world.getQueryResults(queryId);

    for (const entityId of entities) {
      const ai = world.getComponent(entityId, 'AI');
      const transform = world.getComponent(entityId, 'Transform');

      if (!ai || !transform) continue;

      // Comportamiento simple de patrulla
      if (ai.behavior === 'patrol') {
        transform.position.x += Math.sin(Date.now() * 0.001) * ai.moveSpeed * deltaTime;
      } else if (ai.behavior === 'chase' && ai.targetEntity) {
        const targetTransform = world.getComponent(ai.targetEntity, 'Transform');
        if (targetTransform) {
          const dx = targetTransform.position.x - transform.position.x;
          const dz = targetTransform.position.z - transform.position.z;
          const distance = Math.sqrt(dx*dx + dz*dz);

          if (distance > 0) {
            const moveX = (dx / distance) * ai.moveSpeed * deltaTime;
            const moveZ = (dz / distance) * ai.moveSpeed * deltaTime;
            transform.position.x += moveX;
            transform.position.z += moveZ;
          }
        }
      }
    }
  }
}

export class EventSystem {
  constructor() {
    this.name = 'Event';
    this.requiredComponents = [];
    this.lastExecutionTime = 0;
  }

  update() {
    // Sistema de eventos básico
    // En un juego real, procesaría colas de eventos
    console.log('🎯 Sistema de eventos ejecutándose...');
  }
}

export class ParticleSystem {
  constructor() {
    this.name = 'Particle';
    this.requiredComponents = ['ParticleEmitter', 'Transform'];
    this.lastExecutionTime = 0;
    this.particles = new Map(); // entityId -> array of particles
  }

  update(deltaTime, world) {
    const queryId = world.createQuery(this.requiredComponents);
    const entities = world.getQueryResults(queryId);

    for (const entityId of entities) {
      const emitter = world.getComponent(entityId, 'ParticleEmitter');
      const transform = world.getComponent(entityId, 'Transform');

      if (!emitter || !transform) continue;

      // Inicializar array de partículas si no existe
      if (!this.particles.has(entityId)) {
        this.particles.set(entityId, []);
      }

      const particleArray = this.particles.get(entityId);

      // Emitir nuevas partículas
      const particlesToEmit = emitter.rate * deltaTime;
      for (let i = 0; i < particlesToEmit; i++) {
        const particle = {
          id: Date.now() + Math.random(),
          position: { ...transform.position },
          velocity: {
            x: (Math.random() - 0.5) * emitter.speed * 2,
            y: (Math.random() - 0.5) * emitter.speed * 2,
            z: (Math.random() - 0.5) * emitter.speed * 2
          },
          lifetime: emitter.lifetime,
          maxLifetime: emitter.lifetime,
          size: emitter.size,
          color: { ...emitter.color }
        };
        particleArray.push(particle);
      }

      // Actualizar partículas existentes
      for (let i = particleArray.length - 1; i >= 0; i--) {
        const particle = particleArray[i];

        // Actualizar posición
        particle.position.x += particle.velocity.x * deltaTime;
        particle.position.y += particle.velocity.y * deltaTime;
        particle.position.z += particle.velocity.z * deltaTime;

        // Actualizar tiempo de vida
        particle.lifetime -= deltaTime;

        // Aplicar gravedad
        particle.velocity.y -= 9.81 * deltaTime;

        // Reducir velocidad (fricción)
        particle.velocity.x *= 0.98;
        particle.velocity.z *= 0.98;

        // Eliminar partículas muertas
        if (particle.lifetime <= 0) {
          particleArray.splice(i, 1);
        } else {
          // Fade out
          const lifeRatio = particle.lifetime / particle.maxLifetime;
          particle.color.a = lifeRatio;
          particle.size = emitter.size * lifeRatio;
        }
      }
    }
  }

  getParticles(entityId) {
    return this.particles.get(entityId) || [];
  }
}

export class PhysicsSystem {
  constructor() {
    this.name = 'Physics';
    this.requiredComponents = ['Physics', 'Transform'];
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    const queryId = world.createQuery(this.requiredComponents);
    const entities = world.getQueryResults(queryId);

    for (const entityId of entities) {
      const physics = world.getComponent(entityId, 'Physics');
      const transform = world.getComponent(entityId, 'Transform');

      if (!physics || !transform) continue;

      // Aplicar fuerzas
      for (const force of physics.forces) {
        physics.acceleration.x += force.x / physics.mass;
        physics.acceleration.y += force.y / physics.mass;
        physics.acceleration.z += force.z / physics.mass;
      }

      // Actualizar velocidad
      physics.velocity.x += physics.acceleration.x * deltaTime;
      physics.velocity.z += physics.acceleration.z * deltaTime;

      // Aplicar gravedad
      physics.velocity.y += physics.acceleration.y * deltaTime - 9.81 * deltaTime;

      // Aplicar fricción
      physics.velocity.x *= (1 - physics.friction * deltaTime);
      physics.velocity.z *= (1 - physics.friction * deltaTime);

      // Actualizar posición
      transform.position.x += physics.velocity.x * deltaTime;
      transform.position.y += physics.velocity.y * deltaTime;
      transform.position.z += physics.velocity.z * deltaTime;

      // Resetear aceleración para el siguiente frame
      physics.acceleration.x = 0;
      physics.acceleration.y = 0;
      physics.acceleration.z = 0;

      // Limpiar fuerzas aplicadas
      physics.forces.length = 0;
    }
  }

  applyForce(entityId, force, world) {
    const physics = world.getComponent(entityId, 'Physics');
    if (physics) {
      physics.forces.push({ ...force });
    }
  }
}

export class AudioSystem {
  constructor() {
    this.name = 'Audio';
    this.requiredComponents = ['AudioSource'];
    this.lastExecutionTime = 0;
    this.audioContext = null;
  }

  update(deltaTime, world) {
    const queryId = world.createQuery(this.requiredComponents);
    const entities = world.getQueryResults(queryId);

    for (const entityId of entities) {
      const audio = world.getComponent(entityId, 'AudioSource');

      if (!audio) continue;

      // Simular reproducción de audio (en un juego real esto tocaría sonidos)
      if (audio.playOnAwake && !audio.isPlaying) {
        console.log(`🔊 Reproduciendo audio: ${audio.clip} (volumen: ${audio.volume})`);
        audio.isPlaying = true;
      }

      if (audio.loop && audio.isPlaying) {
        console.log(`🔄 Audio en loop: ${audio.clip}`);
      }
    }
  }
}

export class HierarchySystem {
  constructor() {
    this.name = 'Hierarchy';
    this.requiredComponents = ['Transform', 'Parent'];
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    // Primero actualizar las transformaciones de padres
    this.updateParentTransforms(world);

    // Luego propagar a hijos
    this.updateChildTransforms(world);
  }

  updateParentTransforms(world) {
    const parentQuery = world.createQuery(['Transform', 'Parent']);

    for (const entityId of parentQuery) {
      const transform = world.getComponent(entityId, 'Transform');
      const parent = world.getComponent(entityId, 'Parent');

      if (!transform || !parent) continue;

      // Calcular matriz de transformación mundial
      this.calculateWorldTransform(entityId, transform, parent, world);
    }
  }

  updateChildTransforms(world) {
    const childQuery = world.createQuery(['Transform', 'Child']);

    for (const entityId of childQuery) {
      const transform = world.getComponent(entityId, 'Transform');
      const child = world.getComponent(entityId, 'Child');

      if (!transform || !child || !child.parentId) continue;

      // Obtener transform del padre
      const parentTransform = world.getComponent(child.parentId, 'Transform');
      if (!parentTransform) continue;

      // Aplicar transform local relativo al padre
      transform.position.x = parentTransform.position.x + child.localPosition.x;
      transform.position.y = parentTransform.position.y + child.localPosition.y;
      transform.position.z = parentTransform.position.z + child.localPosition.z;

      transform.rotation.x = parentTransform.rotation.x + child.localRotation.x;
      transform.rotation.y = parentTransform.rotation.y + child.localRotation.y;
      transform.rotation.z = parentTransform.rotation.z + child.localRotation.z;

      transform.scale.x = parentTransform.scale.x * child.localScale.x;
      transform.scale.y = parentTransform.scale.y * child.localScale.y;
      transform.scale.z = parentTransform.scale.z * child.localScale.z;
    }
  }

  calculateWorldTransform(entityId, transform, parent, world) {
    // Para este ejemplo educativo, mantenemos simple la transformación
    // En un motor real, esto implicaría matrices de transformación
    if (parent.entityId) {
      const parentTransform = world.getComponent(parent.entityId, 'Transform');
      if (parentTransform) {
        // Aplicar offset relativo al padre
        transform.position.x = parentTransform.position.x + parent.offset.x;
        transform.position.y = parentTransform.position.y + parent.offset.y;
        transform.position.z = parentTransform.position.z + parent.offset.z;
      }
    }
  }

  setParent(childId, parentId, world, offset = null) {
    // Remover cualquier relación padre anterior
    world.removeComponent(childId, 'Child');

    // Añadir componente Child
    const childComponent = {
      parentId: parentId,
      localPosition: offset || { x: 0, y: 0, z: 0 },
      localRotation: { x: 0, y: 0, z: 0 },
      localScale: { x: 1, y: 1, z: 1 }
    };
    world.addComponent(childId, 'Child', childComponent);

    // Añadir componente Parent al padre si no lo tiene
    if (!world.hasComponent(parentId, 'Parent')) {
      world.addComponent(parentId, 'Parent', {
        entityId: parentId,
        maintainOffset: true,
        offset: { x: 0, y: 0, z: 0 }
      });
    }

    console.log(`🔗 Entidad ${childId} ahora es hija de ${parentId}`);
  }

  removeParent(childId, world) {
    world.removeComponent(childId, 'Child');
    console.log(`🔗 Entidad ${childId} ya no tiene padre`);
  }

  getHierarchyTree(entityId, world, depth = 0) {
    const children = [];
    const childQuery = world.createQuery(['Child']);

    for (const childId of childQuery) {
      const child = world.getComponent(childId, 'Child');
      if (child && child.parentId === entityId) {
        children.push({
          id: childId,
          children: this.getHierarchyTree(childId, world, depth + 1),
          depth
        });
      }
    }

    return children;
  }
}