/**
 * Optimizador de queries educativo
 * Demuestra los beneficios del almacenamiento denso y cache-friendly
 */

export class QueryOptimizer {
  constructor(world) {
    this.world = world;
    this.queryStats = new Map(); // queryId -> estadísticas de rendimiento
    this.cacheSimulation = {
      cacheHits: 0,
      cacheMisses: 0,
      simulatedCache: new Set() // Simula líneas de cache
    };
  }

  /**
   * Ejecuta una query optimizada
   */
  executeOptimizedQuery(queryId, requiredComponents = [], forbiddenComponents = []) {
    const startTime = performance.now();

    // Obtener entidades que cumplen los requisitos
    const matchingEntities = [];

    // Optimización: encontrar el componente más restrictivo primero
    const componentCounts = requiredComponents.map(comp => ({
      type: comp,
      count: this.world.components.get(comp)?.size || 0
    })).sort((a, b) => a.count - b.count);

    const mostRestrictiveComponent = componentCounts[0]?.type;
    if (!mostRestrictiveComponent) return matchingEntities;

    // Iterar solo sobre las entidades que tienen el componente más restrictivo
    const restrictiveMap = this.world.components.get(mostRestrictiveComponent);
    if (!restrictiveMap) return matchingEntities;

    for (const [entityId] of restrictiveMap) {
      // Verificar componentes requeridos
      const hasRequired = requiredComponents.every(comp =>
        this.world.entities.get(entityId)?.has(comp)
      );

      // Verificar componentes prohibidos
      const hasForbidden = forbiddenComponents.some(comp =>
        this.world.entities.get(entityId)?.has(comp)
      );

      if (hasRequired && !hasForbidden) {
        matchingEntities.push(entityId);
        this.simulateCacheAccess(entityId, requiredComponents);
      }
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Registrar estadísticas
    this.recordQueryStats(queryId, {
      executionTime,
      entitiesFound: matchingEntities.length,
      componentsChecked: requiredComponents.length,
      cacheHitRatio: this.cacheSimulation.cacheHits / (this.cacheSimulation.cacheHits + this.cacheSimulation.cacheMisses),
      estimatedIterations: matchingEntities.length * requiredComponents.length
    });

    return matchingEntities;
  }

  /**
   * Simula el comportamiento de la cache
   */
  simulateCacheAccess(entityId, components) {
    const cacheLineSize = 64; // bytes
    const entitySize = 16; // bytes por entidad (aproximado)

    components.forEach(compType => {
      const componentMap = this.world.components.get(compType);
      if (componentMap?.has(entityId)) {
        // Simular acceso a memoria
        const memoryAddress = entityId * entitySize;
        const cacheLine = Math.floor(memoryAddress / cacheLineSize);

        if (this.cacheSimulation.simulatedCache.has(cacheLine)) {
          this.cacheSimulation.cacheHits++;
        } else {
          this.cacheSimulation.cacheMisses++;
          // Cache tiene tamaño limitado
          if (this.cacheSimulation.simulatedCache.size > 100) {
            const firstLine = this.cacheSimulation.simulatedCache.values().next().value;
            this.cacheSimulation.simulatedCache.delete(firstLine);
          }
          this.cacheSimulation.simulatedCache.add(cacheLine);
        }
      }
    });
  }

  /**
   * Registra estadísticas de rendimiento de queries
   */
  recordQueryStats(queryId, stats) {
    this.queryStats.set(queryId, {
      ...stats,
      timestamp: Date.now(),
      calls: (this.queryStats.get(queryId)?.calls || 0) + 1
    });
  }

  /**
   * Obtiene estadísticas de rendimiento
   */
  getPerformanceStats() {
    const totalQueries = this.queryStats.size;
    const totalTime = Array.from(this.queryStats.values())
      .reduce((sum, stats) => sum + stats.executionTime, 0);

    const avgCacheHitRatio = Array.from(this.queryStats.values())
      .reduce((sum, stats) => sum + (stats.cacheHitRatio || 0), 0) / totalQueries;

    return {
      totalQueries,
      totalExecutionTime: totalTime,
      averageExecutionTime: totalTime / totalQueries,
      averageCacheHitRatio: avgCacheHitRatio,
      queryDetails: Object.fromEntries(this.queryStats)
    };
  }

  /**
   * Genera un reporte educativo sobre el rendimiento
   */
  generateEducationalReport() {
    const stats = this.getPerformanceStats();
    const report = [];

    report.push('📊 Reporte de Optimización ECS');
    report.push('================================');
    report.push(`Total de queries ejecutadas: ${stats.totalQueries}`);
    report.push(`Tiempo total de ejecución: ${stats.totalExecutionTime.toFixed(2)}ms`);
    report.push(`Ratio de hits de cache: ${(stats.averageCacheHitRatio * 100).toFixed(1)}%`);

    if (stats.averageCacheHitRatio > 0.8) {
      report.push('✅ ¡Excelente rendimiento de cache! Los datos están bien alineados.');
    } else if (stats.averageCacheHitRatio > 0.6) {
      report.push('⚠️ Rendimiento de cache aceptable. Considera reordenar los datos.');
    } else {
      report.push('🔴 Rendimiento de cache bajo. Los datos están dispersos en memoria.');
    }

    return report.join('\n');
  }

  /**
   * Demuestra la diferencia entre iteración optimizada y no optimizada
   */
  demonstrateOptimizationBenefit(requiredComponents) {
    const startTime = performance.now();

    // Método no optimizado: verificar cada entidad contra cada componente
    const naiveMethod = [];
    for (const [entityId] of this.world.entities) {
      const hasAllComponents = requiredComponents.every(comp =>
        this.world.entities.get(entityId)?.has(comp)
      );
      if (hasAllComponents) {
        naiveMethod.push(entityId);
      }
    }
    const naiveTime = performance.now() - startTime;

    // Método optimizado
    const optimizedStart = performance.now();
    const optimizedMethod = this.executeOptimizedQuery(
      'demo_optimization',
      requiredComponents
    );
    const optimizedTime = performance.now() - optimizedStart;

    return {
      naive: {
        time: naiveTime,
        entities: naiveMethod.length,
        iterations: this.world.entities.size * requiredComponents.length
      },
      optimized: {
        time: optimizedTime,
        entities: optimizedMethod.length,
        iterations: optimizedMethod.length * requiredComponents.length
      },
      improvement: naiveTime > 0 ? ((naiveTime - optimizedTime) / naiveTime * 100) : 0
    };
  }
}

/**
 * Utilidades para visualización educativa del rendimiento
 */
export class PerformanceVisualizer {
  static generateCacheHeatmap(entities, components) {
    // Genera datos para visualizar el patrón de acceso a memoria
    const heatmap = [];

    entities.forEach((entityId) => {
      const row = { entityId, components: {} };

      components.forEach(compType => {
        // Simular si el componente está en cache
        const cacheLine = Math.floor((entityId * 16) / 64);
        const isInCache = Math.random() > 0.3; // Simulación simplificada

        row.components[compType] = {
          inCache: isInCache,
          memoryAddress: entityId * 16,
          cacheLine
        };
      });

      heatmap.push(row);
    });

    return heatmap;
  }

  static generateMemoryLayoutDiagram(entities, components) {
    // Genera una representación visual del layout de memoria
    const diagram = [];

    diagram.push('🎯 Layout de Memoria - Diseño Orientado a Datos');
    diagram.push('=' .repeat(50));

    components.forEach(compType => {
      diagram.push(`\n📦 Componente: ${compType}`);
      diagram.push('-'.repeat(30));

      const componentMap = entities.filter(e => e.components[compType]);
      componentMap.forEach((entity) => {
        const cacheStatus = entity.components[compType]?.inCache ? '✅' : '❌';
        diagram.push(`${cacheStatus} Entidad #${entity.entityId} -> ${compType}`);
      });
    });

    return diagram.join('\n');
  }
}
