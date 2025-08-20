/**
 * Hook personalizado para integrar el ECS con React
 * Maneja el bucle principal, actualización de sistemas y sincronización con React Three Fiber
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { ECSWorld } from '../ecs/world.js';
import { ComponentDefinitions } from '../ecs/components.js';
import { MovementSystem, InputSystem, CollisionSystem, DamageSystem, AISystem, EventSystem, ParticleSystem, PhysicsSystem, AudioSystem, HierarchySystem } from '../ecs/systems.js';
import { ResourceManager } from '../ecs/resources.js';

export function useECS() {
  const worldRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(0);
  const [stats, setStats] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  // Inicializar mundo ECS
  useEffect(() => {
    worldRef.current = new ECSWorld();

    // Registrar componentes básicos
    Object.keys(ComponentDefinitions).forEach(componentType => {
      worldRef.current.registerComponent(componentType, ComponentDefinitions[componentType]);
    });

    // Inicializar optimizador de queries
    worldRef.current.initializeQueryOptimizer();

    // Inicializar gestor de persistencia
    worldRef.current.initializePersistenceManager();

    // Inicializar gestor de recursos
    worldRef.current.resourceManager = new ResourceManager();

    // Registrar sistemas
    worldRef.current.registerSystem('movement', new MovementSystem());
    worldRef.current.registerSystem('input', new InputSystem());
    worldRef.current.registerSystem('collision', new CollisionSystem());
    worldRef.current.registerSystem('damage', new DamageSystem());
    worldRef.current.registerSystem('ai', new AISystem());
    worldRef.current.registerSystem('event', new EventSystem());
    worldRef.current.registerSystem('particle', new ParticleSystem());
    worldRef.current.registerSystem('physics', new PhysicsSystem());
    worldRef.current.registerSystem('audio', new AudioSystem());
    worldRef.current.registerSystem('hierarchy', new HierarchySystem());

    console.log('🎮 ECS inicializado con sistemas básicos y optimizador');

    return () => {
      if (worldRef.current) {
        worldRef.current.stop();
      }
    };
  }, []);

  // Bucle principal de animación
  const gameLoop = useCallback((currentTime) => {
    if (!worldRef.current || !worldRef.current.isRunning) return;

    // Calcular delta time
    const deltaTime = lastTimeRef.current ? (currentTime - lastTimeRef.current) / 1000 : 1/60;
    lastTimeRef.current = currentTime;

    // Actualizar mundo ECS
    worldRef.current.update(deltaTime);

    // Actualizar estadísticas para UI
    setStats(worldRef.current.getStats());

    // Continuar bucle
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // Iniciar ECS
  const start = useCallback(() => {
    if (worldRef.current && !worldRef.current.isRunning) {
      worldRef.current.start();
      setIsRunning(true);
      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      console.log('▶️ Bucle ECS iniciado');
    }
  }, [gameLoop]);

  // Detener ECS
  const stop = useCallback(() => {
    if (worldRef.current) {
      worldRef.current.stop();
      setIsRunning(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      console.log('⏸️ Bucle ECS detenido');
    }
  }, []);

  // Crear entidad de prueba
  const createTestEntity = useCallback((type = 'sphere') => {
    if (!worldRef.current) return null;

    const entityId = worldRef.current.createEntity(`Test${type}`);

    // Componentes básicos
    worldRef.current.addComponent(entityId, 'Transform', {
      position: {
        x: (Math.random() - 0.5) * 10,
        y: Math.random() * 5,
        z: (Math.random() - 0.5) * 10
      }
    });

    worldRef.current.addComponent(entityId, 'Velocity', {
      linear: { x: 0, y: 0, z: 0 }
    });

    worldRef.current.addComponent(entityId, 'Color', {
      r: Math.random(),
      g: Math.random(),
      b: Math.random(),
      a: 1
    });

    // Componentes específicos por tipo
    switch (type) {
      case 'player':
        worldRef.current.addComponent(entityId, 'Input', {
          speed: 8
        });
        worldRef.current.addComponent(entityId, 'Health', {
          current: 100,
          maximum: 100,
          regeneration: 5
        });
        break;

      case 'enemy':
        worldRef.current.addComponent(entityId, 'AI', {
          behavior: 'patrol',
          moveSpeed: 3,
          detectionRadius: 10
        });
        worldRef.current.addComponent(entityId, 'Health', {
          current: 50,
          maximum: 50
        });
        worldRef.current.addComponent(entityId, 'Damage', {
          value: 15,
          type: 'physical'
        });
        break;

      case 'projectile':
        worldRef.current.addComponent(entityId, 'Damage', {
          value: 25,
          type: 'energy'
        });
        worldRef.current.addComponent(entityId, 'Velocity', {
          linear: { x: 0, y: 0, z: -15 }
        });
        break;

      case 'particle_emitter':
        worldRef.current.addComponent(entityId, 'ParticleEmitter', {
          rate: 20,
          lifetime: 3.0,
          speed: 8.0,
          size: 0.2,
          color: { r: 0, g: 1, b: 1, a: 1 },
          shape: 'sphere'
        });
        break;

      case 'physics_object':
        worldRef.current.addComponent(entityId, 'Physics', {
          mass: 2.0,
          friction: 0.3,
          restitution: 0.8
        });
        break;
    }

    // Componente de renderizado
    worldRef.current.addComponent(entityId, 'RenderMesh', {
      geometry: type === 'player' ? 'sphere' : type === 'enemy' ? 'cube' : 'sphere',
      radius: type === 'player' ? 0.8 : 0.5
    });

    // Colisionador
    worldRef.current.addComponent(entityId, 'Collider', {
      shape: 'sphere',
      radius: type === 'player' ? 0.8 : 0.5
    });

    return entityId;
  }, []);

  // Obtener entidades para renderizado
  const getRenderableEntities = useCallback(() => {
    if (!worldRef.current) return [];

    const entities = [];
    for (const [entityId, componentTypes] of worldRef.current.entities) {
      if (componentTypes.has('Transform') && componentTypes.has('RenderMesh')) {
        const transform = worldRef.current.getComponent(entityId, 'Transform');
        const renderMesh = worldRef.current.getComponent(entityId, 'RenderMesh');
        const color = worldRef.current.getComponent(entityId, 'Color');
        const health = worldRef.current.getComponent(entityId, 'Health');

        entities.push({
          id: entityId,
          transform,
          renderMesh,
          color,
          health,
          particleSystem: componentTypes.has('ParticleEmitter') ?
            worldRef.current.systems.get('particle') : null
        });
      }
    }

    return entities;
  }, []);

  // Sistema de entrada de teclado
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!worldRef.current) return;

      const inputSystem = worldRef.current.systems.get('input');
      if (inputSystem) {
        switch (event.code) {
          case 'KeyW':
          case 'ArrowUp':
            inputSystem.setKeyState('forward', true);
            break;
          case 'KeyS':
          case 'ArrowDown':
            inputSystem.setKeyState('backward', true);
            break;
          case 'KeyA':
          case 'ArrowLeft':
            inputSystem.setKeyState('left', true);
            break;
          case 'KeyD':
          case 'ArrowRight':
            inputSystem.setKeyState('right', true);
            break;
          case 'Space':
            inputSystem.setKeyState('jump', true);
            break;
        }
      }
    };

    const handleKeyUp = (event) => {
      if (!worldRef.current) return;

      const inputSystem = worldRef.current.systems.get('input');
      if (inputSystem) {
        switch (event.code) {
          case 'KeyW':
          case 'ArrowUp':
            inputSystem.setKeyState('forward', false);
            break;
          case 'KeyS':
          case 'ArrowDown':
            inputSystem.setKeyState('backward', false);
            break;
          case 'KeyA':
          case 'ArrowLeft':
            inputSystem.setKeyState('left', false);
            break;
          case 'KeyD':
          case 'ArrowRight':
            inputSystem.setKeyState('right', false);
            break;
          case 'Space':
            inputSystem.setKeyState('jump', false);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // API pública del hook
  return {
    world: worldRef.current,
    stats,
    isRunning,
    start,
    stop,
    createTestEntity,
    getRenderableEntities,
    resourceManager: worldRef.current?.resourceManager
  };
}
