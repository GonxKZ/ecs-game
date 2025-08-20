import { useState, useEffect } from 'react';

const LEVELS = {
  1: {
    id: 1,
    title: "🏗️ Nivel 1: Entidades",
    description: "Las entidades son identificadores únicos que no contienen datos ni comportamiento",
    theory: {
      definition: "Las entidades son identificadores únicos (generalmente enteros) que representan objetos del juego. No contienen datos ni lógica, solo sirven para agrupar componentes.",
      intuition: "Imagina las entidades como las etiquetas de equipaje en un aeropuerto. La etiqueta no lleva nada, solo identifica a quién pertenece el equipaje (sus componentes).",
      whenToUse: "Siempre que necesites representar algo en el mundo del juego, desde jugadores hasta partículas.",
      whenNotToUse: "No uses entidades para datos globales o configuraciones que no representan objetos individuales.",
      traps: "No caigas en la tentación de almacenar datos en entidades. Recuerda: ¡entidades = solo IDs!",
      examples: "Jugador, Enemigo, Bala, Partícula, Objeto del escenario"
    },
    objectives: [
      {
        id: 'create_entities',
        description: 'Crear al menos 3 entidades',
        check: (world) => world.entities.size >= 3,
        hint: 'Usa el botón "Crear Entidad" para añadir nuevas entidades al mundo'
      },
      {
        id: 'select_entity',
        description: 'Seleccionar una entidad y ver su información',
        check: (progress) => progress.selectedEntity !== null,
        hint: 'Haz clic en cualquier entidad de la lista para seleccionarla'
      },
      {
        id: 'delete_entity',
        description: 'Eliminar una entidad',
        check: (progress) => progress.deletedEntity,
        hint: 'Selecciona una entidad y usa el botón "Eliminar" para removerla'
      }
    ],
    demoSteps: [
      'Crea 3 entidades usando el botón "Crear Esfera"',
      'Observa que solo tienen IDs únicos',
      'Selecciona una entidad y mira su información en el panel derecho',
      'Elimina una entidad para ver el ID liberado',
      '¡Felicidades! Has completado el Nivel 1'
    ],
    initialSetup: (world) => {
      // Crear una entidad de ejemplo
      world.createEntity('EntidadEjemplo');
    },
    completionMessage: "🎉 ¡Excelente! Has comprendido que las entidades son solo identificadores únicos. Ahora pasemos a los componentes..."
  },

  2: {
    id: 2,
    title: "📦 Nivel 2: Componentes",
    description: "Los componentes son estructuras de datos puras que contienen toda la información de las entidades",
    theory: {
      definition: "Los componentes son estructuras de datos puras sin métodos que contienen la información específica de cada aspecto de una entidad.",
      intuition: "Imagina que cada componente es como una página en el pasaporte de una entidad. El pasaporte (entidad) no tiene contenido propio, solo páginas (componentes) que describen diferentes aspectos: dónde vive (Transform), cómo se mueve (Velocity), cómo se ve (Color), etc.",
      whenToUse: "Para cualquier dato que una entidad pueda tener: posición, velocidad, color, salud, comportamiento, etc.",
      whenNotToUse: "No pongas lógica en componentes. Evita jerarquías profundas de componentes.",
      traps: "No hagas componentes que 'hereden' de otros. Cada componente debe ser completamente independiente.",
      examples: "Transform (posición, rotación, escala), Velocity (velocidad lineal y angular), Health (puntos de vida, regeneración), Color (RGBA), AI (tipo de comportamiento, objetivos)"
    },
    objectives: [
      {
        id: 'add_transform',
        description: 'Añadir componente Transform (posición)',
        check: (world) => hasEntityWithComponent(world, 'Transform'),
        hint: 'Usa el panel ECS para añadir Transform a una entidad existente'
      },
      {
        id: 'add_velocity',
        description: 'Añadir componente Velocity (movimiento)',
        check: (world) => hasEntityWithComponent(world, 'Velocity'),
        hint: 'Añade Velocity para que la entidad pueda moverse'
      },
      {
        id: 'add_color',
        description: 'Añadir componente Color (apariencia)',
        check: (world) => hasEntityWithComponent(world, 'Color'),
        hint: 'Añade Color para que la entidad sea visible'
      },
      {
        id: 'create_custom_entity',
        description: 'Crear entidad con múltiples componentes',
        check: (world) => hasEntityWithComponents(world, ['Transform', 'Velocity', 'Color']),
        hint: 'Crea una entidad que tenga Transform, Velocity y Color simultáneamente'
      }
    ],
    demoSteps: [
      'Crea una nueva entidad llamada "MiObjeto"',
      'Añádele componente Transform - esto le da posición en el espacio',
      'Añádele componente Velocity - esto le permite moverse',
      'Añádele componente Color - esto le da apariencia visual',
      'Observa cómo cada componente es completamente independiente',
      '¡Ahora tienes una entidad completa con datos estructurados!'
    ],
    initialSetup: (world) => {
      // Crear entidad de ejemplo con algunos componentes
      const entity1 = world.createEntity('EjemploTransform');
      world.addComponent(entity1, 'Transform', {
        position: { x: -3, y: 0, z: 0 },
        scale: { x: 1.5, y: 1.5, z: 1.5 }
      });

      const entity2 = world.createEntity('EjemploColor');
      world.addComponent(entity2, 'Transform', {
        position: { x: 3, y: 0, z: 0 }
      });
      world.addComponent(entity2, 'Color', {
        r: 1, g: 0, b: 1, a: 1
      });
    },
    completionMessage: "🎉 ¡Excelente! Has dominado el concepto de componentes. Ahora cada entidad puede tener cualquier combinación de datos sin jerarquías complicadas. Pasemos a los sistemas..."
  },

  3: {
    id: 3,
    title: "⚙️ Nivel 3: Sistemas y Bucle de Juego",
    description: "Los sistemas contienen la lógica del juego y operan sobre entidades con componentes específicos",
    theory: {
      definition: "Los sistemas contienen toda la lógica del juego. Operan sobre entidades que tienen ciertos componentes, procesándolos en cada frame del bucle de juego.",
      intuition: "Si las entidades son sustantivos y los componentes adjetivos, los sistemas son los verbos: hacen que las cosas pasen.",
      whenToUse: "Para implementar cualquier comportamiento: movimiento, colisiones, IA, renderizado...",
      whenNotToUse: "No uses sistemas para datos. Evita que los sistemas sepan unos de otros directamente.",
      traps: "Resiste la tentación de hacer sistemas 'inteligentes'. Deben ser funciones puras que procesan datos.",
      examples: "MovementSystem (aplica velocidad), RenderSystem (dibuja entidades), AISystem (comportamiento)"
    },
    objectives: [
      {
        id: 'create_movable_entity',
        description: 'Tener entidad con Transform y Velocity',
        check: (world) => hasEntityWithComponents(world, ['Transform', 'Velocity']),
        hint: 'Crea una entidad con componentes Transform y Velocity'
      },
      {
        id: 'see_movement',
        description: 'Observar movimiento automático',
        check: (progress) => progress.movementObserved,
        hint: 'Inicia el ECS y observa cómo las entidades con Velocity se mueven automáticamente'
      }
    ],
    demoSteps: [
      'Asegúrate de tener una entidad con Transform y Velocity',
      'Inicia el ECS usando el botón "Iniciar"',
      'Observa cómo el sistema de movimiento actualiza las posiciones',
      'Ve cómo solo se mueven las entidades con los componentes requeridos',
      '¡Increíble! Los sistemas dan vida a los datos de los componentes'
    ],
    initialSetup: (world) => {
      const entity = world.createEntity('EntidadMovil');
      world.addComponent(entity, 'Transform', {
        position: { x: 0, y: 0, z: 0 }
      });
      world.addComponent(entity, 'Velocity', {
        linear: { x: 1, y: 0, z: 0 }
      });
      world.addComponent(entity, 'Color', {
        r: 1, g: 0, b: 0, a: 1
      });
      world.addComponent(entity, 'RenderMesh', {
        geometry: 'sphere',
        radius: 0.5
      });
    },
    completionMessage: "🎉 ¡Fantástico! Has visto cómo los sistemas procesan componentes. Ahora vamos a profundizar en las queries..."
  },

  4: {
    id: 4,
    title: "🔍 Nivel 4: Queries y Arquetipos",
    description: "Las queries encuentran entidades con componentes específicos. Los arquetipos optimizan el acceso a datos.",
    theory: {
      definition: "Una query es una búsqueda que devuelve todas las entidades que tienen un conjunto específico de componentes. Los arquetipos son grupos de entidades que comparten la misma combinación de componentes, permitiendo acceso secuencial optimizado.",
      intuition: "Imagina que las queries son como filtros en una base de datos relacional. En lugar de revisar cada entidad individualmente ('¿tiene Transform? ¿tiene Velocity?'), las queries te dan directamente las entidades que cumplen todos los criterios. Los arquetipos son como índices de base de datos que aceleran estas búsquedas.",
      whenToUse: "Siempre que necesites procesar entidades que comparten características específicas. Las queries son la base de todos los sistemas ECS.",
      whenNotToUse: "No hagas queries en cada frame para los mismos datos. Las queries optimizadas se reutilizan automáticamente.",
      traps: "Evita modificar componentes mientras iteras sobre una query. Esto puede invalidar el arquetipo y causar penalizaciones de rendimiento.",
      examples: "Query para entidades móviles (Transform + Velocity), Query para entidades dañables (Health + Collider), Query para entidades renderizables (Transform + RenderMesh)"
    },
    objectives: [
      {
        id: 'create_multiple_combinations',
        description: 'Crear entidades con diferentes combinaciones de componentes',
        check: (world) => world.entities.size >= 5,
        hint: 'Crea entidades con diferentes combinaciones: solo Transform, Transform+Velocity, Transform+Color, etc.'
      },
      {
        id: 'observe_queries',
        description: 'Observar las queries activas en el sistema',
        check: (progress) => progress.queriesObserved,
        hint: 'Revisa el panel de rendimiento para ver cuántas queries están activas y cómo optimizan el acceso'
      },
      {
        id: 'understand_archetypes',
        description: 'Entender cómo los arquetipos agrupan entidades similares',
        check: (progress) => progress.archetypesUnderstood,
        hint: 'Las entidades con la misma combinación de componentes se agrupan automáticamente en arquetipos'
      }
    ],
    demoSteps: [
      'Crea 3 entidades con solo Transform (grupo A)',
      'Crea 2 entidades con Transform + Velocity (grupo B)',
      'Crea 2 entidades con Transform + Color (grupo C)',
      'Observa cómo se forman automáticamente 3 arquetipos diferentes',
      'Revisa el panel de rendimiento para ver las queries activas',
      '¡Los arquetipos hacen que el acceso a datos sea hasta 10x más rápido!'
    ],
    initialSetup: (world) => {
      // Crear entidades de ejemplo para mostrar arquetipos
      const entity1 = world.createEntity('SoloTransform1');
      world.addComponent(entity1, 'Transform', { position: { x: -4, y: 0, z: 0 } });
      world.addComponent(entity1, 'RenderMesh', { geometry: 'sphere', radius: 0.5 });

      const entity2 = world.createEntity('SoloTransform2');
      world.addComponent(entity2, 'Transform', { position: { x: -2, y: 0, z: 0 } });
      world.addComponent(entity2, 'RenderMesh', { geometry: 'sphere', radius: 0.5 });

      const entity3 = world.createEntity('ConVelocity1');
      world.addComponent(entity3, 'Transform', { position: { x: 2, y: 0, z: 0 } });
      world.addComponent(entity3, 'Velocity', { linear: { x: 1, y: 0, z: 0 } });
      world.addComponent(entity3, 'RenderMesh', { geometry: 'cube', radius: 0.5 });
      world.addComponent(entity3, 'Color', { r: 0, g: 1, b: 0, a: 1 });

      const entity4 = world.createEntity('ConVelocity2');
      world.addComponent(entity4, 'Transform', { position: { x: 4, y: 0, z: 0 } });
      world.addComponent(entity4, 'Velocity', { linear: { x: -1, y: 0, z: 0 } });
      world.addComponent(entity4, 'RenderMesh', { geometry: 'cube', radius: 0.5 });
      world.addComponent(entity4, 'Color', { r: 1, g: 0, b: 0, a: 1 });
    },
    completionMessage: "🎉 ¡Increíble! Has descubierto el poder de las queries y arquetipos. Ahora el ECS puede procesar miles de entidades de forma eficiente, accediendo solo a los datos que necesita. Este es el secreto del rendimiento en ECS."
  },

  5: {
    id: 5,
    title: "📡 Nivel 5: Eventos y Mensajería",
    description: "Los eventos permiten comunicación desacoplada entre sistemas sin dependencias directas.",
    theory: {
      definition: "Los eventos son mensajes que los sistemas pueden enviar y recibir para comunicarse sin conocerse directamente. Un sistema emite un evento y otros sistemas pueden suscribirse para procesarlo.",
      intuition: "Imagina que los eventos son como cartas en el correo. En lugar de que el sistema de colisiones llame directamente al sistema de daño (acoplamiento fuerte), el sistema de colisiones envía una 'carta' (evento) diciendo 'hubo una colisión', y el sistema de daño lee sus cartas y procesa el daño.",
      whenToUse: "Para comunicación entre sistemas que no deben depender unos de otros, como colisiones, daño, logros, efectos de sonido.",
      whenNotToUse: "No uses eventos para comunicación síncrona que requiere respuesta inmediata. Para eso, mejor llamadas directas.",
      traps: "No acumules eventos indefinidamente sin limpiarlos. Los eventos no procesados consumen memoria.",
      examples: "Evento Collision (sistema de colisiones), Evento Damage (sistema de daño), Evento PlayerDeath (sistema de logros)"
    },
    objectives: [
      {
        id: 'create_damageable_entities',
        description: 'Crear entidades con componentes Health y Damage',
        check: (world) => hasEntityWithComponent(world, 'Health') && hasEntityWithComponent(world, 'Damage'),
        hint: 'Crea entidades que puedan recibir y causar daño'
      },
      {
        id: 'trigger_collision',
        description: 'Generar colisiones para crear eventos',
        check: (progress) => progress.collisionTriggered,
        hint: 'Haz que entidades con Collider choquen para generar eventos de colisión'
      },
      {
        id: 'observe_events',
        description: 'Observar cómo los eventos fluyen entre sistemas',
        check: (progress) => progress.eventsObserved,
        hint: 'Los eventos aparecen en la consola y se procesan automáticamente por los sistemas correspondientes'
      }
    ],
    demoSteps: [
      'Crea una entidad con Health (puede recibir daño)',
      'Crea otra entidad con Damage (puede causar daño)',
      'Añade componentes Collider a ambas para detectar colisiones',
      'Observa los eventos de colisión en la consola',
      'Ve cómo el DamageSystem procesa automáticamente los eventos',
      '¡Los sistemas se comunican sin conocerse directamente!'
    ],
    initialSetup: (world) => {
      // Entidad que puede recibir daño
      const victim = world.createEntity('Victima');
      world.addComponent(victim, 'Transform', { position: { x: -2, y: 0, z: 0 } });
      world.addComponent(victim, 'Health', { current: 100, maximum: 100 });
      world.addComponent(victim, 'RenderMesh', { geometry: 'sphere', radius: 0.7 });
      world.addComponent(victim, 'Color', { r: 0, g: 1, b: 0, a: 1 });
      world.addComponent(victim, 'Collider', { shape: 'sphere', radius: 0.7 });

      // Entidad que puede causar daño
      const attacker = world.createEntity('Atacante');
      world.addComponent(attacker, 'Transform', { position: { x: 2, y: 0, z: 0 } });
      world.addComponent(attacker, 'Velocity', { linear: { x: -1, y: 0, z: 0 } });
      world.addComponent(attacker, 'Damage', { value: 25, type: 'physical' });
      world.addComponent(attacker, 'RenderMesh', { geometry: 'cube', radius: 0.5 });
      world.addComponent(attacker, 'Color', { r: 1, g: 0, b: 0, a: 1 });
      world.addComponent(attacker, 'Collider', { shape: 'sphere', radius: 0.5 });
    },
    completionMessage: "🎉 ¡Excelente! Has dominado los eventos y la mensajería. Ahora los sistemas pueden comunicarse de forma limpia y desacoplada. Este patrón es esencial para sistemas de juegos escalables."
  },

  6: {
    id: 6,
    title: "🎛️ Nivel 6: Recursos y Datos Globales",
    description: "Los recursos manejan datos globales que no pertenecen a entidades individuales.",
    theory: {
      definition: "Los recursos son contenedores para datos globales que no están asociados a una entidad específica, como configuraciones del juego, assets compartidos, o estados globales.",
      intuition: "Si las entidades son como empleados de una empresa, y los componentes son sus habilidades, los recursos son como la base de datos de la empresa, las políticas de recursos humanos, o el inventario general.",
      whenToUse: "Para datos que se comparten entre múltiples entidades o sistemas, como configuraciones, assets, temporizadores globales.",
      whenNotToUse: "No uses recursos para datos que deberían estar en componentes. Si el dato describe una entidad específica, debe ser un componente.",
      traps: "Evita tener demasiados recursos singleton. Pueden convertirse en un lugar donde acumular estado global descontrolado.",
      examples: "Resource Time (tiempo del juego), Resource Assets (texturas, modelos), Resource Configuration (dificultad, volumen)"
    },
    objectives: [
      {
        id: 'create_shared_resource',
        description: 'Crear un recurso compartido (como gravedad)',
        check: (progress) => progress.sharedResourceCreated,
        hint: 'Usa el panel para ajustar parámetros globales que afecten a múltiples entidades'
      },
      {
        id: 'observe_global_effect',
        description: 'Observar cómo el recurso afecta a todas las entidades',
        check: (progress) => progress.globalEffectObserved,
        hint: 'Cambia un parámetro global y ve cómo afecta a todas las entidades que lo usan'
      },
      {
        id: 'create_particle_system',
        description: 'Crear un sistema de partículas como recurso visual',
        check: (world) => world.entities.size >= 3,
        hint: 'Crea entidades con el componente ParticleEmitter para ver efectos visuales'
      }
    ],
    demoSteps: [
      'Crea un emisor de partículas para ver efectos visuales',
      'Crea un objeto con física para ver simulaciones realistas',
      'Ajusta parámetros globales como gravedad o velocidad',
      'Observa cómo estos recursos afectan a múltiples entidades',
      '¡Los recursos mantienen el estado global organizado!'
    ],
    initialSetup: (world) => {
      // Crear emisor de partículas
      const emitter = world.createEntity('EmisorParticulas');
      world.addComponent(emitter, 'Transform', { position: { x: 0, y: 2, z: 0 } });
      world.addComponent(emitter, 'ParticleEmitter', {
        rate: 15,
        lifetime: 2.5,
        speed: 6.0,
        size: 0.15,
        color: { r: 0.5, g: 0.8, b: 1, a: 1 },
        shape: 'sphere'
      });
      world.addComponent(emitter, 'RenderMesh', { geometry: 'sphere', radius: 0.3 });
      world.addComponent(emitter, 'Color', { r: 0.5, g: 0.8, b: 1, a: 1 });

      // Crear objeto con física
      const physicsObj = world.createEntity('ObjetoFisica');
      world.addComponent(physicsObj, 'Transform', { position: { x: 1, y: 3, z: 0 } });
      world.addComponent(physicsObj, 'Physics', {
        mass: 1.5,
        friction: 0.2,
        restitution: 0.9
      });
      world.addComponent(physicsObj, 'RenderMesh', { geometry: 'cube', radius: 0.4 });
      world.addComponent(physicsObj, 'Color', { r: 1, g: 0.5, b: 0, a: 1 });
    },
    completionMessage: "🎉 ¡Perfecto! Has aprendido a manejar recursos y datos globales. Los recursos mantienen el estado compartido organizado y accesible para todos los sistemas que los necesiten."
  },

  7: {
    id: 7,
    title: "⏰ Nivel 7: Scheduling y Determinismo",
    description: "El orden de ejecución de sistemas y el tiempo fijo vs variable afectan la simulación.",
    theory: {
      definition: "El scheduling es el orden en el que se ejecutan los sistemas. El tiempo fijo mantiene actualizaciones consistentes, mientras que el tiempo variable se adapta a los frames.",
      intuition: "Es como organizar una cadena de producción. El orden importa: no puedes pintar un auto antes de ensamblarlo. El tiempo fijo es como una línea de producción con ritmo constante, mientras que el tiempo variable es como trabajadores que van a diferentes velocidades.",
      whenToUse: "Tiempo fijo para simulaciones físicas y lógicas críticas, tiempo variable para rendering y efectos visuales.",
      whenNotToUse: "No uses tiempo variable para lógica de juego que requiere consistencia. Los bugs de 'delta time' son famosos.",
      traps: "No asumas que los sistemas siempre se ejecutan en el mismo orden. Las dependencias deben estar claramente definidas.",
      examples: "FixedUpdate (física, lógica), Update (rendering, input), LateUpdate (cámara, efectos)"
    },
    objectives: [
      {
        id: 'create_multiple_systems',
        description: 'Tener múltiples sistemas ejecutándose',
        check: (world) => Object.keys(world.systems).length >= 3,
        hint: 'Asegúrate de que varios sistemas estén activos'
      },
      {
        id: 'observe_execution_order',
        description: 'Observar el orden de ejecución de sistemas',
        check: (progress) => progress.executionOrderObserved,
        hint: 'Revisa los logs en consola para ver el orden de ejecución'
      },
      {
        id: 'test_timing_modes',
        description: 'Experimentar con diferentes modos de tiempo',
        check: (progress) => progress.timingModesTested,
        hint: 'Observa las diferencias entre actualizaciones fijas y variables'
      }
    ],
    demoSteps: [
      'Observa cómo se ejecutan los sistemas en orden',
      'Crea entidades que usen diferentes sistemas',
      'Ve los logs de ejecución en la consola',
      'Entiende por qué el orden de sistemas es importante',
      '¡El scheduling correcto es clave para un juego estable!'
    ],
    initialSetup: (world) => {
      // Entidad con movimiento
      const moving = world.createEntity('Movil');
      world.addComponent(moving, 'Transform', { position: { x: -3, y: 0, z: 0 } });
      world.addComponent(moving, 'Velocity', { linear: { x: 1, y: 0, z: 0 } });
      world.addComponent(moving, 'RenderMesh', { geometry: 'sphere', radius: 0.5 });
      world.addComponent(moving, 'Color', { r: 0, g: 1, b: 0, a: 1 });

      // Entidad con partículas
      const emitter = world.createEntity('Particulas');
      world.addComponent(emitter, 'Transform', { position: { x: 3, y: 0, z: 0 } });
      world.addComponent(emitter, 'ParticleEmitter', {
        rate: 10,
        lifetime: 1.5,
        speed: 4.0,
        size: 0.1,
        color: { r: 1, g: 0, b: 1, a: 1 },
        shape: 'sphere'
      });
      world.addComponent(emitter, 'RenderMesh', { geometry: 'sphere', radius: 0.3 });
      world.addComponent(emitter, 'Color', { r: 1, g: 0, b: 1, a: 1 });

      // Entidad con física
      const physics = world.createEntity('Fisica');
      world.addComponent(physics, 'Transform', { position: { x: 0, y: 2, z: 0 } });
      world.addComponent(physics, 'Physics', {
        mass: 1.0,
        friction: 0.1,
        restitution: 0.8
      });
      world.addComponent(physics, 'RenderMesh', { geometry: 'cube', radius: 0.4 });
      world.addComponent(physics, 'Color', { r: 0, g: 0.5, b: 1, a: 1 });
    },
    completionMessage: "🎉 ¡Brillante! Has dominado el scheduling y el manejo del tiempo. Ahora puedes crear simulaciones consistentes y entender por qué el orden de ejecución es tan importante en los juegos."
  },

  8: {
    id: 8,
    title: "🌳 Nivel 8: Jerarquías y Relaciones Parent",
    description: "Las jerarquías permiten crear estructuras padre-hijo para objetos compuestos.",
    theory: {
      definition: "Las jerarquías en ECS se implementan usando componentes Parent y Child que permiten crear relaciones entre entidades. Una entidad padre puede tener múltiples hijos, y las transformaciones se propagan de padres a hijos.",
      intuition: "Imagina un robot: el cuerpo es el padre, y los brazos, piernas y cabeza son hijos. Cuando mueves el cuerpo, todo se mueve junto. En ECS, esto se logra con componentes Parent/Child, no con herencia de clases.",
      whenToUse: "Para objetos compuestos, personajes con múltiples partes, UI con elementos anidados, cualquier estructura donde las partes necesitan moverse juntas.",
      whenNotToUse: "Para relaciones temporales o que cambian frecuentemente. Las jerarquías deben ser estructuras relativamente estables.",
      traps: "Evitar jerarquías muy profundas (más de 3-4 niveles) ya que complican las transformaciones. Considerar técnicas de instancing para objetos repetitivos.",
      examples: "Robot con partes móviles, árbol genealógico, UI con panels anidados, vehículo con ruedas independientes"
    },
    objectives: [
      {
        id: 'create_parent_child',
        description: 'Crear una relación padre-hijo entre entidades',
        check: (world) => hasEntityWithComponent(world, 'Parent') && hasEntityWithComponent(world, 'Child'),
        hint: 'Usa los componentes Parent y Child para crear jerarquías'
      },
      {
        id: 'test_hierarchy_movement',
        description: 'Ver cómo el movimiento se propaga en la jerarquía',
        check: (progress) => progress.hierarchyMovementTested,
        hint: 'Mueve el padre y observa cómo los hijos siguen automáticamente'
      },
      {
        id: 'create_complex_hierarchy',
        description: 'Crear una jerarquía más compleja con múltiples niveles',
        check: (progress) => progress.complexHierarchyCreated,
        hint: 'Crea abuelos, padres y nietos para ver la propagación de transformaciones'
      }
    ],
    demoSteps: [
      'Crea una entidad padre (ej: robot)',
      'Crea entidades hijas (brazos, piernas)',
      'Mueve el padre y observa cómo los hijos siguen',
      'Crea una jerarquía más compleja',
      '¡Las jerarquías hacen que los objetos se muevan como una unidad!'
    ],
    initialSetup: (world) => {
      // Crear una jerarquía simple: padre con dos hijos
      const padre = world.createEntity('Padre');
      world.addComponent(padre, 'Transform', {
        position: { x: 0, y: 1, z: 0 }
      });
      world.addComponent(padre, 'Velocity', {
        linear: { x: 0.5, y: 0, z: 0 }
      });
      world.addComponent(padre, 'RenderMesh', {
        geometry: 'sphere',
        radius: 0.8
      });
      world.addComponent(padre, 'Color', {
        r: 0, g: 1, b: 0, a: 1
      });
      world.addComponent(padre, 'Parent', {
        entityId: padre,
        maintainOffset: true,
        offset: { x: 0, y: 0, z: 0 }
      });

      // Hijo derecho
      const hijoDerecho = world.createEntity('HijoDerecho');
      world.addComponent(hijoDerecho, 'Transform', {
        position: { x: 1.5, y: 1, z: 0 }
      });
      world.addComponent(hijoDerecho, 'RenderMesh', {
        geometry: 'cube',
        radius: 0.4
      });
      world.addComponent(hijoDerecho, 'Color', {
        r: 1, g: 0, b: 0, a: 1
      });
      world.addComponent(hijoDerecho, 'Child', {
        parentId: padre,
        localPosition: { x: 1.5, y: 0, z: 0 }
      });

      // Hijo izquierdo
      const hijoIzquierdo = world.createEntity('HijoIzquierdo');
      world.addComponent(hijoIzquierdo, 'Transform', {
        position: { x: -1.5, y: 1, z: 0 }
      });
      world.addComponent(hijoIzquierdo, 'RenderMesh', {
        geometry: 'cube',
        radius: 0.4
      });
      world.addComponent(hijoIzquierdo, 'Color', {
        r: 0, g: 0, b: 1, a: 1
      });
      world.addComponent(hijoIzquierdo, 'Child', {
        parentId: padre,
        localPosition: { x: -1.5, y: 0, z: 0 }
      });
    },
    completionMessage: "🎉 ¡Excelente! Has comprendido las jerarquías en ECS. Ahora puedes crear objetos compuestos donde las partes se mueven juntas manteniendo su relación relativa. Este es el fundamento de los personajes y objetos complejos en los juegos."
  },

  9: {
    id: 9,
    title: "💾 Nivel 9: Persistencia y Prefabs",
    description: "La persistencia permite guardar y cargar estados del ECS. Los prefabs son plantillas reutilizables.",
    theory: {
      definition: "La persistencia es la capacidad de guardar y cargar el estado completo del ECS. Los prefabs son entidades template que se pueden instanciar múltiples veces, como clases factory pero basadas en datos.",
      intuition: "Es como guardar una partida de videojuego: guardas el estado de todas las entidades, sus componentes, y los recursos. Los prefabs son como moldes de galletas - defines una vez cómo debe ser una galleta (entidad), y luego puedes crear todas las galletas idénticas que quieras.",
      whenToUse: "Para guardado de partidas, niveles prefabricados, assets reutilizables, templates de entidades complejas.",
      whenNotToUse: "Para datos que no necesitan persistir, como efectos temporales o debugging info.",
      traps: "Cuidado con referencias circulares al serializar. Asegurarse de que todos los componentes sean serializables.",
      examples: "Guardar partida, cargar nivel, spawnear enemigos desde prefab, crear items desde template"
    },
    objectives: [
      {
        id: 'create_prefab',
        description: 'Crear un prefab a partir de una entidad',
        check: (progress) => progress.prefabCreated,
        hint: 'Crea una entidad con componentes y conviértela en un prefab para reutilizar'
      },
      {
        id: 'instantiate_prefab',
        description: 'Instanciar múltiples copias del prefab',
        check: (progress) => progress.prefabInstantiated,
        hint: 'Usa el prefab para crear varias entidades idénticas'
      },
      {
        id: 'save_and_load',
        description: 'Guardar y cargar el estado del mundo',
        check: (progress) => progress.worldSavedAndLoaded,
        hint: 'Guarda el estado actual y luego cárgalo para ver cómo persiste'
      },
      {
        id: 'export_entity',
        description: 'Exportar e importar entidades individuales',
        check: (progress) => progress.entityExportedAndImported,
        hint: 'Exporta una entidad a JSON y luego impórtala como nueva entidad'
      }
    ],
    demoSteps: [
      'Crea una entidad compleja con múltiples componentes',
      'Conviértela en un prefab para reutilizar',
      'Instancia varias copias del prefab',
      'Guarda el estado del mundo completo',
      'Carga el estado guardado para verificar persistencia',
      '¡Ahora puedes crear y persistir mundos ECS completos!'
    ],
    initialSetup: (world) => {
      // Crear entidad de ejemplo para convertir en prefab
      const templateEntity = world.createEntity('PlantillaEnemigo');
      world.addComponent(templateEntity, 'Transform', {
        position: { x: 2, y: 1, z: 0 }
      });
      world.addComponent(templateEntity, 'Health', {
        current: 50,
        maximum: 50
      });
      world.addComponent(templateEntity, 'Damage', {
        value: 10,
        type: 'physical'
      });
      world.addComponent(templateEntity, 'RenderMesh', {
        geometry: 'cube',
        radius: 0.6
      });
      world.addComponent(templateEntity, 'Color', {
        r: 1, g: 0.3, b: 0.3, a: 1
      });

      // Crear otra entidad para demostrar
      const playerEntity = world.createEntity('Jugador');
      world.addComponent(playerEntity, 'Transform', {
        position: { x: -2, y: 1, z: 0 }
      });
      world.addComponent(playerEntity, 'Health', {
        current: 100,
        maximum: 100
      });
      world.addComponent(playerEntity, 'RenderMesh', {
        geometry: 'sphere',
        radius: 0.8
      });
      world.addComponent(playerEntity, 'Color', {
        r: 0, g: 0.8, b: 1, a: 1
      });
    },
    completionMessage: "🎉 ¡Increíble! Has dominado la persistencia y los prefabs. Ahora puedes crear sistemas ECS completos que persisten entre sesiones, reutilizan assets, y manejan estados complejos. ¡Este es el nivel profesional!"
  },

  10: {
    id: 10,
    title: "🎮 Nivel 10: Minijuego Final - Extiende el Juego",
    description: "¡Casi has terminado! Ahora crea un minijuego completo combinando todo lo aprendido y extiende sus funcionalidades.",
    theory: {
      definition: "En este nivel final, crearás un minijuego que combine todos los conceptos de ECS que has aprendido. El juego base será simple, pero el verdadero desafío será extenderlo añadiendo nuevos componentes y sistemas sin tocar el código existente.",
      intuition: "Imagina que eres un desarrollador de juegos trabajando en un equipo. El motor base está hecho, pero necesitas añadir nuevas funcionalidades (power-ups, enemigos especiales, efectos visuales) sin romper el código existente. En ECS, esto es fácil porque cada nueva funcionalidad es un componente + sistema independientes.",
      whenToUse: "Para crear juegos modulares, extensibles y mantenibles. ECS brilla cuando necesitas añadir funcionalidades frecuentemente.",
      whenNotToUse: "Para juegos muy simples donde la arquitectura ECS sería overkill. Para prototipos rápidos, a veces un approach más directo es mejor.",
      traps: "No caigas en la tentación de crear componentes 'híbridos' que hacen muchas cosas. Mantén cada componente enfocado en una responsabilidad única.",
      examples: "Minecraft (blocks + comportamientos), Space Invaders (enemigos + patrones), cualquier juego con mods"
    },
    objectives: [
      {
        id: 'create_minigame',
        description: 'Crear un minijuego básico con jugador, enemigos y colisiones',
        check: (world) => {
          const hasPlayer = Array.from(world.entities).some(([, components]) =>
            components.has('Input') && components.has('Health')
          );
          const hasEnemies = Array.from(world.entities).some(([, components]) =>
            components.has('AI') && components.has('Damage')
          );
          return hasPlayer && hasEnemies;
        },
        hint: 'Usa los prefabs y sistemas existentes para crear un jugador y enemigos básicos'
      },
      {
        id: 'add_new_component',
        description: 'Añadir un nuevo componente personalizado sin tocar código existente',
        check: (progress) => progress.newComponentAdded,
        hint: 'Crea un componente como "Shield" o "SpeedBoost" y añádelo a entidades'
      },
      {
        id: 'add_new_system',
        description: 'Crear un nuevo sistema que use el componente personalizado',
        check: (progress) => progress.newSystemAdded,
        hint: 'Implementa ShieldSystem o SpeedBoostSystem que procese tu nuevo componente'
      },
      {
        id: 'extend_gameplay',
        description: 'Extender el gameplay con la nueva funcionalidad',
        check: (progress) => progress.gameplayExtended,
        hint: 'Integra tu nuevo power-up en el flujo de juego y verifica que funciona'
      }
    ],
    demoSteps: [
      'Configura el escenario base con jugador y enemigos',
      'Crea un nuevo componente (ej: ShieldComponent)',
      'Implementa el sistema correspondiente (ej: ShieldSystem)',
      'Añade el power-up al jugador o enemigos',
      'Verifica que todo funciona sin tocar código existente',
      '¡Felicidades! Eres un desarrollador ECS profesional'
    ],
    initialSetup: (world) => {
      // Crear jugador
      const player = world.createEntity('Jugador');
      world.addComponent(player, 'Transform', { position: { x: 0, y: 0, z: 0 } });
      world.addComponent(player, 'Velocity', { linear: { x: 0, y: 0, z: 0 } });
      world.addComponent(player, 'Input', { speed: 5 });
      world.addComponent(player, 'Health', { current: 100, maximum: 100 });
      world.addComponent(player, 'RenderMesh', { geometry: 'sphere', radius: 0.8 });
      world.addComponent(player, 'Color', { r: 0, g: 0.8, b: 1, a: 1 });
      world.addComponent(player, 'Collider', { shape: 'sphere', radius: 0.8 });

      // Crear enemigos
      for (let i = 0; i < 3; i++) {
        const enemy = world.createEntity(`Enemigo${i + 1}`);
        world.addComponent(enemy, 'Transform', {
          position: { x: (i - 1) * 3, y: 2, z: 5 }
        });
        world.addComponent(enemy, 'Velocity', { linear: { x: 0, y: 0, z: -1 } });
        world.addComponent(enemy, 'AI', { behavior: 'patrol', moveSpeed: 2 });
        world.addComponent(enemy, 'Health', { current: 30, maximum: 30 });
        world.addComponent(enemy, 'Damage', { value: 15, type: 'enemy' });
        world.addComponent(enemy, 'RenderMesh', { geometry: 'cube', radius: 0.6 });
        world.addComponent(enemy, 'Color', { r: 1, g: 0.3, b: 0.3, a: 1 });
        world.addComponent(enemy, 'Collider', { shape: 'sphere', radius: 0.6 });
      }

      // Crear power-ups como ejemplo
      const shieldPowerUp = world.createEntity('Escudo');
      world.addComponent(shieldPowerUp, 'Transform', { position: { x: -2, y: 1, z: 3 } });
      world.addComponent(shieldPowerUp, 'RenderMesh', { geometry: 'sphere', radius: 0.3 });
      world.addComponent(shieldPowerUp, 'Color', { r: 1, g: 1, b: 0, a: 1 });
      world.addComponent(shieldPowerUp, 'Collider', { shape: 'sphere', radius: 0.3, isTrigger: true });
    },
    completionMessage: "🎉 ¡FELICIDADES! Has completado el juego educativo ECS. Ahora eres capaz de:\n\n✅ Crear entidades modulares con componentes\n✅ Construir sistemas que procesan datos de forma eficiente\n✅ Usar queries para encontrar entidades específicas\n✅ Gestionar jerarquías padre-hijo\n✅ Implementar eventos para comunicación entre sistemas\n✅ Manejar recursos globales\n✅ Controlar el scheduling de sistemas\n✅ Crear prefabs reutilizables\n✅ Guardar y cargar estados del juego\n✅ Extender juegos sin tocar código existente\n\n¡Eres un desarrollador ECS profesional! 🚀"
  }
};

// Funciones auxiliares
function hasEntityWithComponent(world, componentType) {
  for (const [, components] of world.entities) {
    if (components.has(componentType)) {
      return true;
    }
  }
  return false;
}

function hasEntityWithComponents(world, componentTypes) {
  for (const [, components] of world.entities) {
    if (componentTypes.every(comp => components.has(comp))) {
      return true;
    }
  }
  return false;
}

export default function LevelManager({
  currentLevel,
  world,
  onLevelComplete,
  onAddConsoleMessage
}) {
  const [levelProgress, setLevelProgress] = useState({});
  const [objectives, setObjectives] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);

  const level = LEVELS[currentLevel];

  // Inicializar nivel
  useEffect(() => {
    if (!world || !level) return;

    // Mostrar información del nivel
    onAddConsoleMessage(`🎯 === ${level.title} ===`);
    onAddConsoleMessage(level.description);
    onAddConsoleMessage('');

    // Mostrar objetivos
    onAddConsoleMessage('📋 Objetivos del nivel:');
    level.objectives.forEach((obj, index) => {
      onAddConsoleMessage(`  ${index + 1}. ${obj.description}`);
    });
    onAddConsoleMessage('');

    // Setup inicial del nivel
    if (level.initialSetup) {
      level.initialSetup(world);
    }

    setObjectives(level.objectives);
    setLevelProgress({});
  }, [currentLevel, world, level, onAddConsoleMessage]);

  // Verificar progreso del nivel
  useEffect(() => {
    if (!world || !level) return;

    const progress = {};
    level.objectives.forEach((objective, index) => {
      progress[index] = objective.check(world, { ...levelProgress, selectedEntity });
    });

    setLevelProgress(progress);

    // Verificar si el nivel está completo
    const isComplete = level.objectives.every((_, index) => progress[index]);

    if (isComplete && level.objectives.length > 0) {
      onAddConsoleMessage('🎉 ¡Nivel completado!');
      onAddConsoleMessage(level.completionMessage);
      onAddConsoleMessage('');
      onAddConsoleMessage('💡 Usa los conocimientos aprendidos en el siguiente nivel...');
      setTimeout(() => onLevelComplete(), 2000);
    }
  }, [world, level, levelProgress, selectedEntity, onLevelComplete, onAddConsoleMessage]);

  // Actualizar progreso cuando se selecciona una entidad
  useEffect(() => {
    setLevelProgress(prev => ({
      ...prev,
      hasSelectedEntity: selectedEntity !== null
    }));
  }, [selectedEntity]);

  const handleEntitySelect = () => {
    setSelectedEntity(null);
    setLevelProgress(prev => ({
      ...prev,
      hasSelectedEntity: true
    }));
  };

  const handleEntityDelete = () => {
    setLevelProgress(prev => ({
      ...prev,
      deletedEntity: true
    }));
  };

  const handleStartECS = () => {
    setTimeout(() => {
      setLevelProgress(prev => ({
        ...prev,
        movementObserved: true
      }));
    }, 2000); // Simular que el usuario observa el movimiento
  };

  return {
    level,
    progress: levelProgress,
    objectives,
    selectedEntity,
    onEntitySelect: handleEntitySelect,
    onEntityDelete: handleEntityDelete,
    onStartECS: handleStartECS
  };
}
