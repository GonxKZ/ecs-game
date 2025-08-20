import * as THREE from 'three';

/**
 * Sistema de Audio de Rayos X - Ilumina eventos ECS con sonidos
 * Cada tipo de evento tiene un tono específico para debugging auditivo
 */
export class AudioXRaySystem {
  constructor() {
    this.name = 'AudioXRaySystem';
    this.requiredComponents = [];
    this.isEnabled = false;

    // Configuración de audio
    this.audioContext = null;
    this.isInitialized = false;
    this.soundPool = new Map();

    // Mapeo de eventos a sonidos (frecuencia en Hz, duración en ms)
    this.eventSoundMap = new Map([
      ['Input', { frequency: 440, duration: 100, volume: 0.3, type: 'sine' }],      // La4
      ['Damage', { frequency: 220, duration: 200, volume: 0.5, type: 'sawtooth' }], // La3
      ['Spawn', { frequency: 880, duration: 150, volume: 0.4, type: 'sine' }],      // La5
      ['Death', { frequency: 110, duration: 300, volume: 0.6, type: 'sawtooth' }],  // La2
      ['Collision', { frequency: 660, duration: 80, volume: 0.4, type: 'square' }],  // Mi5
      ['Pickup', { frequency: 1320, duration: 120, volume: 0.5, type: 'sine' }],     // Mi6
      ['LevelComplete', { frequency: 1760, duration: 400, volume: 0.7, type: 'sine' }], // La6
      ['SystemMessage', { frequency: 330, duration: 50, volume: 0.2, type: 'sine' }], // Mi4
      ['Render', { frequency: 55, duration: 20, volume: 0.1, type: 'sine' }],        // La1
      ['Physics', { frequency: 165, duration: 30, volume: 0.2, type: 'triangle' }],  // Mi3
      ['Audio', { frequency: 2640, duration: 60, volume: 0.3, type: 'sine' }],       // Mi7
      ['Network', { frequency: 825, duration: 90, volume: 0.4, type: 'sawtooth' }]   // Sol#5
    ]);

    // Estado del sistema
    this.world = null;
    this.stats = {
      eventsProcessed: 0,
      soundsPlayed: 0,
      lastEventTime: 0,
      eventCounts: new Map()
    };

    // Configuración visual (opcional - para mostrar en pantalla)
    this.visualizationEnabled = false;
    this.eventHistory = [];
    this.maxHistorySize = 50;
  }

  /**
   * Inicializa el contexto de audio
   */
  async init() {
    try {
      // Crear contexto de audio
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Crear pool de sonidos para reutilización
      this.createSoundPool();

      // Suscribirse a eventos del EventBus
      if (this.world && this.world.eventBus) {
        for (const eventType of this.eventSoundMap.keys()) {
          this.world.eventBus.subscribe(eventType, (event) => {
            this.handleEvent(eventType, event);
          });
        }
      }

      this.isInitialized = true;
      console.log('🔊 Audio X-Ray System inicializado');
    } catch (error) {
      console.error('❌ Error inicializando Audio X-Ray System:', error);
    }
  }

  /**
   * Crea un pool de nodos de audio para reutilización
   */
  createSoundPool() {
    for (const [eventType, config] of this.eventSoundMap.entries()) {
      const pool = [];
      for (let i = 0; i < 5; i++) { // 5 sonidos por tipo de evento
        pool.push(this.createAudioNode(config));
      }
      this.soundPool.set(eventType, pool);
    }
  }

  /**
   * Crea un nodo de audio con la configuración especificada
   */
  createAudioNode(config) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(config.volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + config.duration / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    return { oscillator, gainNode, config, inUse: false };
  }

  /**
   * Maneja un evento ECS y reproduce su sonido correspondiente
   */
  handleEvent(eventType, event) {
    if (!this.isEnabled || !this.isInitialized) return;

    this.stats.eventsProcessed++;
    this.stats.lastEventTime = performance.now();

    // Actualizar contador de eventos
    const count = this.stats.eventCounts.get(eventType) || 0;
    this.stats.eventCounts.set(eventType, count + 1);

    // Obtener configuración de sonido
    const soundConfig = this.eventSoundMap.get(eventType);
    if (!soundConfig) return;

    // Obtener sonido del pool
    const soundPool = this.soundPool.get(eventType);
    if (!soundPool) return;

    // Encontrar un sonido libre o reutilizar el más antiguo
    let audioNode = soundPool.find(node => !node.inUse);
    if (!audioNode) {
      audioNode = soundPool[0]; // Reutilizar el primero
      if (audioNode.oscillator) {
        audioNode.oscillator.stop();
      }
    }

    // Marcar como en uso
    audioNode.inUse = true;

    // Configurar y reproducir
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const currentTime = this.audioContext.currentTime;
      const duration = soundConfig.duration / 1000;

      audioNode.oscillator.frequency.setValueAtTime(soundConfig.frequency, currentTime);
      audioNode.gainNode.gain.setValueAtTime(0, currentTime);
      audioNode.gainNode.gain.linearRampToValueAtTime(soundConfig.volume, currentTime + 0.01);
      audioNode.gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

      audioNode.oscillator.start(currentTime);
      audioNode.oscillator.stop(currentTime + duration);

      this.stats.soundsPlayed++;

      // Liberar después de la duración
      setTimeout(() => {
        audioNode.inUse = false;
      }, soundConfig.duration + 10);

    } catch (error) {
      console.error(`Error reproduciendo sonido para ${eventType}:`, error);
      audioNode.inUse = false;
    }

    // Añadir a historial visual si está habilitado
    if (this.visualizationEnabled) {
      this.addToEventHistory(eventType, event);
    }
  }

  /**
   * Añade evento al historial visual
   */
  addToEventHistory(eventType, event) {
    const eventInfo = {
      type: eventType,
      timestamp: performance.now(),
      frequency: this.eventSoundMap.get(eventType)?.frequency || 0,
      senderId: event.senderId || 0,
      data: event.payload
    };

    this.eventHistory.push(eventInfo);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Actualiza el sistema (principalmente para estadísticas)
   */
  update(deltaTime) {
    // Usar deltaTime para debugging
    if (deltaTime > 0.1) {
      console.log('DeltaTime alto en AudioXRaySystem:', deltaTime);
    }
    // El sistema principal se maneja a través de eventos
    // Aquí podemos actualizar métricas o efectos visuales
  }

  // === API PÚBLICA ===

  /**
   * Habilita/deshabilita el modo Audio X-Ray
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;

    if (enabled && !this.isInitialized) {
      this.init();
    }

    console.log(`🔊 Audio X-Ray Mode: ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Habilita/deshabilita la visualización
   */
  setVisualizationEnabled(enabled) {
    this.visualizationEnabled = enabled;
    console.log(`👁️ Audio X-Ray Visualization: ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Configura el volumen general
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    console.log(`🔊 Audio X-Ray Master Volume: ${Math.round(volume * 100)}%`);
  }

  /**
   * Obtiene estadísticas del sistema
   */
  getStats() {
    return {
      ...this.stats,
      isEnabled: this.isEnabled,
      isInitialized: this.isInitialized,
      eventTypes: Array.from(this.eventSoundMap.keys()),
      eventCounts: Object.fromEntries(this.stats.eventCounts.entries()),
      masterVolume: this.masterVolume || 1.0
    };
  }

  /**
   * Obtiene el historial de eventos para visualización
   */
  getEventHistory() {
    return this.eventHistory;
  }

  /**
   * Personaliza el sonido de un tipo de evento
   */
  customizeEventSound(eventType, config) {
    if (this.eventSoundMap.has(eventType)) {
      this.eventSoundMap.set(eventType, { ...this.eventSoundMap.get(eventType), ...config });

      // Recrear pool para este tipo de evento
      const pool = [];
      for (let i = 0; i < 5; i++) {
        pool.push(this.createAudioNode(this.eventSoundMap.get(eventType)));
      }
      this.soundPool.set(eventType, pool);

      console.log(`🔧 Personalizado sonido para ${eventType}:`, config);
    }
  }

  /**
   * Resetea estadísticas
   */
  resetStats() {
    this.stats.eventsProcessed = 0;
    this.stats.soundsPlayed = 0;
    this.stats.eventCounts.clear();
    this.eventHistory.length = 0;
    console.log('🔄 Audio X-Ray Stats reset');
  }

  /**
   * Obtiene información de debugging
   */
  getDebugInfo() {
    return {
      stats: this.getStats(),
      soundMap: Object.fromEntries(this.eventSoundMap.entries()),
      eventHistory: this.getEventHistory(),
      poolStatus: Object.fromEntries(
        Array.from(this.soundPool.entries()).map(([type, pool]) => [
          type,
          {
            total: pool.length,
            inUse: pool.filter(node => node.inUse).length
          }
        ])
      )
    };
  }
}
