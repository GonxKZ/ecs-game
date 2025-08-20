import { useState, useEffect, useRef } from 'react';

export default function PreloadingScreen({ world, resourceManager, onComplete, onProgress }) {
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('Iniciando...');
  const [isComplete, setIsComplete] = useState(false);
  const [loadingStats, setLoadingStats] = useState({
    resourcesLoaded: 0,
    totalResources: 0,
    shadersCompiled: 0,
    vramUsed: 0
  });

  const progressBarRef = useRef(null);
  const startTime = useRef(Date.now());

  // Lista de recursos críticos a pre-cargar
  const criticalResources = [
    // Texturas críticas
    { type: 'texture', url: '/textures/default_diffuse.jpg', priority: 'critical' },
    { type: 'texture', url: '/textures/default_normal.jpg', priority: 'high' },
    { type: 'texture', url: '/textures/environment.jpg', priority: 'medium' },

    // Modelos críticos
    { type: 'gltf', url: '/models/player.gltf', priority: 'critical' },
    { type: 'gltf', url: '/models/enemy.gltf', priority: 'high' },
    { type: 'gltf', url: '/models/environment.gltf', priority: 'medium' },

    // Audio crítico
    { type: 'audio', url: '/audio/ambient.mp3', priority: 'low' },
    { type: 'audio', url: '/audio/effects.mp3', priority: 'medium' }
  ];

  useEffect(() => {
    startPreloading();
  }, []);

  const startPreloading = async () => {
    console.log('🚀 Iniciando preloading de recursos críticos...');

    setLoadingStats(prev => ({
      ...prev,
      totalResources: criticalResources.length
    }));

    try {
      // Fase 1: Cargar recursos críticos
      await loadCriticalResources();

      // Fase 2: Precalentar shaders
      await warmupShaders();

      // Fase 3: Optimizar cachés
      await optimizeCaches();

      // Completar
      setProgress(100);
      setCurrentTask('¡Listo! Iniciando juego...');
      setIsComplete(true);

      // Pequeño delay para mostrar el 100%
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 500);

    } catch (error) {
      console.error('Error durante preloading:', error);
      // Continuar aunque haya errores
      setProgress(100);
      setIsComplete(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 1000);
    }
  };

  const loadCriticalResources = async () => {
    setCurrentTask('Cargando recursos críticos...');

    const promises = criticalResources.map(async (resource, index) => {
      try {
        switch (resource.type) {
          case 'texture':
            await resourceManager.loadTexture(resource.url, {
              priority: resource.priority,
              lifetime: 'session'
            });
            break;
          case 'gltf':
            await resourceManager.loadGLTF(resource.url, {
              priority: resource.priority,
              lifetime: 'session'
            });
            break;
          case 'audio':
            await resourceManager.loadAudio(resource.url, {
              priority: resource.priority,
              lifetime: 'session'
            });
            break;
        }

        // Actualizar progreso
        const newProgress = ((index + 1) / criticalResources.length) * 70; // 70% para recursos
        setProgress(newProgress);
        setLoadingStats(prev => ({
          ...prev,
          resourcesLoaded: prev.resourcesLoaded + 1
        }));

        if (onProgress) {
          onProgress(newProgress, `Cargando ${resource.type}: ${resource.url}`);
        }

      } catch (error) {
        console.warn(`Error cargando ${resource.url}:`, error);
        // Continuar con el siguiente recurso
      }
    });

    await Promise.allSettled(promises);
  };

  const warmupShaders = async () => {
    setCurrentTask('Precalentando shaders...');

    // Crear objetos temporales para forzar compilación de shaders
    const tempScene = new THREE.Scene();
    const tempCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

    // Materiales PBR para precalentar
    const materials = [
      new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x00ff00, metalness: 0.5, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0x0000ff, metalness: 1.0, roughness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: 0xffff00, metalness: 0.2, roughness: 0.8 })
    ];

    // Geometrías para precalentar
    const geometries = [
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.SphereGeometry(0.5, 32, 16),
      new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
      new THREE.PlaneGeometry(1, 1)
    ];

    // Crear meshes temporales para forzar compilación
    const tempMeshes = [];
    materials.forEach((material, i) => {
      const geometry = geometries[i % geometries.length];
      const mesh = new THREE.Mesh(geometry, material);
      tempScene.add(mesh);
      tempMeshes.push(mesh);
    });

    // Render temporal para forzar compilación
    const tempRenderer = new THREE.WebGLRenderer({ antialias: false });
    tempRenderer.setSize(64, 64);

    // Múltiples renders para asegurar compilación completa
    for (let i = 0; i < 10; i++) {
      tempRenderer.render(tempScene, tempCamera);

      // Actualizar progreso
      const shaderProgress = 70 + (i / 10) * 20; // 70-90% para shaders
      setProgress(shaderProgress);
      setCurrentTask(`Compilando shaders... ${Math.round((i + 1) / 10 * 100)}%`);
      setLoadingStats(prev => ({
        ...prev,
        shadersCompiled: Math.floor((i + 1) / 10 * materials.length * geometries.length)
      }));

      if (onProgress) {
        onProgress(shaderProgress, `Compilando shaders ${i + 1}/10`);
      }

      // Pequeño delay para evitar bloqueo
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Limpiar recursos temporales
    tempMeshes.forEach(mesh => {
      tempScene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    tempRenderer.dispose();

    console.log('🔥 Shaders precalentados');
  };

  const optimizeCaches = async () => {
    setCurrentTask('Optimizando cachés...');

    // Forzar optimización de cachés del ResourceManager
    if (resourceManager) {
      resourceManager.optimizeCompressionForPlatform();
      resourceManager.setupDracoCompression();
      resourceManager.setupKTX2Compression();
    }

    // Simular optimización
    for (let i = 0; i < 5; i++) {
      const cacheProgress = 90 + (i / 5) * 10; // 90-100% para optimización
      setProgress(cacheProgress);
      setCurrentTask(`Optimizando cachés... ${Math.round((i + 1) / 5 * 100)}%`);

      if (onProgress) {
        onProgress(cacheProgress, `Optimizando caché ${i + 1}/5`);
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Actualizar estadísticas finales
    const finalStats = resourceManager.getResourceStats();
    setLoadingStats(prev => ({
      ...prev,
      vramUsed: finalStats.vramUsage.total
    }));

    console.log('⚡ Cachés optimizados');
  };

  const getEstimatedTimeRemaining = () => {
    const elapsed = Date.now() - startTime.current;
    const remaining = Math.max(0, (100 - progress) / progress * elapsed);
    return Math.round(remaining / 1000);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-50">
      {/* Fondo animado */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 bg-slate-800/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4">
        {/* Logo/Título */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🚀</div>
          <h1 className="text-2xl font-bold text-cyan-400 mb-2">
            ECS Game Engine
          </h1>
          <p className="text-slate-300 text-sm">
            Preparando tu experiencia educativa...
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>{currentTask}</span>
            <span>{Math.round(progress)}%</span>
          </div>

          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              ref={progressBarRef}
              className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                boxShadow: progress > 0 ? '0 0 20px rgba(34, 211, 238, 0.5)' : 'none'
              }}
            ></div>
          </div>

          <div className="text-xs text-slate-500 mt-1 text-center">
            Tiempo restante: ~{getEstimatedTimeRemaining()}s
          </div>
        </div>

        {/* Estadísticas de carga */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl text-green-400">{loadingStats.resourcesLoaded}</div>
            <div className="text-slate-400">Recursos</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl text-blue-400">{loadingStats.shadersCompiled}</div>
            <div className="text-slate-400">Shaders</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl text-purple-400">{loadingStats.vramUsed.toFixed(1)}MB</div>
            <div className="text-slate-400">VRAM</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl text-yellow-400">{Math.round(progress)}%</div>
            <div className="text-slate-400">Completado</div>
          </div>
        </div>

        {/* Consejos de optimización */}
        <div className="bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 Optimizaciones Activas</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• Compresión Draco para geometrías 3D</li>
            <li>• Texturas KTX2 con compresión GPU</li>
            <li>• Shaders pre-compilados</li>
            <li>• Caché inteligente de recursos</li>
            <li>• Optimización automática por plataforma</li>
          </ul>
        </div>

        {/* Mensaje final */}
        {isComplete && (
          <div className="mt-6 text-center">
            <div className="text-green-400 text-lg mb-2">✅ ¡Todo listo!</div>
            <div className="text-slate-400 text-sm">
              Tu motor ECS está optimizado y listo para la acción
            </div>
          </div>
        )}
      </div>

      {/* Partículas de fondo (simplificadas) */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}
