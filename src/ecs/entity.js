/**
 * Sistema de identidad generacional para entidades ECS
 * Evita dangling references usando índices generacionales de 32 bits
 */

export class EntityManager {
  constructor(maxEntities = 10000) {
    this.maxEntities = maxEntities;
    this.nextEntityId = 1;

    // Generaciones: índice -> generación actual
    this.generations = new Uint8Array(maxEntities);

    // Free list: slots libres para reutilizar
    this.freeSlots = [];

    // Mapa entityId -> slot para lookups rápidos
    this.entityToSlot = new Map();

    // Mapa slot -> entityId para validación
    this.slotToEntity = new Map();
  }

  /**
   * Crea una nueva entidad
   * Devuelve un entityId de 32 bits: [índice 24 bits][generación 8 bits]
   */
  createEntity() {
    let slot;

    if (this.freeSlots.length > 0) {
      // Reutilizar slot libre
      slot = this.freeSlots.pop();
      this.generations[slot]++;
    } else {
      // Crear nuevo slot
      if (this.nextEntityId >= this.maxEntities) {
        throw new Error('Máximo número de entidades alcanzado');
      }
      slot = this.nextEntityId++;
    }

    const generation = this.generations[slot];
    const entityId = this.encodeEntityId(slot, generation);

    this.entityToSlot.set(entityId, slot);
    this.slotToEntity.set(slot, entityId);

    return entityId;
  }

  /**
   * Destruye una entidad
   * Invalida todas las referencias incrementando la generación
   */
  destroyEntity(entityId) {
    if (!this.isAlive(entityId)) {
      return false;
    }

    const slot = this.entityToSlot.get(entityId);

    // Incrementar generación para invalidar referencias
    this.generations[slot]++;
    this.freeSlots.push(slot);

    this.entityToSlot.delete(entityId);
    this.slotToEntity.delete(slot);

    return true;
  }

  /**
   * Verifica si una entidad está viva (no destruida)
   */
  isAlive(entityId) {
    const slot = this.entityToSlot.get(entityId);
    if (slot === undefined) {
      return false;
    }

    const currentGeneration = this.generations[slot];
    const entityGeneration = this.decodeGeneration(entityId);

    return currentGeneration === entityGeneration;
  }

  /**
   * Obtiene el índice (slot) de una entidad
   */
  getIndex(entityId) {
    return this.entityToSlot.get(entityId);
  }

  /**
   * Obtiene la generación de una entidad
   */
  getGeneration(entityId) {
    return this.decodeGeneration(entityId);
  }

  /**
   * Codifica índice y generación en un entityId de 32 bits
   * [índice 24 bits][generación 8 bits]
   */
  encodeEntityId(index, generation) {
    return (index << 8) | (generation & 0xFF);
  }

  /**
   * Decodifica el índice del entityId
   */
  decodeIndex(entityId) {
    return entityId >>> 8;
  }

  /**
   * Decodifica la generación del entityId
   */
  decodeGeneration(entityId) {
    return entityId & 0xFF;
  }

  /**
   * Obtiene estadísticas del sistema de entidades
   */
  getStats() {
    return {
      aliveEntities: this.entityToSlot.size,
      freeSlots: this.freeSlots.length,
      totalSlots: this.nextEntityId - 1,
      loadFactor: ((this.nextEntityId - 1 - this.freeSlots.length) / this.maxEntities) * 100
    };
  }

  /**
   * Obtiene todas las entidades vivas
   */
  getAllEntities() {
    return Array.from(this.entityToSlot.keys());
  }

  /**
   * Limpia todas las entidades
   */
  clear() {
    this.entityToSlot.clear();
    this.slotToEntity.clear();
    this.freeSlots.length = 0;
    this.nextEntityId = 1;
    this.generations.fill(0);
  }
}
