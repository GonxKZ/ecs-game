/**
 * Sistema de Mapeo Audio-Eventos para ECS
 * Mapea automáticamente eventos ECS a reproducción de sonidos con pool de reproductores
 */

export class AudioEventMapper {
  constructor(audioSystem) {
    this.audioSystem = audioSystem;
    this.name = 'AudioEventMapper';
    this.lastExecutionTime = 0;

    // Mapeo de eventos a sonidos
    this.eventSoundMap = new Map();

    // Configuración de mapeo por defecto
    this.setupDefaultMappings();

    // Estadísticas
    this.stats = {
      eventsProcessed: 0,
      soundsPlayed: 0,
      failedPlays: 0,
      activeMappings: 0
    };

    this.name = 'AudioEventMapper';
    this.lastExecutionTime = 0;
  }

  update(deltaTime, world) {
    const startTime = performance.now();

    // Procesar eventos del bus de eventos
    this.processEventBus(world);

    // Actualizar estadísticas
    this.updateStats();

    this.lastExecutionTime = performance.now() - startTime;
  }

  setupDefaultMappings() {
    // Mapeos por defecto de eventos ECS a sonidos
    this.eventSoundMap.set('PickupEvent', {
      sound: 'pickup',
      volume: 0.8,
      bus: 'sfx',
      spatial: true,
      priority: 'normal'
    });

    this.eventSoundMap.set('DamageEvent', {
      sound: 'damage',
      volume: 1.0,
      bus: 'sfx',
      spatial: true,
      priority: 'high',
      pitchVariation: 0.2
    });

    this.eventSoundMap.set('DeathEvent', {
      sound: 'death',
      volume: 1.2,
      bus: 'sfx',
      spatial: true,
      priority: 'high'
    });

    this.eventSoundMap.set('SpawnEvent', {
      sound: 'spawn',
      volume: 0.6,
      bus: 'sfx',
      spatial: true,
      priority: 'normal'
    });

    this.eventSoundMap.set('CollisionEvent', {
      sound: 'collision',
      volume: 0.4,
      bus: 'sfx',
      spatial: true,
      priority: 'low',
      pitchVariation: 0.3
    });

    this.eventSoundMap.set('JumpEvent', {
      sound: 'jump',
      volume: 0.7,
      bus: 'sfx',
      spatial: true,
      priority: 'normal'
    });

    this.eventSoundMap.set('ButtonClick', {
      sound: 'click',
      volume: 0.5,
      bus: 'sfx',
      spatial: false,
      priority: 'normal'
    });

    this.eventSoundMap.set('LevelComplete', {
      sound: 'level_complete',
      volume: 1.0,
      bus: 'music',
      spatial: false,
      priority: 'high'
    });

    this.eventSoundMap.set('GameOver', {
      sound: 'game_over',
      volume: 1.0,
      bus: 'sfx',
      spatial: false,
      priority: 'high'
    });

    // Eventos de tutorial
    this.eventSoundMap.set('TutorialStep', {
      sound: 'tutorial_step',
      volume: 0.6,
      bus: 'voice',
      spatial: false,
      priority: 'normal'
    });

    // Eventos de feedback
    this.eventSoundMap.set('Success', {
      sound: 'success',
      volume: 0.8,
      bus: 'sfx',
      spatial: false,
      priority: 'normal'
    });

    this.eventSoundMap.set('Error', {
      sound: 'error',
      volume: 0.7,
      bus: 'sfx',
      spatial: false,
      priority: 'normal'
    });

    console.log(`🎵 Configurados ${this.eventSoundMap.size} mapeos audio-eventos`);
  }

  processEventBus(world) {
    // Suscribirse a eventos del bus (implementación simplificada)
    // En producción real, esto se integraría con el EventBus existente

    // Simular procesamiento de eventos recientes
    this.processRecentEvents(world);
  }

  processRecentEvents(world) {
    // Buscar entidades con componentes de eventos de audio
    const audioEventEntities = world.queryEntities({
      components: ['AudioEvent']
    });

    for (const entityId of audioEventEntities) {
      const audioEvent = world.getComponent(entityId, 'AudioEvent');
      const transform = world.getComponent(entityId, 'Transform');

      if (audioEvent && audioEvent.eventType) {
        this.handleAudioEvent(audioEvent.eventType, {
          entityId,
          position: transform ? {
            x: transform.position_x,
            y: transform.position_y,
            z: transform.position_z
          } : null,
          volume: audioEvent.volume,
          pitch: audioEvent.pitch
        });

        // Remover componente de evento procesado
        world.removeComponent(entityId, 'AudioEvent');
      }
    }
  }

  handleAudioEvent(eventType, context = {}) {
    this.stats.eventsProcessed++;

    const mapping = this.eventSoundMap.get(eventType);
    if (!mapping) {
      // Evento sin mapeo de sonido
      return;
    }

    try {
      // Preparar opciones de reproducción
      const options = {
        volume: (mapping.volume || 1.0) * (context.volume || 1.0),
        bus: mapping.bus || 'sfx',
        spatial: mapping.spatial && context.position !== null,
        position: context.position,
        priority: mapping.priority || 'normal',
        entityId: context.entityId
      };

      // Aplicar variación de pitch si está configurada
      if (mapping.pitchVariation) {
        const variation = (Math.random() - 0.5) * 2 * mapping.pitchVariation;
        options.playbackRate = 1.0 + variation;
      }

      // Aplicar pitch específico si viene en el contexto
      if (context.pitch) {
        options.playbackRate = context.pitch;
      }

      // Reproducir sonido
      const soundId = this.audioSystem.playSound(mapping.sound, options);

      if (soundId) {
        this.stats.soundsPlayed++;
        console.log(`🔊 Evento "${eventType}" → Sonido "${mapping.sound}" (ID: ${soundId})`);
      } else {
        this.stats.failedPlays++;
        console.warn(`⚠️ Falló reproducción de sonido para evento "${eventType}"`);
      }

    } catch (error) {
      console.error(`Error procesando evento de audio "${eventType}":`, error);
      this.stats.failedPlays++;
    }
  }

  // API para configurar mapeos personalizados
  addMapping(eventType, soundConfig) {
    this.eventSoundMap.set(eventType, {
      sound: soundConfig.sound,
      volume: soundConfig.volume || 1.0,
      bus: soundConfig.bus || 'sfx',
      spatial: soundConfig.spatial !== false,
      priority: soundConfig.priority || 'normal',
      pitchVariation: soundConfig.pitchVariation || 0,
      loop: soundConfig.loop || false
    });

    this.stats.activeMappings = this.eventSoundMap.size;
    console.log(`➕ Mapeo añadido: "${eventType}" → "${soundConfig.sound}"`);
  }

  removeMapping(eventType) {
    if (this.eventSoundMap.delete(eventType)) {
      this.stats.activeMappings = this.eventSoundMap.size;
      console.log(`➖ Mapeo removido: "${eventType}"`);
    }
  }

  getMapping(eventType) {
    return this.eventSoundMap.get(eventType);
  }

  listMappings() {
    return Array.from(this.eventSoundMap.entries()).map(([eventType, config]) => ({
      eventType,
      sound: config.sound,
      bus: config.bus,
      volume: config.volume,
      spatial: config.spatial
    }));
  }

  // Métodos para crear eventos de audio desde código
  triggerEvent(eventType, context = {}) {
    // Crear entidad temporal con evento de audio
    const tempEntityId = this.world?.createEntity() || 0;

    const audioEventData = {
      eventType: eventType,
      volume: context.volume || 1.0,
      pitch: context.pitch || 1.0,
      timestamp: performance.now()
    };

    if (context.position) {
      // Crear transform temporal si hay posición
      this.world?.addComponent(tempEntityId, 'Transform', {
        position_x: context.position.x,
        position_y: context.position.y,
        position_z: context.position.z
      });
    }

    // Procesar evento inmediatamente
    this.handleAudioEvent(eventType, context);

    // Limpiar entidad temporal si fue creada
    if (tempEntityId && this.world) {
      setTimeout(() => {
        try {
          this.world.destroyEntity(tempEntityId);
        } catch (e) {
          // Entidad ya puede estar destruida
        }
      }, 100);
    }
  }

  // Métodos de utilidad para debugging
  createEventDebugPanel() {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      bottom: 110px;
      left: 10px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 11px;
      z-index: 1000;
      border-radius: 5px;
      min-width: 200px;
    `;

    setInterval(() => {
      panel.innerHTML = `
        <div><strong>🎵 Audio Events</strong></div>
        <div>Events: ${this.stats.eventsProcessed}</div>
        <div>Sounds: ${this.stats.soundsPlayed}</div>
        <div>Failed: ${this.stats.failedPlays}</div>
        <div>Mappings: ${this.stats.activeMappings}</div>
      `;
    }, 500);

    document.body.appendChild(panel);
    return panel;
  }

  // Sistema de presets de sonidos
  getSoundPresets() {
    return {
      ui: {
        click: { sound: 'ui_click', volume: 0.5, bus: 'sfx', spatial: false },
        hover: { sound: 'ui_hover', volume: 0.3, bus: 'sfx', spatial: false },
        confirm: { sound: 'ui_confirm', volume: 0.6, bus: 'sfx', spatial: false },
        error: { sound: 'ui_error', volume: 0.7, bus: 'sfx', spatial: false }
      },
      gameplay: {
        pickup: { sound: 'pickup', volume: 0.8, bus: 'sfx', spatial: true },
        damage: { sound: 'damage', volume: 1.0, bus: 'sfx', spatial: true, pitchVariation: 0.2 },
        jump: { sound: 'jump', volume: 0.7, bus: 'sfx', spatial: true },
        walk: { sound: 'walk', volume: 0.4, bus: 'sfx', spatial: true, loop: true },
        death: { sound: 'death', volume: 1.2, bus: 'sfx', spatial: true }
      },
      environment: {
        wind: { sound: 'wind', volume: 0.3, bus: 'ambient', spatial: false, loop: true },
        water: { sound: 'water', volume: 0.4, bus: 'ambient', spatial: true, loop: true },
        fire: { sound: 'fire', volume: 0.5, bus: 'ambient', spatial: true, loop: true }
      }
    };
  }

  loadPreset(presetName) {
    const presets = this.getSoundPresets();

    switch (presetName) {
      case 'ui':
        Object.entries(presets.ui).forEach(([eventType, config]) => {
          this.addMapping(`UI${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`, config);
        });
        break;

      case 'gameplay':
        Object.entries(presets.gameplay).forEach(([eventType, config]) => {
          this.addMapping(`${eventType.charAt(0).toUpperCase() + eventType.slice(1)}Event`, config);
        });
        break;

      case 'environment':
        Object.entries(presets.environment).forEach(([eventType, config]) => {
          this.addMapping(`${eventType.charAt(0).toUpperCase() + eventType.slice(1)}Event`, config);
        });
        break;

      default:
        console.warn(`Preset "${presetName}" no encontrado`);
    }

    console.log(`🎛️ Preset "${presetName}" cargado`);
  }

  // Estadísticas y debugging
  updateStats() {
    this.stats.activeMappings = this.eventSoundMap.size;
  }

  getStats() {
    return {
      ...this.stats,
      mappings: this.listMappings()
    };
  }

  // Limpiar todos los mapeos
  clearMappings() {
    this.eventSoundMap.clear();
    this.stats.activeMappings = 0;
    console.log('🧹 Mapeos de audio limpiados');
  }

  // Exportar/Importar configuración
  exportMappings() {
    const mappings = {};
    this.eventSoundMap.forEach((config, eventType) => {
      mappings[eventType] = config;
    });

    return JSON.stringify({
      version: '1.0',
      mappings,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  importMappings(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      if (data.mappings) {
        this.eventSoundMap.clear();
        Object.entries(data.mappings).forEach(([eventType, config]) => {
          this.eventSoundMap.set(eventType, config);
        });

        this.stats.activeMappings = this.eventSoundMap.size;
        console.log(`📥 Importados ${this.eventSoundMap.size} mapeos de audio`);
      }
    } catch (error) {
      console.error('Error importando mapeos:', error);
    }
  }
}

/**
 * Componente para eventos de audio
 */
export const AudioEventComponent = {
  eventType: 'string', // Tipo de evento (ej: 'PickupEvent')
  volume: 'float32',   // Volumen del sonido (0.0 - 1.0)
  pitch: 'float32',    // Pitch del sonido (0.5 - 2.0)
  timestamp: 'float32' // Timestamp del evento
};

/**
 * Utilidades para mapeo audio-eventos
 */
export class AudioEventUtils {
  static createPickupEvent(world, entityId, itemType = 'generic') {
    world.addComponent(entityId, 'AudioEvent', {
      eventType: 'PickupEvent',
      volume: itemType === 'powerup' ? 1.2 : 0.8,
      pitch: itemType === 'coin' ? 1.5 : 1.0,
      timestamp: performance.now()
    });
  }

  static createDamageEvent(world, entityId, damageType = 'generic', severity = 1.0) {
    world.addComponent(entityId, 'AudioEvent', {
      eventType: 'DamageEvent',
      volume: Math.min(severity, 1.0),
      pitch: 0.8 + severity * 0.4, // Pitch más alto con más daño
      timestamp: performance.now()
    });
  }

  static createJumpEvent(world, entityId, jumpHeight = 1.0) {
    world.addComponent(entityId, 'AudioEvent', {
      eventType: 'JumpEvent',
      volume: 0.5 + jumpHeight * 0.2,
      pitch: 1.0,
      timestamp: performance.now()
    });
  }

  static createCollisionEvent(world, entityId, impactForce = 1.0) {
    world.addComponent(entityId, 'AudioEvent', {
      eventType: 'CollisionEvent',
      volume: Math.min(impactForce * 0.3, 1.0),
      pitch: 0.8 + impactForce * 0.4,
      timestamp: performance.now()
    });
  }

  static createUIEvent(world, eventType, volume = 0.5) {
    // Crear entidad temporal para evento UI
    const tempEntityId = world.createEntity();

    world.addComponent(tempEntityId, 'AudioEvent', {
      eventType: `UI${eventType}`,
      volume: volume,
      pitch: 1.0,
      timestamp: performance.now()
    });

    // Auto-destruir después de procesar
    setTimeout(() => {
      if (world.entities.has(tempEntityId)) {
        world.destroyEntity(tempEntityId);
      }
    }, 100);
  }
}
