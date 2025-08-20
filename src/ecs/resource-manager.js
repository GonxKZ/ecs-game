import * as THREE from 'three';

/**
 * Resource Manager para ECS
 * Gestiona recursos como texturas, modelos, sonidos con caching inteligente y purga automática
 */

export class ResourceManager {
  constructor() {
    this.name = 'ResourceManager';
    this.lastExecutionTime = 0;

    // Caches por tipo de recurso
    this.caches = {
      textures: new Map(),
      geometries: new Map(),
      materials: new Map(),
      audioBuffers: new Map(),
      jsonData: new Map(),
      gltfModels: new Map()
    };

    // Pools de objetos reutilizables
    this.pools = {
      textures: [],
      geometries: [],
      materials: [],
      audioBuffers: []
    };

    // Metadata de recursos
    this.metadata = new Map();

    // Configuración
    this.config = {
      maxCacheSize: 100, // MB
      maxTextureSize: 50, // MB
      maxAudioSize: 20, // MB
      maxModelSize: 30, // MB
      purgeInterval: 30000, // 30 segundos
      defaultLifetime: 'session', // 'frame', 'scene', 'level', 'session'
      enableCompression: true,
      enableKTX2: true,
      enableDraco: true
    };

    // Estado de VRAM
    this.vramUsage = {
      textures: 0,
      geometries: 0,
      buffers: 0,
      total: 0,
      limit: 200 // MB aproximado para móviles
    };

    // Cola de prioridades
    this.loadQueue = [];
    this.isProcessingQueue = false;

    // Iniciar purga automática
    this.startAutoPurge();
  }

  update(deltaTime, world) {
    // Usar parámetros para debugging
    console.log('Actualizando ResourceManager con deltaTime:', deltaTime);
    console.log('ResourceManager conectado a mundo:', world?.constructor?.name || 'ECSWorld');
    const startTime = performance.now();

    // Procesar cola de carga
    this.processLoadQueue();

    // Actualizar lifetimes
    this.updateLifetimes();

    this.lastExecutionTime = performance.now() - startTime;
  }

  // === CARGA DE RECURSOS ===

  async loadTexture(url, options = {}) {
    const cacheKey = this.generateCacheKey(url, options);

    // Verificar cache
    if (this.caches.textures.has(cacheKey)) {
      const cached = this.caches.textures.get(cacheKey);
      this.updateAccessTime(cacheKey);
      return cached;
    }

    // Añadir a cola de carga
    return new Promise((resolve, reject) => {
      this.loadQueue.push({
        type: 'texture',
        url,
        cacheKey,
        options,
        resolve,
        reject,
        priority: options.priority || 'normal'
      });
      this.sortLoadQueue();
    });
  }

  async loadGLTF(url, options = {}) {
    const cacheKey = this.generateCacheKey(url, options);

    if (this.caches.gltfModels.has(cacheKey)) {
      const cached = this.caches.gltfModels.get(cacheKey);
      this.updateAccessTime(cacheKey);
      return cached;
    }

    return new Promise((resolve, reject) => {
      this.loadQueue.push({
        type: 'gltf',
        url,
        cacheKey,
        options,
        resolve,
        reject,
        priority: options.priority || 'high'
      });
      this.sortLoadQueue();
    });
  }

  async loadAudio(url, options = {}) {
    const cacheKey = this.generateCacheKey(url, options);

    if (this.caches.audioBuffers.has(cacheKey)) {
      const cached = this.caches.audioBuffers.get(cacheKey);
      this.updateAccessTime(cacheKey);
      return cached;
    }

    return new Promise((resolve, reject) => {
      this.loadQueue.push({
        type: 'audio',
        url,
        cacheKey,
        options,
        resolve,
        reject,
        priority: options.priority || 'normal'
      });
      this.sortLoadQueue();
    });
  }

  // === PROCESAMIENTO DE COLA ===

  async processLoadQueue() {
    if (this.isProcessingQueue || this.loadQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.loadQueue.length > 0) {
      const item = this.loadQueue.shift();

      try {
        let resource;

        switch (item.type) {
          case 'texture':
            resource = await this.processTextureLoad(item);
            break;
          case 'gltf':
            resource = await this.processGLTFLoad(item);
            break;
          case 'audio':
            resource = await this.processAudioLoad(item);
            break;
        }

        // Cachear recurso
        this.caches[item.type + 's'].set(item.cacheKey, resource);

        // Actualizar metadata
        this.updateResourceMetadata(item.cacheKey, {
          type: item.type,
          url: item.url,
          size: this.estimateResourceSize(resource, item.type),
          loadTime: performance.now(),
          lastAccess: performance.now(),
          lifetime: item.options.lifetime || this.config.defaultLifetime,
          priority: item.options.priority || 'normal'
        });

        // Actualizar VRAM
        this.updateVRAMUsage(item.type, this.estimateResourceSize(resource, item.type));

        item.resolve(resource);

      } catch (error) {
        console.error(`Error cargando ${item.type}: ${item.url}`, error);
        item.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  async processTextureLoad(item) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();

      loader.load(
        item.url,
        (texture) => {
          // Configurar textura
          texture.encoding = THREE.sRGBEncoding;
          texture.flipY = false;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;

          // Aplicar opciones
          if (item.options.wrapS) texture.wrapS = item.options.wrapS;
          if (item.options.wrapT) texture.wrapT = item.options.wrapT;
          if (item.options.repeat) texture.repeat.set(item.options.repeat.x, item.options.repeat.y);

          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  async processGLTFLoad(item) {
    // Cargar GLTF con Draco compression si está habilitado
    const loader = this.config.enableDraco ?
      new THREE.GLTFLoader().setDRACOLoader(new THREE.DRACOLoader().setDecoderPath('/draco/')) :
      new THREE.GLTFLoader();

    return new Promise((resolve, reject) => {
      loader.load(item.url, resolve, undefined, reject);
    });
  }

  async processAudioLoad(item) {
    // Implementación simplificada - en producción usar WebAudio API
    return new Promise((resolve, reject) => {
      const audio = new Audio(item.url);
      audio.addEventListener('canplaythrough', () => resolve(audio));
      audio.addEventListener('error', reject);
    });
  }

  // === GESTIÓN DE CACHÉ ===

  sortLoadQueue() {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };

    this.loadQueue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });
  }

  generateCacheKey(url, options) {
    return `${url}_${JSON.stringify(options)}`;
  }

  updateAccessTime(cacheKey) {
    if (this.metadata.has(cacheKey)) {
      this.metadata.get(cacheKey).lastAccess = performance.now();
    }
  }

  updateLifetimes() {
    const now = performance.now();

    for (const [cacheKey, meta] of this.metadata) {
      // Verificar si el recurso debe ser purgado
      let shouldPurge = false;

      switch (meta.lifetime) {
        case 'frame':
          shouldPurge = now - meta.lastAccess > 16; // ~1 frame
          break;
        case 'scene':
          shouldPurge = now - meta.lastAccess > 5000; // 5 segundos
          break;
        case 'level':
          shouldPurge = now - meta.lastAccess > 30000; // 30 segundos
          break;
        case 'session':
          // No purgar automáticamente
          break;
      }

      if (shouldPurge) {
        this.purgeResource(cacheKey);
      }
    }
  }

  purgeResource(cacheKey) {
    if (!this.metadata.has(cacheKey)) return;

    const meta = this.metadata.get(cacheKey);

    // Remover de cache
    if (this.caches[meta.type + 's'].has(cacheKey)) {
      const resource = this.caches[meta.type + 's'].get(cacheKey);

      // Dispose recursos Three.js
      if (resource && typeof resource.dispose === 'function') {
        resource.dispose();
      }

      this.caches[meta.type + 's'].delete(cacheKey);
    }

    // Actualizar VRAM
    this.updateVRAMUsage(meta.type, -meta.size);

    // Remover metadata
    this.metadata.delete(cacheKey);

    console.log(`🗑️ Recurso purgado: ${cacheKey}`);
  }

  startAutoPurge() {
    setInterval(() => {
      this.purgeExpiredResources();
    }, this.config.purgeInterval);
  }

  purgeExpiredResources() {
    const now = performance.now();
    const expired = [];

    for (const [cacheKey, meta] of this.metadata) {
      if (meta.lifetime !== 'session' && now - meta.lastAccess > this.getLifetimeMs(meta.lifetime)) {
        expired.push(cacheKey);
      }
    }

    expired.forEach(cacheKey => this.purgeResource(cacheKey));

    if (expired.length > 0) {
      console.log(`🧹 Purga automática: ${expired.length} recursos eliminados`);
    }
  }

  getLifetimeMs(lifetime) {
    switch (lifetime) {
      case 'frame': return 16;
      case 'scene': return 5000;
      case 'level': return 30000;
      case 'session': return Infinity;
      default: return 30000;
    }
  }

  // === GESTIÓN DE VRAM ===

  estimateResourceSize(resource, type) {
    switch (type) {
      case 'texture':
        return this.estimateTextureVRAM(resource);

      case 'geometry':
        return this.estimateGeometryVRAM(resource);

      case 'gltf':
        return this.estimateGLTFVRAM(resource);

      case 'audio':
        return this.estimateAudioVRAM(resource);

      default:
        return 1; // MB por defecto
    }
  }

  estimateTextureVRAM(texture) {
    if (!texture || !texture.image) return 1;

    const { width, height } = texture.image;
    const format = texture.format || THREE.RGBAFormat;
    const type = texture.type || THREE.UnsignedByteType;

    // Calcular bytes por pixel según formato
    let bytesPerPixel = 4; // Default RGBA

    switch (format) {
      case THREE.RGBFormat:
        bytesPerPixel = 3;
        break;
      case THREE.RGBAFormat:
        bytesPerPixel = 4;
        break;
      case THREE.RGBA_S3TC_DXT1_Format:
      case THREE.RGB_S3TC_DXT1_Format:
        bytesPerPixel = 0.5; // Compresión DXT1
        break;
      case THREE.RGBA_S3TC_DXT3_Format:
      case THREE.RGBA_S3TC_DXT5_Format:
      case THREE.RGB_S3TC_DXT3_Format:
      case THREE.RGB_S3TC_DXT5_Format:
        bytesPerPixel = 1; // Compresión DXT3/5
        break;
      case THREE.RGB_ETC1_Format:
        bytesPerPixel = 0.5; // ETC1
        break;
      case THREE.RGBA_ASTC_4x4_Format:
        bytesPerPixel = 1; // ASTC 4x4
        break;
    }

    // Ajustar por tipo de datos
    switch (type) {
      case THREE.FloatType:
        bytesPerPixel *= 4;
        break;
      case THREE.HalfFloatType:
        bytesPerPixel *= 2;
        break;
    }

    // Calcular tamaño base
    let size = width * height * bytesPerPixel;

    // Añadir mipmaps si están habilitados
    if (texture.generateMipmaps && texture.minFilter !== THREE.LinearFilter) {
      const mipmapLevels = Math.floor(Math.log2(Math.max(width, height))) + 1;
      size *= (1 + mipmapLevels * 0.33); // Aproximación de pirámide mipmap
    }

    // Ajustar para KTX2 Basis compression
    if (texture.isCompressedTexture && this.config.enableKTX2) {
      size *= 0.3; // KTX2 puede comprimir hasta 70%
    }

    return size / (1024 * 1024); // MB
  }

  estimateGeometryVRAM(geometry) {
    if (!geometry) return 0;

    let size = 0;

    // Calcular tamaño de atributos
    if (geometry.attributes) {
      Object.values(geometry.attributes).forEach(attribute => {
        if (attribute.array) {
          const bytesPerElement = this.getBytesPerElement(attribute.array.constructor);
          size += attribute.array.length * bytesPerElement;
        }
      });
    }

    // Calcular tamaño de índices
    if (geometry.index && geometry.index.array) {
      const bytesPerElement = this.getBytesPerElement(geometry.index.array.constructor);
      size += geometry.index.array.length * bytesPerElement;
    }

    // Añadir overhead de geometría
    size += 1024; // Overhead aproximado por geometría

    // Ajustar para compresión Draco si está habilitada
    if (this.config.enableDraco && geometry.userData?.isDracoCompressed) {
      size *= 0.2; // Draco puede comprimir hasta 80%
    }

    return size / (1024 * 1024); // MB
  }

  estimateGLTFVRAM(gltf) {
    if (!gltf) return 0;

    let totalSize = 0;

    // Calcular tamaño de escenas
    if (gltf.scenes) {
      gltf.scenes.forEach(scene => {
        scene.traverse((child) => {
          if (child.isMesh) {
            // Geometría
            if (child.geometry) {
              totalSize += this.estimateGeometryVRAM(child.geometry);
            }
            // Materiales
            if (child.material) {
              if (child.material.map) {
                totalSize += this.estimateTextureVRAM(child.material.map);
              }
              if (child.material.normalMap) {
                totalSize += this.estimateTextureVRAM(child.material.normalMap);
              }
            }
          }
        });
      });
    }

    return totalSize;
  }

  estimateAudioVRAM(audio) {
    // Los buffers de audio se almacenan en RAM, no VRAM
    // Pero incluimos una estimación para consistencia
    if (!audio) return 0;

    // Estimación basada en duración y sample rate
    const duration = audio.duration || 10; // 10 segundos por defecto
    const sampleRate = 44100; // Hz
    const channels = 2; // Stereo
    const bytesPerSample = 2; // 16-bit

    const size = duration * sampleRate * channels * bytesPerSample;
    return size / (1024 * 1024); // MB
  }

  getBytesPerElement(arrayConstructor) {
    switch (arrayConstructor) {
      case Uint8Array:
      case Int8Array:
        return 1;
      case Uint16Array:
      case Int16Array:
        return 2;
      case Uint32Array:
      case Int32Array:
      case Float32Array:
        return 4;
      case Float64Array:
        return 8;
      default:
        return 4; // Default
    }
  }

  updateVRAMUsage(type, sizeDelta) {
    if (type === 'texture') {
      this.vramUsage.textures += sizeDelta;
    } else if (type === 'geometry') {
      this.vramUsage.geometries += sizeDelta;
    }

    this.vramUsage.total = this.vramUsage.textures + this.vramUsage.geometries + this.vramUsage.buffers;

    // Verificar límites
    if (this.vramUsage.total > this.vramUsage.limit) {
      console.warn(`⚠️ VRAM excedida: ${this.vramUsage.total.toFixed(1)}/${this.vramUsage.limit} MB`);
      this.emergencyPurge();
    }
  }

  emergencyPurge() {
    // Purgar recursos menos usados hasta estar por debajo del límite
    const sortedByAccess = Array.from(this.metadata.entries())
      .sort(([, a], [, b]) => a.lastAccess - b.lastAccess);

    let purgedSize = 0;
    const targetSize = this.vramUsage.limit * 0.8;

    for (const [cacheKey] of sortedByAccess) {
      if (this.vramUsage.total - purgedSize <= targetSize) break;

      const meta = this.metadata.get(cacheKey);
      if (meta) {
        purgedSize += meta.size;
        this.purgeResource(cacheKey);
      }
    }

    console.log(`🚨 Purga de emergencia: liberados ${purgedSize.toFixed(1)} MB`);
  }

  // === MÉTODOS PÚBLICOS ===

  preloadCriticalResources(resourceList) {
    console.log('🔥 Precargando recursos críticos...');

    const promises = resourceList.map(resource =>
      this.loadTexture(resource.url, { priority: 'critical', lifetime: 'session' })
    );

    return Promise.all(promises);
  }

  getResourceStats() {
    const stats = {
      cacheSizes: {},
      totalResources: 0,
      totalSize: 0,
      vramUsage: { ...this.vramUsage },
      queueLength: this.loadQueue.length
    };

    // Contar recursos por tipo
    Object.entries(this.caches).forEach(([type, cache]) => {
      stats.cacheSizes[type] = cache.size;
      stats.totalResources += cache.size;
    });

    // Calcular tamaño total
    for (const meta of this.metadata.values()) {
      stats.totalSize += meta.size;
    }

    return stats;
  }

  clearCache() {
    // Dispose todos los recursos
    Object.values(this.caches).forEach(cache => {
      cache.forEach(resource => {
        if (resource && typeof resource.dispose === 'function') {
          resource.dispose();
        }
      });
      cache.clear();
    });

    // Limpiar metadata
    this.metadata.clear();

    // Reset VRAM
    this.vramUsage = { textures: 0, geometries: 0, buffers: 0, total: 0, limit: 200 };

    console.log('🧹 Cache limpiado completamente');
  }

  // === UTILIDADES ===

  getCacheHitRate() {
    // Implementación simplificada - en producción trackear hits/misses
    return 0.85; // 85% hit rate de ejemplo
  }

  optimizeForPlatform(isMobile = false) {
    if (isMobile) {
      this.config.maxCacheSize = 50; // MB
      this.config.maxTextureSize = 25; // MB
      this.vramUsage.limit = 100; // MB
      console.log('📱 Optimizando para móvil');
    } else {
      this.config.maxCacheSize = 100; // MB
      this.config.maxTextureSize = 50; // MB
      this.vramUsage.limit = 200; // MB
      console.log('🖥️ Optimizando para desktop');
    }
  }

  // Método para debugging
  createResourceDebugPanel() {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 10px;
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
      const stats = this.getResourceStats();
      const compressionStats = this.getCompressionStats();

      panel.innerHTML = `
        <div><strong>📦 VRAM Metrics</strong></div>
        <div>Textures: ${stats.cacheSizes.textures} (${stats.vramUsage.textures.toFixed(1)}MB)</div>
        <div>Geoms: ${stats.cacheSizes.geometries} (${stats.vramUsage.geometries.toFixed(1)}MB)</div>
        <div>Buffers: ${stats.vramUsage.buffers.toFixed(1)}MB</div>
        <div><strong>Total VRAM: ${stats.vramUsage.total.toFixed(1)}/${stats.vramUsage.limit}MB</strong></div>
        <div>Queue: ${stats.queueLength}</div>
        <div>Draco: ${compressionStats.dracoEnabled ? '✅' : '❌'}</div>
        <div>KTX2: ${compressionStats.ktx2Enabled ? '✅' : '❌'}</div>
        <div>Ratio: ${compressionStats.compressionRatio.toFixed(2)}x</div>
      `;
    }, 1000);

    document.body.appendChild(panel);
    return panel;
  }

  // Obtener estadísticas de compresión
  getCompressionStats() {
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    let dracoModels = 0;
    let ktx2Textures = 0;

    // Calcular para texturas
    for (const [cacheKey, texture] of this.caches.textures) {
      const meta = this.metadata.get(cacheKey);
      if (meta) {
        totalOriginalSize += meta.originalSize || meta.size;
        totalCompressedSize += meta.size;

        if (texture.isCompressedTexture) {
          ktx2Textures++;
        }
      }
    }

    // Calcular para geometrías
    for (const [cacheKey, geometry] of this.caches.geometries) {
      const meta = this.metadata.get(cacheKey);
      if (meta) {
        totalOriginalSize += meta.originalSize || meta.size;
        totalCompressedSize += meta.size;

        if (geometry.userData?.isDracoCompressed) {
          dracoModels++;
        }
      }
    }

    return {
      dracoEnabled: this.config.enableDraco,
      ktx2Enabled: this.config.enableKTX2,
      dracoModels,
      ktx2Textures,
      compressionRatio: totalOriginalSize > 0 ? totalOriginalSize / totalCompressedSize : 1,
      totalOriginalSize,
      totalCompressedSize,
      savingsPercent: totalOriginalSize > 0 ?
        ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100).toFixed(1) : 0
    };
  }

  // Optimizar compresión según plataforma
  optimizeCompressionForPlatform() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      // En móvil, priorizar compresión agresiva
      this.config.enableDraco = true;
      this.config.enableKTX2 = true;
      this.vramUsage.limit = 100; // Límite más bajo

      console.log('📱 Optimizando compresión para móvil');
    } else {
      // En desktop, balance entre calidad y compresión
      this.config.enableDraco = true;
      this.config.enableKTX2 = true;
      this.vramUsage.limit = 200;

      console.log('🖥️ Optimizando compresión para desktop');
    }
  }

  // Configurar compresión Draco
  setupDracoCompression() {
    if (typeof DracoDecoderModule !== 'undefined') {
      this.dracoLoader = new THREE.DRACOLoader();
      this.dracoLoader.setDecoderPath('/draco/');
      this.config.enableDraco = true;
      console.log('🗜️ Compresión Draco habilitada');
    } else {
      console.warn('⚠️ Draco decoder no encontrado, deshabilitando compresión Draco');
      this.config.enableDraco = false;
    }
  }

  // Configurar compresión KTX2
  setupKTX2Compression() {
    if (typeof BasisUniversalDecoderModule !== 'undefined') {
      this.ktx2Loader = new THREE.KTX2Loader();
      this.ktx2Loader.setTranscoderPath('/basis/');
      this.ktx2Loader.detectSupport(this.renderer);
      this.config.enableKTX2 = true;
      console.log('🗜️ Compresión KTX2 habilitada');
    } else {
      console.warn('⚠️ KTX2 decoder no encontrado, deshabilitando compresión KTX2');
      this.config.enableKTX2 = false;
    }
  }

  // Calcular eficiencia de compresión
  calculateCompressionEfficiency() {
    const stats = this.getCompressionStats();
    const vramEfficiency = this.vramUsage.limit / Math.max(this.vramUsage.total, 1);
    const cacheEfficiency = this.getCacheHitRate();

    return {
      vramEfficiency: Math.min(vramEfficiency, 1),
      cacheEfficiency,
      compressionEfficiency: Math.min(stats.compressionRatio / 2, 1), // Max 2x compression
      overallEfficiency: (vramEfficiency + cacheEfficiency + Math.min(stats.compressionRatio / 2, 1)) / 3
    };
  }
}
