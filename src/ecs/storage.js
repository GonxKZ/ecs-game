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
   * Obtiene el valor por defecto para un tipo de campo
   */
  getDefaultValue(fieldType) {
    switch (fieldType) {
      case 'float32':
      case 'int32':
      case 'uint32':
      case 'uint8':
        return 0;
      case 'boolean':
        return false;
      case 'string':
        return '';
      default:
        return null;
    }
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
    // Convertir de objeto a SoA si es necesario
    const soaData = this.convertObjectToSoa(data);

    for (const [fieldName, value] of Object.entries(soaData)) {
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
   * Convierte datos de objeto a formato SoA
   */
  convertObjectToSoa(objData) {
    // Para Transform: convertir objeto a campos separados
    if (this.componentName === 'Transform') {
      return {
        position_x: objData.position?.x || 0,
        position_y: objData.position?.y || 0,
        position_z: objData.position?.z || 0,
        rotation_x: objData.rotation?.x || 0,
        rotation_y: objData.rotation?.y || 0,
        rotation_z: objData.rotation?.z || 0,
        scale_x: objData.scale?.x || 1,
        scale_y: objData.scale?.y || 1,
        scale_z: objData.scale?.z || 1
      };
    }

    // Para Velocity: convertir objeto a campos separados
    if (this.componentName === 'Velocity') {
      return {
        linear_x: objData.linear?.x || 0,
        linear_y: objData.linear?.y || 0,
        linear_z: objData.linear?.z || 0,
        angular_x: objData.angular?.x || 0,
        angular_y: objData.angular?.y || 0,
        angular_z: objData.angular?.z || 0
      };
    }

    // Para Physics: convertir objeto a campos separados
    if (this.componentName === 'Physics') {
      return {
        mass: objData.mass || 1.0,
        friction: objData.friction || 0.5,
        restitution: objData.restitution || 0.3,
        velocity_x: objData.velocity?.x || 0,
        velocity_y: objData.velocity?.y || 0,
        velocity_z: objData.velocity?.z || 0,
        acceleration_x: objData.acceleration?.x || 0,
        acceleration_y: objData.acceleration?.y || 0,
        acceleration_z: objData.acceleration?.z || 0
      };
    }

    // Para otros componentes, devolver datos tal cual
    return objData;
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

    // Intentar convertir a formato de objeto si es necesario
    try {
      // Importación dinámica para evitar dependencias circulares
      return this.convertSoaToObject(data);
    } catch {
      // Si no se puede convertir, devolver datos SoA
      return data;
    }
  }

  /**
   * Convierte datos SoA a formato de objeto
   */
  convertSoaToObject(soaData) {
    // Para Transform: convertir campos separados a objeto
    if (this.componentName === 'Transform') {
      return {
        position: {
          x: soaData.position_x || 0,
          y: soaData.position_y || 0,
          z: soaData.position_z || 0
        },
        rotation: {
          x: soaData.rotation_x || 0,
          y: soaData.rotation_y || 0,
          z: soaData.rotation_z || 0
        },
        scale: {
          x: soaData.scale_x || 1,
          y: soaData.scale_y || 1,
          z: soaData.scale_z || 1
        }
      };
    }

    // Para Velocity: convertir campos separados a objeto
    if (this.componentName === 'Velocity') {
      return {
        linear: {
          x: soaData.linear_x || 0,
          y: soaData.linear_y || 0,
          z: soaData.linear_z || 0
        },
        angular: {
          x: soaData.angular_x || 0,
          y: soaData.angular_y || 0,
          z: soaData.angular_z || 0
        }
      };
    }

    // Para Physics: convertir campos separados a objeto
    if (this.componentName === 'Physics') {
      return {
        mass: soaData.mass || 1.0,
        friction: soaData.friction || 0.5,
        restitution: soaData.restitution || 0.3,
        velocity: {
          x: soaData.velocity_x || 0,
          y: soaData.velocity_y || 0,
          z: soaData.velocity_z || 0
        },
        acceleration: {
          x: soaData.acceleration_x || 0,
          y: soaData.acceleration_y || 0,
          z: soaData.acceleration_z || 0
        },
        forces: [] // Los arrays no se manejan en SoA por simplicidad
      };
    }

    // Para otros componentes, devolver datos SoA tal cual
    return soaData;
  }

  /**
   * Limpia un slot (pone valores por defecto)
   */
  clearSlot(slot) {
    for (const [fieldName, fieldType] of Object.entries(this.schema)) {
      const array = this.arrays[fieldName];
      const defaultValue = this.getDefaultValue(fieldType);

      if (array instanceof Array) {
        array[slot] = defaultValue;
      } else {
        array[slot] = defaultValue;
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
