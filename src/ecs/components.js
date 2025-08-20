/**
 * Definiciones de componentes para el ECS educativo
 * Cada componente es una estructura de datos pura sin métodos
 */

export const ComponentDefinitions = {
  // Componente de metadatos para identificación
  Metadata: {
    name: 'string',
    createdAt: 'int32',
    tags: 'object' // Array de strings
  },

  // Componente de transformación (posición, rotación, escala)
  Transform: {
    position_x: 'float32',
    position_y: 'float32',
    position_z: 'float32',
    rotation_x: 'float32',
    rotation_y: 'float32',
    rotation_z: 'float32',
    scale_x: 'float32',
    scale_y: 'float32',
    scale_z: 'float32'
  },

  // Componente de velocidad para movimiento
  Velocity: {
    linear_x: 'float32',
    linear_y: 'float32',
    linear_z: 'float32',
    angular_x: 'float32',
    angular_y: 'float32',
    angular_z: 'float32'
  },

  // Componente de color para renderizado
  Color: {
    r: 'float32',
    g: 'float32',
    b: 'float32',
    a: 'float32'
  },

  // Componente de malla para renderizado 3D (datos puros, sin objetos Three.js)
  RenderMesh: {
    geometryType: 'string', // 'sphere', 'cube', 'cylinder', 'plane', 'custom'
    radius: 'float32',
    width: 'float32',
    height: 'float32',
    depth: 'float32',
    geometryResource: 'string', // ID del recurso de geometría pre-cargado
    visible: 'boolean'
  },

  // Componente de material para renderizado (datos puros)
  MaterialRef: {
    materialType: 'string', // 'standard', 'phong', 'basic', 'custom'
    color_r: 'float32',
    color_g: 'float32',
    color_b: 'float32',
    metalness: 'float32',
    roughness: 'float32',
    emissive_r: 'float32',
    emissive_g: 'float32',
    emissive_b: 'float32',
    textureResource: 'string', // ID del recurso de textura
    normalMapResource: 'string', // ID del normal map
    transparent: 'boolean',
    opacity: 'float32'
  },

  // Componente de salud para sistemas de daño
  Health: {
    current: 'int32',
    maximum: 'int32',
    regeneration: 'float32'
  },

  // Componente de daño para entidades que pueden hacer daño
  Damage: {
    value: 'int32',
    type: 'string',
    cooldown: 'float32'
  },

  // Componente de entrada para entidades controlables por el jugador
  Input: {
    moveForward: 'boolean',
    moveBackward: 'boolean',
    moveLeft: 'boolean',
    moveRight: 'boolean',
    jump: 'boolean',
    speed: 'float32'
  },

  // Componente de cámara para vistas (datos puros)
  Camera: {
    isActive: 'boolean',
    fov: 'float32',
    near: 'float32',
    far: 'float32',
    aspect: 'float32',
    target: 'int32', // entityId
    mode: 'string' // 'perspective', 'orthographic'
  },

  // Componente de luz (datos puros)
  Light: {
    type: 'string', // 'ambient', 'directional', 'point', 'spot'
    color_r: 'float32',
    color_g: 'float32',
    color_b: 'float32',
    intensity: 'float32',
    range: 'float32', // para point y spot lights
    angle: 'float32', // para spot lights
    penumbra: 'float32', // para spot lights
    castShadow: 'boolean'
  },

  // Componente de animación (datos puros)
  AnimationState: {
    animationName: 'string',
    isPlaying: 'boolean',
    loop: 'boolean',
    speed: 'float32',
    currentTime: 'float32',
    duration: 'float32'
  },

  // Componente de particulas (datos puros)
  ParticleSystem: {
    emitterShape: 'string', // 'point', 'sphere', 'box', 'cone'
    rate: 'float32', // partículas por segundo
    lifetime: 'float32',
    startSize: 'float32',
    endSize: 'float32',
    startColor_r: 'float32',
    startColor_g: 'float32',
    startColor_b: 'float32',
    endColor_r: 'float32',
    endColor_g: 'float32',
    endColor_b: 'float32',
    velocity_x: 'float32',
    velocity_y: 'float32',
    velocity_z: 'float32',
    velocityVariation: 'float32'
  },

  // Componente de colisión para detección de colisiones
  Collider: {
    shape: 'string',
    radius: 'float32',
    width: 'float32',
    height: 'float32',
    depth: 'float32',
    isTrigger: 'boolean'
  },

  // Componente de física para simulaciones físicas
  Physics: {
    mass: 'float32',
    friction: 'float32',
    restitution: 'float32',
    velocity_x: 'float32',
    velocity_y: 'float32',
    velocity_z: 'float32',
    acceleration_x: 'float32',
    acceleration_y: 'float32',
    acceleration_z: 'float32'
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
   * Convierte datos SoA a formato de objeto
   */
  static soaToObject(componentType, slotData) {
    const definition = ComponentDefinitions[componentType];
    if (!definition) return null;

    const obj = {};

    // Transform: convertir campos separados a objetos
    if (componentType === 'Transform') {
      obj.position = {
        x: slotData.position_x || 0,
        y: slotData.position_y || 0,
        z: slotData.position_z || 0
      };
      obj.rotation = {
        x: slotData.rotation_x || 0,
        y: slotData.rotation_y || 0,
        z: slotData.rotation_z || 0
      };
      obj.scale = {
        x: slotData.scale_x || 1,
        y: slotData.scale_y || 1,
        z: slotData.scale_z || 1
      };
    } else if (componentType === 'Velocity') {
      obj.linear = {
        x: slotData.linear_x || 0,
        y: slotData.linear_y || 0,
        z: slotData.linear_z || 0
      };
      obj.angular = {
        x: slotData.angular_x || 0,
        y: slotData.angular_y || 0,
        z: slotData.angular_z || 0
      };
    } else if (componentType === 'Physics') {
      obj.mass = slotData.mass || 1.0;
      obj.friction = slotData.friction || 0.5;
      obj.restitution = slotData.restitution || 0.3;
      obj.velocity = {
        x: slotData.velocity_x || 0,
        y: slotData.velocity_y || 0,
        z: slotData.velocity_z || 0
      };
      obj.acceleration = {
        x: slotData.acceleration_x || 0,
        y: slotData.acceleration_y || 0,
        z: slotData.acceleration_z || 0
      };
      obj.forces = []; // Los arrays no se manejan en SoA por simplicidad
    } else {
      // Para otros componentes, copiar directamente
      for (const [fieldName, value] of Object.entries(slotData)) {
        obj[fieldName] = value;
      }
    }

    return obj;
  }

  /**
   * Convierte datos de objeto a formato SoA
   */
  static objectToSoa(componentType, objData) {
    const definition = ComponentDefinitions[componentType];
    if (!definition) return null;

    const soaData = {};

    // Transform: convertir objetos a campos separados
    if (componentType === 'Transform') {
      soaData.position_x = objData.position?.x || 0;
      soaData.position_y = objData.position?.y || 0;
      soaData.position_z = objData.position?.z || 0;
      soaData.rotation_x = objData.rotation?.x || 0;
      soaData.rotation_y = objData.rotation?.y || 0;
      soaData.rotation_z = objData.rotation?.z || 0;
      soaData.scale_x = objData.scale?.x || 1;
      soaData.scale_y = objData.scale?.y || 1;
      soaData.scale_z = objData.scale?.z || 1;
    } else if (componentType === 'Velocity') {
      soaData.linear_x = objData.linear?.x || 0;
      soaData.linear_y = objData.linear?.y || 0;
      soaData.linear_z = objData.linear?.z || 0;
      soaData.angular_x = objData.angular?.x || 0;
      soaData.angular_y = objData.angular?.y || 0;
      soaData.angular_z = objData.angular?.z || 0;
    } else if (componentType === 'Physics') {
      soaData.mass = objData.mass || 1.0;
      soaData.friction = objData.friction || 0.5;
      soaData.restitution = objData.restitution || 0.3;
      soaData.velocity_x = objData.velocity?.x || 0;
      soaData.velocity_y = objData.velocity?.y || 0;
      soaData.velocity_z = objData.velocity?.z || 0;
      soaData.acceleration_x = objData.acceleration?.x || 0;
      soaData.acceleration_y = objData.acceleration?.y || 0;
      soaData.acceleration_z = objData.acceleration?.z || 0;
    } else {
      // Para otros componentes, copiar directamente
      for (const [fieldName, value] of Object.entries(objData)) {
        soaData[fieldName] = value;
      }
    }

    return soaData;
  }

  /**
   * Crea datos por defecto para un componente
   */
  static createDefault(type, overrides = {}) {
    const definition = ComponentDefinitions[type];
    if (!definition) {
      throw new Error(`Componente ${type} no definido`);
    }
    return this.objectToSoa(type, overrides);
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

  /**
   * Obtiene el esquema de tipos para el almacenamiento SoA
   */
  static getSchema(type) {
    return ComponentDefinitions[type] || null;
  }
}
