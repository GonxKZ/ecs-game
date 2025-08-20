/**
 * Sistema de Prefabs para ECS
 * Permite crear, guardar y cargar plantillas reutilizables de entidades
 * Esencial para contenido educativo modular
 */

export class PrefabSystem {
  constructor(world) {
    this.world = world;
    this.prefabs = new Map();
    this.instances = new Map(); // prefabId -> [entityId]
    this.name = 'Prefabs';
    this.lastExecutionTime = 0;

    // Historial para undo/redo
    this.history = [];
    this.currentHistoryIndex = -1;

    // Configuración
    this.config = {
      maxHistorySize: 50,
      autoSaveToStorage: true,
      storagePrefix: 'ecs_prefab_'
    };

    this.name = 'Prefabs';
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    const startTime = performance.now();

    // Actualizar instancias de prefabs si es necesario
    this.updatePrefabInstances();

    this.lastExecutionTime = performance.now() - startTime;
  }

  // === CREACIÓN Y GESTIÓN DE PREFABS ===

  // Crear un prefab a partir de una entidad existente
  createPrefabFromEntity(entityId, prefabName, description = '') {
    if (!this.world.entities.has(entityId)) {
      throw new Error(`Entidad ${entityId} no existe`);
    }

    const prefabId = `prefab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Obtener todos los componentes de la entidad
    const components = this.world.getEntityComponents(entityId);
    const prefabData = {
      id: prefabId,
      name: prefabName,
      description: description,
      version: '1.0',
      createdAt: new Date().toISOString(),
      components: {},
      metadata: {
        originalEntity: entityId,
        componentCount: components.length,
        tags: []
      }
    };

    // Copiar datos de cada componente
    components.forEach(componentType => {
      const componentData = this.world.getComponent(entityId, componentType);
      if (componentData) {
        prefabData.components[componentType] = { ...componentData };
      }
    });

    // Guardar prefab
    this.prefabs.set(prefabId, prefabData);

    // Auto-guardar en localStorage
    if (this.config.autoSaveToStorage) {
      this.savePrefabToStorage(prefabId);
    }

    console.log(`🏗️ Prefab "${prefabName}" creado (ID: ${prefabId})`);
    return prefabId;
  }

  // Crear un prefab desde cero
  createPrefab(prefabName, components, description = '') {
    const prefabId = `prefab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const prefabData = {
      id: prefabId,
      name: prefabName,
      description: description,
      version: '1.0',
      createdAt: new Date().toISOString(),
      components: { ...components },
      metadata: {
        componentCount: Object.keys(components).length,
        tags: []
      }
    };

    this.prefabs.set(prefabId, prefabData);

    if (this.config.autoSaveToStorage) {
      this.savePrefabToStorage(prefabId);
    }

    console.log(`🏗️ Prefab "${prefabName}" creado desde cero (ID: ${prefabId})`);
    return prefabId;
  }

  // Instanciar un prefab
  instantiatePrefab(prefabId, overrides = {}) {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) {
      throw new Error(`Prefab ${prefabId} no encontrado`);
    }

    // Crear nueva entidad
    const entityId = this.world.createEntity();

    // Instalar componentes del prefab
    Object.entries(prefab.components).forEach(([componentType, componentData]) => {
      // Aplicar overrides si existen
      const finalData = { ...componentData };
      if (overrides[componentType]) {
        Object.assign(finalData, overrides[componentType]);
      }

      this.world.addComponent(entityId, componentType, finalData);
    });

    // Añadir metadatos de prefab
    this.world.addComponent(entityId, 'PrefabInstance', {
      prefabId: prefabId,
      instanceId: entityId,
      overrides: overrides
    });

    // Registrar instancia
    if (!this.instances.has(prefabId)) {
      this.instances.set(prefabId, []);
    }
    this.instances.get(prefabId).push(entityId);

    // Guardar en historial
    this.addToHistory({
      type: 'instantiate',
      prefabId,
      entityId,
      overrides
    });

    console.log(`📦 Prefab "${prefab.name}" instanciado como entidad ${entityId}`);
    return entityId;
  }

  // Actualizar todas las instancias de un prefab
  updatePrefabInstances(prefabId = null) {
    const prefabsToUpdate = prefabId ? [prefabId] : Array.from(this.prefabs.keys());

    prefabsToUpdate.forEach(id => {
      const prefab = this.prefabs.get(id);
      const instances = this.instances.get(id) || [];

      instances.forEach(entityId => {
        if (this.world.entities.has(entityId)) {
          this.updateInstanceFromPrefab(entityId, prefab);
        }
      });
    });
  }

  // Actualizar una instancia específica desde su prefab
  updateInstanceFromPrefab(entityId, prefab) {
    const instanceComponent = this.world.getComponent(entityId, 'PrefabInstance');
    if (!instanceComponent) return;

    // Obtener componentes actuales
    const currentComponents = this.world.getEntityComponents(entityId);

    // Actualizar cada componente del prefab
    Object.entries(prefab.components).forEach(([componentType, prefabData]) => {
      const overrides = instanceComponent.overrides[componentType] || {};

      if (this.world.hasComponent(entityId, componentType)) {
        // Actualizar componente existente
        const currentData = this.world.getComponent(entityId, componentType);
        const newData = { ...prefabData, ...overrides };
        this.world.updateComponent(entityId, componentType, newData);
      } else {
        // Añadir componente faltante
        const newData = { ...prefabData, ...overrides };
        this.world.addComponent(entityId, componentType, newData);
      }
    });
  }

  // === GESTIÓN DE PREFABS ===

  // Eliminar un prefab
  deletePrefab(prefabId) {
    if (!this.prefabs.has(prefabId)) return false;

    const prefab = this.prefabs.get(prefabId);

    // Eliminar todas las instancias
    const instances = this.instances.get(prefabId) || [];
    instances.forEach(entityId => {
      if (this.world.entities.has(entityId)) {
        this.world.destroyEntity(entityId);
      }
    });

    // Eliminar prefab
    this.prefabs.delete(prefabId);
    this.instances.delete(prefabId);

    // Eliminar de localStorage
    this.removePrefabFromStorage(prefabId);

    console.log(`🗑️ Prefab "${prefab.name}" eliminado`);
    return true;
  }

  // Duplicar un prefab
  duplicatePrefab(prefabId, newName) {
    const original = this.prefabs.get(prefabId);
    if (!original) return null;

    const newPrefabId = this.createPrefab(
      newName || `${original.name} (Copia)`,
      original.components,
      `Copia de ${original.description}`
    );

    return newPrefabId;
  }

  // === SERIALIZACIÓN ===

  // Exportar prefab como JSON
  exportPrefab(prefabId) {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) return null;

    const exportData = {
      ...prefab,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Importar prefab desde JSON
  importPrefab(jsonString) {
    try {
      const prefabData = JSON.parse(jsonString);

      // Validar estructura
      if (!prefabData.id || !prefabData.name || !prefabData.components) {
        throw new Error('Estructura de prefab inválida');
      }

      // Crear prefab
      const prefabId = this.createPrefab(
        prefabData.name,
        prefabData.components,
        prefabData.description || ''
      );

      console.log(`📥 Prefab "${prefabData.name}" importado`);
      return prefabId;
    } catch (error) {
      console.error('Error importando prefab:', error);
      return null;
    }
  }

  // === ALMACENAMIENTO LOCAL ===

  savePrefabToStorage(prefabId) {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) return;

    const storageKey = `${this.config.storagePrefix}${prefabId}`;
    const storageData = {
      ...prefab,
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(storageKey, JSON.stringify(storageData));
  }

  loadPrefabFromStorage(prefabId) {
    const storageKey = `${this.config.storagePrefix}${prefabId}`;
    const storedData = localStorage.getItem(storageKey);

    if (storedData) {
      try {
        const prefabData = JSON.parse(storedData);
        this.prefabs.set(prefabId, prefabData);
        return prefabData;
      } catch (error) {
        console.error(`Error cargando prefab ${prefabId} de localStorage:`, error);
      }
    }

    return null;
  }

  removePrefabFromStorage(prefabId) {
    const storageKey = `${this.config.storagePrefix}${prefabId}`;
    localStorage.removeItem(storageKey);
  }

  loadAllPrefabsFromStorage() {
    const keys = Object.keys(localStorage);
    const prefabKeys = keys.filter(key => key.startsWith(this.config.storagePrefix));

    prefabKeys.forEach(key => {
      const prefabId = key.replace(this.config.storagePrefix, '');
      this.loadPrefabFromStorage(prefabId);
    });

    console.log(`📦 ${this.prefabs.size} prefabs cargados de localStorage`);
  }

  // === SISTEMA DE HISTORIAL ===

  addToHistory(action) {
    // Remover acciones futuras si estamos en medio del historial
    if (this.currentHistoryIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentHistoryIndex + 1);
    }

    // Añadir nueva acción
    this.history.push({
      ...action,
      timestamp: new Date().toISOString(),
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    this.currentHistoryIndex = this.history.length - 1;

    // Limitar tamaño del historial
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
      this.currentHistoryIndex--;
    }
  }

  undo() {
    if (this.currentHistoryIndex < 0) return false;

    const action = this.history[this.currentHistoryIndex];

    switch (action.type) {
      case 'instantiate':
        // Deshacer instanciación
        if (this.world.entities.has(action.entityId)) {
          this.world.destroyEntity(action.entityId);
        }
        break;
    }

    this.currentHistoryIndex--;
    console.log('⏪ Undo realizado');
    return true;
  }

  redo() {
    if (this.currentHistoryIndex >= this.history.length - 1) return false;

    this.currentHistoryIndex++;
    const action = this.history[this.currentHistoryIndex];

    switch (action.type) {
      case 'instantiate':
        // Rehacer instanciación
        this.instantiatePrefab(action.prefabId, action.overrides);
        break;
    }

    console.log('⏩ Redo realizado');
    return true;
  }

  // === UTILIDADES ===

  // Obtener lista de prefabs
  getPrefabList() {
    return Array.from(this.prefabs.values()).map(prefab => ({
      id: prefab.id,
      name: prefab.name,
      description: prefab.description,
      componentCount: prefab.metadata.componentCount,
      instanceCount: this.instances.get(prefab.id)?.length || 0,
      createdAt: prefab.createdAt
    }));
  }

  // Buscar prefabs por nombre o descripción
  searchPrefabs(query) {
    const lowercaseQuery = query.toLowerCase();
    return this.getPrefabList().filter(prefab =>
      prefab.name.toLowerCase().includes(lowercaseQuery) ||
      prefab.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Obtener estadísticas
  getStats() {
    const totalInstances = Array.from(this.instances.values())
      .reduce((total, instances) => total + instances.length, 0);

    return {
      totalPrefabs: this.prefabs.size,
      totalInstances,
      historySize: this.history.length,
      currentHistoryIndex: this.currentHistoryIndex,
      storagePrefix: this.config.storagePrefix
    };
  }

  // === PREFABS PREDEFINIDOS EDUCATIVOS ===

  createEducationalPrefabs() {
    // Prefab básico de cubo
    this.createPrefab('Cubo Básico', {
      Transform: { position_x: 0, position_y: 0, position_z: 0, scale_x: 1, scale_y: 1, scale_z: 1 },
      RenderMesh: { geometryType: 'cube', width: 1, height: 1, depth: 1, visible: true },
      MaterialRef: { materialType: 'standard', color_r: 1, color_g: 1, color_b: 1, metalness: 0.5, roughness: 0.5 }
    }, 'Un cubo básico con material PBR');

    // Prefab de esfera física
    this.createPrefab('Esfera Física', {
      Transform: { position_x: 0, position_y: 5, position_z: 0 },
      RenderMesh: { geometryType: 'sphere', radius: 0.5, visible: true },
      MaterialRef: { materialType: 'standard', color_r: 0.8, color_g: 0.2, color_b: 0.2, metalness: 0.8, roughness: 0.2 },
      RigidBody: { type: 'dynamic', mass: 1 },
      Collider: { shape: 'sphere', radius: 0.5, friction: 0.5, restitution: 0.8 }
    }, 'Una esfera con físicas realistas');

    // Prefab de plataforma estática
    this.createPrefab('Plataforma', {
      Transform: { position_x: 0, position_y: 0, position_z: 0, scale_x: 5, scale_y: 0.5, scale_z: 5 },
      RenderMesh: { geometryType: 'cube', width: 5, height: 0.5, depth: 5, visible: true },
      MaterialRef: { materialType: 'standard', color_r: 0.5, color_g: 0.5, color_b: 0.5, metalness: 0.1, roughness: 0.8 },
      RigidBody: { type: 'static', mass: 0 },
      Collider: { shape: 'box', width: 5, height: 0.5, depth: 5, friction: 0.7, restitution: 0.2 }
    }, 'Una plataforma estática para colocar objetos');

    // Prefab de luz direccional
    this.createPrefab('Luz Direccional', {
      Transform: { position_x: 5, position_y: 10, position_z: 5 },
      Light: { type: 'directional', color_r: 1, color_g: 1, color_b: 1, intensity: 1, castShadow: true }
    }, 'Una luz direccional que simula el sol');

    console.log('🎓 Prefabs educativos creados');
  }
}

/**
 * Componente para marcar instancias de prefabs
 */
export const PrefabInstanceComponent = {
  prefabId: 'string', // ID del prefab original
  instanceId: 'int32', // ID de esta instancia
  overrides: 'object' // Overrides específicos de esta instancia
};

/**
 * Utilidades para prefabs
 */
export class PrefabUtils {
  /**
   * Crear un prefab de jugador completo
   */
  static createPlayerPrefab(prefabSystem) {
    return prefabSystem.createPrefab('Jugador', {
      Transform: { position_x: 0, position_y: 1, position_z: 0 },
      RenderMesh: { geometryType: 'capsule', radius: 0.5, height: 2, visible: true },
      MaterialRef: { materialType: 'standard', color_r: 0.2, color_g: 0.6, color_b: 1, metalness: 0.2, roughness: 0.5 },
      RigidBody: { type: 'dynamic', mass: 70 },
      Collider: { shape: 'capsule', radius: 0.5, height: 2, friction: 0.8, restitution: 0.1 },
      Input: { moveForward: false, moveBackward: false, moveLeft: false, moveRight: false, jump: false, speed: 5.0 },
      Health: { current: 100, maximum: 100 },
      Camera: { isActive: true, fov: 75, near: 0.1, far: 1000 }
    }, 'Personaje jugador completo con controles y cámara');
  }

  /**
   * Crear un prefab de enemigo simple
   */
  static createEnemyPrefab(prefabSystem) {
    return prefabSystem.createPrefab('Enemigo', {
      Transform: { position_x: 0, position_y: 1, position_z: 0 },
      RenderMesh: { geometryType: 'sphere', radius: 0.7, visible: true },
      MaterialRef: { materialType: 'standard', color_r: 0.8, color_g: 0.2, color_b: 0.2, metalness: 0.3, roughness: 0.7 },
      RigidBody: { type: 'dynamic', mass: 50 },
      Collider: { shape: 'sphere', radius: 0.7, friction: 0.6, restitution: 0.3 },
      AI: { state: 'patrol', target_x: 0, target_y: 0, target_z: 0, speed: 2.0 },
      Health: { current: 50, maximum: 50 }
    }, 'Enemigo básico con IA simple');
  }

  /**
   * Crear un prefab de objeto recolectable
   */
  static createPickupPrefab(prefabSystem) {
    return prefabSystem.createPrefab('Objeto Recolectable', {
      Transform: { position_x: 0, position_y: 1, position_z: 0 },
      RenderMesh: { geometryType: 'sphere', radius: 0.3, visible: true },
      MaterialRef: { materialType: 'standard', color_r: 1, color_g: 0.8, color_b: 0, metalness: 0.9, roughness: 0.1 },
      RigidBody: { type: 'dynamic', mass: 0.1 },
      Collider: { shape: 'sphere', radius: 0.3, friction: 0.2, restitution: 0.5, isSensor: true },
      Animation: { animationName: 'rotate', isPlaying: true, loop: true, speed: 1.0 }
    }, 'Objeto que puede ser recolectado por el jugador');
  }
}
