/**
 * Sistema de recursos globales para el ECS educativo
 * Gestiona datos compartidos que no pertenecen a entidades específicas
 */

export class ResourceManager {
  constructor() {
    this.resources = new Map();
    this.initializeDefaultResources();
  }

  initializeDefaultResources() {
    // Recurso de gravedad global
    this.setResource('gravity', {
      x: 0,
      y: -9.81,
      z: 0,
      enabled: true
    });

    // Recurso de configuración del juego
    this.setResource('gameConfig', {
      difficulty: 'normal',
      maxEntities: 1000,
      enableParticles: true,
      enablePhysics: true,
      soundVolume: 0.7
    });

    // Recurso de tiempo del juego
    this.setResource('gameTime', {
      currentTime: 0,
      deltaTime: 0,
      timeScale: 1.0,
      isPaused: false
    });

    // Recurso de assets compartidos
    this.setResource('assets', {
      loaded: false,
      models: {},
      textures: {},
      sounds: {}
    });
  }

  /**
   * Establece un recurso global
   */
  setResource(name, data) {
    this.resources.set(name, {
      data: { ...data },
      lastModified: Date.now(),
      subscribers: []
    });
    this.notifySubscribers(name);
    console.log(`📦 Recurso ${name} actualizado`);
  }

  /**
   * Obtiene un recurso global
   */
  getResource(name) {
    const resource = this.resources.get(name);
    return resource ? resource.data : null;
  }

  /**
   * Actualiza parcialmente un recurso
   */
  updateResource(name, updates) {
    const resource = this.resources.get(name);
    if (resource) {
      resource.data = { ...resource.data, ...updates };
      resource.lastModified = Date.now();
      this.notifySubscribers(name);
      console.log(`🔄 Recurso ${name} actualizado parcialmente`);
    }
  }

  /**
   * Suscribe una función callback a cambios en un recurso
   */
  subscribeToResource(name, callback) {
    const resource = this.resources.get(name);
    if (resource) {
      resource.subscribers.push(callback);
      return () => {
        // Función para desuscribir
        const index = resource.subscribers.indexOf(callback);
        if (index > -1) {
          resource.subscribers.splice(index, 1);
        }
      };
    }
    return () => {}; // Callback vacío si el recurso no existe
  }

  /**
   * Notifica a todos los suscriptores de un recurso
   */
  notifySubscribers(name) {
    const resource = this.resources.get(name);
    if (resource) {
      resource.subscribers.forEach(callback => {
        try {
          callback(resource.data, resource.lastModified);
        } catch (error) {
          console.error(`Error en callback de suscriptor para ${name}:`, error);
        }
      });
    }
  }

  /**
   * Obtiene estadísticas de recursos
   */
  getStats() {
    return {
      totalResources: this.resources.size,
      resources: Array.from(this.resources.entries()).map(([name, resource]) => ({
        name,
        lastModified: resource.lastModified,
        subscriberCount: resource.subscribers.length
      }))
    };
  }

  /**
   * Guarda el estado actual de todos los recursos
   */
  saveState() {
    const state = {};
    for (const [name, resource] of this.resources) {
      state[name] = {
        data: resource.data,
        lastModified: resource.lastModified
      };
    }
    return JSON.stringify(state);
  }

  /**
   * Carga un estado guardado de recursos
   */
  loadState(jsonState) {
    try {
      const state = JSON.parse(jsonState);
      for (const [name, resourceData] of Object.entries(state)) {
        this.resources.set(name, {
          data: resourceData.data,
          lastModified: resourceData.lastModified,
          subscribers: []
        });
      }
      console.log('💾 Estado de recursos cargado');
    } catch (error) {
      console.error('Error cargando estado de recursos:', error);
    }
  }
}

/**
 * Utilidades para trabajar con recursos
 */
export class ResourceUtils {
  /**
   * Crea un control deslizante para un valor numérico de un recurso
   */
  static createSlider(resourceManager, resourceName, propertyName, min, max, step = 1) {
    return {
      resource: resourceName,
      property: propertyName,
      min,
      max,
      step,
      get value() {
        const resource = resourceManager.getResource(resourceName);
        return resource ? resource[propertyName] : 0;
      },
      set value(newValue) {
        resourceManager.updateResource(resourceName, { [propertyName]: newValue });
      }
    };
  }

  /**
   * Crea un toggle para un valor booleano de un recurso
   */
  static createToggle(resourceManager, resourceName, propertyName) {
    return {
      resource: resourceName,
      property: propertyName,
      get value() {
        const resource = resourceManager.getResource(resourceName);
        return resource ? resource[propertyName] : false;
      },
      set value(newValue) {
        resourceManager.updateResource(resourceName, { [propertyName]: newValue });
      }
    };
  }

  /**
   * Crea un selector para valores enumerados
   */
  static createSelector(resourceManager, resourceName, propertyName, options) {
    return {
      resource: resourceName,
      property: propertyName,
      options,
      get value() {
        const resource = resourceManager.getResource(resourceName);
        return resource ? resource[propertyName] : options[0];
      },
      set value(newValue) {
        if (options.includes(newValue)) {
          resourceManager.updateResource(resourceName, { [propertyName]: newValue });
        }
      }
    };
  }
}
