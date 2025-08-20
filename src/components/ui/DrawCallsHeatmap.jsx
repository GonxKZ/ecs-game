import { useState, useEffect, useRef } from 'react';

export default function DrawCallsHeatmap({ renderer, scene, onClose }) {
  // Usar scene para obtener estadísticas adicionales
  const getSceneStats = () => {
    if (scene) {
      return {
        meshCount: scene.children.filter(child => child.isMesh).length,
        lightCount: scene.children.filter(child => child.isLight).length,
        totalObjects: scene.children.length
      };
    }
    return { meshCount: 0, lightCount: 0, totalObjects: 0 };
  };

  const [stats, setStats] = useState({
    drawCalls: 0,
    triangles: 0,
    lines: 0,
    points: 0,
    geometries: 0,
    textures: 0,
    shaders: 0,
    frameTime: 0
  });

  const [isRecording, setIsRecording] = useState(true);
  const [history, setHistory] = useState([]);
  const [config, setConfig] = useState({
    maxDrawCalls: {
      desktop: 200,
      mobile: 80
    },
    currentPlatform: 'desktop',
    alertThreshold: 0.8 // 80% del presupuesto
  });

  const [alerts, setAlerts] = useState([]);
  const canvasRef = useRef(null);

  // Detectar si es móvil
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setConfig(prev => ({
      ...prev,
      currentPlatform: isMobile ? 'mobile' : 'desktop'
    }));
  }, []);

  // Capturar estadísticas de renderizado
  useEffect(() => {
    if (!renderer || !isRecording) return;

    const updateStats = () => {
      const renderInfo = renderer.info.render;
      const memoryInfo = renderer.info.memory;

      const sceneStats = getSceneStats();
      const newStats = {
        drawCalls: renderInfo.calls || 0,
        triangles: renderInfo.triangles || 0,
        lines: renderInfo.lines || 0,
        points: renderInfo.points || 0,
        geometries: memoryInfo.geometries || 0,
        textures: memoryInfo.textures || 0,
        shaders: renderInfo.programs || 0,
        frameTime: renderer.info.render.frame || 0,
        meshCount: sceneStats.meshCount,
        lightCount: sceneStats.lightCount,
        totalObjects: sceneStats.totalObjects
      };

      setStats(newStats);

      // Añadir a historial
      setHistory(prev => {
        const newHistory = [...prev, { ...newStats, timestamp: performance.now() }];
        return newHistory.slice(-120); // Últimos 2 segundos a 60 FPS
      });

      // Verificar alertas
      checkAlerts(newStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 16); // ~60 FPS
    return () => clearInterval(interval);
  }, [renderer, isRecording, config]);

  const checkAlerts = (newStats) => {
    const maxDrawCalls = config.maxDrawCalls[config.currentPlatform];
    const threshold = maxDrawCalls * config.alertThreshold;
    const currentAlerts = [];

    if (newStats.drawCalls > maxDrawCalls) {
      currentAlerts.push({
        type: 'critical',
        message: `CRÍTICO: ${newStats.drawCalls} draw calls (máx: ${maxDrawCalls})`,
        value: newStats.drawCalls,
        limit: maxDrawCalls
      });
    } else if (newStats.drawCalls > threshold) {
      currentAlerts.push({
        type: 'warning',
        message: `ALERTA: ${newStats.drawCalls} draw calls (${Math.round(newStats.drawCalls/maxDrawCalls*100)}%)`,
        value: newStats.drawCalls,
        limit: maxDrawCalls
      });
    }

    // Alertas de geometrías
    if (newStats.geometries > 1000) {
      currentAlerts.push({
        type: 'warning',
        message: `Muchas geometrías: ${newStats.geometries}`,
        value: newStats.geometries,
        limit: 1000
      });
    }

    // Alertas de texturas
    if (newStats.textures > 50) {
      currentAlerts.push({
        type: 'warning',
        message: `Muchas texturas: ${newStats.textures}`,
        value: newStats.textures,
        limit: 50
      });
    }

    setAlerts(currentAlerts);
  };

  // Dibujar gráfico de historial
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Limpiar canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    // Dibujar grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    // Líneas horizontales
    const maxDrawCalls = config.maxDrawCalls[config.currentPlatform];
    for (let i = 0; i <= 5; i++) {
      const y = (i / 5) * height;
      const value = maxDrawCalls * (1 - i / 5);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Etiquetas
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px monospace';
      ctx.fillText(Math.round(value), 5, y - 2);
    }

    // Líneas verticales (tiempo)
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Dibujar línea de presupuesto
    const budgetY = height - (config.alertThreshold * height);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, budgetY);
    ctx.lineTo(width, budgetY);
    ctx.stroke();

    // Dibujar datos históricos
    const step = width / Math.max(history.length - 1, 1);
    const maxValue = config.maxDrawCalls[config.currentPlatform];

    // Línea de draw calls
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();

    history.forEach((data, index) => {
      const x = index * step;
      const normalizedValue = Math.min(data.drawCalls / maxValue, 1);
      const y = height - (normalizedValue * height);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Rellenar área sobre el presupuesto
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.beginPath();

    history.forEach((data, index) => {
      const x = index * step;
      const normalizedValue = Math.min(data.drawCalls / maxValue, 1);
      const y = height - (normalizedValue * height);

      if (index === 0) {
        ctx.moveTo(x, height);
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      if (index === history.length - 1) {
        ctx.lineTo(x, height);
        ctx.closePath();
        ctx.fill();
      }
    });

  }, [history, config]);

  const getHeatColor = (value, max) => {
    const ratio = value / max;
    if (ratio > 1) return 'text-red-400';
    if (ratio > 0.8) return 'text-yellow-400';
    if (ratio > 0.6) return 'text-orange-400';
    return 'text-green-400';
  };

  const getPlatformIcon = () => {
    return config.currentPlatform === 'mobile' ? '📱' : '🖥️';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-800 p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">
            🔥 Draw Calls Heatmap {getPlatformIcon()}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`px-3 py-1 rounded ${isRecording ? 'bg-red-600' : 'bg-green-600'} hover:opacity-80`}
            >
              {isRecording ? '⏹️ Detener' : '▶️ Grabar'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-red-400 mb-2">🚨 Alertas de Rendimiento</h3>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded ${
                  alert.type === 'critical' ? 'bg-red-900/30 border border-red-500' : 'bg-yellow-900/30 border border-yellow-500'
                }`}>
                  <div className="text-sm">{alert.message}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {alert.value} / {alert.limit} ({Math.round(alert.value/alert.limit*100)}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estadísticas principales */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-700 p-4 rounded text-center">
            <div className={`text-2xl font-bold ${getHeatColor(stats.drawCalls, config.maxDrawCalls[config.currentPlatform])}`}>
              {stats.drawCalls}
            </div>
            <div className="text-sm text-slate-400">Draw Calls</div>
            <div className="text-xs text-slate-500">
              máx: {config.maxDrawCalls[config.currentPlatform]}
            </div>
          </div>
          <div className="bg-slate-700 p-4 rounded text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.triangles.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Triángulos</div>
          </div>
          <div className="bg-slate-700 p-4 rounded text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.textures}</div>
            <div className="text-sm text-slate-400">Texturas</div>
          </div>
          <div className="bg-slate-700 p-4 rounded text-center">
            <div className="text-2xl font-bold text-green-400">{stats.frameTime}ms</div>
            <div className="text-sm text-slate-400">Frame Time</div>
          </div>
        </div>

        {/* Gráfico histórico */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-green-400">📈 Historial de Draw Calls</h3>
            <span className="text-sm text-slate-400">{history.length} frames</span>
          </div>
          <canvas
            ref={canvasRef}
            width={800}
            height={200}
            className="w-full border border-slate-600 rounded"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>← Más antiguo</span>
            <span>Ahora →</span>
          </div>
        </div>

        {/* Consejos de optimización */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-900/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">⚡ Optimizaciones Inmediatas</h4>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Usa instancing para objetos similares</li>
              <li>• Combina geometrías estáticas</li>
              <li>• Reduce texturas grandes</li>
              <li>• Implementa frustum culling</li>
              <li>• Usa LOD (Level of Detail)</li>
            </ul>
          </div>

          <div className="bg-purple-900/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-purple-400 mb-2">🎯 Métricas Ideales</h4>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Desktop: &lt; 200 draw calls</li>
              <li>• Mobile: &lt; 80 draw calls</li>
              <li>• &lt; 100,000 triángulos</li>
              <li>• &lt; 50 texturas activas</li>
              <li>• Frame time &lt; 16ms (60 FPS)</li>
            </ul>
          </div>
        </div>

        {/* Configuración */}
        <div className="mt-6 bg-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">⚙️ Configuración</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Plataforma</label>
              <select
                value={config.currentPlatform}
                onChange={(e) => setConfig(prev => ({ ...prev, currentPlatform: e.target.value }))}
                className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm"
              >
                <option value="desktop">Desktop (200 draw calls)</option>
                <option value="mobile">Mobile (80 draw calls)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Umbral de Alerta (%)</label>
              <input
                type="range"
                min="50"
                max="95"
                value={config.alertThreshold * 100}
                onChange={(e) => setConfig(prev => ({ ...prev, alertThreshold: parseInt(e.target.value) / 100 }))}
                className="w-full"
              />
              <span className="text-xs text-slate-400">{Math.round(config.alertThreshold * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
