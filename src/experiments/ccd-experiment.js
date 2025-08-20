/**
 * Experimento de CCD (Continuous Collision Detection)
 * Compara resolución de túneles con CCD vs substeps aumentados
 */

export class CCDExperiment {
  constructor(world, physicsSystem, physicsSyncSystem) {
    this.world = world;
    this.physicsSystem = physicsSystem;
    this.physicsSyncSystem = physicsSyncSystem;

    // Configuraciones del experimento
    this.experiments = {
      ccd: {
        name: 'CCD Habilitado',
        description: 'Usa Continuous Collision Detection para detectar colisiones entre frames',
        ccd: true,
        substeps: 1,
        projectileSpeed: 50,
        color: 0x00ff88
      },
      substeps: {
        name: 'Substeps Aumentados',
        description: 'Usa múltiples substeps para mejorar detección de colisiones',
        ccd: false,
        substeps: 8,
        projectileSpeed: 50,
        color: 0x0088ff
      },
      baseline: {
        name: 'Baseline',
        description: 'Configuración estándar sin optimizaciones',
        ccd: false,
        substeps: 1,
        projectileSpeed: 50,
        color: 0xff4444
      }
    };

    // Estado del experimento
    this.currentExperiment = 'ccd';
    this.isRunning = false;
    this.projectileEntities = new Set();
    this.targetEntities = new Set();
    this.collisionStats = {
      ccd: { hits: 0, misses: 0 },
      substeps: { hits: 0, misses: 0 },
      baseline: { hits: 0, misses: 0 }
    };

    // Elementos visuales
    this.visualElements = {
      projectiles: new Map(),
      targets: new Map(),
      trajectories: new Map()
    };

    this.name = 'CCDExperiment';
  }

  setupExperiment(experimentType = 'ccd') {
    this.currentExperiment = experimentType;
    this.clearExperiment();

    const config = this.experiments[experimentType];

    // Configurar física
    this.physicsSystem.setCCD(config.ccd);
    // Nota: En implementación real, ajustar substeps en physicsSystem

    console.log(`🧪 Configurando experimento: ${config.name}`);
    console.log(`📋 Descripción: ${config.description}`);
    console.log(`🎯 Configuración: CCD=${config.ccd}, Substeps=${config.substeps}`);

    // Crear objetivos (paredes delgadas para testear túneles)
    this.createTargets();

    // Reset estadísticas
    this.collisionStats[experimentType] = { hits: 0, misses: 0 };
  }

  createTargets() {
    // Crear paredes delgadas para testear penetración
    const wallPositions = [
      { x: 10, y: 0, z: 0 },
      { x: -10, y: 0, z: 0 },
      { x: 0, y: 10, z: 0 },
      { x: 0, y: -10, z: 0 },
      { x: 0, y: 0, z: 10 },
      { x: 0, y: 0, z: -10 }
    ];

    wallPositions.forEach((pos, index) => {
      // Usar index para debugging
      console.log('Creando pared con índice:', index);
      const wallId = this.world.createEntity();

      // Añadir transform
      this.world.addComponent(wallId, 'Transform', {
        position_x: pos.x,
        position_y: pos.y,
        position_z: pos.z
      });

      // Añadir renderizado (pared delgada)
      this.world.addComponent(wallId, 'RenderMesh', {
        geometryType: 'cube',
        width: pos.x !== 0 ? 0.1 : 4,
        height: pos.y !== 0 ? 0.1 : 4,
        depth: pos.z !== 0 ? 0.1 : 4
      });

      // Añadir material
      this.world.addComponent(wallId, 'MaterialRef', {
        materialType: 'standard',
        color_r: 0.8, color_g: 0.8, color_b: 0.8,
        metalness: 0.1, roughness: 0.8
      });

      // Añadir física (estática)
      this.world.addComponent(wallId, 'RigidBody', {
        type: 'static',
        mass: 0
      });

      // Añadir collider
      this.world.addComponent(wallId, 'Collider', {
        shape: 'box',
        width: pos.x !== 0 ? 0.1 : 4,
        height: pos.y !== 0 ? 0.1 : 4,
        depth: pos.z !== 0 ? 0.1 : 4,
        friction: 0.5,
        restitution: 0.3
      });

      this.targetEntities.add(wallId);
    });
  }

  launchProjectile(direction = { x: 1, y: 0, z: 0 }) {
    const config = this.experiments[this.currentExperiment];
    const projectileId = this.world.createEntity();

    // Posición inicial del proyectil
    const startPos = {
      x: direction.x * -5,
      y: direction.y * -5,
      z: direction.z * -5
    };

    // Añadir transform
    this.world.addComponent(projectileId, 'Transform', {
      position_x: startPos.x,
      position_y: startPos.y,
      position_z: startPos.z
    });

    // Añadir renderizado (esfera pequeña)
    this.world.addComponent(projectileId, 'RenderMesh', {
      geometryType: 'sphere',
      radius: 0.2
    });

    // Añadir material con color del experimento
    const color = this.experiments[this.currentExperiment].color;
    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;

    this.world.addComponent(projectileId, 'MaterialRef', {
      materialType: 'standard',
      color_r: r, color_g: g, color_b: b,
      metalness: 0.8, roughness: 0.2,
      emissive_r: r * 0.3, emissive_g: g * 0.3, emissive_b: b * 0.3
    });

    // Añadir física (dinámica, alta velocidad)
    this.world.addComponent(projectileId, 'RigidBody', {
      type: 'dynamic',
      mass: 0.1
    });

    // Añadir collider
    this.world.addComponent(projectileId, 'Collider', {
      shape: 'sphere',
      radius: 0.2,
      friction: 0.1,
      restitution: 0.8
    });

    // Aplicar velocidad inicial
    const velocity = {
      x: direction.x * config.projectileSpeed,
      y: direction.y * config.projectileSpeed,
      z: direction.z * config.projectileSpeed
    };

    setTimeout(() => {
      this.physicsSyncSystem.setVelocity(projectileId, velocity);

      // Habilitar CCD si está configurado
      if (config.ccd) {
        this.physicsSyncSystem.setCCD(projectileId, true);
      }
    }, 100);

    this.projectileEntities.add(projectileId);

    // Programar limpieza después de 5 segundos
    setTimeout(() => {
      if (this.world.entities.has(projectileId)) {
        this.world.destroyEntity(projectileId);
        this.projectileEntities.delete(projectileId);
      }
    }, 5000);

    return projectileId;
  }

  runMultipleTests(testCount = 10) {
    console.log(`🏁 Ejecutando ${testCount} tests de penetración...`);

    const directions = [
      { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
    ];

    let testIndex = 0;

    const runTest = () => {
      if (testIndex >= testCount) {
        this.showResults();
        return;
      }

      const direction = directions[testIndex % directions.length];
      this.launchProjectile(direction);

      testIndex++;
      setTimeout(runTest, 1000); // Un proyectil cada segundo
    };

    runTest();
  }

  showResults() {
    const config = this.experiments[this.currentExperiment];
    const stats = this.collisionStats[this.currentExperiment];

    console.log(`📊 Resultados del Experimento: ${config.name}`);
    console.log(`🎯 Hits: ${stats.hits}`);
    console.log(`❌ Misses: ${stats.misses}`);
    console.log(`📈 Tasa de éxito: ${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)}%`);

    // Comparar con otros experimentos
    Object.entries(this.collisionStats).forEach(([type, typeStats]) => {
      if (type !== this.currentExperiment) {
        const otherConfig = this.experiments[type];
        const successRate = (typeStats.hits / (typeStats.hits + typeStats.misses)) * 100;
        console.log(`📊 Comparación con ${otherConfig.name}: ${successRate.toFixed(1)}%`);
      }
    });
  }

  clearExperiment() {
    // Destruir todos los proyectiles
    this.projectileEntities.forEach(entityId => {
      if (this.world.entities.has(entityId)) {
        this.world.destroyEntity(entityId);
      }
    });
    this.projectileEntities.clear();

    // Destruir objetivos
    this.targetEntities.forEach(entityId => {
      if (this.world.entities.has(entityId)) {
        this.world.destroyEntity(entityId);
      }
    });
    this.targetEntities.clear();
  }

  // Sistema de suscripción a eventos de colisión
  setupCollisionDetection() {
    this.world.eventBus.subscribe('Collision', (event) => {
      const { entityA, entityB } = event.payload;

      // Verificar si uno de los entidades es un proyectil
      if (this.projectileEntities.has(entityA) || this.projectileEntities.has(entityB)) {
        this.collisionStats[this.currentExperiment].hits++;

        // Efecto visual de impacto
        this.createImpactEffect(event.payload.contactPoint);
      }
    });
  }

  createImpactEffect(contactPoint) {
    // Crear efecto visual de impacto
    const effectId = this.world.createEntity();

    this.world.addComponent(effectId, 'Transform', {
      position_x: contactPoint.x,
      position_y: contactPoint.y,
      position_z: contactPoint.z,
      scale_x: 0.1, scale_y: 0.1, scale_z: 0.1
    });

    this.world.addComponent(effectId, 'RenderMesh', {
      geometryType: 'sphere',
      radius: 0.5
    });

    this.world.addComponent(effectId, 'MaterialRef', {
      materialType: 'basic',
      color_r: 1, color_g: 1, color_b: 0,
      transparent: true, opacity: 0.8
    });

    // Auto-destruir después de 0.5 segundos
    setTimeout(() => {
      if (this.world.entities.has(effectId)) {
        this.world.destroyEntity(effectId);
      }
    }, 500);
  }

  // Controles del experimento
  switchExperiment(experimentType) {
    this.setupExperiment(experimentType);
  }

  startExperiment() {
    this.isRunning = true;
    this.runMultipleTests(20); // 20 tests
  }

  stopExperiment() {
    this.isRunning = false;
    this.clearExperiment();
  }

  // Obtener estadísticas
  getStats() {
    return {
      currentExperiment: this.currentExperiment,
      isRunning: this.isRunning,
      collisionStats: { ...this.collisionStats },
      projectileCount: this.projectileEntities.size,
      targetCount: this.targetEntities.size
    };
  }

  // Crear panel de control del experimento
  createExperimentPanel() {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 15px;
      border-radius: 10px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      min-width: 300px;
    `;

    const updatePanel = () => {
      const stats = this.getStats();
      const config = this.experiments[stats.currentExperiment];

      panel.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold;">🧪 Experimento CCD</div>
        <div><strong>Configuración:</strong> ${config.name}</div>
        <div><strong>Descripción:</strong> ${config.description}</div>
        <div><strong>CCD:</strong> ${config.ccd ? '✅' : '❌'}</div>
        <div><strong>Substeps:</strong> ${config.substeps}</div>
        <div style="margin-top: 10px;"><strong>Estadísticas:</strong></div>
        <div>Hits: ${stats.collisionStats[stats.currentExperiment].hits}</div>
        <div>Misses: ${stats.collisionStats[stats.currentExperiment].misses}</div>
        <div>Proyectiles: ${stats.projectileCount}</div>
        <div>Objetivos: ${stats.targetCount}</div>
      `;
    };

    updatePanel();
    setInterval(updatePanel, 500);

    document.body.appendChild(panel);
    return panel;
  }

  // Métodos de utilidad para el modo educativo
  explainCCD() {
    console.log(`
🎯 ¿Qué es CCD (Continuous Collision Detection)?

El CCD detecta colisiones que ocurrirían entre frames, previniendo
que objetos "atraviesen" otros objetos cuando se mueven muy rápido.

📊 Comparación:

1. SIN CCD (Baseline):
   - Un proyectil rápido puede atravesar paredes delgadas
   - Problema común en juegos con físicas

2. CON CCD:
   - Detecta colisión incluso si el proyectil "saltaría" sobre la pared
   - Más preciso pero más costoso computacionalmente

3. SUBSTEPS AUMENTADOS:
   - Divide cada frame en múltiples pasos de simulación
   - Más preciso pero reduce rendimiento
   - Alternativa al CCD para algunos casos

🔍 En este experimento:
- Lanzamos proyectiles a alta velocidad hacia paredes delgadas
- Medimos cuántos "atraviesan" vs cuántos colisionan
- Comparamos la efectividad de cada enfoque
    `);
  }
}
