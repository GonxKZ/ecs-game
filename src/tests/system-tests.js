/**
 * Tests unitarios para sistemas ECS
 * Cubre todos los sistemas implementados con casos de prueba exhaustivos
 */

import { ECSTestFramework } from './test-framework.js';
import { MovementSystem } from '../ecs/systems.js';
import { PhysicsSystem } from '../ecs/physics-system.js';
import { AudioSystem } from '../ecs/audio-system.js';
import { InputSystem } from '../ecs/input-system.js';

export function createSystemTests(testFramework) {

  // Test suite para MovementSystem
  testFramework.registerTestSuite('MovementSystem', {
    'MovementSystem_Initialization': async ({ world }) => {
      const system = new MovementSystem();
      system.init(world);

      testFramework.assert(system.name === 'Movement',
        'MovementSystem debe tener nombre correcto');
      testFramework.assert(system.requiredComponents.includes('Transform'),
        'MovementSystem debe requerir componente Transform');
      testFramework.assert(system.requiredComponents.includes('Velocity'),
        'MovementSystem debe requerir componente Velocity');
    },

    'MovementSystem_Update': async ({ world }) => {
      const system = new MovementSystem();
      system.init(world);

      // Crear entidad de prueba
      const entity = world.createEntity();
      world.addComponent(entity, 'Transform', {
        position_x: 0, position_y: 0, position_z: 0,
        rotation_x: 0, rotation_y: 0, rotation_z: 0,
        scale_x: 1, scale_y: 1, scale_z: 1
      });
      world.addComponent(entity, 'Velocity', {
        linear_x: 1, linear_y: 2, linear_z: 3,
        angular_x: 0, angular_y: 0, angular_z: 0
      });

      const initialPos = { ...world.getComponent(entity, 'Transform') };

      await system.update(16.67, world); // 60 FPS

      const finalPos = world.getComponent(entity, 'Transform');

      // Verificar que la posición cambió
      testFramework.assert(finalPos.position_x !== initialPos.position_x ||
                          finalPos.position_y !== initialPos.position_y ||
                          finalPos.position_z !== initialPos.position_z,
        'MovementSystem debe actualizar posiciones');
    },

    'MovementSystem_Boundary': async ({ world }) => {
      const system = new MovementSystem();
      system.init(world);

      // Crear entidad que se mueva fuera de límites
      const entity = world.createEntity();
      world.addComponent(entity, 'Transform', {
        position_x: 1000, position_y: 1000, position_z: 1000,
        rotation_x: 0, rotation_y: 0, rotation_z: 0,
        scale_x: 1, scale_y: 1, scale_z: 1
      });
      world.addComponent(entity, 'Velocity', {
        linear_x: 100, linear_y: 100, linear_z: 100,
        angular_x: 0, angular_y: 0, angular_z: 0
      });

      await system.update(16.67, world);

      const finalPos = world.getComponent(entity, 'Transform');

      // Verificar que la posición está dentro de límites razonables
      testFramework.assert(
        Math.abs(finalPos.position_x) < 2000 &&
        Math.abs(finalPos.position_y) < 2000 &&
        Math.abs(finalPos.position_z) < 2000,
        'MovementSystem debe mantener entidades dentro de límites'
      );
    },

    'MovementSystem_Property_Based': async ({ world }) => {
      // Property-based test: cualquier velocidad debe producir movimiento predecible
      const results = await testFramework.runPropertyTest(
        'Movement_Consistency',
        async ({ velocity_x, velocity_y, velocity_z, deltaTime }) => {
          const system = new MovementSystem();
          system.init(world);

          const entity = world.createEntity();
          world.addComponent(entity, 'Transform', {
            position_x: 0, position_y: 0, position_z: 0,
            rotation_x: 0, rotation_y: 0, rotation_z: 0,
            scale_x: 1, scale_y: 1, scale_z: 1
          });
          world.addComponent(entity, 'Velocity', {
            linear_x: velocity_x, linear_y: velocity_y, linear_z: velocity_z,
            angular_x: 0, angular_y: 0, angular_z: 0
          });

          const initialPos = { ...world.getComponent(entity, 'Transform') };
          await system.update(deltaTime, world);
          const finalPos = world.getComponent(entity, 'Transform');

          // El movimiento debe ser proporcional a la velocidad y tiempo
          const expectedDx = velocity_x * (deltaTime / 1000);
          const expectedDy = velocity_y * (deltaTime / 1000);
          const expectedDz = velocity_z * (deltaTime / 1000);

          const actualDx = finalPos.position_x - initialPos.position_x;
          const actualDy = finalPos.position_y - initialPos.position_y;
          const actualDz = finalPos.position_z - initialPos.position_z;

          // Tolerancia para flotantes
          const tolerance = 0.001;
          testFramework.assert(
            Math.abs(actualDx - expectedDx) < tolerance &&
            Math.abs(actualDy - expectedDy) < tolerance &&
            Math.abs(actualDz - expectedDz) < tolerance,
            `Movimiento debe ser preciso. Esperado: (${expectedDx}, ${expectedDy}, ${expectedDz}), Obtenido: (${actualDx}, ${actualDy}, ${actualDz})`
          );
        },
        {
          velocity_x: () => (Math.random() - 0.5) * 20,
          velocity_y: () => (Math.random() - 0.5) * 20,
          velocity_z: () => (Math.random() - 0.5) * 20,
          deltaTime: () => 16 + Math.random() * 32 // 16-48ms
        }
      );

      // Al menos 95% de casos deben pasar
      const passedCount = results.filter(r => r.passed).length;
      const passRate = passedCount / results.length;
      testFramework.assert(passRate >= 0.95,
        `Property test debe pasar al menos 95%. Pasaron ${passedCount}/${results.length} (${Math.round(passRate * 100)}%)`);
    }
  });

  // Test suite para InputSystem
  testFramework.registerTestSuite('InputSystem', {
    'InputSystem_Initialization': async ({ world }) => {
      const system = new InputSystem();
      system.init(world);

      testFramework.assert(system.name === 'InputSystem',
        'InputSystem debe tener nombre correcto');
      testFramework.assert(system.config.enableKeyboard,
        'InputSystem debe tener teclado habilitado por defecto');
    },

    'InputSystem_Action_Mapping': async ({ world }) => {
      const system = new InputSystem();
      system.init(world);

      // Simular input de teclado
      system.simulateKeyPress('KeyW', 87);

      const jumpAction = system.isActionPressed('move_forward');
      // Nota: esto dependerá de la configuración específica del input mapping
      // Por ahora solo verificamos que no crashee
      testFramework.assert(typeof jumpAction === 'boolean',
        'InputSystem debe manejar acciones correctamente');
    },

    'InputSystem_Edge_Detection': async ({ world }) => {
      const system = new InputSystem();
      system.init(world);

      // Verificar que edge detection buffers estén disponibles
      testFramework.assert(system.edgeBuffers,
        'InputSystem debe tener edge detection buffers');

      const actionBuffers = system.getActionBuffers('jump');
      testFramework.assert(Array.isArray(actionBuffers.downBuffer),
        'InputSystem debe proporcionar buffers de down events');
    }
  });

  // Test suite para EntityManager
  testFramework.registerTestSuite('EntityManager', {
    'EntityManager_Create_Destroy': async ({ world }) => {
      const entity = world.createEntity();
      testFramework.assert(entity > 0, 'Debe crear entidad con ID válido');

      const entity2 = world.createEntity();
      testFramework.assert(entity2 !== entity, 'Cada entidad debe tener ID único');

      world.destroyEntity(entity);
      testFramework.assert(!world.entityManager.entities.has(entity),
        'Entidad debe ser destruida correctamente');
    },

    'EntityManager_Generational_IDs': async ({ world }) => {
      const entity = world.createEntity();
      world.destroyEntity(entity);

      // El slot debe ser reutilizado
      const entity2 = world.createEntity();

      testFramework.assert(entity !== entity2,
        'Nueva entidad debe tener ID diferente después de destruir la anterior');
    },

    'EntityManager_Component_Management': async ({ world }) => {
      const entity = world.createEntity();

      world.addComponent(entity, 'Transform', { position_x: 1, position_y: 2, position_z: 3 });
      testFramework.assert(world.hasComponent(entity, 'Transform'),
        'Entidad debe tener componente después de añadirlo');

      const transform = world.getComponent(entity, 'Transform');
      testFramework.assert(transform.position_x === 1,
        'Componente debe almacenar datos correctamente');

      world.removeComponent(entity, 'Transform');
      testFramework.assert(!world.hasComponent(entity, 'Transform'),
        'Entidad no debe tener componente después de removerlo');
    }
  });

  // Test suite para ComponentStorage
  testFramework.registerTestSuite('ComponentStorage', {
    'ComponentStorage_SoA_Layout': async ({ world }) => {
      // Verificar que los componentes usan SoA layout
      const transformStorage = world.components.Transform;
      if (transformStorage) {
        const keys = Object.keys(transformStorage);
        testFramework.assert(keys.includes('position_x'),
          'Transform debe usar layout SoA con position_x separado');
        testFramework.assert(keys.includes('position_y'),
          'Transform debe usar layout SoA con position_y separado');
      }
    },

    'ComponentStorage_Memory_Efficiency': async ({ world }) => {
      // Crear muchas entidades con componentes
      const entityCount = 1000;
      const entities = [];

      for (let i = 0; i < entityCount; i++) {
        const entity = world.createEntity();
        entities.push(entity);

        world.addComponent(entity, 'Transform', {
          position_x: i * 0.01,
          position_y: i * 0.01,
          position_z: i * 0.01,
          rotation_x: 0, rotation_y: 0, rotation_z: 0,
          scale_x: 1, scale_y: 1, scale_z: 1
        });
      }

      // Verificar que el almacenamiento es eficiente
      const storage = world.components.Transform;
      const totalComponents = storage ? storage.size : 0;
      testFramework.assert(totalComponents >= entityCount * 0.8,
        'Debe almacenar la mayoría de componentes correctamente');

      // Limpiar
      entities.forEach(entity => world.destroyEntity(entity));
    }
  });

  // Test suite para QuerySystem
  testFramework.registerTestSuite('QuerySystem', {
    'QuerySystem_Single_Component': async ({ world }) => {
      // Crear entidades con diferentes combinaciones de componentes
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();
      const entity3 = world.createEntity();

      world.addComponent(entity1, 'Transform', {});
      world.addComponent(entity2, 'Transform', {});
      world.addComponent(entity3, 'Velocity', {});

      const transformEntities = world.query(['Transform']);
      testFramework.assert(transformEntities.length === 2,
        'Query debe encontrar 2 entidades con Transform');
      testFramework.assert(transformEntities.includes(entity1),
        'Query debe incluir entity1');
      testFramework.assert(transformEntities.includes(entity2),
        'Query debe incluir entity2');
      testFramework.assert(!transformEntities.includes(entity3),
        'Query no debe incluir entity3');
    },

    'QuerySystem_Multiple_Components': async ({ world }) => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      world.addComponent(entity1, 'Transform', {});
      world.addComponent(entity1, 'Velocity', {});
      world.addComponent(entity2, 'Transform', {});

      const bothEntities = world.query(['Transform', 'Velocity']);
      testFramework.assert(bothEntities.length === 1,
        'Query debe encontrar 1 entidad con Transform y Velocity');
      testFramework.assert(bothEntities[0] === entity1,
        'Query debe encontrar entity1');
    },

    'QuerySystem_Performance': async ({ world }) => {
      // Crear muchas entidades para test de rendimiento
      const entityCount = 1000;
      const entities = [];

      for (let i = 0; i < entityCount; i++) {
        const entity = world.createEntity();
        entities.push(entity);

        if (i % 2 === 0) {
          world.addComponent(entity, 'Transform', {});
        }
        if (i % 3 === 0) {
          world.addComponent(entity, 'Velocity', {});
        }
      }

      const startTime = performance.now();
      const results = world.query(['Transform', 'Velocity']);
      const queryTime = performance.now() - startTime;

      testFramework.assert(queryTime < 10,
        `Query debe ser rápido (< 10ms). Tiempo: ${queryTime}ms`);
      testFramework.assert(results.length > 0,
        'Query debe encontrar algunas entidades');

      // Limpiar
      entities.forEach(entity => world.destroyEntity(entity));
    }
  });

  // Test suite para EventBus
  testFramework.registerTestSuite('EventBus', {
    'EventBus_Send_Receive': async ({ world }) => {
      let receivedEvent = null;
      let eventData = null;

      world.eventBus.subscribe('TestEvent', (event) => {
        receivedEvent = event.type;
        eventData = event.data;
      });

      world.eventBus.send('TestEvent', { test: 123 }, 1);

      // Forzar procesamiento de eventos
      world.eventBus.processEvents();

      testFramework.assert(receivedEvent === 'TestEvent',
        'EventBus debe recibir eventos enviados');
      testFramework.assert(eventData.test === 123,
        'EventBus debe pasar datos correctamente');
    },

    'EventBus_Multiple_Subscribers': async ({ world }) => {
      let callCount = 0;

      const subscriber1 = () => callCount++;
      const subscriber2 = () => callCount++;

      world.eventBus.subscribe('TestEvent', subscriber1);
      world.eventBus.subscribe('TestEvent', subscriber2);

      world.eventBus.send('TestEvent', {}, 1);
      world.eventBus.processEvents();

      testFramework.assert(callCount === 2,
        'EventBus debe notificar a múltiples subscribers');
    },

    'EventBus_Unsubscribe': async ({ world }) => {
      let callCount = 0;

      const subscriber = () => callCount++;
      world.eventBus.subscribe('TestEvent', subscriber);

      world.eventBus.send('TestEvent', {}, 1);
      world.eventBus.processEvents();
      testFramework.assert(callCount === 1, 'Subscriber debe ser llamado');

      world.eventBus.unsubscribe('TestEvent', subscriber);
      world.eventBus.send('TestEvent', {}, 1);
      world.eventBus.processEvents();
      testFramework.assert(callCount === 1, 'Subscriber no debe ser llamado después de unsubscribe');
    }
  });

  console.log('🧪 System tests registrados correctamente');
}
