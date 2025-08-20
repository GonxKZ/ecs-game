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
      intuition: "Imagina que cada sistema es como un chef en una cocina. Cada chef (sistema) solo trabaja con ciertos ingredientes (componentes) y tiene una receta específica. El chef de pastas (MovementSystem) solo toca los ingredientes para pasta, el chef de postres (RenderSystem) solo los ingredientes dulces, etc.",
      whenToUse: "Para implementar cualquier comportamiento: movimiento, colisiones, IA, renderizado, daño, etc.",
      whenNotToUse: "No uses sistemas para almacenar datos. Evita que los sistemas dependan unos de otros directamente.",
      traps: "No hagas sistemas que 'sepan demasiado'. Cada sistema debe tener una responsabilidad única y clara.",
      examples: "MovementSystem (actualiza posiciones basado en velocidad), CollisionSystem (detecta colisiones), RenderSystem (dibuja entidades), AISystem (controla comportamiento inteligente)"
    },
    objectives: [
      {
        id: 'create_movable_entity',
        description: 'Crear entidad con Transform y Velocity',
        check: (world) => hasEntityWithComponents(world, ['Transform', 'Velocity']),
        hint: 'Usa el panel ECS para crear una entidad con componentes de posición y velocidad'
      },
      {
        id: 'start_ecs',
        description: 'Iniciar el bucle de juego',
        check: (progress) => progress.ecsStarted,
        hint: 'Haz clic en "Iniciar" para activar los sistemas'
      },
      {
        id: 'see_movement',
        description: 'Observar el sistema de movimiento funcionando',
        check: (progress) => progress.movementObserved,
        hint: 'Observa cómo las entidades con Velocity se mueven automáticamente por el MovementSystem'
      },
      {
        id: 'understand_query',
        description: 'Entender por qué solo algunas entidades se mueven',
        check: (progress) => progress.queryUnderstood,
        hint: 'Nota que solo las entidades con Transform Y Velocity se mueven - eso es una query en acción'
      }
    ],
    demoSteps: [
      'Crea una entidad con Transform y Velocity (se moverá)',
      'Crea otra entidad solo con Transform (no se moverá)',
      'Inicia el ECS con el botón "Iniciar"',
      'Observa cómo el MovementSystem solo afecta entidades con ambos componentes',
      'Pausa y crea más entidades para experimentar',
      '¡Los sistemas son como filtros que procesan solo lo que les interesa!'
    ],
    initialSetup: (world) => {
      // Entidad que se moverá
      const movableEntity = world.createEntity('ObjetoMovil');
      world.addComponent(movableEntity, 'Transform', {
        position: { x: -2, y: 0, z: 0 }
      });
      world.addComponent(movableEntity, 'Velocity', {
        linear: { x: 2, y: 0, z: 0 }
      });
      world.addComponent(movableEntity, 'Color', {
        r: 0, g: 1, b: 0, a: 1
      });
      world.addComponent(movableEntity, 'RenderMesh', {
        geometry: 'sphere',
        radius: 0.5
      });

      // Entidad que NO se moverá (solo Transform)
      const staticEntity = world.createEntity('ObjetoEstatico');
      world.addComponent(staticEntity, 'Transform', {
        position: { x: 2, y: 0, z: 0 }
      });
      world.addComponent(staticEntity, 'Color', {
        r: 1, g: 0, b: 0, a: 1
      });
      world.addComponent(staticEntity, 'RenderMesh', {
        geometry: 'cube',
        radius: 0.5
      });
    },
    completionMessage: "🎉 ¡Brillante! Has visto cómo los sistemas dan vida a los datos. El MovementSystem solo procesa entidades que tienen los componentes que necesita. Este es el corazón de ECS: separación clara entre datos y lógica."
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
    setLevelProgress(prev => ({
      ...prev,
      ecsStarted: true
    }));

    // Simular que el usuario observa el movimiento después de un tiempo
    setTimeout(() => {
      setLevelProgress(prev => ({
        ...prev,
        movementObserved: true,
        queryUnderstood: true
      }));
    }, 3000);
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
