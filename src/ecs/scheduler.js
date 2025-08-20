/**
 * Scheduler profesional para ECS con fixed timestep y dependencias
 * Maneja el orden de ejecución de sistemas y optimiza el rendimiento
 */

export class SystemScheduler {
  constructor() {
    this.systems = new Map();
    this.executionOrder = [];
    this.dependencies = new Map();

    // Estado del scheduler
    this.isRunning = true;
    this.isPaused = false;
    this.stepMode = false;
    this.stepRequested = false;

    // Estadísticas de rendimiento
    this.stats = {
      totalExecutionTime: 0,
      systemCalls: 0,
      averageFrameTime: 0,
      longestSystem: null,
      frameCount: 0,
      deltaTimeHistory: [],
      maxHistorySize: 60 // Últimos 60 frames
    };

    // Configuración de timestep
    this.fixedTimeStep = 1000 / 60; // 60 FPS
    this.maxDeltaTime = 1000 / 10; // Máximo 10 FPS
    this.accumulator = 0;
    this.currentTime = performance.now();
    this.lastTime = this.currentTime;

    // Configuración de render
    this.renderTimeStep = 1000 / 144; // Render a 144 FPS máximo
    this.lastRenderTime = 0;

    // Callbacks para debugging
    this.onFrameStart = null;
    this.onFrameEnd = null;
    this.onSystemStart = null;
    this.onSystemEnd = null;
  }

  /**
   * Registra un sistema con sus dependencias
   */
  registerSystem(name, system, dependencies = []) {
    this.systems.set(name, {
      system,
      name,
      dependencies,
      executionTime: 0,
      callCount: 0,
      lastExecutionTime: 0
    });

    this.dependencies.set(name, dependencies);
    this.rebuildExecutionOrder();
  }

  /**
   * Remueve un sistema
   */
  unregisterSystem(name) {
    this.systems.delete(name);
    this.dependencies.delete(name);
    this.rebuildExecutionOrder();
  }

  /**
   * Reconstruye el orden de ejecución basado en dependencias
   */
  rebuildExecutionOrder() {
    const order = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (name) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Dependencia circular detectada: ${name}`);
      }

      visiting.add(name);

      const deps = this.dependencies.get(name) || [];
      for (const dep of deps) {
        if (!this.systems.has(dep)) {
          console.warn(`Sistema ${name} depende de ${dep} que no existe`);
          continue;
        }
        visit(dep);
      }

      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    // Visitar todos los sistemas
    for (const name of this.systems.keys()) {
      visit(name);
    }

    this.executionOrder = order.reverse(); // Los dependientes van después
    console.log('🎯 Orden de ejecución reconstruido:', this.executionOrder);
  }

  /**
   * Ejecuta un frame con fixed timestep
   */
  executeFrame(deltaTime, world) {
    if (!this.isRunning) return;

    const frameStart = performance.now();

    // Limitar delta time para evitar spiraling
    if (deltaTime > this.maxDeltaTime) {
      deltaTime = this.maxDeltaTime;
    }

    // Actualizar historial de delta time para osciloscopio
    this.stats.deltaTimeHistory.push(deltaTime);
    if (this.stats.deltaTimeHistory.length > this.stats.maxHistorySize) {
      this.stats.deltaTimeHistory.shift();
    }

    // Callback de inicio de frame
    if (this.onFrameStart) {
      this.onFrameStart(deltaTime, this.stats.frameCount);
    }

    // Control de pausa y step
    if (this.isPaused && !this.stepRequested) {
      this.updateStats(performance.now() - frameStart);
      return;
    }

    this.accumulator += deltaTime;

    // Ejecutar fixed updates (solo si no está pausado o es un step)
    if (!this.isPaused || this.stepRequested) {
      const fixedSteps = Math.floor(this.accumulator / this.fixedTimeStep);
      for (let i = 0; i < fixedSteps; i++) {
        this.executeFixedUpdate(this.fixedTimeStep, world);
        this.accumulator -= this.fixedTimeStep;
      }

      // Reset step flag
      if (this.stepRequested) {
        this.stepRequested = false;
      }
    }

    // Ejecutar variable updates (rendering, UI) - siempre se ejecutan
    this.executeVariableUpdate(deltaTime, world);

    const frameTime = performance.now() - frameStart;

    // Callback de fin de frame
    if (this.onFrameEnd) {
      this.onFrameEnd(frameTime, this.stats.frameCount);
    }

    this.updateStats(frameTime);
    this.stats.frameCount++;
  }

  /**
   * Ejecuta fixed timestep updates
   */
  executeFixedUpdate(deltaTime, world) {
    // Ejecutar sistemas según dependencias
    for (const systemName of this.executionOrder) {
      const systemInfo = this.systems.get(systemName);
      if (!systemInfo) continue;

      const startTime = performance.now();

      try {
        // Solo ejecutar sistemas que no son de rendering en fixed update
        if (!this.isRenderSystem(systemInfo.system)) {
          systemInfo.system.update(deltaTime, world);
        }
      } catch (error) {
        console.error(`Error ejecutando sistema ${systemName}:`, error);
      }

      const executionTime = performance.now() - startTime;
      systemInfo.lastExecutionTime = executionTime;
      systemInfo.executionTime += executionTime;
      systemInfo.callCount++;

      this.stats.systemCalls++;
    }
  }

  /**
   * Ejecuta variable timestep updates
   */
  executeVariableUpdate(deltaTime, world) {
    // Ejecutar sistemas de rendering
    for (const systemName of this.executionOrder) {
      const systemInfo = this.systems.get(systemName);
      if (!systemInfo) continue;

      try {
        if (this.isRenderSystem(systemInfo.system)) {
          const startTime = performance.now();
          systemInfo.system.update(deltaTime, world);
          const executionTime = performance.now() - startTime;

          systemInfo.lastExecutionTime = executionTime;
          systemInfo.executionTime += executionTime;
          systemInfo.callCount++;
          this.stats.systemCalls++;
        }
      } catch (error) {
        console.error(`Error ejecutando sistema de render ${systemName}:`, error);
      }
    }
  }

  /**
   * Determina si un sistema es de rendering
   */
  isRenderSystem(system) {
    // Los sistemas de rendering típicamente no requieren fixed timestep
    const renderSystemNames = ['Render', 'UI', 'Camera', 'Particle'];
    return renderSystemNames.some(name =>
      system.name && system.name.includes(name)
    );
  }

  /**
   * Actualiza estadísticas
   */
  updateStats(frameTime) {
    this.stats.totalExecutionTime += frameTime;
    this.stats.averageFrameTime = this.stats.totalExecutionTime / Math.max(1, this.stats.systemCalls);

    // Encontrar sistema más lento
    let longestSystem = null;
    let longestTime = 0;

    for (const [name, info] of this.systems) {
      if (info.lastExecutionTime > longestTime) {
        longestTime = info.lastExecutionTime;
        longestSystem = name;
      }
    }

    this.stats.longestSystem = longestSystem;
  }

  /**
   * Obtiene estadísticas de rendimiento
   */
  getStats() {
    const systemStats = {};
    for (const [name, info] of this.systems) {
      systemStats[name] = {
        executionTime: info.executionTime,
        callCount: info.callCount,
        averageTime: info.callCount > 0 ? info.executionTime / info.callCount : 0,
        lastExecutionTime: info.lastExecutionTime
      };
    }

    return {
      ...this.stats,
      systems: systemStats,
      executionOrder: this.executionOrder,
      fixedTimeStep: this.fixedTimeStep,
      accumulator: this.accumulator
    };
  }

  /**
   * Pausa la ejecución del scheduler
   */
  pause() {
    this.isPaused = true;
    console.log('⏸️ Scheduler pausado');
  }

  /**
   * Reanuda la ejecución del scheduler
   */
  resume() {
    this.isPaused = false;
    this.lastTime = performance.now();
    console.log('▶️ Scheduler reanudado');
  }

  /**
   * Activa el modo step-by-step
   */
  enableStepMode() {
    this.stepMode = true;
    this.pause();
    console.log('🐛 Modo step-by-step activado');
  }

  /**
   * Desactiva el modo step-by-step
   */
  disableStepMode() {
    this.stepMode = false;
    this.resume();
    console.log('🚀 Modo step-by-step desactivado');
  }

  /**
   * Ejecuta un paso manual (solo en modo step)
   */
  step(world) {
    if (!this.isPaused || !this.stepMode) return;

    this.stepRequested = true;

    // Ejecutar un frame con timestep fijo
    const deltaTime = this.fixedTimeStep;
    this.executeFrame(deltaTime, world);

    console.log('⏯️ Step ejecutado');
  }

  /**
   * Toggle pausa
   */
  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Toggle modo step
   */
  toggleStepMode() {
    if (this.stepMode) {
      this.disableStepMode();
    } else {
      this.enableStepMode();
    }
  }

  /**
   * Configura el timestep
   */
  setTimeStep(fps) {
    this.fixedTimeStep = 1000 / fps;
    console.log(`⏰ Fixed timestep configurado a ${fps} FPS`);
  }
}

/**
 * Dependencias comunes predefinidas
 */
export const CommonDependencies = {
  // Los sistemas de física van antes de las colisiones
  PhysicsBeforeCollision: ['Physics', 'Collision'],

  // Las colisiones van antes del daño
  CollisionBeforeDamage: ['Collision', 'Damage'],

  // El daño va antes de la muerte
  DamageBeforeDeath: ['Damage', 'Death'],

  // Los inputs van antes de los sistemas que los usan
  InputBeforeMovement: ['Input', 'Movement'],

  // Los sistemas de IA van antes de los sistemas de movimiento
  AIBeforeMovement: ['AI', 'Movement'],

  // Los sistemas de render van al final
  LogicBeforeRender: ['Movement', 'Physics', 'AI', 'Render']
};

/**
 * Utilidades para el scheduler
 */
export class SchedulerUtils {
  /**
   * Valida que no haya dependencias circulares
   */
  static validateDependencies(dependencies) {
    const visiting = new Set();
    const visited = new Set();

    const hasCycle = (node) => {
      if (visiting.has(node)) return true;
      if (visited.has(node)) return false;

      visiting.add(node);

      const deps = dependencies.get(node) || [];
      for (const dep of deps) {
        if (hasCycle(dep)) return true;
      }

      visiting.delete(node);
      visited.add(node);
      return false;
    };

    for (const node of dependencies.keys()) {
      if (hasCycle(node)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Optimiza el orden de ejecución basándose en uso de componentes
   */
  static optimizeExecutionOrder(systems) {
    // Los sistemas que escriben componentes que otros leen van primero
    // Esta es una versión simplificada
    const writeSystems = [];
    const readSystems = [];

    for (const [name] of systems) {
      // Simplificación: sistemas con "Movement", "Physics" escriben
      if (name.includes('Movement') || name.includes('Physics')) {
        writeSystems.push(name);
      } else {
        readSystems.push(name);
      }
    }

    return [...writeSystems, ...readSystems];
  }
}
