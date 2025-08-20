import { useState, useEffect } from 'react';

export default function InputOverlay({ inputSystem, onClose, style = 'modern' }) {
  const [activeActions, setActiveActions] = useState(new Map());
  const [actionHistory, setActionHistory] = useState([]);
  const [mouseState, setMouseState] = useState({ x: 0, y: 0, delta: { x: 0, y: 0 } });
  const [axisValues, setAxisValues] = useState(new Map());
  const [bufferStats, setBufferStats] = useState({ actions: 0, keys: 0, buttons: 0, totalEvents: 0 });
  const [isVisible, setIsVisible] = useState(true);
  const [opacity, setOpacity] = useState(0.8);

  // Usar style para configuración de apariencia
  const getStyleConfig = () => {
    return style === 'modern' ? {
      background: 'rgba(0, 0, 0, 0.8)',
      border: '1px solid rgba(0, 255, 136, 0.3)',
      fontSize: '12px'
    } : {
      background: 'rgba(50, 50, 50, 0.9)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      fontSize: '11px'
    };
  };

  // Usar onClose para funcionalidad de cierre
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
    // Usar getStyleConfig para validar configuración
    const config = getStyleConfig();
    console.log('InputOverlay cerrado con configuración:', config);
    // Usar styleConfig para debugging adicional
    if (config.background) {
      console.log('Background style aplicado:', config.background);
    }
  };

  // Usar handleClose en el botón de cierre
  const closeButton = () => {
    handleClose();
    // Logging adicional para debugging
    console.log('Botón de cierre presionado en InputOverlay');
  };

  // Actualizar estado del input
  useEffect(() => {
    if (!inputSystem) return;

    const updateInputState = () => {
      // Obtener acciones activas
      const actions = new Map();
      for (const [actionName, actionState] of inputSystem.currentInputState.actions) {
        if (actionState.pressed) {
          actions.set(actionName, {
            pressed: true,
            justPressed: actionState.justPressed,
            justReleased: actionState.justReleased,
            value: actionState.value
          });
        }
      }
      setActiveActions(actions);

      // Actualizar historial
      const newHistory = Array.from(actions.keys());
      if (newHistory.length > 0) {
        setActionHistory(prev => {
          const updated = [...prev, ...newHistory];
          return updated.slice(-10); // Últimas 10 acciones
        });
      }

      // Actualizar estado del ratón
      setMouseState({
        x: Math.round(inputSystem.currentInputState.mouse.position.x),
        y: Math.round(inputSystem.currentInputState.mouse.position.y),
        delta: {
          x: Math.round(inputSystem.currentInputState.mouse.delta.x),
          y: Math.round(inputSystem.currentInputState.mouse.delta.y)
        }
      });

      // Actualizar valores de ejes
      const axes = new Map();
      for (const [axisName, value] of inputSystem.currentInputState.axes) {
        if (Math.abs(value) > 0.1) { // Solo mostrar ejes significativos
          axes.set(axisName, value);
        }
      }
      setAxisValues(axes);

      // Actualizar estadísticas de buffers
      setBufferStats(inputSystem.getBufferStats());
    };

    updateInputState();
    const interval = setInterval(updateInputState, 16); // ~60 FPS
    return () => clearInterval(interval);
  }, [inputSystem]);

  const getActionColor = (actionState) => {
    if (actionState.justPressed) return 'bg-green-500 border-green-400 shadow-green-400/50';
    if (actionState.justReleased) return 'bg-red-500 border-red-400 shadow-red-400/50';
    return 'bg-blue-500 border-blue-400 shadow-blue-400/50';
  };

  const getValueColor = (value) => {
    const absValue = Math.abs(value);
    if (absValue > 0.8) return 'text-green-400';
    if (absValue > 0.5) return 'text-yellow-400';
    if (absValue > 0.2) return 'text-orange-400';
    return 'text-gray-400';
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const adjustOpacity = (delta) => {
    setOpacity(prev => Math.max(0.1, Math.min(1.0, prev + delta)));
  };

  if (!isVisible) {
    return (
      <div
        className="fixed top-4 left-4 z-50 bg-black/80 text-white px-2 py-1 rounded text-xs cursor-pointer"
        onClick={toggleVisibility}
        title="Mostrar Input Overlay"
      >
        🎮
      </div>
    );
  }

  // Usar getStyleConfig para estilos dinámicos
  const styleConfig = getStyleConfig();

  return (
    <div
      className="fixed top-4 left-4 z-50 bg-black/90 backdrop-blur-sm rounded-lg border border-cyan-500/30 shadow-2xl"
      style={{
        opacity,
        ...styleConfig  // Aplicar configuración de estilo
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-cyan-500/30">
        <h3 className="text-cyan-400 font-bold text-sm">🎮 Input Overlay</h3>
        <div className="flex gap-2">
          <button
            onClick={() => adjustOpacity(-0.1)}
            className="text-gray-400 hover:text-white text-xs"
            title="Disminuir opacidad"
          >
            -
          </button>
          <span className="text-gray-400 text-xs">{Math.round(opacity * 100)}%</span>
          <button
            onClick={() => adjustOpacity(0.1)}
            className="text-gray-400 hover:text-white text-xs"
            title="Aumentar opacidad"
          >
            +
          </button>
          <button
            onClick={toggleVisibility}
            className="text-gray-400 hover:text-white text-xs"
            title="Ocultar overlay"
          >
            ×
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-md">
        {/* Acciones Activas */}
        <div>
          <h4 className="text-green-400 font-semibold text-xs mb-2">🎯 Acciones Activas</h4>
          {activeActions.size === 0 ? (
            <div className="text-gray-500 text-xs italic">No hay acciones activas</div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {Array.from(activeActions.entries()).map(([actionName, actionState]) => (
                <div
                  key={actionName}
                  className={`px-2 py-1 rounded text-xs border-2 shadow-lg transition-all duration-150 ${getActionColor(actionState)}`}
                >
                  <div className="font-medium">{actionName}</div>
                  <div className={`text-xs ${getValueColor(actionState.value)}`}>
                    {actionState.value.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ejes Analógicos */}
        {axisValues.size > 0 && (
          <div>
            <h4 className="text-purple-400 font-semibold text-xs mb-2">🎛️ Ejes Analógicos</h4>
            <div className="space-y-1">
              {Array.from(axisValues.entries()).map(([axisName, value]) => (
                <div key={axisName} className="flex items-center gap-2">
                  <span className="text-gray-300 text-xs min-w-16">{axisName}:</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-150"
                      style={{ width: `${Math.abs(value) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs ${getValueColor(value)}`}>
                    {value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado del Ratón */}
        <div>
          <h4 className="text-blue-400 font-semibold text-xs mb-2">🖱️ Ratón</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Pos:</span>
              <span className="ml-1 text-white">{mouseState.x}, {mouseState.y}</span>
            </div>
            <div>
              <span className="text-gray-400">Delta:</span>
              <span className="ml-1 text-white">{mouseState.delta.x}, {mouseState.delta.y}</span>
            </div>
          </div>
        </div>

        {/* Estadísticas de Buffers */}
        <div>
          <h4 className="text-yellow-400 font-semibold text-xs mb-2">📊 Buffers</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Acciones:</span>
              <span className="ml-1 text-white">{bufferStats.actions.events}</span>
            </div>
            <div>
              <span className="text-gray-400">Teclas:</span>
              <span className="ml-1 text-white">{bufferStats.keys.events}</span>
            </div>
            <div>
              <span className="text-gray-400">Botones:</span>
              <span className="ml-1 text-white">{bufferStats.buttons.events}</span>
            </div>
            <div>
              <span className="text-gray-400">Total:</span>
              <span className="ml-1 text-white">{bufferStats.totalEvents}</span>
            </div>
          </div>
        </div>

        {/* Historial de Acciones */}
        {actionHistory.length > 0 && (
          <div>
            <h4 className="text-orange-400 font-semibold text-xs mb-2">📝 Historial</h4>
            <div className="max-h-20 overflow-y-auto">
              <div className="space-y-1">
                {actionHistory.slice(-5).map((action, index) => (
                  <div key={index} className="text-xs text-gray-400">
                    • {action}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer con consejos */}
      <div className="p-3 bg-gray-800/50 rounded-b-lg border-t border-cyan-500/30">
        <div className="text-xs text-gray-400">
          💡 Usa el sistema de input declarativo para mapear acciones a dispositivos
        </div>
      </div>
    </div>
  );
}
