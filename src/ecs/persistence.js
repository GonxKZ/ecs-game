/**
 * Sistema de persistencia para el ECS educativo
 * Permite guardar y cargar estados del mundo, crear prefabs, etc.
 */

export class PersistenceManager {
  constructor(world) {
    this.world = world;
    this.prefabs = new Map();
  }

  /**
   * Guarda el estado completo del mundo
   */
  saveWorld(name = 'world') {
    const saveData = {
      name,
      timestamp: Date.now(),
      entities: {},
      resources: {},
      nextEntityId: this.world.nextEntityId
    };

    // Guardar entidades
    for (const [entityId, componentTypes] of this.world.entities) {
      saveData.entities[entityId] = {};

      for (const componentType of componentTypes) {
        const componentData = this.world.getComponent(entityId, componentType);
        if (componentData) {
          saveData.entities[entityId][componentType] = componentData;
        }
      }
    }

    // Guardar recursos
    if (this.world.resourceManager) {
      saveData.resources = this.world.resourceManager.getStats().resources.reduce((acc, resource) => {
        acc[resource.name] = this.world.resourceManager.getResource(resource.name);
        return acc;
      }, {});
    }

    console.log(`💾 Mundo guardado: ${Object.keys(saveData.entities).length} entidades`);
    return JSON.stringify(saveData, null, 2);
  }

  /**
   * Carga un estado guardado del mundo
   */
  loadWorld(jsonData) {
    try {
      const loadData = JSON.parse(jsonData);

      // Limpiar mundo actual
      this.world.entities.clear();
      this.world.nextEntityId = loadData.nextEntityId || 1;

      // Cargar entidades
      for (const [entityId, components] of Object.entries(loadData.entities)) {
        const numericId = parseInt(entityId);

        // Crear entidad si no existe
        if (!this.world.entities.has(numericId)) {
          this.world.entities.set(numericId, new Set());
        }

        // Cargar componentes
        for (const [componentType, componentData] of Object.entries(components)) {
          this.world.addComponent(numericId, componentType, componentData);
        }
      }

      // Cargar recursos
      if (this.world.resourceManager && loadData.resources) {
        for (const [name, data] of Object.entries(loadData.resources)) {
          this.world.resourceManager.setResource(name, data);
        }
      }

      console.log(`📂 Mundo cargado: ${Object.keys(loadData.entities).length} entidades`);
      return true;
    } catch (error) {
      console.error('Error cargando mundo:', error);
      return false;
    }
  }

  /**
   * Crea un prefab a partir de una entidad
   */
  createPrefab(entityId, name) {
    if (!this.world.entities.has(entityId)) {
      console.error(`Entidad ${entityId} no existe`);
      return null;
    }

    const prefab = {
      name,
      createdAt: Date.now(),
      components: {}
    };

    // Copiar todos los componentes de la entidad
    for (const componentType of this.world.entities.get(entityId)) {
      const componentData = this.world.getComponent(entityId, componentType);
      if (componentData) {
        prefab.components[componentType] = { ...componentData };
      }
    }

    this.prefabs.set(name, prefab);
    console.log(`🏗️ Prefab creado: ${name} (${Object.keys(prefab.components).length} componentes)`);

    return prefab;
  }

  /**
   * Instancia un prefab en el mundo
   */
  instantiatePrefab(prefabName, position = { x: 0, y: 0, z: 0 }) {
    const prefab = this.prefabs.get(prefabName);
    if (!prefab) {
      console.error(`Prefab ${prefabName} no existe`);
      return null;
    }

    const entityId = this.world.createEntity(`${prefabName}_instance`);

    // Instanciar todos los componentes del prefab
    for (const [componentType, componentData] of Object.entries(prefab.components)) {
      const instanceData = { ...componentData };

      // Si es un componente Transform, aplicar la posición
      if (componentType === 'Transform') {
        instanceData.position = { ...position };
      }

      this.world.addComponent(entityId, componentType, instanceData);
    }

    console.log(`🎭 Prefab instanciado: ${prefabName} (entidad ${entityId})`);
    return entityId;
  }

  /**
   * Lista todos los prefabs disponibles
   */
  listPrefabs() {
    return Array.from(this.prefabs.entries()).map(([name, prefab]) => ({
      name,
      componentCount: Object.keys(prefab.components).length,
      createdAt: prefab.createdAt
    }));
  }

  /**
   * Guarda todos los prefabs
   */
  savePrefabs() {
    const prefabData = {};
    for (const [name, prefab] of this.prefabs) {
      prefabData[name] = prefab;
    }

    console.log(`💾 Prefabs guardados: ${this.prefabs.size} prefabs`);
    return JSON.stringify(prefabData, null, 2);
  }

  /**
   * Carga prefabs guardados
   */
  loadPrefabs(jsonData) {
    try {
      const prefabData = JSON.parse(jsonData);
      this.prefabs.clear();

      for (const [name, prefab] of Object.entries(prefabData)) {
        this.prefabs.set(name, prefab);
      }

      console.log(`📂 Prefabs cargados: ${this.prefabs.size} prefabs`);
      return true;
    } catch (error) {
      console.error('Error cargando prefabs:', error);
      return false;
    }
  }

  /**
   * Exporta una entidad como JSON
   */
  exportEntity(entityId) {
    if (!this.world.entities.has(entityId)) {
      return null;
    }

    const entityData = {
      id: entityId,
      components: {}
    };

    for (const componentType of this.world.entities.get(entityId)) {
      const componentData = this.world.getComponent(entityId, componentType);
      if (componentData) {
        entityData.components[componentType] = componentData;
      }
    }

    return JSON.stringify(entityData, null, 2);
  }

  /**
   * Importa una entidad desde JSON
   */
  importEntity(jsonData) {
    try {
      const entityData = JSON.parse(jsonData);
      const entityId = this.world.createEntity(`imported_${entityData.id || Date.now()}`);

      for (const [componentType, componentData] of Object.entries(entityData.components)) {
        this.world.addComponent(entityId, componentType, componentData);
      }

      console.log(`📥 Entidad importada: ${entityId}`);
      return entityId;
    } catch (error) {
      console.error('Error importando entidad:', error);
      return null;
    }
  }
}

/**
 * Utilidades para trabajar con datos serializables
 */
export class SerializationUtils {
  /**
   * Verifica si un objeto es serializable a JSON
   */
  static isSerializable(obj) {
    try {
      JSON.stringify(obj);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Limpia un objeto para hacerlo serializable
   */
  static cleanForSerialization(obj) {
    const cleaned = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'function') continue;
      if (typeof value === 'symbol') continue;
      if (value === undefined) continue;

      if (typeof value === 'object' && value !== null) {
        cleaned[key] = this.cleanForSerialization(value);
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Calcula el tamaño aproximado de un objeto serializado
   */
  static calculateSerializedSize(obj) {
    try {
      const json = JSON.stringify(obj);
      return new Blob([json]).size;
    } catch {
      return 0;
    }
  }
}
