import { useState, useEffect } from 'react';

export default function LevelSystem({
  currentLevel,
  world,
  onLevelComplete,
  onAddConsoleMessage
}) {
  const [levelProgress, setLevelProgress] = useState({});
  const [objectives, setObjectives] = useState([]);

  // Definir objetivos por nivel
  useEffect(() => {
    const levelObjectives = getLevelObjectives(currentLevel);
    setObjectives(levelObjectives);
    setLevelProgress({});

    // Mostrar objetivos en consola
    onAddConsoleMessage(`🎯 Objetivos del Nivel ${currentLevel}:`);
    levelObjectives.forEach((obj, index) => {
      onAddConsoleMessage(`  ${index + 1}. ${obj.description}`);
    });
  }, [currentLevel, onAddConsoleMessage]);

  // Verificar progreso del nivel
  useEffect(() => {
    if (!world) return;

    const progress = checkLevelProgress(currentLevel, world);
    setLevelProgress(progress);

    // Verificar si el nivel está completo
    const isComplete = objectives.every((obj, index) => progress[index]);

    if (isComplete && objectives.length > 0) {
      onAddConsoleMessage(`🎉 ¡Nivel ${currentLevel} completado!`);
      onAddConsoleMessage('Presiona "Siguiente Nivel" para continuar...');
      onLevelComplete();
    }
  }, [world, currentLevel, objectives, onAddConsoleMessage, onLevelComplete]);

  return (
    <div className="bg-gray-700 p-3 rounded mb-4">
      <h4 className="font-semibold mb-2 text-ecs-blue">Progreso del Nivel</h4>
      <div className="space-y-2">
        {objectives.map((objective, index) => (
          <div key={index} className="flex items-center text-sm">
            <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center text-xs ${
              levelProgress[index] ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-400'
            }`}>
              {levelProgress[index] ? '✓' : index + 1}
            </div>
            <span className={levelProgress[index] ? 'text-green-300' : 'text-gray-300'}>
              {objective.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getLevelObjectives(level) {
  switch (level) {
    case 1:
      return [
        { description: 'Crear al menos 3 entidades', check: (world) => world.entities.size >= 3 },
        { description: 'Seleccionar una entidad y ver su información', check: (world, progress) => progress.hasSelectedEntity },
        { description: 'Eliminar una entidad', check: (world, progress) => progress.hasDeletedEntity }
      ];
    case 2:
      return [
        { description: 'Añadir componente Transform a una entidad', check: (world) => hasEntityWithComponent(world, 'Transform') },
        { description: 'Añadir componente Velocity a una entidad', check: (world) => hasEntityWithComponent(world, 'Velocity') },
        { description: 'Añadir componente Color a una entidad', check: (world) => hasEntityWithComponent(world, 'Color') }
      ];
    case 3:
      return [
        { description: 'Tener entidades con Transform y Velocity', check: (world) => hasEntityWithComponents(world, ['Transform', 'Velocity']) },
        { description: 'Observar movimiento automático', check: (world, progress) => progress.hasSeenMovement }
      ];
    case 4:
      return [
        { description: 'Crear múltiples entidades con diferentes combinaciones', check: (world) => world.entities.size >= 5 },
        { description: 'Ver estadísticas de queries en el panel de rendimiento', check: (world, progress) => progress.hasCheckedQueries }
      ];
    case 5:
      return [
        { description: 'Crear entidades con Health y Damage', check: (world) => hasEntityWithComponent(world, 'Health') && hasEntityWithComponent(world, 'Damage') },
        { description: 'Generar colisiones para ver eventos', check: (world, progress) => progress.hasSeenCollisions }
      ];
    default:
      return [];
  }
}

function checkLevelProgress(level, world) {
  const progress = {};
  const objectives = getLevelObjectives(level);

  objectives.forEach((objective, index) => {
    progress[index] = objective.check(world, progress);
  });

  return progress;
}

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
