/**
 * Sistema de identidad generacional para entidades ECS
 * Evita dangling references usando índices generacionales de 32 bits
 */

export class EntityManager {
  constructor(maxEntities = 10000) {
    this.maxEntities = maxEntities;
    this.nextEntityId = 1;

    // Generaciones: índice -> generación actual (8 bits, overflow intencional)
    this.generations = new Uint8Array(maxEntities);

    // Free list: slots libres para reutilizar (LIFO para locality)
    this.freeSlots = [];

    // Mapa entityId -> slot para lookups O(1)
    this.entityToSlot = new Map();

    // Mapa slot -> entityId para validación O(1)
    this.slotToEntity = new Map();

    // Estadísticas para debugging
    this.stats = {
      created: 0,
      destroyed: 0,
      reused: 0,
      alive: 0
    };

    // Pool de entityIds destruidos para evitar GC de strings
    this.destroyedIds = new Set();
  }

  /**
   * Crea una nueva entidad
   * Devuelve un entityId de 32 bits: [índice 24 bits][generación 8 bits]
   */
  createEntity() {
    let slot;

    if (this.freeSlots.length > 0) {
      // Reutilizar slot libre (LIFO para mejor locality)
      slot = this.freeSlots.pop();
      this.generations[slot]++;
      this.stats.reused++;
    } else {
      // Crear nuevo slot
      if (this.nextEntityId >= this.maxEntities) {
        throw new Error('Máximo número de entidades alcanzado');
      }
      slot = this.nextEntityId++;
      this.stats.created++;
    }

    const generation = this.generations[slot];
    const entityId = this.encodeEntityId(slot, generation);

    this.entityToSlot.set(entityId, slot);
    this.slotToEntity.set(slot, entityId);
    this.stats.alive++;

    // Limpiar del pool de destruidos si estaba ahí
    this.destroyedIds.delete(entityId);

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

    // Incrementar generación para invalidar referencias (overflow intencional)
    this.generations[slot]++;
    this.freeSlots.push(slot);

    this.entityToSlot.delete(entityId);
    this.slotToEntity.delete(slot);

    // Añadir al pool de destruidos para evitar GC
    this.destroyedIds.add(entityId);

    this.stats.destroyed++;
    this.stats.alive--;

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
    const totalSlots = this.nextEntityId - 1;
    const usedSlots = totalSlots - this.freeSlots.length;
    const loadFactor = (usedSlots / this.maxEntities) * 100;

    return {
      aliveEntities: this.stats.alive,
      freeSlots: this.freeSlots.length,
      totalSlots,
      usedSlots,
      loadFactor,
      isOverloaded: loadFactor > 80,
      generationsUsed: Math.max(...this.generations),
      destroyedIdsPool: this.destroyedIds.size,
      ...this.stats
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
