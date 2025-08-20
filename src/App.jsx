import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useState, useEffect, useCallback } from 'react';
import { useECS } from './hooks/useECS';
import LevelManager from './levels/LevelManager';
import TheoryPanel from './components/ui/TheoryPanel';
import ECSPanel from './components/ui/ECSPanel';
import ConsolePanel from './components/ui/ConsolePanel';
import EntityRenderer from './scene/EntityRenderer';

function App() {
  const {
    world,
    stats,
    isRunning,
    start,
    stop,
    createTestEntity,
    getRenderableEntities
  } = useECS();

  const [currentLevel, setCurrentLevel] = useState(1);
  const [consoleMessages, setConsoleMessages] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);

  const addConsoleMessage = useCallback((message) => {
    setConsoleMessages(prev => [...prev.slice(-4), message]); // Mantener últimos 5 mensajes
  }, []);

  // Level Manager
  const levelManager = LevelManager({
    currentLevel,
    world,
    onLevelComplete: () => {
      if (currentLevel < 10) {
        setCurrentLevel(prev => prev + 1);
      }
    },
    onAddConsoleMessage: addConsoleMessage
  });

  // Inicializar cuando se monte el componente
  useEffect(() => {
    if (world) {
      // Detener cualquier ejecución anterior
      stop();

      // Limpiar entidades existentes
      world.entities.clear();
      world.nextEntityId = 1;

      // Mensaje de bienvenida
      addConsoleMessage('🎮 ¡Bienvenido al ECS Playground!');
      addConsoleMessage('📚 Un juego educativo para aprender Entity-Component-System');
      addConsoleMessage('💡 Comenzando con el Nivel 1...');
      addConsoleMessage('');
    }
  }, [world, stop, addConsoleMessage]);

  const handleEntityClick = (entityId) => {
    setSelectedEntity(entityId);
    levelManager.onEntitySelect(entityId);
    addConsoleMessage(`🔍 Entidad ${entityId} seleccionada`);
  };

  const handleCreateEntity = (type) => {
    const entityId = createTestEntity(type);
    addConsoleMessage(`🏗️ Entidad ${entityId} creada (${type})`);
  };

  const handleDeleteEntity = (entityId) => {
    if (world) {
      world.destroyEntity(entityId);
      levelManager.onEntityDelete(entityId);
      if (selectedEntity === entityId) {
        setSelectedEntity(null);
      }
      addConsoleMessage(`🗑️ Entidad ${entityId} eliminada`);
    }
  };

  const handleStart = () => {
    start();
    levelManager.onStartECS();
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col game-layout">
      {/* Header */}
      <header className="game-header p-6 border-b border-white/10">
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🚀 ECS Playground
            </h1>
            <p className="text-sm text-slate-400 mt-1">Aprende Entity-Component-System Jugando</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-right">
              <div className="text-sm font-medium text-white">
                Nivel {currentLevel}
              </div>
              <div className="text-xs text-slate-400">
                {stats.entities || 0} entidades activas
              </div>
            </div>
            <button
              onClick={isRunning ? stop : handleStart}
              className={`btn ${isRunning ? 'btn-warning' : 'btn-primary'} glow`}
            >
              {isRunning ? (
                <>
                  <span>⏸️</span>
                  Pausar
                </>
              ) : (
                <>
                  <span>▶️</span>
                  Iniciar ECS
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout - 3 Columnas */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Panel Izquierdo - Teoría y Guía */}
        <div className="w-1/4 glass-effect rounded-xl flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-bold text-purple-400 flex items-center gap-2">
              <span>📚</span>
              Teoría y Guía
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <TheoryPanel levelData={levelManager.level} progress={levelManager.progress} />
          </div>
        </div>

        {/* Panel Central - Escenario 3D */}
        <div className="flex-1 glass-effect rounded-xl relative overflow-hidden">
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-black/60 backdrop-blur-sm p-3 rounded-lg text-xs font-mono">
              <div className="text-green-400">● ECS Activo</div>
              <div className="text-blue-400">Entidades: {stats.entities || 0}</div>
              <div className="text-purple-400">Sistemas: {Object.keys(stats.systems || {}).length}</div>
            </div>
          </div>

          <Canvas
            camera={{ position: [10, 10, 10], fov: 60 }}
            gl={{ antialias: true, alpha: true }}
            className="rounded-xl"
          >
            {/* Iluminación mejorada */}
            <ambientLight intensity={0.3} color="#6366f1" />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1}
              color="#8b5cf6"
              castShadow
            />
            <pointLight
              position={[-10, -10, -5]}
              intensity={0.5}
              color="#06b6d4"
            />

            {/* Entorno mejorado */}
            <Stars
              radius={150}
              depth={80}
              count={3000}
              factor={6}
              saturation={0.5}
              fade
              speed={0.5}
            />

            {/* Grid de referencia mejorado */}
            <gridHelper
              args={[30, 30, '#6366f1', '#334155']}
              position={[0, -0.1, 0]}
            />

            {/* Entidades renderizables */}
            <EntityRenderer
              entities={getRenderableEntities()}
              onEntityClick={handleEntityClick}
              selectedEntity={selectedEntity}
            />

            {/* Controles de cámara mejorados */}
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              maxDistance={60}
              minDistance={3}
              enableDamping={true}
              dampingFactor={0.05}
            />
          </Canvas>

          {/* Efecto de vidrio en el borde */}
          <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-white/10" />
        </div>

        {/* Panel Derecho - Laboratorio ECS */}
        <div className="w-1/4 glass-effect rounded-xl flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
              <span>🧪</span>
              Laboratorio ECS
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ECSPanel
              world={world}
              stats={stats}
              selectedEntity={selectedEntity}
              onCreateEntity={handleCreateEntity}
              onDeleteEntity={handleDeleteEntity}
              onSelectEntity={setSelectedEntity}
            />
          </div>
        </div>
      </div>

      {/* Panel Inferior - Consola Didáctica */}
      <div className="h-40 glass-effect mx-4 mb-4 rounded-xl border-t border-white/10">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-sm font-bold text-green-400 flex items-center gap-2">
            <span>💻</span>
            Consola Didáctica
          </h3>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConsolePanel messages={consoleMessages} />
        </div>
      </div>
    </div>
  );
}

export default App;