/**
 * Grabador Determinista - Graba y reproduce sesiones con semilla fija
 * Garantiza que la ejecución sea idéntica en cada reproducción
 */
export class DeterministicRecorder {
  constructor() {
    this.name = 'DeterministicRecorder';
    this.isRecording = false;
    this.isPlaying = false;
    this.currentRecording = null;
    this.playbackFrame = 0;
    this.rngSeed = 0;

    // Configuración
    this.config = {
      recordInput: true,
      recordRNG: true,
      recordEvents: true,
      recordEntityChanges: false, // Muy pesado
      maxRecordingLength: 10000, // frames
      autoSave: true
    };

    // Estado del RNG determinista
    this.originalRandom = Math.random;
    this.originalDateNow = Date.now;
    this.originalPerformanceNow = performance.now;

    // Callbacks
    this.onRecordingStart = null;
    this.onRecordingStop = null;
    this.onPlaybackStart = null;
    this.onPlaybackStop = null;
    this.onPlaybackFrame = null;
  }

  /**
   * Inicializa el grabador con el mundo ECS
   */
  init(world) {
    this.world = world;
    console.log('🎬 Deterministic Recorder inicializado');
  }

  /**
   * Inicia una nueva grabación
   */
  startRecording(seed = Date.now()) {
    if (this.isRecording || this.isPlaying) {
      console.warn('❌ No se puede iniciar grabación: ya hay una grabación o reproducción activa');
      return false;
    }

    this.rngSeed = seed;
    this.currentRecording = {
      seed: seed,
      startTime: performance.now(),
      frames: [],
      metadata: {
        userAgent: navigator.userAgent,
        screenSize: { width: window.innerWidth, height: window.innerHeight },
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    this.isRecording = true;

    // Reemplazar funciones no deterministas
    this.replaceNonDeterministicFunctions();

    if (this.onRecordingStart) {
      this.onRecordingStart(this.currentRecording);
    }

    console.log(`🎬 Grabación iniciada con semilla: ${seed}`);
    return true;
  }

  /**
   * Detiene la grabación actual
   */
  stopRecording() {
    if (!this.isRecording) {
      console.warn('❌ No hay grabación activa para detener');
      return false;
    }

    this.currentRecording.endTime = performance.now();
    this.currentRecording.duration = this.currentRecording.endTime - this.currentRecording.startTime;

    this.isRecording = false;

    // Restaurar funciones originales
    this.restoreNonDeterministicFunctions();

    if (this.onRecordingStop) {
      this.onRecordingStop(this.currentRecording);
    }

    console.log(`⏹️ Grabación detenida. ${this.currentRecording.frames.length} frames grabados`);
    return this.currentRecording;
  }

  /**
   * Inicia reproducción de una grabación
   */
  startPlayback(recording) {
    if (this.isRecording || this.isPlaying) {
      console.warn('❌ No se puede iniciar reproducción: ya hay una grabación o reproducción activa');
      return false;
    }

    if (!recording || !recording.frames) {
      console.error('❌ Grabación inválida');
      return false;
    }

    this.currentRecording = recording;
    this.playbackFrame = 0;
    this.isPlaying = true;

    // Establecer semilla para reproducción determinista
    this.rngSeed = recording.seed;
    this.replaceNonDeterministicFunctions();

    if (this.onPlaybackStart) {
      this.onPlaybackStart(recording);
    }

    console.log(`▶️ Reproducción iniciada. ${recording.frames.length} frames a reproducir`);
    return true;
  }

  /**
   * Detiene la reproducción
   */
  stopPlayback() {
    if (!this.isPlaying) {
      console.warn('❌ No hay reproducción activa para detener');
      return false;
    }

    this.isPlaying = false;
    this.playbackFrame = 0;

    // Restaurar funciones originales
    this.restoreNonDeterministicFunctions();

    if (this.onPlaybackStop) {
      this.onPlaybackStop(this.currentRecording);
    }

    console.log('⏸️ Reproducción detenida');
    return true;
  }

  /**
   * Graba un frame de la simulación
   */
  recordFrame(frameData) {
    if (!this.isRecording || !this.currentRecording) return;

    // Limitar longitud de grabación
    if (this.currentRecording.frames.length >= this.config.maxRecordingLength) {
      console.warn('⚠️ Límite de grabación alcanzado, deteniendo automáticamente');
      this.stopRecording();
      return;
    }

    const frame = {
      frameNumber: this.currentRecording.frames.length,
      timestamp: performance.now(),
      ...frameData
    };

    this.currentRecording.frames.push(frame);
  }

  /**
   * Reproduce el siguiente frame
   */
  playNextFrame() {
    if (!this.isPlaying || !this.currentRecording) return null;

    if (this.playbackFrame >= this.currentRecording.frames.length) {
      console.log('🏁 Fin de la reproducción');
      this.stopPlayback();
      return null;
    }

    const frame = this.currentRecording.frames[this.playbackFrame];

    if (this.onPlaybackFrame) {
      this.onPlaybackFrame(frame, this.playbackFrame);
    }

    this.playbackFrame++;
    return frame;
  }

  /**
   * Reemplaza funciones no deterministas con versiones deterministas
   */
  replaceNonDeterministicFunctions() {
    // RNG determinista
    let seed = this.rngSeed;
    Math.random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280.0;
    };

    // Time determinista (usando frame number)
    let startTime = this.originalPerformanceNow();
    performance.now = () => {
      return startTime + (this.playbackFrame * 16.67); // 60 FPS
    };

    Date.now = () => {
      return startTime + (this.playbackFrame * 16.67);
    };
  }

  /**
   * Restaura las funciones originales
   */
  restoreNonDeterministicFunctions() {
    Math.random = this.originalRandom;
    performance.now = this.originalPerformanceNow;
    Date.now = this.originalDateNow;
  }

  /**
   * Guarda una grabación en localStorage
   */
  saveRecording(name, recording = null) {
    const rec = recording || this.currentRecording;
    if (!rec) {
      console.warn('❌ No hay grabación para guardar');
      return false;
    }

    try {
      const serialized = JSON.stringify(rec);
      localStorage.setItem(`ecs-recording-${name}`, serialized);
      console.log(`💾 Grabación "${name}" guardada (${(serialized.length / 1024).toFixed(1)} KB)`);
      return true;
    } catch (error) {
      console.error('❌ Error guardando grabación:', error);
      return false;
    }
  }

  /**
   * Carga una grabación desde localStorage
   */
  loadRecording(name) {
    try {
      const serialized = localStorage.getItem(`ecs-recording-${name}`);
      if (!serialized) {
        console.warn(`❌ Grabación "${name}" no encontrada`);
        return null;
      }

      const recording = JSON.parse(serialized);
      console.log(`📂 Grabación "${name}" cargada (${recording.frames.length} frames)`);
      return recording;
    } catch (error) {
      console.error('❌ Error cargando grabación:', error);
      return null;
    }
  }

  /**
   * Lista todas las grabaciones guardadas
   */
  listSavedRecordings() {
    const recordings = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('ecs-recording-')) {
        const name = key.replace('ecs-recording-', '');
        try {
          const recording = JSON.parse(localStorage.getItem(key));
          recordings.push({
            name,
            frameCount: recording.frames.length,
            duration: recording.duration || 0,
            timestamp: recording.metadata.timestamp
          });
        } catch (error) {
          console.error(`Error leyendo grabación ${name}:`, error);
        }
      }
    }

    return recordings;
  }

  /**
   * Elimina una grabación guardada
   */
  deleteRecording(name) {
    localStorage.removeItem(`ecs-recording-${name}`);
    console.log(`🗑️ Grabación "${name}" eliminada`);
  }

  // === API PÚBLICA ===

  /**
   * Obtiene el estado actual del grabador
   */
  getState() {
    return {
      isRecording: this.isRecording,
      isPlaying: this.isPlaying,
      currentFrame: this.playbackFrame,
      totalFrames: this.currentRecording?.frames?.length || 0,
      hasRecording: !!this.currentRecording,
      seed: this.rngSeed
    };
  }

  /**
   * Obtiene estadísticas de la grabación actual
   */
  getStats() {
    if (!this.currentRecording) {
      return {
        frames: 0,
        duration: 0,
        size: 0
      };
    }

    const size = JSON.stringify(this.currentRecording).length;

    return {
      frames: this.currentRecording.frames.length,
      duration: this.currentRecording.duration || 0,
      size: (size / 1024).toFixed(1), // KB
      seed: this.currentRecording.seed,
      timestamp: this.currentRecording.metadata.timestamp
    };
  }

  /**
   * Configura el grabador
   */
  setConfig(newConfig) {
    Object.assign(this.config, newConfig);
    console.log('⚙️ Deterministic Recorder config updated:', this.config);
  }

  /**
   * Exporta grabación como archivo
   */
  exportRecording(recording = null) {
    const rec = recording || this.currentRecording;
    if (!rec) return null;

    const data = JSON.stringify(rec, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `ecs-recording-${rec.seed}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('📤 Grabación exportada como archivo');
  }

  /**
   * Importa grabación desde archivo
   */
  async importRecording(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const recording = JSON.parse(e.target.result);
          console.log(`📥 Grabación importada: ${recording.frames.length} frames`);
          resolve(recording);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Resetea el grabador
   */
  reset() {
    this.stopRecording();
    this.stopPlayback();
    this.currentRecording = null;
    this.playbackFrame = 0;
    this.restoreNonDeterministicFunctions();
    console.log('🔄 Deterministic Recorder reset');
  }
}
