/**
 * Sistema de Frame Diff Visual - Compara componentes entre frames consecutivos
 * para debugging y optimización de rendimiento
 */
export class FrameDiffSystem {
  constructor() {
    this.name = 'FrameDiffSystem';
    this.requiredComponents = [];
    this.isEnabled = false;

    // Estado del sistema
    this.world = null;
    this.currentFrame = null;
    this.previousFrame = null;
    this.frameCounter = 0;

    // Configuración
    this.config = {
      maxDiffs: 100,              // Máximo número de diferencias a rastrear
      ignoreComponents: new Set(['Metadata']), // Componentes a ignorar
      diffThreshold: 0.001,        // Umbral para considerar cambio significativo
      trackComponentTypes: true,   // Rastrear tipos de componentes cambiados
      trackEntityChanges: true     // Rastrear entidades modificadas
    };

    // Diferencias actuales
    this.currentDiffs = {
      changedComponents: new Map(),  // entityId -> { componentType: { old: data, new: data } }
      addedComponents: new Map(),    // entityId -> Set(componentTypes)
      removedComponents: new Map(),  // entityId -> Set(componentTypes)
      addedEntities: new Set(),      // entityIds
      removedEntities: new Set(),    // entityIds
      modifiedEntities: new Set()    // entityIds
    };

    // Historial de diferencias
    this.diffHistory = [];
    this.maxHistorySize = 60; // Últimos 60 frames

    // Estadísticas
    this.stats = {
      framesAnalyzed: 0,
      totalChanges: 0,
      avgChangesPerFrame: 0,
      mostChangedComponent: '',
      mostChangedEntity: 0
    };
  }

  /**
   * Inicializa el sistema
   */
  init(world) {
    this.world = world;
    console.log('🔍 Frame Diff System inicializado');
  }

  /**
   * Captura el estado actual de todos los componentes
   */
  captureFrame() {
    if (!this.world) return;

    const frame = {
      frameNumber: this.frameCounter++,
      timestamp: performance.now(),
      entities: new Map(),
      componentCounts: new Map()
    };

    // Capturar todas las entidades y sus componentes
    const allEntities = this.world.entityManager.getAllEntities();

    for (const entityId of allEntities) {
      const entityComponents = {};

      // Obtener todos los componentes de la entidad
      for (const componentType of Object.keys(this.world.components || {})) {
        if (this.world.hasComponent(entityId, componentType)) {
          const componentData = this.world.getComponent(entityId, componentType);
          if (componentData) {
            entityComponents[componentType] = this.deepClone(componentData);

            // Contar componentes por tipo
            const count = frame.componentCounts.get(componentType) || 0;
            frame.componentCounts.set(componentType, count + 1);
          }
        }
      }

      if (Object.keys(entityComponents).length > 0) {
        frame.entities.set(entityId, entityComponents);
      }
    }

    // Actualizar frames
    this.previousFrame = this.currentFrame;
    this.currentFrame = frame;

    return frame;
  }

  /**
   * Calcula las diferencias entre frames consecutivos
   */
  calculateDiffs() {
    if (!this.previousFrame || !this.currentFrame) return;

    // Reset diffs
    this.currentDiffs = {
      changedComponents: new Map(),
      addedComponents: new Map(),
      removedComponents: new Map(),
      addedEntities: new Set(),
      removedEntities: new Set(),
      modifiedEntities: new Set()
    };

    const prevEntities = this.previousFrame.entities;
    const currEntities = this.currentFrame.entities;

    // Encontrar entidades añadidas y removidas
    const prevEntityIds = new Set(prevEntities.keys());
    const currEntityIds = new Set(currEntities.keys());

    for (const entityId of currEntityIds) {
      if (!prevEntityIds.has(entityId)) {
        this.currentDiffs.addedEntities.add(entityId);
      }
    }

    for (const entityId of prevEntityIds) {
      if (!currEntityIds.has(entityId)) {
        this.currentDiffs.removedEntities.add(entityId);
      }
    }

    // Encontrar cambios en componentes
    for (const entityId of currEntityIds) {
      if (prevEntityIds.has(entityId)) {
        const prevComponents = prevEntities.get(entityId);
        const currComponents = currEntities.get(entityId);
        const entityChanges = { changed: new Map(), added: new Set(), removed: new Set() };

        // Componentes actuales
        for (const [compType, currData] of Object.entries(currComponents)) {
          if (this.config.ignoreComponents.has(compType)) continue;

          const prevData = prevComponents[compType];

          if (!prevData) {
            // Componente añadido
            entityChanges.added.add(compType);
            this.addToComponentMap(this.currentDiffs.addedComponents, entityId, compType);
          } else if (!this.areComponentsEqual(prevData, currData)) {
            // Componente modificado
            entityChanges.changed.set(compType, {
              old: prevData,
              new: currData,
              diff: this.calculateComponentDiff(prevData, currData)
            });
            this.addToComponentMap(this.currentDiffs.changedComponents, entityId, compType, {
              old: prevData,
              new: currData
            });
          }
        }

        // Componentes removidos
        for (const compType of Object.keys(prevComponents)) {
          if (this.config.ignoreComponents.has(compType)) continue;

          if (!currComponents[compType]) {
            entityChanges.removed.add(compType);
            this.addToComponentMap(this.currentDiffs.removedComponents, entityId, compType);
          }
        }

        // Marcar entidad como modificada si hubo cambios
        if (entityChanges.changed.size > 0 || entityChanges.added.size > 0 || entityChanges.removed.size > 0) {
          this.currentDiffs.modifiedEntities.add(entityId);
        }
      }
    }

    // Actualizar estadísticas
    this.updateStats();

    // Añadir al historial
    this.addToHistory();
  }

  /**
   * Añade entrada al historial
   */
  addToHistory() {
    const historyEntry = {
      frameNumber: this.currentFrame.frameNumber,
      timestamp: this.currentFrame.timestamp,
      changes: {
        addedEntities: this.currentDiffs.addedEntities.size,
        removedEntities: this.currentDiffs.removedEntities.size,
        modifiedEntities: this.currentDiffs.modifiedEntities.size,
        changedComponents: this.getTotalChangedComponents(),
        addedComponents: this.getTotalAddedComponents(),
        removedComponents: this.getTotalRemovedComponents()
      },
      totalChanges: this.getTotalChanges()
    };

    this.diffHistory.push(historyEntry);
    if (this.diffHistory.length > this.maxHistorySize) {
      this.diffHistory.shift();
    }
  }

  /**
   * Actualiza estadísticas
   */
  updateStats() {
    this.stats.framesAnalyzed++;

    const totalChanges = this.getTotalChanges();
    this.stats.totalChanges += totalChanges;

    // Promedio de cambios por frame
    this.stats.avgChangesPerFrame = this.stats.totalChanges / Math.max(1, this.stats.framesAnalyzed);

    // Encontrar componente más cambiado
    const componentChanges = new Map();
    for (const changes of this.currentDiffs.changedComponents.values()) {
      for (const compType of changes.keys()) {
        const count = componentChanges.get(compType) || 0;
        componentChanges.set(compType, count + 1);
      }
    }

    let maxChanges = 0;
    for (const [compType, count] of componentChanges.entries()) {
      if (count > maxChanges) {
        maxChanges = count;
        this.stats.mostChangedComponent = compType;
      }
    }

    // Encontrar entidad más cambiada
    const entityChanges = new Map();
    for (const entityId of this.currentDiffs.modifiedEntities) {
      const changes = this.currentDiffs.changedComponents.get(entityId);
      if (changes) {
        entityChanges.set(entityId, changes.size);
      }
    }

    let maxEntityChanges = 0;
    for (const [entityId, count] of entityChanges.entries()) {
      if (count > maxEntityChanges) {
        maxEntityChanges = count;
        this.stats.mostChangedEntity = entityId;
      }
    }
  }

  /**
   * Método principal de actualización
   */
  update(deltaTime) {
    // Usar deltaTime para debugging de performance
    if (this.debugMode && deltaTime > 16.67) {
      console.warn('FrameDiffSystem: Frame time alto:', deltaTime, 'ms');
    }
    if (!this.isEnabled) return;

    this.captureFrame();
    this.calculateDiffs();
  }

  // === MÉTODOS DE COMPARACIÓN ===

  /**
   * Compara dos componentes para ver si son iguales
   */
  areComponentsEqual(comp1, comp2) {
    if (comp1 === comp2) return true;

    // Comparación profunda para objetos
    if (typeof comp1 !== typeof comp2) return false;
    if (comp1 === null || comp2 === null) return comp1 === comp2;

    if (typeof comp1 === 'object') {
      const keys1 = Object.keys(comp1);
      const keys2 = Object.keys(comp2);

      if (keys1.length !== keys2.length) return false;

      for (const key of keys1) {
        if (!keys2.includes(key)) return false;

        const val1 = comp1[key];
        const val2 = comp2[key];

        // Para números, usar umbral
        if (typeof val1 === 'number' && typeof val2 === 'number') {
          if (Math.abs(val1 - val2) > this.config.diffThreshold) return false;
        } else if (!this.areComponentsEqual(val1, val2)) {
          return false;
        }
      }

      return true;
    }

    return comp1 === comp2;
  }

  /**
   * Calcula la diferencia específica entre dos componentes
   */
  calculateComponentDiff(oldComp, newComp) {
    const diff = {};

    for (const key of Object.keys(newComp)) {
      const oldVal = oldComp[key];
      const newVal = newComp[key];

      if (typeof oldVal === 'number' && typeof newVal === 'number') {
        const delta = newVal - oldVal;
        if (Math.abs(delta) > this.config.diffThreshold) {
          diff[key] = { old: oldVal, new: newVal, delta };
        }
      } else if (oldVal !== newVal) {
        diff[key] = { old: oldVal, new: newVal };
      }
    }

    return diff;
  }

  // === MÉTODOS UTILITARIOS ===

  /**
   * Añade componente a un mapa de componentes por entidad
   */
  addToComponentMap(map, entityId, componentType, data = null) {
    if (!map.has(entityId)) {
      map.set(entityId, new Map());
    }

    if (data) {
      map.get(entityId).set(componentType, data);
    } else {
      if (!map.has(entityId)) {
        map.set(entityId, new Set());
      }
      map.get(entityId).add(componentType);
    }
  }

  /**
   * Clonación profunda de objetos
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }

    if (obj instanceof Map) {
      return new Map(Array.from(obj.entries()).map(([k, v]) => [k, this.deepClone(v)]));
    }

    if (obj instanceof Set) {
      return new Set(Array.from(obj).map(item => this.deepClone(item)));
    }

    const cloned = {};
    for (const key of Object.keys(obj)) {
      cloned[key] = this.deepClone(obj[key]);
    }
    return cloned;
  }

  // === MÉTODOS DE CONSULTA ===

  /**
   * Obtiene el total de cambios en el frame actual
   */
  getTotalChanges() {
    return (
      this.currentDiffs.addedEntities.size +
      this.currentDiffs.removedEntities.size +
      this.currentDiffs.modifiedEntities.size +
      this.getTotalChangedComponents() +
      this.getTotalAddedComponents() +
      this.getTotalRemovedComponents()
    );
  }

  getTotalChangedComponents() {
    let total = 0;
    for (const changes of this.currentDiffs.changedComponents.values()) {
      total += changes.size;
    }
    return total;
  }

  getTotalAddedComponents() {
    let total = 0;
    for (const changes of this.currentDiffs.addedComponents.values()) {
      total += changes.size;
    }
    return total;
  }

  getTotalRemovedComponents() {
    let total = 0;
    for (const changes of this.currentDiffs.removedComponents.values()) {
      total += changes.size;
    }
    return total;
  }

  // === API PÚBLICA ===

  /**
   * Habilita/deshabilita el sistema
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (enabled) {
      this.captureFrame(); // Captura frame inicial
    }
    console.log(`🔍 Frame Diff System: ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Obtiene las diferencias del frame actual
   */
  getCurrentDiffs() {
    return {
      ...this.currentDiffs,
      changedComponents: Object.fromEntries(
        Array.from(this.currentDiffs.changedComponents.entries()).map(([entityId, changes]) => [
          entityId,
          Object.fromEntries(changes.entries())
        ])
      ),
      addedComponents: Object.fromEntries(
        Array.from(this.currentDiffs.addedComponents.entries()).map(([entityId, comps]) => [
          entityId,
          Array.from(comps)
        ])
      ),
      removedComponents: Object.fromEntries(
        Array.from(this.currentDiffs.removedComponents.entries()).map(([entityId, comps]) => [
          entityId,
          Array.from(comps)
        ])
      ),
      addedEntities: Array.from(this.currentDiffs.addedEntities),
      removedEntities: Array.from(this.currentDiffs.removedEntities),
      modifiedEntities: Array.from(this.currentDiffs.modifiedEntities)
    };
  }

  /**
   * Obtiene estadísticas del sistema
   */
  getStats() {
    return {
      ...this.stats,
      currentChanges: this.getTotalChanges(),
      isEnabled: this.isEnabled,
      historySize: this.diffHistory.length
    };
  }

  /**
   * Obtiene el historial de diferencias
   */
  getDiffHistory() {
    return this.diffHistory;
  }

  /**
   * Configura el sistema
   */
  setConfig(newConfig) {
    Object.assign(this.config, newConfig);
    console.log('🔧 Frame Diff System config updated:', this.config);
  }

  /**
   * Resetea el sistema
   */
  reset() {
    this.currentFrame = null;
    this.previousFrame = null;
    this.frameCounter = 0;
    this.currentDiffs = {
      changedComponents: new Map(),
      addedComponents: new Map(),
      removedComponents: new Map(),
      addedEntities: new Set(),
      removedEntities: new Set(),
      modifiedEntities: new Set()
    };
    this.diffHistory.length = 0;
    this.stats = {
      framesAnalyzed: 0,
      totalChanges: 0,
      avgChangesPerFrame: 0,
      mostChangedComponent: '',
      mostChangedEntity: 0
    };
    console.log('🔄 Frame Diff System reset');
  }
}
