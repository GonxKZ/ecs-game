/**
 * Benchmarks automáticos para Motor ECS
 * Mide rendimiento de queries, sistemas y operaciones críticas con percentiles
 */

export class AutomatedBenchmarks {
  constructor() {
    this.isRunning = false;
    this.results = new Map();
    this.config = {
      sampleSize: 1000,          // Número de muestras por benchmark
      percentile95: 95,          // Percentil 95 para métricas críticas
      percentile99: 99,          // Percentil 99 para outliers
      warmupIterations: 10,      // Iteraciones de calentamiento
      targetFrameTime: 16.67,    // Tiempo objetivo por frame (60 FPS)
      memoryThreshold: 10 * 1024 * 1024, // 10MB threshold
      enableMemoryProfiling: true,
      enableCPUProfiling: true
    };

    // Métricas de rendimiento
    this.metrics = {
      frameTime: [],
      memoryUsage: [],
      queryTime: new Map(),
      systemTime: new Map(),
      cacheMisses: 0,
      allocations: 0
    };

    // Thresholds para alerts
    this.thresholds = {
      frameTime: { warn: 16.67, critical: 33.34 }, // 60 FPS, 30 FPS
      queryTime: { warn: 0.5, critical: 1.0 },     // ms
      memoryDelta: { warn: 1024 * 1024, critical: 5 * 1024 * 1024 } // 1MB, 5MB
    };
  }

  /**
   * Ejecuta todos los benchmarks
   */
  async runAllBenchmarks(world) {
    this.isRunning = true;
    this.results.clear();

    console.log('🏃 Iniciando benchmarks automáticos...');

    try {
      // Benchmarks de queries
      await this.benchmarkQueries(world);

      // Benchmarks de sistemas
      await this.benchmarkSystems(world);

      // Benchmarks de memoria
      await this.benchmarkMemory(world);

      // Benchmarks de concurrencia
      await this.benchmarkConcurrency(world);

      // Análisis de resultados
      this.analyzeResults();

      console.log('✅ Benchmarks completados');
      return this.generateReport();

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Benchmark de queries ECS
   */
  async benchmarkQueries(world) {
    console.log('🔍 Benchmarking Queries...');

    const queryTypes = [
      { name: 'SingleComponent', components: ['Transform'], setup: () => this.createEntitiesWithComponents(world, 1000, ['Transform']) },
      { name: 'DoubleComponent', components: ['Transform', 'Velocity'], setup: () => this.createEntitiesWithComponents(world, 1000, ['Transform', 'Velocity']) },
      { name: 'TripleComponent', components: ['Transform', 'Velocity', 'RenderMesh'], setup: () => this.createEntitiesWithComponents(world, 1000, ['Transform', 'Velocity', 'RenderMesh']) },
      { name: 'ComplexQuery', components: ['Transform', 'Velocity', 'Health', 'RigidBody'], setup: () => this.createEntitiesWithComponents(world, 500, ['Transform', 'Velocity', 'Health', 'RigidBody']) }
    ];

    for (const queryType of queryTypes) {
      const result = await this.runQueryBenchmark(world, queryType);
      this.results.set(`Query_${queryType.name}`, result);
    }
  }

  /**
   * Ejecuta benchmark específico de query
   */
  async runQueryBenchmark(world, queryType) {
    const { name, components, setup } = queryType;

    // Setup
    setup();
    await this.warmup();

    const times = [];

    for (let i = 0; i < this.config.sampleSize; i++) {
      const startTime = performance.now();
      const results = world.query(components);
      // Usar results para debugging
      console.log('Resultados de query:', Array.from(results));
      const endTime = performance.now();

      times.push(endTime - startTime);

      // Forzar garbage collection en algunos samples
      if (i % 100 === 0) {
        await this.forceGC();
      }
    }

    const stats = this.calculateStats(times);

    return {
      name,
      components,
      sampleCount: times.length,
      stats,
      passed: stats.p95 <= this.thresholds.queryTime.critical,
      recommendations: this.generateQueryRecommendations(stats, components.length)
    };
  }

  /**
   * Benchmark de sistemas ECS
   */
  async benchmarkSystems(world) {
    console.log('⚙️ Benchmarking Systems...');

    const systems = [
      { name: 'MovementSystem', components: ['Transform', 'Velocity'] },
      { name: 'PhysicsSystem', components: ['Transform', 'RigidBody'] },
      { name: 'RenderSystem', components: ['Transform', 'RenderMesh'] },
      { name: 'AudioSystem', components: ['Transform', 'AudioSource'] }
    ];

    for (const systemInfo of systems) {
      const result = await this.runSystemBenchmark(world, systemInfo);
      this.results.set(`System_${systemInfo.name}`, result);
    }
  }

  /**
   * Ejecuta benchmark específico de sistema
   */
  async runSystemBenchmark(world, systemInfo) {
    const { name, components } = systemInfo;

    // Crear sistema y entidades de prueba
    const system = this.createSystemInstance(name);
    if (!system) {
      return { name, error: 'System not available', passed: false };
    }

    system.init(world);
    this.createEntitiesWithComponents(world, 500, components);

    await this.warmup();

    const times = [];
    const memoryStart = performance.memory ? performance.memory.usedJSHeapSize : 0;

    for (let i = 0; i < this.config.sampleSize; i++) {
      const startTime = performance.now();
      await system.update(16.67, world); // 60 FPS
      const endTime = performance.now();

      times.push(endTime - startTime);
    }

    const memoryEnd = performance.memory ? performance.memory.usedJSHeapSize : 0;
    const memoryDelta = memoryEnd - memoryStart;

    const stats = this.calculateStats(times);

    return {
      name,
      sampleCount: times.length,
      stats,
      memoryDelta,
      passed: stats.p95 <= this.thresholds.frameTime.warn,
      recommendations: this.generateSystemRecommendations(stats, memoryDelta)
    };
  }

  /**
   * Benchmark de uso de memoria
   */
  async benchmarkMemory(world) {
    console.log('🧠 Benchmarking Memory Usage...');

    const memorySnapshots = [];

    // Crear entidades progresivamente
    for (let entityCount = 100; entityCount <= 2000; entityCount += 100) {
      // Limpiar entidades anteriores
      this.clearAllEntities(world);

      // Crear nuevas entidades
      this.createEntitiesWithComponents(world, entityCount, ['Transform', 'Velocity', 'RenderMesh']);

      // Forzar GC y medir
      await this.forceGC();

      const memory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      memorySnapshots.push({
        entityCount,
        memoryUsage: memory / 1024 / 1024, // MB
        timestamp: performance.now()
      });

      // Pequeña pausa para estabilizar
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    this.results.set('Memory_Scaling', {
      snapshots: memorySnapshots,
      analysis: this.analyzeMemoryScaling(memorySnapshots)
    });
  }

  /**
   * Benchmark de concurrencia
   */
  async benchmarkConcurrency(world) {
    console.log('🔄 Benchmarking Concurrency...');

    const concurrencyLevels = [1, 2, 4, 8];
    const results = [];

    for (const level of concurrencyLevels) {
      const result = await this.runConcurrencyBenchmark(world, level);
      results.push({ concurrency: level, ...result });
    }

    this.results.set('Concurrency_Scaling', {
      results,
      analysis: this.analyzeConcurrencyScaling(results)
    });
  }

  /**
   * Ejecuta benchmark de concurrencia
   */
  async runConcurrencyBenchmark(world, concurrencyLevel) {
    const tasks = [];
    const startTime = performance.now();

    // Crear tareas concurrentes
    for (let i = 0; i < concurrencyLevel; i++) {
      tasks.push(this.runConcurrentTask(world, i));
    }

    // Ejecutar todas las tareas
    const taskResults = await Promise.all(tasks);
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const avgTaskTime = taskResults.reduce((sum, time) => sum + time, 0) / taskResults.length;

    return {
      totalTime,
      avgTaskTime,
      efficiency: avgTaskTime / (totalTime / concurrencyLevel),
      taskResults
    };
  }

  /**
   * Tarea concurrente para benchmark
   */
  async runConcurrentTask(world, taskId) {
    const startTime = performance.now();

    // Simular trabajo de sistema
    for (let i = 0; i < 100; i++) {
      world.query(['Transform', 'Velocity']);
      world.createEntity();
      world.destroyEntity(i + taskId * 100);
    }

    return performance.now() - startTime;
  }

  // === UTILIDADES ===

  /**
   * Crea entidades con componentes específicos
   */
  createEntitiesWithComponents(world, count, componentTypes) {
    const entities = [];

    for (let i = 0; i < count; i++) {
      const entity = world.createEntity();
      entities.push(entity);

      componentTypes.forEach(compType => {
        world.addComponent(entity, compType, this.generateBenchmarkComponentData(compType));
      });
    }

    return entities;
  }

  /**
   * Genera datos de componente para benchmarks
   */
  generateBenchmarkComponentData(componentType) {
    const generators = {
      Transform: () => ({
        position_x: Math.random() * 100,
        position_y: Math.random() * 100,
        position_z: Math.random() * 100,
        rotation_x: Math.random() * Math.PI,
        rotation_y: Math.random() * Math.PI,
        rotation_z: Math.random() * Math.PI,
        scale_x: 1, scale_y: 1, scale_z: 1
      }),
      Velocity: () => ({
        linear_x: (Math.random() - 0.5) * 10,
        linear_y: (Math.random() - 0.5) * 10,
        linear_z: (Math.random() - 0.5) * 10,
        angular_x: 0, angular_y: 0, angular_z: 0
      }),
      RenderMesh: () => ({
        geometryType: 'sphere',
        radius: 0.5 + Math.random(),
        visible: true
      }),
      Health: () => ({
        current: 50 + Math.random() * 50,
        max: 100
      }),
      RigidBody: () => ({
        type: 'dynamic',
        mass: 1 + Math.random() * 5
      }),
      AudioSource: () => ({
        volume: 0.5 + Math.random() * 0.5,
        pitch: 0.8 + Math.random() * 0.4
      })
    };

    return generators[componentType]?.() || {};
  }

  /**
   * Crea instancia de sistema para benchmark
   */
  createSystemInstance(systemName) {
    // Esto necesitaría acceso a las clases reales de sistemas
    // Por ahora retornamos null
    console.warn(`System ${systemName} not available for benchmarking`);
    return null;
  }

  /**
   * Calcula estadísticas de rendimiento
   */
  calculateStats(times) {
    const sorted = [...times].sort((a, b) => a - b);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: times.reduce((sum, time) => sum + time, 0) / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      stdDev: this.calculateStandardDeviation(times)
    };
  }

  /**
   * Calcula desviación estándar
   */
  calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Fuerza garbage collection (si está disponible)
   */
  async forceGC() {
    if (window.gc) {
      window.gc();
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Fase de warmup
   */
  async warmup() {
    for (let i = 0; i < this.config.warmupIterations; i++) {
      // Operaciones de warmup
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  /**
   * Limpia todas las entidades
   */
  clearAllEntities(world) {
    const entities = Array.from(world.entityManager.entities.keys());
    entities.forEach(entityId => world.destroyEntity(entityId));
  }

  // === ANÁLISIS ===

  /**
   * Analiza resultados y genera recomendaciones
   */
  analyzeResults() {
    const criticalIssues = [];
    const warnings = [];
    const optimizations = [];

    for (const [benchmarkName, result] of this.results.entries()) {
      if (result.passed === false) {
        criticalIssues.push(`${benchmarkName}: Rendimiento crítico detectado`);
      }

      if (result.stats?.p95 > this.thresholds.frameTime.warn) {
        warnings.push(`${benchmarkName}: P95 por encima del umbral (${result.stats.p95.toFixed(2)}ms)`);
      }

      if (result.memoryDelta > this.thresholds.memoryDelta.warn) {
        warnings.push(`${benchmarkName}: Crecimiento de memoria significativo (${Math.round(result.memoryDelta / 1024)}KB)`);
      }
    }

    this.analysis = {
      criticalIssues,
      warnings,
      optimizations,
      timestamp: new Date().toISOString(),
      overallHealth: this.calculateOverallHealth()
    };
  }

  /**
   * Calcula salud general del sistema
   */
  calculateOverallHealth() {
    const results = Array.from(this.results.values());
    const passedCount = results.filter(r => r.passed !== false).length;
    const totalCount = results.length;

    const passRate = passedCount / totalCount;

    if (passRate >= 0.9) return 'Excelente';
    if (passRate >= 0.7) return 'Bueno';
    if (passRate >= 0.5) return 'Regular';
    return 'Crítico';
  }

  /**
   * Genera recomendaciones específicas
   */
  generateQueryRecommendations(stats, componentCount) {
    const recommendations = [];

    if (stats.p95 > 1.0) {
      recommendations.push('Optimizar queries con múltiples componentes - considerar índices');
    }

    if (componentCount > 3) {
      recommendations.push('Queries con más de 3 componentes pueden ser lentas - evaluar frecuencia de uso');
    }

    return recommendations;
  }

  /**
   * Genera recomendaciones para sistemas
   */
  generateSystemRecommendations(stats, memoryDelta) {
    const recommendations = [];

    if (stats.p95 > this.thresholds.frameTime.warn) {
      recommendations.push('Sistema excede presupuesto de frame - optimizar algoritmos');
    }

    if (memoryDelta > this.thresholds.memoryDelta.warn) {
      recommendations.push('Sistema causa crecimiento significativo de memoria - revisar allocations');
    }

    return recommendations;
  }

  /**
   * Analiza escalabilidad de memoria
   */
  analyzeMemoryScaling(snapshots) {
    if (snapshots.length < 2) return { slope: 0, efficiency: 'Unknown' };

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];

    const slope = (last.memoryUsage - first.memoryUsage) / (last.entityCount - first.entityCount);

    let efficiency;
    if (slope < 0.01) efficiency = 'Excelente';
    else if (slope < 0.05) efficiency = 'Bueno';
    else if (slope < 0.1) efficiency = 'Regular';
    else efficiency = 'Crítico';

    return { slope, efficiency };
  }

  /**
   * Analiza escalabilidad de concurrencia
   */
  analyzeConcurrencyScaling(results) {
    if (results.length < 2) return { scaling: 'Unknown' };

    const singleThread = results.find(r => r.concurrency === 1);
    const maxConcurrency = results[results.length - 1];

    if (!singleThread || !maxConcurrency) return { scaling: 'Unknown' };

    const speedup = maxConcurrency.avgTaskTime / singleThread.avgTaskTime;
    const efficiency = speedup / maxConcurrency.concurrency;

    let scaling;
    if (efficiency >= 0.8) scaling = 'Excelente';
    else if (efficiency >= 0.6) scaling = 'Bueno';
    else if (efficiency >= 0.4) scaling = 'Regular';
    else scaling = 'Pobre';

    return { speedup, efficiency, scaling };
  }

  // === REPORTING ===

  /**
   * Genera reporte completo
   */
  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      config: { ...this.config },
      results: Object.fromEntries(this.results.entries()),
      analysis: this.analysis,
      recommendations: this.generateGlobalRecommendations(),
      performanceScore: this.calculatePerformanceScore()
    };
  }

  /**
   * Genera recomendaciones globales
   */
  generateGlobalRecommendations() {
    const recommendations = [];

    // Análisis de queries
    const queryResults = Array.from(this.results.entries()).filter(([name]) => name.startsWith('Query_'));
    const slowQueries = queryResults.filter(([queryName, result]) => {
      // Usar queryName para debugging
      console.log('Analizando query:', queryName, 'p95:', result.stats?.p95);
      return result.stats?.p95 > 1.0;
    });

    if (slowQueries.length > 0) {
      recommendations.push(`Optimizar ${slowQueries.length} queries lentas - considerar caching o reestructuración`);
    }

    // Análisis de sistemas
    const systemResults = Array.from(this.results.entries()).filter(([name]) => name.startsWith('System_'));
    const slowSystems = systemResults.filter(([systemName, result]) => {
      // Usar systemName para debugging
      console.log('Analizando sistema:', systemName, 'p95:', result.stats?.p95);
      return result.stats?.p95 > this.thresholds.frameTime.warn;
    });

    if (slowSystems.length > 0) {
      recommendations.push(`Revisar ${slowSystems.length} sistemas con rendimiento crítico`);
    }

    // Análisis de memoria
    const memoryResult = this.results.get('Memory_Scaling');
    if (memoryResult?.analysis?.efficiency === 'Crítico') {
      recommendations.push('Revisar gestión de memoria - posible fuga o ineficiencia');
    }

    return recommendations;
  }

  /**
   * Calcula puntuación de rendimiento general
   */
  calculatePerformanceScore() {
    let score = 100;

    // Penalización por issues críticos
    score -= this.analysis.criticalIssues.length * 20;

    // Penalización por warnings
    score -= this.analysis.warnings.length * 5;

    // Bonus por optimizaciones
    score += this.analysis.optimizations.length * 2;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Resetea el benchmark
   */
  reset() {
    this.isRunning = false;
    this.results.clear();
    this.metrics = {
      frameTime: [],
      memoryUsage: [],
      queryTime: new Map(),
      systemTime: new Map(),
      cacheMisses: 0,
      allocations: 0
    };
    console.log('🔄 Automated Benchmarks reset');
  }
}
