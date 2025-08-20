import { useState, useEffect } from 'react';

export default function CathodeRayVisualizer({ cathodeRaySystem, onClose }) {
  const [isVisible, setIsVisible] = useState(true);
  const [stats, setStats] = useState({});
  const [config, setConfig] = useState({
    showBoundingBoxes: true,
    showSystemColors: true,
    showUpdateOrder: false,
    pulseIntensity: 1.0,
    boxDuration: 2.0,
    maxBoxes: 100
  });

  // Actualizar estadísticas
  useEffect(() => {
    if (!cathodeRaySystem) return;

    const updateStats = () => {
      setStats(cathodeRaySystem.getStats());
      setConfig(cathodeRaySystem.config);
    };

    updateStats();
    const interval = setInterval(updateStats, 500);
    return () => clearInterval(interval);
  }, [cathodeRaySystem]);

  const handleConfigChange = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    cathodeRaySystem.setConfig(newConfig);
  };

  const systemColors = cathodeRaySystem?.systemColors || new Map();

  if (!isVisible) {
    return (
      <div
        className="fixed top-64 left-4 z-50 bg-black/80 text-white px-3 py-2 rounded text-sm cursor-pointer border border-green-500/30"
        onClick={() => setIsVisible(true)}
        title="Mostrar Cathode Ray Visualizer"
      >
        📺 Cathode
      </div>
    );
  }

  return (
    <div className="fixed top-64 left-4 w-96 h-[500px] bg-gray-900/95 backdrop-blur-sm rounded-lg border border-green-500/30 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-green-500/30">
        <h3 className="text-green-400 font-bold text-lg">📺 Cathode Ray Visualizer</h3>
        <div className="flex gap-2">
          <button
            onClick={() => cathodeRaySystem.setEnabled(!stats.isEnabled)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              stats.isEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
            } text-white`}
          >
            {stats.isEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white text-lg"
          >
            ×
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-gray-700">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-400">Estado:</span>
            <span className={`ml-1 font-bold ${stats.isEnabled ? 'text-green-400' : 'text-red-400'}`}>
              {stats.isEnabled ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Boxes:</span>
            <span className="ml-1 text-white">{stats.activeBoxes || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Sistemas:</span>
            <span className="ml-1 text-white">{stats.systemColors || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Máx:</span>
            <span className="ml-1 text-white">{config.maxBoxes || 0}</span>
          </div>
        </div>
      </div>

      {/* Configuración */}
      <div className="p-4 border-b border-gray-700 space-y-3">
        <h4 className="text-white font-semibold text-sm">⚙️ Configuración</h4>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={config.showBoundingBoxes}
              onChange={(e) => handleConfigChange('showBoundingBoxes', e.target.checked)}
              className="form-checkbox h-3 w-3 text-green-600 rounded"
            />
            <span className="text-gray-400">Mostrar Bounding Boxes</span>
          </label>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={config.showSystemColors}
              onChange={(e) => handleConfigChange('showSystemColors', e.target.checked)}
              className="form-checkbox h-3 w-3 text-green-600 rounded"
            />
            <span className="text-gray-400">Colores por Sistema</span>
          </label>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={config.showUpdateOrder}
              onChange={(e) => handleConfigChange('showUpdateOrder', e.target.checked)}
              className="form-checkbox h-3 w-3 text-green-600 rounded"
            />
            <span className="text-gray-400">Orden de Updates</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Intensidad Pulso</label>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={config.pulseIntensity}
              onChange={(e) => handleConfigChange('pulseIntensity', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-white">{config.pulseIntensity.toFixed(1)}</span>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Duración Boxes</label>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={config.boxDuration}
              onChange={(e) => handleConfigChange('boxDuration', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-white">{config.boxDuration.toFixed(1)}s</span>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Máx Boxes</label>
          <input
            type="range"
            min="10"
            max="500"
            step="10"
            value={config.maxBoxes}
            onChange={(e) => handleConfigChange('maxBoxes', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-white">{config.maxBoxes}</span>
        </div>
      </div>

      {/* Colores de Sistemas */}
      <div className="p-4 border-b border-gray-700">
        <h4 className="text-white font-semibold text-sm mb-2">🎨 Colores de Sistemas</h4>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {Array.from(systemColors.entries()).map(([systemName, color]) => (
            <div key={systemName} className="flex items-center gap-2 text-xs">
              <div
                className="w-4 h-4 rounded border border-gray-600"
                style={{ backgroundColor: `#${color.toString(16).padStart(6, '0')}` }}
              />
              <span className="text-gray-400 truncate">{systemName}</span>
            </div>
          ))}
          {systemColors.size === 0 && (
            <div className="text-gray-500 text-xs italic">No hay sistemas registrados</div>
          )}
        </div>
      </div>

      {/* Controles */}
      <div className="p-4 space-y-2">
        <button
          onClick={() => cathodeRaySystem.clearAllBoxes()}
          className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors"
        >
          🧹 Limpiar Boxes
        </button>

        <button
          onClick={() => cathodeRaySystem.reset()}
          className="w-full py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm font-medium transition-colors"
        >
          🔄 Reset Sistema
        </button>
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-800/50 border-t border-gray-700 text-xs text-gray-400">
        💡 Visualiza el flujo de datos como un osciloscopio. Cada color representa un sistema.
      </div>
    </div>
  );
}
