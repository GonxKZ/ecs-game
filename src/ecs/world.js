/**
 * Mundo ECS educativo
 * Gestiona entidades, componentes y sistemas de forma pedagógica
 */

import { EntityManager } from './entity.js';
import { StorageManager } from './storage.js';
import { QueryOptimizer, PerformanceVisualizer } from './queryOptimizer.js';

export class ECSWorld {
  constructor() {
    // Sistema de entidades generacionales
    this.entityManager = new EntityManager(10000);

    // Sistema de almacenamiento SoA
    this.storageManager = new StorageManager();

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
    const entityId = this.nextEntityId++;
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

    // Remover de todos los componentes
    this.entities.get(entityId).forEach(componentType => {
      this.components.get(componentType).delete(entityId);
    });

    this.entities.delete(entityId);
    console.log(`🗑️ Entidad ${entityId} eliminada`);
  }

  /**
   * Registra un nuevo tipo de componente
   */
  registerComponent(componentType) {
    if (this.components.has(componentType)) {
      console.warn(`⚠️ Componente ${componentType} ya registrado`);
      return;
    }

    this.components.set(componentType, new Map());
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

    if (!this.components.has(componentType)) {
      this.registerComponent(componentType, data);
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
   * Registra un sistema
   */
  registerSystem(name, system) {
    this.systems.set(name, system);
    console.log(`⚙️ Sistema ${name} registrado`);
  }

  /**
   * Ejecuta todos los sistemas
   */
  update(deltaTime) {
    if (!this.isRunning) return;

    // Actualizar tiempo acumulado
    this.accumulatedTime += deltaTime;

    // Ejecutar sistemas de tiempo variable
    for (const [, system] of this.systems) {
      if (system.update) {
        const startTime = performance.now();
        system.update(deltaTime, this);
        const endTime = performance.now();
        system.lastExecutionTime = endTime - startTime;
      }
    }

    // Ejecutar sistemas de tiempo fijo
    while (this.accumulatedTime >= this.fixedTimeStep) {
      for (const [, system] of this.systems) {
        if (system.fixedUpdate) {
          const startTime = performance.now();
          system.fixedUpdate(this.fixedTimeStep, this);
          const endTime = performance.now();
          system.lastExecutionTime = endTime - startTime;
        }
      }
      this.accumulatedTime -= this.fixedTimeStep;
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
}
