/**
 * Sistema PWA para Motor ECS Educativo
 * Maneja service workers, caching, offline support y actualizaciones
 */

export class PWASystem {
  constructor() {
    this.name = 'PWASystem';
    this.requiredComponents = [];
    this.isEnabled = true;

    // Estado del PWA
    this.isInstalled = false;
    this.isOnline = navigator.onLine;
    this.serviceWorker = null;
    this.deferredPrompt = null;
    this.updateAvailable = false;

    // Configuración de caching
    this.cacheConfig = {
      enabled: true,
      cacheName: 'ecs-game-v1.0.0',
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      cacheExpiration: 24 * 60 * 60 * 1000, // 24 horas
      criticalAssets: [
        '/',
        '/index.html',
        '/manifest.json',
        '/favicon.ico',
        '/logo192.png',
        '/logo512.png'
      ]
    };

    // Métricas de performance
    this.metrics = {
      cacheHitRate: 0,
      networkRequests: 0,
      cachedRequests: 0,
      offlineTime: 0,
      lastOnlineTime: Date.now()
    };

    // Callbacks
    this.onUpdateAvailable = null;
    this.onOffline = null;
    this.onOnline = null;
    this.onInstallPrompt = null;

    this.init();
  }

  /**
   * Inicializar el sistema PWA
   */
  async init() {
    // Detectar si ya está instalado
    this.isInstalled = window.matchMedia('(display-mode: standalone)').matches;

    // Registrar service worker
    await this.registerServiceWorker();

    // Configurar event listeners
    this.setupEventListeners();

    // Verificar actualizaciones
    this.checkForUpdates();

    console.log('🔧 PWA System inicializado');
    console.log('📱 Instalado:', this.isInstalled);
    console.log('🌐 Online:', this.isOnline);
  }

  /**
   * Registrar service worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });

        this.serviceWorker = registration;

        // Manejar actualizaciones
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.updateAvailable = true;
                if (this.onUpdateAvailable) {
                  this.onUpdateAvailable();
                }
                console.log('🔄 Actualización de PWA disponible');
              }
            });
          }
        });

        // Esperar a que el service worker esté activo
        if (registration.active) {
          console.log('✅ Service Worker activo:', registration.active.scriptURL);
        }

        return registration;
      } catch (error) {
        console.error('❌ Error registrando Service Worker:', error);
      }
    } else {
      console.warn('⚠️ Service Workers no soportados en este navegador');
    }
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    // Evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (this.onInstallPrompt) {
        this.onInstallPrompt(e);
      }
      console.log('📱 PWA install prompt disponible');
    });

    // Evento appinstalled
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      console.log('✅ PWA instalada exitosamente');
    });

    // Eventos de conexión
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.metrics.lastOnlineTime = Date.now();
      if (this.onOnline) {
        this.onOnline();
      }
      console.log('🌐 Conexión restaurada');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.metrics.offlineTime += Date.now() - this.metrics.lastOnlineTime;
      if (this.onOffline) {
        this.onOffline();
      }
      console.log('🔌 Sin conexión');
    });

    // Evento de mensajes del service worker
    navigator.serviceWorker?.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event);
    });
  }

  /**
   * Mostrar prompt de instalación
   */
  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      console.warn('⚠️ No hay prompt de instalación disponible');
      return false;
    }

    try {
      const result = await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      this.deferredPrompt = null;

      if (outcome === 'accepted') {
        console.log('✅ Usuario aceptó instalar PWA');
        return true;
      } else {
        console.log('❌ Usuario rechazó instalar PWA');
        return false;
      }
    } catch (error) {
      console.error('❌ Error mostrando install prompt:', error);
      return false;
    }
  }

  /**
   * Actualizar PWA
   */
  async updatePWA() {
    if (!this.serviceWorker) return false;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error actualizando PWA:', error);
      return false;
    }
  }

  /**
   * Verificar actualizaciones
   */
  async checkForUpdates() {
    if (!this.serviceWorker) return;

    try {
      await this.serviceWorker.update();
      console.log('🔍 Verificación de actualizaciones completada');
    } catch (error) {
      console.error('❌ Error verificando actualizaciones:', error);
    }
  }

  /**
   * Precargar assets críticos
   */
  async preloadCriticalAssets() {
    if (!this.cacheConfig.enabled) return;

    try {
      const cache = await caches.open(this.cacheConfig.cacheName);
      await cache.addAll(this.cacheConfig.criticalAssets);
      console.log('📦 Assets críticos precargados');
    } catch (error) {
      console.error('❌ Error precargando assets críticos:', error);
    }
  }

  /**
   * Obtener información de cache
   */
  async getCacheInfo() {
    if (!this.serviceWorker) return null;

    try {
      const cache = await caches.open(this.cacheConfig.cacheName);
      const keys = await cache.keys();

      // Calcular tamaño aproximado (simplificado)
      let totalSize = 0;
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            totalSize += parseInt(contentLength);
          }
        }
      }

      return {
        cacheName: this.cacheConfig.cacheName,
        cachedItems: keys.length,
        totalSize: (totalSize / 1024 / 1024).toFixed(2), // MB
        maxSize: (this.cacheConfig.maxCacheSize / 1024 / 1024).toFixed(2) // MB
      };
    } catch (error) {
      console.error('❌ Error obteniendo información de cache:', error);
      return null;
    }
  }

  /**
   * Limpiar cache
   */
  async clearCache() {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('🧹 Cache limpiado completamente');
      return true;
    } catch (error) {
      console.error('❌ Error limpiando cache:', error);
      return false;
    }
  }

  /**
   * Manejar mensajes del service worker
   */
  handleServiceWorkerMessage(event) {
    const { type, data } = event.data;

    switch (type) {
      case 'CACHE_INFO':
        console.log('📊 Información de cache:', data);
        break;

      case 'NETWORK_REQUEST':
        this.metrics.networkRequests++;
        break;

      case 'CACHE_HIT':
        this.metrics.cachedRequests++;
        this.updateCacheHitRate();
        break;

      case 'UPDATE_AVAILABLE':
        this.updateAvailable = true;
        if (this.onUpdateAvailable) {
          this.onUpdateAvailable();
        }
        break;

      default:
        console.log('📨 Mensaje del SW:', event.data);
    }
  }

  /**
   * Actualizar tasa de aciertos de cache
   */
  updateCacheHitRate() {
    const total = this.metrics.networkRequests + this.metrics.cachedRequests;
    if (total > 0) {
      this.metrics.cacheHitRate = (this.metrics.cachedRequests / total) * 100;
    }
  }

  /**
   * Obtener métricas de performance
   */
  getPerformanceMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHitRate.toFixed(1),
      isInstalled: this.isInstalled,
      isOnline: this.isOnline,
      updateAvailable: this.updateAvailable,
      cacheInfo: null // Se debe obtener con getCacheInfo()
    };
  }

  /**
   * Obtener estado del PWA
   */
  getPWAState() {
    return {
      isInstalled: this.isInstalled,
      isOnline: this.isOnline,
      updateAvailable: this.updateAvailable,
      serviceWorkerActive: !!this.serviceWorker?.active,
      deferredPromptAvailable: !!this.deferredPrompt,
      displayMode: this.getDisplayMode(),
      connectionType: navigator.connection?.effectiveType || 'unknown',
      saveDataEnabled: navigator.connection?.saveData || false
    };
  }

  /**
   * Obtener modo de display actual
   */
  getDisplayMode() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;

    if (isStandalone) return 'standalone';
    if (isFullscreen) return 'fullscreen';
    if (isMinimalUI) return 'minimal-ui';
    return 'browser';
  }

  /**
   * Enviar mensaje al service worker
   */
  async sendMessageToSW(type, data = {}) {
    if (!this.serviceWorker?.active) return false;

    try {
      const messageChannel = new MessageChannel();
      this.serviceWorker.active.postMessage({ type, data }, [messageChannel.port]);
      return true;
    } catch (error) {
      console.error('❌ Error enviando mensaje al SW:', error);
      return false;
    }
  }

  /**
   * Configurar callbacks
   */
  setCallbacks(callbacks) {
    if (callbacks.onUpdateAvailable) this.onUpdateAvailable = callbacks.onUpdateAvailable;
    if (callbacks.onOffline) this.onOffline = callbacks.onOffline;
    if (callbacks.onOnline) this.onOnline = callbacks.onOnline;
    if (callbacks.onInstallPrompt) this.onInstallPrompt = callbacks.onInstallPrompt;
  }

  /**
   * Actualizar configuración
   */
  updateConfig(newConfig) {
    Object.assign(this.cacheConfig, newConfig);
    console.log('⚙️ PWA System config updated:', this.cacheConfig);
  }

  /**
   * Verificar soporte de características PWA
   */
  getFeatureSupport() {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      webAppManifest: 'manifest' in document.createElement('link'),
      beforeInstallPrompt: 'onbeforeinstallprompt' in window,
      standaloneMode: window.matchMedia('(display-mode: standalone)').matches,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      pushNotifications: 'serviceWorker' in navigator && 'PushManager' in window,
      backgroundFetch: 'serviceWorker' in navigator && 'BackgroundFetchManager' in window.ServiceWorkerRegistration.prototype,
      periodicSync: 'serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype
    };
  }
}
