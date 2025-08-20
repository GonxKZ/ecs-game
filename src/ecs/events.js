/**
 * Sistema de eventos lock-free con double buffering para ECS
 * Permite comunicación eficiente entre sistemas sin dependencias directas
 */

export class EventBus {
  constructor() {
    // Double buffer para eventos (lock-free)
    this.buffers = [
      new Map(), // Buffer A: producción
      new Map()  // Buffer B: consumo
    ];
    this.currentBuffer = 0; // Índice del buffer actual (0 = producción, 1 = consumo)

    // Suscriptores por tipo de evento (thread-safe con Map)
    this.subscribers = new Map();

    // Estadísticas de rendimiento
    this.stats = {
      eventsSent: 0,
      eventsProcessed: 0,
      maxQueueLength: 0,
      droppedEvents: 0,
      averageProcessingTime: 0
    };

    // Tipos de eventos predefinidos con IDs numéricos
    this.eventTypes = new Map([
      ['Input', 1],
      ['Damage', 2],
      ['Spawn', 3],
      ['Death', 4],
      ['Collision', 5],
      ['Pickup', 6],
      ['LevelComplete', 7],
      ['SystemMessage', 8],
      ['Render', 9],
      ['Physics', 10],
      ['Audio', 11],
      ['Network', 12]
    ]);

    // Pool de objetos evento para reducir GC
    this.eventPool = [];
    this.maxPoolSize = 1000;

    // Configuración de límites
    this.maxEventsPerFrame = 10000;
    this.maxSubscribersPerEvent = 100;
  }

  /**
   * Envía un evento al buffer actual (lock-free, thread-safe)
   */
  send(eventType, payload, senderId = 0) {
    const buffer = this.buffers[this.currentBuffer];
    const eventId = this.getEventTypeId(eventType);

    // Obtener o crear cola de eventos para este tipo
    let eventQueue = buffer.get(eventId);
    if (!eventQueue) {
      eventQueue = [];
      buffer.set(eventId, eventQueue);
    }

    // Limitar eventos por frame para evitar explosión de memoria
    if (eventQueue.length >= this.maxEventsPerFrame) {
      this.stats.droppedEvents++;
      return false;
    }

    // Obtener evento del pool o crear nuevo
    let event = this.eventPool.pop();
    if (!event) {
      event = {};
    }

    // Configurar evento
    event.type = eventId;
    event.senderId = senderId;
    event.timestamp = performance.now();
    event.payload = this.sanitizePayload(payload);

    eventQueue.push(event);
    this.stats.eventsSent++;

    const queueLength = eventQueue.length;
    if (queueLength > this.stats.maxQueueLength) {
      this.stats.maxQueueLength = queueLength;
    }

    return true;
  }

  /**
   * Procesa todos los eventos del buffer opuesto (lock-free swap buffers)
   */
  processEvents() {
    const startTime = performance.now();

    // Atomic swap buffers (lock-free)
    const readBuffer = this.currentBuffer;
    this.currentBuffer = 1 - this.currentBuffer;
    const writeBuffer = this.currentBuffer;

    // Limpiar buffer de escritura para el siguiente frame
    this.buffers[writeBuffer].clear();

    // Procesar eventos del buffer de lectura
    const readBufferMap = this.buffers[readBuffer];

    for (const [eventType, events] of readBufferMap) {
      const subscribers = this.subscribers.get(eventType) || [];

      // Limitar suscriptores para evitar cuellos de botella
      const maxSubscribers = Math.min(subscribers.length, this.maxSubscribersPerEvent);

      for (const event of events) {
        // Notificar a suscriptores limitados
        for (let i = 0; i < maxSubscribers; i++) {
          const subscriber = subscribers[i];
          try {
            subscriber(event);
          } catch (error) {
            console.error(`Error en suscriptor de evento ${eventType}:`, error);
          }
        }

        this.stats.eventsProcessed++;

        // Devolver evento al pool para reutilización
        this.returnEventToPool(event);
      }
    }

    const processingTime = performance.now() - startTime;
    this.updateAverageProcessingTime(processingTime);
  }

  /**
   * Devuelve evento al pool para reutilización
   */
  returnEventToPool(event) {
    if (this.eventPool.length < this.maxPoolSize) {
      // Limpiar propiedades para reutilización
      event.type = 0;
      event.senderId = 0;
      event.timestamp = 0;
      event.payload = null;

      this.eventPool.push(event);
    }
  }

  /**
   * Actualiza tiempo promedio de procesamiento
   */
  updateAverageProcessingTime(processingTime) {
    const alpha = 0.1; // Smoothing factor
    this.stats.averageProcessingTime =
      this.stats.averageProcessingTime * (1 - alpha) + processingTime * alpha;
  }

  /**
   * Suscribe una función a un tipo de evento
   */
  subscribe(eventType, callback) {
    const eventId = this.getEventTypeId(eventType);

    if (!this.subscribers.has(eventId)) {
      this.subscribers.set(eventId, new Set());
    }

    this.subscribers.get(eventId).add(callback);

    // Retornar función para desuscribir
    return () => {
      const subs = this.subscribers.get(eventId);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  /**
   * Obtiene el ID numérico de un tipo de evento
   */
  getEventTypeId(eventType) {
    return this.eventTypes.get(eventType) || 0;
  }

  /**
   * Registra un nuevo tipo de evento
   */
  registerEventType(eventType, eventId) {
    if (!this.eventTypes.has(eventType)) {
      this.eventTypes.set(eventType, eventId);
      return true;
    }
    return false;
  }

  /**
   * Sanitiza el payload para evitar problemas de serialización
   */
  sanitizePayload(payload) {
    if (payload === null || payload === undefined) {
      return {};
    }

    if (typeof payload !== 'object') {
      return { value: payload };
    }

    // Crear copia superficial y remover funciones
    const sanitized = {};
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value !== 'function' && typeof value !== 'symbol') {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Obtiene estadísticas del sistema de eventos
   */
  getStats() {
    const totalSubscribers = Array.from(this.subscribers.values())
      .reduce((sum, subs) => sum + subs.size, 0);

    const bufferAEventCount = Array.from(this.buffers[0].values())
      .reduce((sum, events) => sum + events.length, 0);

    const bufferBEventCount = Array.from(this.buffers[1].values())
      .reduce((sum, events) => sum + events.length, 0);

    const poolEfficiency = this.eventPool.length / this.maxPoolSize;

    return {
      ...this.stats,
      totalSubscribers,
      eventTypesCount: this.eventTypes.size,
      bufferAEvents: bufferAEventCount,
      bufferBEvents: bufferBEventCount,
      poolEfficiency,
      currentBuffer: this.currentBuffer === 0 ? 'A' : 'B',
      memoryUsage: {
        eventPoolSize: this.eventPool.length,
        maxPoolSize: this.maxPoolSize
      }
    };
  }

  /**
   * Limpia todos los eventos y suscriptores
   */
  clear() {
    this.buffers[0].clear();
    this.buffers[1].clear();
    this.subscribers.clear();
    this.stats = {
      eventsSent: 0,
      eventsProcessed: 0,
      maxQueueLength: 0
    };
  }
}

/**
 * Wrapper para usar EventBus en sistemas ECS
 */
export class ECSEventSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.name = 'Event';
    this.requiredComponents = [];
    this.lastExecutionTime = 0;
  }

  update() {
    // Procesar eventos al final de cada frame
    this.eventBus.processEvents();
  }

  /**
   * Envía un evento desde una entidad
   */
  sendEntityEvent(entityId, eventType, payload) {
    this.eventBus.send(eventType, payload, entityId);
  }

  /**
   * Suscribe a eventos de un tipo específico
   */
  on(eventType, callback) {
    return this.eventBus.subscribe(eventType, callback);
  }
}

/**
 * Utilidades para trabajar con eventos
 */
export class EventUtils {
  /**
   * Crea un evento de daño
   */
  static createDamageEvent(attackerId, targetId, damage, type = 'physical') {
    return {
      attackerId,
      targetId,
      damage,
      type,
      position: null // Se puede añadir posición del impacto
    };
  }

  /**
   * Crea un evento de colisión
   */
  static createCollisionEvent(entityA, entityB, point = null, normal = null) {
    return {
      entityA,
      entityB,
      point,
      normal,
      timestamp: performance.now()
    };
  }

  /**
   * Crea un evento de spawn
   */
  static createSpawnEvent(entityId, prefabName, position) {
    return {
      entityId,
      prefabName,
      position,
      timestamp: performance.now()
    };
  }

  /**
   * Filtra eventos por tipo
   */
  static filterEventsByType(events, eventType) {
    return events.filter(event => event.type === eventType);
  }

  /**
   * Obtiene los eventos más recientes de cada tipo
   */
  static getLatestEvents(events, limit = 10) {
    const grouped = events.reduce((acc, event) => {
      if (!acc[event.type]) {
        acc[event.type] = [];
      }
      acc[event.type].push(event);
      return acc;
    }, {});

    const latest = {};
    for (const [type, typeEvents] of Object.entries(grouped)) {
      latest[type] = typeEvents.slice(-limit);
    }

    return latest;
  }
}
