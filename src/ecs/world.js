/**
 * Mundo ECS educativo
 * Gestiona entidades, componentes y sistemas de forma pedagógica
 */

import { EntityManager } from './entity.js';
import { StorageManager } from './storage.js';
import { QueryOptimizer, PerformanceVisualizer } from './queryOptimizer.js';
import { EventBus, ECSEventSystem } from './events.js';
import { SystemScheduler } from './scheduler.js';

export class ECSWorld {
  constructor() {
    // Sistema de entidades generacionales
    this.entityManager = new EntityManager(10000);

    // Sistema de almacenamiento SoA
    this.storageManager = new StorageManager();

    // Sistema de eventos lock-free
    this.eventBus = new EventBus();

    // Scheduler profesional con fixed timestep
    this.scheduler = new SystemScheduler();

    // Mantener compatibilidad con código existente
    this.entities = new Map(); // entityId -> Set<componentTypes>
    this.components = new Map(); // componentType -> Map<entityId, componentData>
    this.systems = new Map(); // systemName -> systemInstance
    this.queries = new Map(); // queryId -> Set<entityId>
    this.archetypes = new Map(); // archetypeSignature -> Set<entityId>
    this.queryOptimizer = null; // Se inicializará cuando se importe
    this.persistenceManager = null; // Se inicializará dinámicamente
    this.nextEntityId = 1;
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.accumulatedTime = 0;
    this.fixedTimeStep = 1000 / 60; // 60 FPS
  }

  /**
   * Crea una nueva entidad y devuelve su ID
   */
  createEntity(name) {
    // Usar el sistema de entidades generacionales
    const entityId = this.entityManager.createEntity();

    // Mantener compatibilidad con código existente
    this.entities.set(entityId, new Set());

    // Añadir componente de metadatos si se proporciona nombre
    if (name) {
      this.addComponent(entityId, 'Metadata', { name, createdAt: Date.now() });
    }

    console.log(`🏗️ Entidad ${entityId} creada${name && name.length > 0 ? ` (${name})` : ''}`);
    return entityId;
  }

  /**
   * Elimina una entidad y todos sus componentes
   */
  destroyEntity(entityId) {
    if (!this.entities.has(entityId)) {
      console.warn(`⚠️ Intento de eliminar entidad inexistente: ${entityId}`);
      return;
    }

    // Verificar que la entidad esté viva usando el EntityManager
    if (!this.entityManager.isAlive(entityId)) {
      console.warn(`⚠️ Intento de eliminar entidad ya destruida: ${entityId}`);
      return;
    }

    // Remover de todos los componentes
    this.entities.get(entityId).forEach(componentType => {
      this.components.get(componentType).delete(entityId);
      // También del sistema de almacenamiento SoA
      if (this.storageManager) {
        this.storageManager.removeComponent(entityId, componentType);
      }
    });

    // Destruir usando el EntityManager (invalida todas las referencias)
    this.entityManager.destroyEntity(entityId);

    this.entities.delete(entityId);
    console.log(`🗑️ Entidad ${entityId} eliminada`);
  }

  /**
   * Registra un nuevo tipo de componente
   */
  registerComponent(componentType, schema) {
    if (this.components.has(componentType)) {
      console.warn(`⚠️ Componente ${componentType} ya registrado`);
      return;
    }

    // Mantener compatibilidad con código existente
    this.components.set(componentType, new Map());

    // Registrar en el sistema de almacenamiento SoA
    if (this.storageManager && schema) {
      this.storageManager.registerComponent(componentType, schema);
    }

    console.log(`📦 Componente ${componentType} registrado`);
  }

  /**
   * Añade un componente a una entidad
   */
  addComponent(entityId, componentType, data = {}) {
    if (!this.entities.has(entityId)) {
      console.warn(`⚠️ Entidad ${entityId} no existe`);
      return false;
    }

    // Verificar que la entidad esté viva
    if (!this.entityManager.isAlive(entityId)) {
      console.warn(`⚠️ Intento de añadir componente a entidad destruida: ${entityId}`);
      return false;
    }

    if (!this.components.has(componentType)) {
      this.registerComponent(componentType, data);
    }

    // Añadir al sistema de almacenamiento SoA
    if (this.storageManager) {
      this.storageManager.addComponent(entityId, componentType, data);
    }

    const componentMap = this.components.get(componentType);
    componentMap.set(entityId, { ...data });

    this.entities.get(entityId).add(componentType);

    // Actualizar arquetipo de la entidad
    this.updateEntityArchetype(entityId);

    // Invalidar queries que podrían verse afectadas
    this.invalidateQueries();

    console.log(`➕ Componente ${componentType} añadido a entidad ${entityId}`);
    return true;
  }

  /**
   * Remueve un componente de una entidad
   */
  removeComponent(entityId, componentType) {
    if (!this.entities.has(entityId)) {
      return false;
    }

    if (!this.entities.get(entityId).has(componentType)) {
      return false;
    }

    this.components.get(componentType).delete(entityId);
    this.entities.get(entityId).delete(componentType);

    // Actualizar arquetipo de la entidad
    this.updateEntityArchetype(entityId);

    // Invalidar queries
    this.invalidateQueries();

    console.log(`➖ Componente ${componentType} removido de entidad ${entityId}`);
    return true;
  }

  /**
   * Obtiene los datos de un componente de una entidad
   */
  getComponent(entityId, componentType) {
    if (!this.components.has(componentType)) {
      return null;
    }
    return this.components.get(componentType).get(entityId) || null;
  }

  /**
   * Verifica si una entidad tiene un componente
   */
  hasComponent(entityId, componentType) {
    if (!this.entities.has(entityId)) {
      return false;
    }
    return this.entities.get(entityId).has(componentType);
  }

  /**
   * Crea una query para encontrar entidades con ciertos componentes
   */
  createQuery(requiredComponents = [], forbiddenComponents = []) {
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const matchingEntities = new Set();

    // Encontrar entidades que cumplen los requisitos
    for (const [entityId, entityComponents] of this.entities) {
      const hasRequired = requiredComponents.every(comp => entityComponents.has(comp));
      const hasForbidden = forbiddenComponents.some(comp => entityComponents.has(comp));

      if (hasRequired && !hasForbidden) {
        matchingEntities.add(entityId);
      }
    }

    this.queries.set(queryId, matchingEntities);
    return queryId;
  }

  /**
   * Obtiene las entidades que cumplen una query
   */
  getQueryResults(queryId) {
    return this.queries.get(queryId) || new Set();
  }

  /**
   * Invalida todas las queries (llamar cuando cambian componentes)
   */
  invalidateQueries() {
    this.queries.clear();
  }



  /**
   * Ejecuta todos los sistemas usando el scheduler profesional
   */
  update(deltaTime) {
    if (!this.isRunning) return;

    // Usar el scheduler con fixed timestep y dependencias
    this.scheduler.executeFrame(deltaTime, this);

    // Mantener compatibilidad: actualizar lastExecutionTime en sistemas antiguos
    for (const [, system] of this.systems) {
      if (system.lastExecutionTime === undefined) {
        system.lastExecutionTime = 0;
      }
    }
  }

  /**
   * Inicia el bucle de actualización
   */
  start() {
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    console.log('🚀 ECS iniciado');
  }

  /**
   * Detiene el bucle de actualización
   */
  stop() {
    this.isRunning = false;
    console.log('⏹️ ECS detenido');
  }

  /**
   * Registra un sistema con dependencias en el scheduler
   */
  registerSystem(name, system, dependencies = []) {
    this.systems.set(name, system);
    this.scheduler.registerSystem(name, system, dependencies);

    // Integrar con el sistema de eventos si es necesario
    if (name === 'Event' && this.eventBus) {
      system.eventBus = this.eventBus;
    }

    console.log(`✅ Sistema ${name} registrado con dependencias: ${dependencies.join(', ')}`);
  }

  /**
   * Control del scheduler
   */
  pauseScheduler() {
    this.scheduler.pause();
  }

  resumeScheduler() {
    this.scheduler.resume();
  }

  togglePauseScheduler() {
    this.scheduler.togglePause();
  }

  enableStepMode() {
    this.scheduler.enableStepMode();
  }

  stepScheduler() {
    this.scheduler.step(this);
  }

  /**
   * Inicializa el optimizador de queries (se llama desde el hook)
   */
  initializeQueryOptimizer() {
    // Importación dinámica para evitar problemas de dependencias circulares
    import('./queryOptimizer.js').then(({ QueryOptimizer }) => {
      this.queryOptimizer = new QueryOptimizer(this);
    }).catch(err => {
      console.warn('No se pudo cargar el optimizador de queries:', err);
    });
  }

  /**
   * Inicializa el gestor de persistencia
   */
  initializePersistenceManager() {
    import('./persistence.js').then(({ PersistenceManager }) => {
      this.persistenceManager = new PersistenceManager(this);
    }).catch(err => {
      console.warn('No se pudo cargar el gestor de persistencia:', err);
    });
  }

  /**
   * Calcula la firma de arquetipo de una entidad
   */
  calculateArchetypeSignature(entityId) {
    if (!this.entities.has(entityId)) return '';

    const componentTypes = Array.from(this.entities.get(entityId)).sort();
    return componentTypes.join(',');
  }

  /**
   * Actualiza el arquetipo de una entidad
   */
  updateEntityArchetype(entityId) {
    const signature = this.calculateArchetypeSignature(entityId);

    // Remover de arquetipos anteriores
    for (const [archSignature, entities] of this.archetypes) {
      entities.delete(entityId);
      if (entities.size === 0) {
        this.archetypes.delete(archSignature);
      }
    }

    // Añadir al nuevo arquetipo
    if (!this.archetypes.has(signature)) {
      this.archetypes.set(signature, new Set());
    }
    this.archetypes.get(signature).add(entityId);
  }

  /**
   * Crea una query optimizada usando el optimizador
   */
  createOptimizedQuery(requiredComponents = [], forbiddenComponents = []) {
    if (this.queryOptimizer) {
      const queryId = `optimized_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.queryOptimizer.executeOptimizedQuery(
        queryId,
        requiredComponents,
        forbiddenComponents
      );
      return queryId;
    }

    // Fallback al método original
    return this.createQuery(requiredComponents, forbiddenComponents);
  }

  /**
   * Obtiene estadísticas educativas avanzadas
   */
  getEducationalStats() {
    const baseStats = this.getStats();
    const archetypeStats = {};

    // Estadísticas de arquetipos
    for (const [signature, entities] of this.archetypes) {
      archetypeStats[signature] = {
        entityCount: entities.size,
        components: signature.split(',').filter(c => c.length > 0)
      };
    }

    // Estadísticas del optimizador
    const optimizerStats = this.queryOptimizer ?
      this.queryOptimizer.getPerformanceStats() :
      { message: 'Optimizador no disponible' };

    return {
      ...baseStats,
      archetypes: archetypeStats,
      archetypeCount: this.archetypes.size,
      queryOptimizer: optimizerStats
    };
  }

  /**
   * Genera un reporte educativo sobre el estado del ECS
   */
  generateEducationalReport() {
    const stats = this.getEducationalStats();
    const report = [];

    report.push('🎓 Reporte Educativo del ECS');
    report.push('='.repeat(40));
    report.push(`📊 Entidades totales: ${stats.entities}`);
    report.push(`📦 Componentes totales: ${stats.totalComponents}`);
    report.push(`🏗️ Arquetipos: ${stats.archetypeCount}`);
    report.push(`⚙️ Sistemas: ${Object.keys(stats.systems).length}`);

    report.push('\n🔍 Distribución por arquetipos:');
    Object.entries(stats.archetypes).forEach(([signature, data]) => {
      report.push(`  • ${data.entityCount} entidades: [${signature || 'sin componentes'}]`);
    });

    if (this.queryOptimizer) {
      report.push('\n📈 Optimización de Queries:');
      const optReport = this.queryOptimizer.generateEducationalReport();
      report.push(optReport);
    }

    return report.join('\n');
  }

  /**
   * Obtiene estadísticas del mundo
   */
  getStats() {
    const stats = {
      entities: this.entities.size,
      components: {},
      systems: {},
      totalComponents: 0
    };

    // Contar componentes por tipo
    for (const [componentType, componentMap] of this.components) {
      stats.components[componentType] = componentMap.size;
      stats.totalComponents += componentMap.size;
    }

    // Estadísticas de sistemas
    for (const [name, system] of this.systems) {
      stats.systems[name] = {
        lastExecutionTime: system.lastExecutionTime || 0
      };
    }

    return stats;
  }

  // === MÉTODOS PARA ENTITY EDITOR ===

  // Obtener todos los componentes de una entidad
  getEntityComponents(entityId) {
    const components = [];

    // Verificar cada tipo de componente posible
    const componentTypes = [
      'Transform', 'RenderMesh', 'MaterialRef', 'Velocity', 'Physics',
      'RigidBody', 'Collider', 'Camera', 'Light', 'Health', 'Input',
      'AI', 'ParticleSystem', 'Animation', 'AudioSource', 'Parent',
      'Child', 'State', 'Metadata', 'LOD', 'InstanceGroup', 'InstanceMember'
    ];

    componentTypes.forEach(componentType => {
      if (this.hasComponent(entityId, componentType)) {
        components.push(componentType);
      }
    });

    return components;
  }

  // Obtener datos por defecto para un componente
  getDefaultComponentData(componentType) {
    const defaults = {
      Transform: {
        position_x: 0, position_y: 0, position_z: 0,
        rotation_x: 0, rotation_y: 0, rotation_z: 0,
        scale_x: 1, scale_y: 1, scale_z: 1
      },
      RenderMesh: {
        geometryType: 'sphere',
        radius: 0.5, width: 1, height: 1, depth: 1,
        visible: true
      },
      MaterialRef: {
        materialType: 'standard',
        color_r: 1, color_g: 1, color_b: 1,
        metalness: 0.5, roughness: 0.5,
        emissive_r: 0, emissive_g: 0, emissive_b: 0,
        transparent: false, opacity: 1
      },
      Velocity: {
        linear_x: 0, linear_y: 0, linear_z: 0,
        angular_x: 0, angular_y: 0, angular_z: 0
      },
      Physics: {
        mass: 1.0, friction: 0.5, restitution: 0.3,
        velocity_x: 0, velocity_y: 0, velocity_z: 0,
        acceleration_x: 0, acceleration_y: 0, acceleration_z: 0
      },
      RigidBody: {
        type: 'dynamic',
        mass: 1
      },
      Collider: {
        shape: 'sphere',
        radius: 0.5, width: 1, height: 1, depth: 1,
        friction: 0.5, restitution: 0.3,
        isSensor: false
      },
      Camera: {
        isActive: false,
        fov: 75, near: 0.1, far: 1000, aspect: 1.6,
        mode: 'perspective'
      },
      Light: {
        type: 'point',
        color_r: 1, color_g: 1, color_b: 1,
        intensity: 1, range: 10, angle: Math.PI/4, penumbra: 0.1,
        castShadow: true
      },
      Health: {
        current: 100,
        maximum: 100
      },
      Input: {
        moveForward: false, moveBackward: false, moveLeft: false, moveRight: false,
        jump: false, speed: 5.0
      },
      AI: {
        state: 'idle',
        target_x: 0, target_y: 0, target_z: 0,
        speed: 3.0
      },
      ParticleSystem: {
        emitterShape: 'point',
        rate: 10, lifetime: 2.0,
        startSize: 0.1, endSize: 0.05,
        startColor_r: 1, startColor_g: 1, startColor_b: 1,
        endColor_r: 0, endColor_g: 0, endColor_b: 0,
        velocity_x: 0, velocity_y: 1, velocity_z: 0,
        velocityVariation: 0.5
      },
      Animation: {
        animationName: 'idle',
        isPlaying: false, loop: true, speed: 1.0,
        currentTime: 0, duration: 1
      },
      AudioSource: {
        audioName: 'sound1',
        volume: 1.0, pitch: 1.0,
        loop: false, isPlaying: false,
        spatial: true
      },
      Parent: {
        parentId: 0
      },
      Child: {
        childrenIds: []
      },
      State: {
        currentState: 'default',
        previousState: 'default',
        stateTimer: 0
      },
      Metadata: {
        name: 'Entity',
        description: '',
        tags: []
      }
    };

    return defaults[componentType] || {};
  }

  // Obtener esquema de un componente
  getComponentSchema(componentType) {
    const schemas = {
      Transform: {
        position_x: 'float32', position_y: 'float32', position_z: 'float32',
        rotation_x: 'float32', rotation_y: 'float32', rotation_z: 'float32',
        scale_x: 'float32', scale_y: 'float32', scale_z: 'float32'
      },
      RenderMesh: {
        geometryType: 'string', radius: 'float32', width: 'float32',
        height: 'float32', depth: 'float32', visible: 'boolean'
      },
      MaterialRef: {
        materialType: 'string',
        color_r: 'float32', color_g: 'float32', color_b: 'float32',
        metalness: 'float32', roughness: 'float32',
        emissive_r: 'float32', emissive_g: 'float32', emissive_b: 'float32',
        transparent: 'boolean', opacity: 'float32'
      },
      Velocity: {
        linear_x: 'float32', linear_y: 'float32', linear_z: 'float32',
        angular_x: 'float32', angular_y: 'float32', angular_z: 'float32'
      },
      Physics: {
        mass: 'float32', friction: 'float32', restitution: 'float32',
        velocity_x: 'float32', velocity_y: 'float32', velocity_z: 'float32',
        acceleration_x: 'float32', acceleration_y: 'float32', acceleration_z: 'float32'
      },
      RigidBody: {
        type: 'string', mass: 'float32'
      },
      Collider: {
        shape: 'string', radius: 'float32', width: 'float32', height: 'float32',
        depth: 'float32', friction: 'float32', restitution: 'float32', isSensor: 'boolean'
      },
      Camera: {
        isActive: 'boolean', fov: 'float32', near: 'float32', far: 'float32',
        aspect: 'float32', mode: 'string'
      },
      Light: {
        type: 'string', color_r: 'float32', color_g: 'float32', color_b: 'float32',
        intensity: 'float32', range: 'float32', angle: 'float32', penumbra: 'float32',
        castShadow: 'boolean'
      },
      Health: {
        current: 'int32', maximum: 'int32'
      },
      Input: {
        moveForward: 'boolean', moveBackward: 'boolean', moveLeft: 'boolean',
        moveRight: 'boolean', jump: 'boolean', speed: 'float32'
      },
      AI: {
        state: 'string', target_x: 'float32', target_y: 'float32', target_z: 'float32',
        speed: 'float32'
      },
      ParticleSystem: {
        emitterShape: 'string', rate: 'float32', lifetime: 'float32',
        startSize: 'float32', endSize: 'float32',
        startColor_r: 'float32', startColor_g: 'float32', startColor_b: 'float32',
        endColor_r: 'float32', endColor_g: 'float32', endColor_b: 'float32',
        velocity_x: 'float32', velocity_y: 'float32', velocity_z: 'float32',
        velocityVariation: 'float32'
      },
      Animation: {
        animationName: 'string', isPlaying: 'boolean', loop: 'boolean',
        speed: 'float32', currentTime: 'float32', duration: 'float32'
      },
      AudioSource: {
        audioName: 'string', volume: 'float32', pitch: 'float32',
        loop: 'boolean', isPlaying: 'boolean', spatial: 'boolean'
      },
      Parent: {
        parentId: 'int32'
      },
      Child: {
        childrenIds: 'array'
      },
      State: {
        currentState: 'string', previousState: 'string', stateTimer: 'float32'
      },
      Metadata: {
        name: 'string', description: 'string', tags: 'array'
      }
    };

    return schemas[componentType] || {};
  }

  // Actualizar componente (para el editor)
  updateComponent(entityId, componentType, newData) {
    // Remover el componente existente
    this.removeComponent(entityId, componentType);

    // Añadir con los nuevos datos
    this.addComponent(entityId, componentType, newData);
  }
}
