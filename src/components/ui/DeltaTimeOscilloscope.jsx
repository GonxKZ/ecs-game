import { useState, useEffect, useRef } from 'react';

export default function DeltaTimeOscilloscope({ scheduler, onClose }) {
  const [deltaTimeData, setDeltaTimeData] = useState([]);
  const [isRecording, setIsRecording] = useState(true);
  const [stats, setStats] = useState({
    average: 0,
    min: 0,
    max: 0,
    variance: 0,
    stability: 0
  });
  const canvasRef = useRef(null);

  // Actualizar datos del scheduler
  useEffect(() => {
    if (!scheduler || !isRecording) return;

    const updateData = () => {
      const history = scheduler.stats.deltaTimeHistory || [];
      setDeltaTimeData([...history]);

      // Calcular estadísticas
      if (history.length > 0) {
        const avg = history.reduce((sum, dt) => sum + dt, 0) / history.length;
        const min = Math.min(...history);
        const max = Math.max(...history);
        const variance = history.reduce((sum, dt) => sum + Math.pow(dt - avg, 2), 0) / history.length;
        const stability = 1 - (variance / Math.pow(avg, 2)); // 1 = muy estable, 0 = muy variable

        setStats({
          average: avg,
          min,
          max,
          variance,
          stability: Math.max(0, Math.min(1, stability))
        });
      }
    };

    updateData();
    const interval = setInterval(updateData, 100);
    return () => clearInterval(interval);
  }, [scheduler, isRecording]);

  // Dibujar osciloscopio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || deltaTimeData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Limpiar canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    // Configurar grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    // Líneas horizontales (valores)
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Etiquetas de valores
      if (i % 2 === 0) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px monospace';
        const value = (stats.max - stats.min) * (1 - i / 10) + stats.min;
        ctx.fillText(`${value.toFixed(1)}ms`, 5, y - 2);
      }
    }

    // Líneas verticales (tiempo)
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Dibujar línea base (promedio)
    const avgY = height - ((stats.average - stats.min) / (stats.max - stats.min)) * height;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, avgY);
    ctx.lineTo(width, avgY);
    ctx.stroke();

    // Dibujar datos
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = width / Math.max(deltaTimeData.length - 1, 1);
    deltaTimeData.forEach((dt, index) => {
      const x = index * step;
      const normalizedValue = (dt - stats.min) / (stats.max - stats.min);
      const y = height - normalizedValue * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Rellenar área bajo la curva
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.beginPath();
    deltaTimeData.forEach((dt, index) => {
      const x = index * step;
      const normalizedValue = (dt - stats.min) / (stats.max - stats.min);
      const y = height - normalizedValue * height;

      if (index === 0) {
        ctx.moveTo(x, height);
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

  }, [deltaTimeData, stats]);

  const getStabilityColor = (stability) => {
    if (stability > 0.8) return 'text-green-400';
    if (stability > 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStabilityText = (stability) => {
    if (stability > 0.8) return 'Muy Estable';
    if (stability > 0.6) return 'Moderadamente Estable';
    return 'Variable';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-800 p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">📊 Osciloscopio de Delta-Time</h2>
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

        {/* Estadísticas */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-700 p-4 rounded text-center">
            <div className="text-lg font-bold text-cyan-400">{stats.average.toFixed(2)}ms</div>
            <div className="text-sm text-slate-400">Promedio</div>
          </div>
          <div className="bg-slate-700 p-4 rounded text-center">
            <div className="text-lg font-bold text-green-400">{stats.min.toFixed(2)}ms</div>
            <div className="text-sm text-slate-400">Mínimo</div>
          </div>
          <div className="bg-slate-700 p-4 rounded text-center">
            <div className="text-lg font-bold text-red-400">{stats.max.toFixed(2)}ms</div>
            <div className="text-sm text-slate-400">Máximo</div>
          </div>
          <div className="bg-slate-700 p-4 rounded text-center">
            <div className={`text-lg font-bold ${getStabilityColor(stats.stability)}`}>
              {(stats.stability * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-slate-400">Estabilidad</div>
          </div>
        </div>

        {/* Canvas del osciloscopio */}
        <div className="bg-slate-900 p-4 rounded mb-6">
          <canvas
            ref={canvasRef}
            width={800}
            height={300}
            className="w-full border border-slate-600 rounded"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>← Más antiguo</span>
            <span>Ahora →</span>
          </div>
        </div>

        {/* Leyenda */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-blue-400 mb-2">🎯 Interpretación</h4>
            <ul className="text-slate-300 space-y-1">
              <li>• <span className="text-green-400">Línea verde</span>: Delta-time actual</li>
              <li>• <span className="text-yellow-400">Línea amarilla</span>: Promedio</li>
              <li>• <span className="text-green-400">Área verde</span>: Variación del promedio</li>
              <li>• <span className="text-cyan-400">Grid</span>: Escala de tiempo/valores</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-purple-400 mb-2">📈 Estado: {getStabilityText(stats.stability)}</h4>
            <ul className="text-slate-300 space-y-1">
              <li>• <span className="text-green-400">Estable</span>: VSync funcionando bien</li>
              <li>• <span className="text-yellow-400">Moderado</span>: Pequeñas variaciones</li>
              <li>• <span className="text-red-400">Variable</span>: Problemas de rendimiento</li>
              <li>• Frames: {deltaTimeData.length} mostrados</li>
            </ul>
          </div>
        </div>

        {/* Consejos de optimización */}
        <div className="mt-6 bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">⚡ Consejos de Optimización</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• Delta-time estable indica buena sincronización con VSync</li>
            <li>• Picos frecuentes sugieren frame drops o GC pauses</li>
            <li>• Variaciones altas pueden causar stuttering visual</li>
            <li>• El scheduler fixed timestep ayuda a mantener estabilidad</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
