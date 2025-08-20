/**
 * Almacenamiento orientado a datos (SoA) para componentes ECS
 * Usa TypedArrays para coherencia de caché y sparse sets para mapeo eficiente
 */

export class ComponentStorage {
  constructor(componentName, schema, initialCapacity = 256) {
    this.componentName = componentName;
    this.schema = schema;
    this.capacity = initialCapacity;
    this.size = 0;

    // Sparse set: entityId -> slot y slot -> entityId
    this.entityToSlot = new Map();
    this.slotToEntity = new Map();

    // Free list para slots reutilizables
    this.freeSlots = [];

    // Datos en formato SoA (Structure of Arrays)
    this.arrays = this.createArrays();

    // Estadísticas de rendimiento
    this.stats = {
      allocations: 0,
      deallocations: 0,
      resizes: 0,
      cacheMisses: 0
    };
  }

  /**
   * Crea los TypedArrays basados en el esquema
   */
  createArrays() {
    const arrays = {};

    for (const [fieldName, fieldType] of Object.entries(this.schema)) {
      switch (fieldType) {
        case 'float32':
          arrays[fieldName] = new Float32Array(this.capacity);
          break;
        case 'int32':
          arrays[fieldName] = new Int32Array(this.capacity);
          break;
        case 'uint32':
          arrays[fieldName] = new Uint32Array(this.capacity);
          break;
        case 'uint8':
          arrays[fieldName] = new Uint8Array(this.capacity);
          break;
        case 'boolean':
          arrays[fieldName] = new Uint8Array(this.capacity);
          break;
        case 'string':
          // Para strings usamos un array de referencias
          arrays[fieldName] = new Array(this.capacity).fill('');
          break;
        default:
          // Para objetos complejos
          arrays[fieldName] = new Array(this.capacity).fill(null);
          break;
      }
    }

    return arrays;
  }

  /**
   * Añade un componente a una entidad
   */
  add(entityId, data = {}) {
    if (this.entityToSlot.has(entityId)) {
      // Ya existe, actualizar
      return this.update(entityId, data);
    }

    // Obtener slot libre o nuevo
    let slot;
    if (this.freeSlots.length > 0) {
      slot = this.freeSlots.pop();
    } else {
      slot = this.size;
      if (slot >= this.capacity) {
        this.grow();
      }
    }

    // Mapear entity -> slot
    this.entityToSlot.set(entityId, slot);
    this.slotToEntity.set(slot, entityId);

    // Escribir datos en el slot
    this.writeDataToSlot(slot, data);

    this.size++;
    this.stats.allocations++;

    return true;
  }

  /**
   * Actualiza un componente existente
   */
  update(entityId, data) {
    const slot = this.entityToSlot.get(entityId);
    if (slot === undefined) {
      return false;
    }

    this.writeDataToSlot(slot, data);
    return true;
  }

  /**
   * Elimina un componente de una entidad
   */
  remove(entityId) {
    const slot = this.entityToSlot.get(entityId);
    if (slot === undefined) {
      return false;
    }

    // Limpiar slot
    this.clearSlot(slot);

    // Remover mapeos
    this.entityToSlot.delete(entityId);
    this.slotToEntity.delete(slot);

    // Añadir a free list
    this.freeSlots.push(slot);

    this.size--;
    this.stats.deallocations++;

    return true;
  }

  /**
   * Obtiene los datos de un componente
   */
  get(entityId) {
    const slot = this.entityToSlot.get(entityId);
    if (slot === undefined) {
      return null;
    }

    return this.readDataFromSlot(slot);
  }

  /**
   * Verifica si una entidad tiene este componente
   */
  has(entityId) {
    return this.entityToSlot.has(entityId);
  }

  /**
   * Obtiene todos los entityIds con este componente
   */
  getEntities() {
    return Array.from(this.entityToSlot.keys());
  }

  /**
   * Itera sobre todos los componentes (optimizado para caché)
   */
  forEach(callback) {
    for (let slot = 0; slot < this.capacity; slot++) {
      if (this.slotToEntity.has(slot)) {
        const entityId = this.slotToEntity.get(slot);
        const data = this.readDataFromSlot(slot);
        callback(entityId, data, slot);
      }
    }
  }

  /**
   * Escribe datos en un slot específico
   */
  writeDataToSlot(slot, data) {
    for (const [fieldName, value] of Object.entries(data)) {
      if (this.arrays[fieldName]) {
        if (this.arrays[fieldName] instanceof Array) {
          this.arrays[fieldName][slot] = value;
        } else {
          this.arrays[fieldName][slot] = value;
        }
      }
    }
  }

  /**
   * Lee datos desde un slot específico
   */
  readDataFromSlot(slot) {
    const data = {};

    for (const fieldName of Object.keys(this.schema)) {
      const array = this.arrays[fieldName];
      if (array instanceof Array) {
        data[fieldName] = array[slot];
      } else {
        data[fieldName] = array[slot];
      }
    }

    return data;
  }

  /**
   * Limpia un slot (pone valores por defecto)
   */
  clearSlot(slot) {
    for (const [fieldName, fieldType] of Object.entries(this.schema)) {
      const array = this.arrays[fieldName];
      if (array instanceof Array) {
        array[slot] = fieldType === 'string' ? '' : null;
      } else {
        array[slot] = 0;
      }
    }
  }

  /**
   * Crece el almacenamiento cuando se llena
   */
  grow() {
    const newCapacity = this.capacity * 2;
    console.log(`🏗️ Creciendo ${this.componentName} de ${this.capacity} a ${newCapacity}`);

    // Crear nuevos arrays
    const newArrays = this.createArrays();

    // Copiar datos existentes
    for (const fieldName of Object.keys(this.schema)) {
      if (newArrays[fieldName] instanceof Array) {
        newArrays[fieldName] = [...this.arrays[fieldName]];
        newArrays[fieldName].length = newCapacity;
      } else {
        // Copiar TypedArray
        const oldArray = this.arrays[fieldName];
        const newArray = new (oldArray.constructor)(newCapacity);
        newArray.set(oldArray);
        newArrays[fieldName] = newArray;
      }
    }

    this.arrays = newArrays;
    this.capacity = newCapacity;
    this.stats.resizes++;
  }

  /**
   * Obtiene estadísticas de rendimiento
   */
  getStats() {
    const loadFactor = (this.size / this.capacity) * 100;
    const isOverloaded = loadFactor > 80;

    return {
      componentName: this.componentName,
      size: this.size,
      capacity: this.capacity,
      loadFactor,
      isOverloaded,
      freeSlots: this.freeSlots.length,
      ...this.stats
    };
  }

  /**
   * Obtiene acceso directo a arrays para iteración optimizada
   */
  getRawArrays() {
    return this.arrays;
  }

  /**
   * Obtiene el slot de una entidad (para optimizaciones)
   */
  getSlot(entityId) {
    return this.entityToSlot.get(entityId);
  }
}

/**
 * Gestor de todos los almacenamientos de componentes
 */
export class StorageManager {
  constructor() {
    this.storages = new Map();
    this.componentSchemas = new Map();
  }

  /**
   * Registra un tipo de componente
   */
  registerComponent(componentType, schema) {
    this.componentSchemas.set(componentType, schema);
    this.storages.set(componentType, new ComponentStorage(componentType, schema));
  }

  /**
   * Obtiene el almacenamiento de un componente
   */
  getStorage(componentType) {
    return this.storages.get(componentType);
  }

  /**
   * Añade un componente a una entidad
   */
  addComponent(entityId, componentType, data = {}) {
    const storage = this.storages.get(componentType);
    if (!storage) {
      throw new Error(`Componente ${componentType} no registrado`);
    }
    return storage.add(entityId, data);
  }

  /**
   * Actualiza un componente
   */
  updateComponent(entityId, componentType, data) {
    const storage = this.storages.get(componentType);
    if (storage) {
      return storage.update(entityId, data);
    }
    return false;
  }

  /**
   * Elimina un componente
   */
  removeComponent(entityId, componentType) {
    const storage = this.storages.get(componentType);
    if (storage) {
      return storage.remove(entityId);
    }
    return false;
  }

  /**
   * Obtiene un componente
   */
  getComponent(entityId, componentType) {
    const storage = this.storages.get(componentType);
    if (storage) {
      return storage.get(entityId);
    }
    return null;
  }

  /**
   * Verifica si una entidad tiene un componente
   */
  hasComponent(entityId, componentType) {
    const storage = this.storages.get(componentType);
    return storage ? storage.has(entityId) : false;
  }

  /**
   * Obtiene estadísticas de todos los almacenamientos
   */
  getStats() {
    const stats = {};
    let totalSize = 0;
    let totalCapacity = 0;
    let overloadedStorages = [];

    for (const [componentType, storage] of this.storages) {
      const storageStats = storage.getStats();
      stats[componentType] = storageStats;
      totalSize += storageStats.size;
      totalCapacity += storageStats.capacity;

      if (storageStats.isOverloaded) {
        overloadedStorages.push(componentType);
      }
    }

    return {
      storages: stats,
      totalSize,
      totalCapacity,
      overallLoadFactor: totalCapacity > 0 ? (totalSize / totalCapacity) * 100 : 0,
      overloadedStorages
    };
  }

  /**
   * Limpia todos los almacenamientos
   */
  clear() {
    for (const storage of this.storages.values()) {
      // Limpiar referencias pero mantener arrays para reutilización
      storage.entityToSlot.clear();
      storage.slotToEntity.clear();
      storage.freeSlots.length = 0;
      storage.size = 0;
    }
  }
}
