/**
 * Sistema de Audio WebAudio con Espacialización 3D para ECS
 * Proporciona mezcla por buses, atenuación espacial y gestión avanzada de audio
 */

export class AudioSystem {
  constructor(camera) {
    this.camera = camera;
    this.name = 'AudioSystem';
    this.lastExecutionTime = 0;

    // Contexto de WebAudio
    this.audioContext = null;
    this.isInitialized = false;

    // Buses de mezcla
    this.buses = {
      master: null,
      music: null,
      sfx: null,
      ambient: null,
      voice: null
    };

    // Pool de reproductores
    this.playerPool = new Map();
    this.maxPlayers = 50;

    // Fuentes de audio activas
    this.activeSources = new Map();

    // Configuración de audio
    this.config = {
      masterVolume: 1.0,
      musicVolume: 0.5,
      sfxVolume: 0.8,
      ambientVolume: 0.3,
      voiceVolume: 1.0,
      spatialAudioEnabled: true,
      hrtfEnabled: true,
      distanceModel: 'inverse', // 'linear', 'inverse', 'exponential'
      maxDistance: 100,
      refDistance: 1,
      rolloffFactor: 1
    };

    // Estado del sistema
    this.audioStats = {
      activePlayers: 0,
      playingSounds: 0,
      totalMemoryUsed: 0,
      contextTime: 0
    };

    this.name = 'AudioSystem';
    this.lastExecutionTime = 0;
  }

  async initialize() {
    try {
      // Crear AudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Configurar contexto
      this.audioContext.suspend(); // Iniciar suspendido

      // Crear buses de mezcla
      this.createAudioBuses();

      // Crear pool de reproductores
      this.initializePlayerPool();

      this.isInitialized = true;
      console.log('🔊 Sistema de audio WebAudio inicializado');

      return true;
    } catch (error) {
      console.error('Error inicializando WebAudio:', error);
      return false;
    }
  }

  createAudioBuses() {
    // Bus master
    this.buses.master = this.audioContext.createGain();
    this.buses.master.gain.value = this.config.masterVolume;
    this.buses.master.connect(this.audioContext.destination);

    // Bus de música
    this.buses.music = this.audioContext.createGain();
    this.buses.music.gain.value = this.config.musicVolume;
    this.buses.music.connect(this.buses.master);

    // Bus de efectos de sonido
    this.buses.sfx = this.audioContext.createGain();
    this.buses.sfx.gain.value = this.config.sfxVolume;
    this.buses.sfx.connect(this.buses.master);

    // Bus ambiente
    this.buses.ambient = this.audioContext.createGain();
    this.buses.ambient.gain.value = this.config.ambientVolume;
    this.buses.ambient.connect(this.buses.master);

    // Bus de voz
    this.buses.voice = this.audioContext.createGain();
    this.buses.voice.gain.value = this.config.voiceVolume;
    this.buses.voice.connect(this.buses.master);
  }

  initializePlayerPool() {
    for (let i = 0; i < this.maxPlayers; i++) {
      this.playerPool.set(i, {
        id: i,
        isActive: false,
        source: null,
        spatialNode: null,
        gainNode: null,
        lastUsed: 0
      });
    }
  }

  update(deltaTime, world) {
    if (!this.isInitialized || !this.audioContext) return;

    const startTime = performance.now();

    // Actualizar posición del listener (cámara)
    this.updateListenerPosition();

    // Actualizar fuentes de audio espacial
    this.updateSpatialSources(world);

    // Limpiar fuentes terminadas
    this.cleanupFinishedSources();

    // Actualizar estadísticas
    this.updateAudioStats();

    this.lastExecutionTime = performance.now() - startTime;
  }

  async resumeContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('▶️ Contexto de audio reanudado');
    }
  }

  updateListenerPosition() {
    if (!this.audioContext || !this.camera) return;

    const listener = this.audioContext.listener;

    // Actualizar posición del listener
    const position = this.camera.position;
    if (listener.positionX !== undefined) {
      // API moderna
      listener.positionX.value = position.x;
      listener.positionY.value = position.y;
      listener.positionZ.value = position.z;

      // Actualizar orientación (simplificada)
      const forward = this.camera.getWorldDirection(new THREE.Vector3());
      listener.forwardX.value = forward.x;
      listener.forwardY.value = forward.y;
      listener.forwardZ.value = forward.z;
    } else {
      // API legacy
      listener.setPosition(position.x, position.y, position.z);
      listener.setOrientation(0, 0, -1, 0, 1, 0);
    }
  }

  async playSound(soundName, options = {}) {
    if (!this.isInitialized) return null;

    const player = this.getAvailablePlayer();
    if (!player) {
      console.warn('⚠️ No hay reproductores disponibles en el pool');
      return null;
    }

    try {
      const audioBuffer = await this.loadAudioBuffer(soundName);
      if (!audioBuffer) return null;

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Configurar nodos de audio
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = options.volume || 1.0;

      let spatialNode = null;

      // Configurar espacialización si está habilitada
      if (this.config.spatialAudioEnabled && options.position) {
        spatialNode = this.createSpatialNode(options.position);
        source.connect(spatialNode).connect(gainNode);
      } else {
        source.connect(gainNode);
      }

      // Conectar al bus apropiado
      const targetBus = this.getTargetBus(options.bus || 'sfx');
      gainNode.connect(targetBus);

      // Configurar propiedades del sonido
      if (options.loop !== undefined) {
        source.loop = options.loop;
      }

      if (options.playbackRate !== undefined) {
        source.playbackRate.value = options.playbackRate;
      }

      // Programar reproducción
      const startTime = this.audioContext.currentTime + (options.delay || 0);
      source.start(startTime, options.offset || 0);

      // Configurar finalización
      if (options.duration) {
        source.stop(startTime + options.duration);
      }

      // Actualizar estado del player
      player.isActive = true;
      player.source = source;
      player.spatialNode = spatialNode;
      player.gainNode = gainNode;
      player.lastUsed = performance.now();
      player.options = options;

      // Manejar finalización
      source.onended = () => {
        this.releasePlayer(player.id);
      };

      // Crear identificador único
      const soundId = `${soundName}_${player.id}_${Date.now()}`;

      this.activeSources.set(soundId, {
        playerId: player.id,
        soundName,
        options,
        startTime: this.audioContext.currentTime
      });

      return soundId;

    } catch (error) {
      console.error('Error reproduciendo sonido:', error);
      this.releasePlayer(player.id);
      return null;
    }
  }

  createSpatialNode(position) {
    const panner = this.audioContext.createPanner();

    // Configurar modelo de distancia
    panner.distanceModel = this.config.distanceModel;
    panner.maxDistance = this.config.maxDistance;
    panner.refDistance = this.config.refDistance;
    panner.rolloffFactor = this.config.rolloffFactor;

    // Configurar posición
    panner.positionX = position.x;
    panner.positionY = position.y;
    panner.positionZ = position.z;

    // Configurar tipo de panner (HRTF para mejor espacialización)
    panner.panningModel = this.config.hrtfEnabled ? 'HRTF' : 'equalpower';

    return panner;
  }

  getAvailablePlayer() {
    // Buscar player inactivo
    for (const [id, player] of this.playerPool) {
      if (!player.isActive) {
        return player;
      }
    }

    // Si no hay disponibles, liberar el más antiguo
    let oldestPlayer = null;
    let oldestTime = Infinity;

    for (const [id, player] of this.playerPool) {
      if (player.lastUsed < oldestTime) {
        oldestTime = player.lastUsed;
        oldestPlayer = player;
      }
    }

    if (oldestPlayer) {
      this.stopPlayer(oldestPlayer.id);
      return oldestPlayer;
    }

    return null;
  }

  releasePlayer(playerId) {
    const player = this.playerPool.get(playerId);
    if (!player) return;

    player.isActive = false;
    player.source = null;
    player.spatialNode = null;
    player.gainNode = null;
    player.options = null;
  }

  stopPlayer(playerId) {
    const player = this.playerPool.get(playerId);
    if (!player || !player.source) return;

    try {
      player.source.stop();
    } catch (error) {
      // El source ya puede estar detenido
    }

    this.releasePlayer(playerId);
  }

  async loadAudioBuffer(soundName) {
    // Implementación simplificada - en producción usar ResourceManager
    try {
      const response = await fetch(`/audio/${soundName}.mp3`);
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error(`Error cargando audio ${soundName}:`, error);
      return null;
    }
  }

  getTargetBus(busName) {
    return this.buses[busName] || this.buses.sfx;
  }

  updateSpatialSources(world) {
    // Actualizar posiciones de fuentes espaciales
    const spatialEntities = world.queryEntities({
      components: ['Transform', 'AudioSource']
    });

    for (const entityId of spatialEntities) {
      const transform = world.getComponent(entityId, 'Transform');
      const audioSource = world.getComponent(entityId, 'AudioSource');

      if (audioSource.spatial && transform) {
        // Buscar player correspondiente
        for (const [soundId, soundData] of this.activeSources) {
          if (soundData.options.entityId === entityId) {
            const player = this.playerPool.get(soundData.playerId);
            if (player && player.spatialNode) {
              // Actualizar posición
              player.spatialNode.positionX.value = transform.position_x;
              player.spatialNode.positionY.value = transform.position_y;
              player.spatialNode.positionZ.value = transform.position_z;
            }
          }
        }
      }
    }
  }

  cleanupFinishedSources() {
    const now = this.audioContext.currentTime;

    for (const [soundId, soundData] of this.activeSources) {
      // Verificar si el sonido ha terminado
      if (soundData.options.duration &&
          now > soundData.startTime + soundData.options.duration) {
        this.activeSources.delete(soundId);
        this.releasePlayer(soundData.playerId);
      }
    }
  }

  updateAudioStats() {
    this.audioStats.activePlayers = Array.from(this.playerPool.values())
      .filter(p => p.isActive).length;

    this.audioStats.playingSounds = this.activeSources.size;
    this.audioStats.contextTime = this.audioContext?.currentTime || 0;
    this.audioStats.totalMemoryUsed = this.estimateAudioMemoryUsage();
  }

  estimateAudioMemoryUsage() {
    // Estimación aproximada del uso de memoria de audio
    let memory = 0;

    // Memoria de buffers de audio
    for (const [soundId, soundData] of this.activeSources) {
      // Estimación aproximada por buffer de audio
      memory += 1024 * 1024; // 1MB por buffer activo
    }

    return memory / (1024 * 1024); // MB
  }

  // API pública para control de audio
  setMasterVolume(volume) {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.buses.master) {
      this.buses.master.gain.value = this.config.masterVolume;
    }
  }

  setBusVolume(busName, volume) {
    if (this.buses[busName]) {
      this.buses[busName].gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  stopAllSounds() {
    for (const [playerId, player] of this.playerPool) {
      if (player.isActive) {
        this.stopPlayer(playerId);
      }
    }
    this.activeSources.clear();
  }

  pauseAllSounds() {
    if (this.audioContext) {
      this.audioContext.suspend();
    }
  }

  resumeAllSounds() {
    if (this.audioContext) {
      this.audioContext.resume();
    }
  }

  // Métodos para debugging
  createAudioDebugPanel() {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      bottom: 60px;
      left: 10px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 11px;
      z-index: 1000;
      border-radius: 5px;
    `;

    setInterval(() => {
      panel.innerHTML = `
        <div><strong>🔊 Audio Debug</strong></div>
        <div>Players: ${this.audioStats.activePlayers}/${this.maxPlayers}</div>
        <div>Sounds: ${this.audioStats.playingSounds}</div>
        <div>Memory: ${this.audioStats.totalMemoryUsed.toFixed(2)}MB</div>
        <div>Context: ${this.audioStats.contextTime.toFixed(2)}s</div>
        <div>State: ${this.audioContext?.state || 'none'}</div>
      `;
    }, 500);

    document.body.appendChild(panel);
    return panel;
  }

  // Obtener estadísticas
  getStats() {
    return {
      ...this.audioStats,
      config: { ...this.config },
      initialized: this.isInitialized,
      contextState: this.audioContext?.state || 'none'
    };
  }

  // Cleanup
  dispose() {
    this.stopAllSounds();

    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
    }

    this.playerPool.clear();
    this.activeSources.clear();
    this.isInitialized = false;
  }
}
