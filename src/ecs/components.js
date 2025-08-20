/**
 * Definiciones de componentes para el ECS educativo
 * Cada componente es una estructura de datos pura sin métodos
 */

export const ComponentDefinitions = {
  // Componente de metadatos para identificación
  Metadata: {
    name: '',
    createdAt: 0,
    tags: []
  },

  // Componente de transformación (posición, rotación, escala)
  Transform: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  },

  // Componente de velocidad para movimiento
  Velocity: {
    linear: { x: 0, y: 0, z: 0 },
    angular: { x: 0, y: 0, z: 0 }
  },

  // Componente de color para renderizado
  Color: {
    r: 1, g: 1, b: 1, a: 1
  },

  // Componente de malla para renderizado 3D
  RenderMesh: {
    geometry: 'sphere', // sphere, cube, cylinder, etc.
    radius: 0.5,
    width: 1,
    height: 1,
    depth: 1
  },

  // Componente de salud para sistemas de daño
  Health: {
    current: 100,
    maximum: 100,
    regeneration: 0
  },

  // Componente de daño para entidades que pueden hacer daño
  Damage: {
    value: 10,
    type: 'physical',
    cooldown: 0.5
  },

  // Componente de entrada para entidades controlables por el jugador
  Input: {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    jump: false,
    speed: 5
  },

  // Componente de cámara para vistas
  Camera: {
    isActive: false,
    fov: 75,
    near: 0.1,
    far: 1000,
    target: null // entityId to follow
  },

  // Componente de colisión para detección de colisiones
  Collider: {
    shape: 'sphere', // sphere, box, cylinder
    radius: 0.5,
    width: 1,
    height: 1,
    depth: 1,
    isTrigger: false
  },

  // Componente de física para simulaciones físicas
  Physics: {
    mass: 1.0,
    friction: 0.5,
    restitution: 0.3,
    velocity: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    forces: []
  },

  // Componente de partículas para efectos visuales
  ParticleEmitter: {
    rate: 10, // partículas por segundo
    lifetime: 2.0,
    speed: 5.0,
    size: 0.1,
    color: { r: 1, g: 1, b: 1, a: 1 },
    shape: 'sphere'
  },

  // Componente de sonido para audio
  AudioSource: {
    clip: null, // nombre del clip de audio
    volume: 1.0,
    pitch: 1.0,
    loop: false,
    playOnAwake: false,
    isPlaying: false
  },

  // Componente de animación para sprites/3D
  Animation: {
    currentAnimation: 'idle',
    animations: {}, // nombre -> {frames, duration, loop}
    currentFrame: 0,
    frameTime: 0,
    isPlaying: true
  },

  // Componente de red para multiplayer
  NetworkSync: {
    networkId: null,
    syncPosition: true,
    syncRotation: true,
    syncScale: false,
    interpolation: 'linear',
    lastSyncTime: 0
  },

  // Componente Parent para jerarquías
  Parent: {
    entityId: null, // ID de la entidad padre
    maintainOffset: true, // Mantener offset relativo
    offset: { x: 0, y: 0, z: 0 }, // Offset relativo al padre
    localTransform: { x: 0, y: 0, z: 0 } // Transform local
  },

  // Componente Child para jerarquías
  Child: {
    parentId: null, // ID del padre
    siblingIndex: 0, // Índice entre hermanos
    localPosition: { x: 0, y: 0, z: 0 },
    localRotation: { x: 0, y: 0, z: 0 },
    localScale: { x: 1, y: 1, z: 1 }
  },

  // Componente de socket para jerarquías avanzadas
  Socket: {
    name: '', // Nombre del socket (ej: 'hand', 'head', 'weapon')
    attachedEntity: null, // Entidad adjunta al socket
    offset: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  },

  // Componente de magnetismo para atracción
  Magnet: {
    strength: 10,
    radius: 5,
    attracts: ['Transform'] // tipos de componentes que atrae
  },

  // Componente de comportamiento para IA
  AI: {
    behavior: 'idle', // idle, patrol, chase, flee
    targetEntity: null,
    detectionRadius: 10,
    moveSpeed: 3
  },

  // Componente de estado para máquinas de estado
  State: {
    current: 'idle',
    previous: null,
    timer: 0
  }
};

/**
 * Utilidades para trabajar con componentes
 */
export class ComponentUtils {
  /**
   * Crea datos por defecto para un componente
   */
  static createDefault(type, overrides = {}) {
    const base = ComponentDefinitions[type];
    if (!base) {
      throw new Error(`Componente ${type} no definido`);
    }
    return { ...base, ...overrides };
  }

  /**
   * Valida que un componente tenga la estructura correcta
   */
  static validateComponent(type, data) {
    const definition = ComponentDefinitions[type];
    if (!definition) {
      return false;
    }

    // Validación básica: verificar que todas las propiedades existan
    for (const key in definition) {
      if (!(key in data)) {
        console.warn(`Componente ${type} le falta propiedad: ${key}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Lista todos los tipos de componentes disponibles
   */
  static getComponentTypes() {
    return Object.keys(ComponentDefinitions);
  }

  /**
   * Obtiene la definición de un componente
   */
  static getComponentDefinition(type) {
    return ComponentDefinitions[type] || null;
  }
}
