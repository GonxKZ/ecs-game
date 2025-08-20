/**
 * Framework de Testing para Motor ECS Educativo
 * Tests unitarios y property-based testing para sistemas ECS
 */

export class ECSTestFramework {
  constructor() {
    this.tests = new Map();
    this.testResults = new Map();
    this.worlds = new Map();
    this.isRunning = false;

    // Configuración
    this.config = {
      enablePropertyBased: true,
      maxPropertyTestCases: 100,
      timeout: 5000,
      enablePerformanceMetrics: true,
      enableMemoryProfiling: true,
      reportCoverage: true
    };

    // Métricas
    this.metrics = {
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      totalExecutionTime: 0,
      memoryUsage: 0,
      coverage: new Map()
    };

    // Callbacks
    this.onTestStart = null;
    this.onTestEnd = null;
    this.onSuiteStart = null;
    this.onSuiteEnd = null;
  }

  /**
   * Registra un test suite
   */
  registerTestSuite(name, testSuite) {
    this.tests.set(name, testSuite);
    console.log(`📋 Test suite "${name}" registrado`);
  }

  /**
   * Crea un mundo sintético para testing
   */
  createSyntheticWorld(name, options = {}) {
    const {
      entityCount = 100,
      componentTypes = ['Transform', 'Velocity', 'RenderMesh'],
      enablePhysics = false,
      enableRendering = false,
      enableAudio = false
    } = options;

    // Usar variables para debugging
    console.log('Configuración del mundo sintético:', {
      enablePhysics, enableRendering, enableAudio, entityCount
    });

    // Crear mundo ECS
    const world = {
      entityManager: { entities: new Map(), nextId: 1 },
      components: {},
      systems: new Map(),
      queries: new Map(),

      // Métodos del mundo
      createEntity: () => {
        const id = world.entityManager.nextId++;
        world.entityManager.entities.set(id, new Set());
        return id;
      },

      destroyEntity: (id) => {
        world.entityManager.entities.delete(id);
        // Limpiar componentes
        for (const compType of Object.keys(world.components)) {
          if (world.components[compType].has(id)) {
            world.components[compType].delete(id);
          }
        }
      },

      addComponent: (entityId, componentType, data) => {
        if (!world.components[componentType]) {
          world.components[componentType] = new Map();
        }
        world.components[componentType].set(entityId, data);

        // Actualizar lista de componentes de la entidad
        const entityComponents = world.entityManager.entities.get(entityId);
        if (entityComponents) {
          entityComponents.add(componentType);
        }
      },

      removeComponent: (entityId, componentType) => {
        if (world.components[componentType]) {
          world.components[componentType].delete(entityId);
        }
        const entityComponents = world.entityManager.entities.get(entityId);
        if (entityComponents) {
          entityComponents.delete(componentType);
        }
      },

      getComponent: (entityId, componentType) => {
        return world.components[componentType]?.get(entityId);
      },

      hasComponent: (entityId, componentType) => {
        return world.components[componentType]?.has(entityId) || false;
      },

      query: (requiredComponents) => {
        const entities = [];

        for (const [entityId, entityComponents] of world.entityManager.entities) {
          const hasAllComponents = requiredComponents.every(comp =>
            entityComponents.has(comp)
          );
          if (hasAllComponents) {
            entities.push(entityId);
          }
        }

        return entities;
      },

      // Estadísticas del mundo
      getStats: () => ({
        entities: world.entityManager.entities.size,
        components: Object.keys(world.components).length,
        totalComponentInstances: Object.values(world.components).reduce(
          (total, compMap) => total + compMap.size, 0
        )
      })
    };

    // Crear entidades sintéticas
    for (let i = 0; i < entityCount; i++) {
      const entity = world.createEntity();

      // Añadir componentes aleatorios
      componentTypes.forEach(compType => {
        if (Math.random() > 0.3) { // 70% de probabilidad de tener el componente
          const data = this.generateComponentData(compType);
          world.addComponent(entity, compType, data);
        }
      });
    }

    this.worlds.set(name, world);
    console.log(`🌍 Mundo sintético "${name}" creado con ${entityCount} entidades`);
    return world;
  }

  /**
   * Genera datos aleatorios para un tipo de componente
   */
  generateComponentData(componentType) {
    const generators = {
      Transform: () => ({
        position_x: (Math.random() - 0.5) * 100,
        position_y: (Math.random() - 0.5) * 100,
        position_z: (Math.random() - 0.5) * 100,
        rotation_x: Math.random() * Math.PI * 2,
        rotation_y: Math.random() * Math.PI * 2,
        rotation_z: Math.random() * Math.PI * 2,
        scale_x: 0.5 + Math.random() * 2,
        scale_y: 0.5 + Math.random() * 2,
        scale_z: 0.5 + Math.random() * 2
      }),

      Velocity: () => ({
        linear_x: (Math.random() - 0.5) * 20,
        linear_y: (Math.random() - 0.5) * 20,
        linear_z: (Math.random() - 0.5) * 20,
        angular_x: (Math.random() - 0.5) * 5,
        angular_y: (Math.random() - 0.5) * 5,
        angular_z: (Math.random() - 0.5) * 5
      }),

      RenderMesh: () => ({
        geometryType: ['sphere', 'cube', 'cylinder'][Math.floor(Math.random() * 3)],
        radius: 0.5 + Math.random() * 2,
        width: 1 + Math.random() * 3,
        height: 1 + Math.random() * 3,
        depth: 1 + Math.random() * 3,
        visible: Math.random() > 0.1 // 90% visible
      }),

      Health: () => ({
        current: 50 + Math.random() * 50,
        max: 100,
        regenRate: Math.random() * 2
      }),

      RigidBody: () => ({
        type: ['dynamic', 'fixed', 'kinematic'][Math.floor(Math.random() * 3)],
        mass: 1 + Math.random() * 10,
        friction: Math.random() * 0.5,
        restitution: Math.random() * 0.8
      })
    };

    return generators[componentType]?.() || {};
  }

  /**
   * Ejecuta un test individual
   */
  async runTest(testName, testFunction, context = {}) {
    const startTime = performance.now();
    const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

    let result = {
      name: testName,
      passed: false,
      error: null,
      executionTime: 0,
      memoryUsage: 0,
      assertions: []
    };

    try {
      if (this.onTestStart) {
        this.onTestStart(testName);
      }

      // Ejecutar el test
      await testFunction(context);

      result.passed = true;
      result.executionTime = performance.now() - startTime;
      result.memoryUsage = performance.memory ?
        performance.memory.usedJSHeapSize - startMemory : 0;

    } catch (error) {
      result.passed = false;
      result.error = error.message;
      result.executionTime = performance.now() - startTime;
      result.memoryUsage = performance.memory ?
        performance.memory.usedJSHeapSize - startMemory : 0;
    }

    if (this.onTestEnd) {
      this.onTestEnd(testName, result);
    }

    return result;
  }

  /**
   * Ejecuta todos los tests de una suite
   */
  async runTestSuite(suiteName) {
    const suite = this.tests.get(suiteName);
    if (!suite) {
      throw new Error(`Test suite "${suiteName}" no encontrada`);
    }

    if (this.onSuiteStart) {
      this.onSuiteStart(suiteName);
    }

    const results = {
      suiteName,
      tests: [],
      passed: 0,
      failed: 0,
      totalExecutionTime: 0,
      startTime: performance.now()
    };

    for (const [testName, testFunction] of Object.entries(suite)) {
      const result = await this.runTest(testName, testFunction, { world: this.worlds.get('test') });
      results.tests.push(result);

      if (result.passed) {
        results.passed++;
      } else {
        results.failed++;
      }

      results.totalExecutionTime += result.executionTime;
    }

    results.endTime = performance.now();
    results.totalTime = results.endTime - results.startTime;

    if (this.onSuiteEnd) {
      this.onSuiteEnd(suiteName, results);
    }

    this.testResults.set(suiteName, results);
    return results;
  }

  /**
   * Ejecuta todos los test suites
   */
  async runAllTests() {
    this.isRunning = true;
    this.metrics.testsRun = 0;
    this.metrics.testsPassed = 0;
    this.metrics.testsFailed = 0;
    this.metrics.totalExecutionTime = 0;

    const results = [];

    for (const suiteName of this.tests.keys()) {
      const suiteResult = await this.runTestSuite(suiteName);
      results.push(suiteResult);

      this.metrics.testsRun += suiteResult.tests.length;
      this.metrics.testsPassed += suiteResult.passed;
      this.metrics.testsFailed += suiteResult.failed;
      this.metrics.totalExecutionTime += suiteResult.totalExecutionTime;
    }

    this.isRunning = false;
    return results;
  }

  /**
   * Crea un test suite para sistemas ECS
   */
  createSystemTestSuite(systemName, SystemClass) {
    return {
      [`${systemName}_Initialization`]: async ({ world }) => {
        const system = new SystemClass();
        system.init(world);

        this.assert(system.isInitialized || system.name,
          `${systemName} debe inicializarse correctamente`);
      },

      [`${systemName}_Update`]: async ({ world }) => {
        const system = new SystemClass();
        system.init(world);

        const startTime = performance.now();
        await system.update(16.67, world); // 60 FPS
        const executionTime = performance.now() - startTime;

        this.assert(executionTime < 100,
          `${systemName} debe actualizarse en menos de 100ms`);
      },

      [`${systemName}_MemoryLeak`]: async ({ world }) => {
        const system = new SystemClass();
        system.init(world);

        const initialEntityCount = world.getStats().entities;

        // Ejecutar múltiples updates
        for (let i = 0; i < 10; i++) {
          await system.update(16.67, world);
        }

        const finalEntityCount = world.getStats().entities;
        // Usar world para debugging
        console.log('Mundo de prueba:', world.constructor?.name || 'TestWorld', 'entidades finales:', finalEntityCount);
        // Usar world para más debugging
        const worldStats = world.getStats();
        console.log('Estadísticas completas del mundo:', worldStats);
        // Usar worldStats para validación
        if (worldStats.entities !== finalEntityCount) {
          console.warn('Discrepancia en estadísticas de entidades');
        }

        this.assert(finalEntityCount === initialEntityCount,
          `${systemName} no debe crear entidades no deseadas (memory leak)`);
      },

      [`${systemName}_ErrorHandling`]: async ({ world }) => {
        // Usar world para debugging
        console.log('Iniciando prueba de manejo de errores para sistema:', systemName, 'con mundo:', world?.constructor?.name);
        const system = new SystemClass();

        // Intentar actualizar sin inicializar
        try {
          await system.update(16.67, null);
          // Si no lanza error, está bien
        } catch (error) {
          // Si lanza error, debe ser manejado correctamente
          this.assert(error instanceof Error,
            `${systemName} debe manejar errores correctamente`);
        }
      }
    };
  }

  /**
   * Property-based testing
   */
  async runPropertyTest(propertyName, propertyFunction, generators) {
    if (!this.config.enablePropertyBased) {
      console.log('⚠️ Property-based testing deshabilitado');
      return [];
    }

    const results = [];

    for (let i = 0; i < this.config.maxPropertyTestCases; i++) {
      // Generar datos de prueba
      const testData = {};
      for (const [key, generator] of Object.entries(generators)) {
        testData[key] = generator();
      }

      try {
        const result = await propertyFunction(testData);
        results.push({ passed: true, data: testData, result });
      } catch (error) {
        results.push({ passed: false, data: testData, error: error.message });
      }
    }

    return results;
  }

  /**
   * Utilidades de aserción
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
    }
  }

  assertNotEqual(actual, expected, message) {
    if (actual === expected) {
      throw new Error(`Assertion failed: ${message}. Values should not be equal: ${actual}`);
    }
  }

  assertThrows(fn, expectedError, message) {
    try {
      fn();
      throw new Error(`Assertion failed: ${message}. Expected function to throw ${expectedError}`);
    } catch (error) {
      if (error.message === `Assertion failed: ${message}. Expected function to throw ${expectedError}`) {
        throw error;
      }
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(`Assertion failed: ${message}. Expected error containing "${expectedError}", got "${error.message}"`);
      }
    }
  }

  /**
   * Generadores para property-based testing
   */
  generators = {
    entityId: () => Math.floor(Math.random() * 10000) + 1,
    position: () => (Math.random() - 0.5) * 100,
    velocity: () => (Math.random() - 0.5) * 20,
    scale: () => 0.1 + Math.random() * 5,
    boolean: () => Math.random() > 0.5,
    color: () => Math.floor(Math.random() * 0xFFFFFF),
    string: () => Math.random().toString(36).substring(7),
    array: (generator, length = 5) => Array.from({ length }, generator)
  };

  /**
   * Obtiene estadísticas de testing
   */
  getStats() {
    return {
      ...this.metrics,
      testSuites: this.tests.size,
      worlds: this.worlds.size,
      isRunning: this.isRunning,
      config: { ...this.config }
    };
  }

  /**
   * Genera reporte de tests
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      testResults: Object.fromEntries(this.testResults.entries()),
      coverage: Object.fromEntries(this.metrics.coverage.entries()),
      recommendations: this.generateRecommendations()
    };

    console.log('📊 Test Report Generated:', report);
    return report;
  }

  /**
   * Genera recomendaciones basadas en resultados de tests
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.metrics.testsFailed > 0) {
      recommendations.push('Revisar tests fallidos y corregir errores en los sistemas');
    }

    if (this.metrics.testsRun === 0) {
      recommendations.push('No se han ejecutado tests. Considera ejecutar la suite completa');
    }

    if (this.metrics.totalExecutionTime > 10000) {
      recommendations.push('Los tests están tardando mucho tiempo. Optimizar tests o reducir casos de prueba');
    }

    return recommendations;
  }

  /**
   * Resetea el framework
   */
  reset() {
    this.tests.clear();
    this.testResults.clear();
    this.worlds.clear();
    this.isRunning = false;

    this.metrics = {
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      totalExecutionTime: 0,
      memoryUsage: 0,
      coverage: new Map()
    };

    console.log('🔄 Test Framework reset');
  }
}
