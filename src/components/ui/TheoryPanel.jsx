import { useState } from 'react';

const LEVEL_CONTENT = {
  1: {
    title: "🏗️ Nivel 1: Entidades",
    definition: "Las entidades son identificadores únicos que representan objetos del juego. No contienen datos ni comportamiento, solo sirven para agrupar componentes.",
    intuition: "Imagina que cada entidad es como una etiqueta de equipaje en un aeropuerto. La etiqueta no lleva nada, solo identifica a quién pertenece el equipaje (los componentes).",
    whenToUse: "Siempre que necesites representar algo en el mundo del juego.",
    whenNotToUse: "No uses entidades para datos globales o configuraciones que no representan objetos individuales.",
    traps: "No intentes almacenar datos directamente en entidades. Recuerda: ¡entidades = IDs únicos!",
    demo: "Crea algunas entidades y observa cómo solo tienen IDs. Luego añade componentes para darles propiedades."
  },
  2: {
    title: "📦 Nivel 2: Componentes",
    definition: "Los componentes son estructuras de datos puras que contienen la información de las entidades. No tienen métodos, solo datos.",
    intuition: "Los componentes son como las características de un personaje en una ficha de rol: fuerza, agilidad, inteligencia... separados para poder mezclarlos libremente.",
    whenToUse: "Para cualquier dato que una entidad pueda tener: posición, velocidad, color, salud, etc.",
    whenNotToUse: "No pongas lógica en componentes. Evita jerarquías profundas de componentes.",
    traps: "No caigas en la tentación de hacer componentes que 'hereden' de otros. Cada componente debe ser independiente.",
    demo: "Añade componentes Transform, Velocity y Color a tus entidades y observa cómo cada uno aporta una capacidad específica."
  },
  3: {
    title: "⚙️ Nivel 3: Sistemas y Bucle de Juego",
    definition: "Los sistemas contienen la lógica del juego. Operan sobre entidades que tienen ciertos componentes, procesándolos en cada frame.",
    intuition: "Si las entidades son sustantivos y los componentes adjetivos, los sistemas son los verbos: hacen que las cosas pasen.",
    whenToUse: "Para implementar cualquier comportamiento: movimiento, colisiones, IA, renderizado...",
    whenNotToUse: "No uses sistemas para datos. Evita que los sistemas sepan unos de otros directamente.",
    traps: "Resiste la tentación de hacer sistemas 'inteligentes'. Deben ser funciones puras que procesan datos.",
    demo: "Activa el sistema de movimiento y observa cómo actualiza las posiciones basado en las velocidades."
  },
  4: {
    title: "🔍 Nivel 4: Queries y Arquetipos",
    definition: "Las queries permiten encontrar entidades que tienen conjuntos específicos de componentes. Los arquetipos agrupan entidades similares.",
    intuition: "Es como buscar en una base de datos: 'dame todos los productos que cuesten menos de 10€ y sean rojos'.",
    whenToUse: "Siempre que necesites procesar entidades con características específicas.",
    whenNotToUse: "No hagas queries en cada frame para los mismos datos. Reutiliza las queries.",
    traps: "No modifiques componentes mientras iteras sobre una query. Invalida y recrea si es necesario.",
    demo: "Crea queries para diferentes combinaciones de componentes y observa cómo se optimiza el acceso a datos."
  },
  5: {
    title: "📡 Nivel 5: Eventos y Mensajería",
    definition: "Los eventos permiten comunicación desacoplada entre sistemas. Un sistema emite eventos, otros los consumen.",
    intuition: "Como un sistema de megafonía en una tienda: el sistema de sonido anuncia 'rebajas', los compradores responden.",
    whenToUse: "Para comunicación entre sistemas que no deben conocerse directamente: colisiones, daños, logros...",
    whenNotToUse: "No uses eventos para todo. Las queries directas son más eficientes para datos frecuentes.",
    traps: "No acumules eventos indefinidamente. Limpia eventos antiguos para evitar memory leaks.",
    demo: "Causa colisiones entre entidades y observa cómo se propagan los eventos de daño."
  }
};

export default function TheoryPanel({ levelData, progress }) {
  const [expandedSection, setExpandedSection] = useState(null);
  const [showDemo, setShowDemo] = useState(false);

  if (!levelData) return null;

  const content = levelData;

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          {content.title}
        </h2>
        <p className="text-sm text-slate-400 mb-4 leading-relaxed">{content.description}</p>

        {/* Teoría */}
        {content.theory && (
          <>
            {/* Definición */}
            <div className="mb-4">
              <button
                className="w-full text-left font-semibold text-green-400 mb-2 flex items-center hover:text-green-300 transition-colors"
                onClick={() => setExpandedSection(expandedSection === 'definition' ? null : 'definition')}
              >
                <span className="mr-2 text-lg">{expandedSection === 'definition' ? '📖' : '📚'}</span>
                Definición
                <span className="ml-2">{expandedSection === 'definition' ? '▼' : '▶'}</span>
              </button>
              {expandedSection === 'definition' && (
                <div className="pl-8 pr-4 py-3 bg-slate-800/50 rounded-lg border-l-4 border-green-400">
                  <p className="text-sm text-slate-200 leading-relaxed">{content.theory.definition}</p>
                </div>
              )}
            </div>

            {/* Intuición */}
            <div className="mb-4">
              <button
                className="w-full text-left font-semibold text-ecs-purple mb-2 flex items-center"
                onClick={() => setExpandedSection(expandedSection === 'intuition' ? null : 'intuition')}
              >
                <span className="mr-2">{expandedSection === 'intuition' ? '▼' : '▶'}</span>
                Intuición
              </button>
              {expandedSection === 'intuition' && (
                <p className="text-sm text-gray-300 pl-6">{content.theory.intuition}</p>
              )}
            </div>

            {/* Cuándo usar */}
            <div className="mb-4">
              <button
                className="w-full text-left font-semibold text-green-400 mb-2 flex items-center"
                onClick={() => setExpandedSection(expandedSection === 'when' ? null : 'when')}
              >
                <span className="mr-2">{expandedSection === 'when' ? '▼' : '▶'}</span>
                Cuándo usarlo
              </button>
              {expandedSection === 'when' && (
                <div className="pl-6">
                  <p className="text-sm text-gray-300 mb-2">{content.theory.whenToUse}</p>
                  <p className="text-sm text-red-300">{content.theory.whenNotToUse}</p>
                </div>
              )}
            </div>

            {/* Trampas típicas */}
            <div className="mb-4">
              <button
                className="w-full text-left font-semibold text-red-400 mb-2 flex items-center"
                onClick={() => setExpandedSection(expandedSection === 'traps' ? null : 'traps')}
              >
                <span className="mr-2">{expandedSection === 'traps' ? '▼' : '▶'}</span>
                Trampas típicas
              </button>
              {expandedSection === 'traps' && (
                <p className="text-sm text-gray-300 pl-6">{content.theory.traps}</p>
              )}
            </div>
          </>
        )}

        {/* Objetivos del nivel */}
        {content.objectives && (
          <div className="mb-4">
            <h3 className="font-semibold text-ecs-blue mb-2">🎯 Objetivos</h3>
            <div className="space-y-2">
              {content.objectives.map((objective, index) => (
                <div key={objective.id} className="flex items-center text-sm">
                  <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center text-xs ${
                    progress && progress[index] ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-400'
                  }`}>
                    {progress && progress[index] ? '✓' : index + 1}
                  </div>
                  <span className={progress && progress[index] ? 'text-green-300' : 'text-gray-300'}>
                    {objective.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demo guiada */}
        {content.demoSteps && (
          <div className="mt-6">
            <button
              className="w-full bg-ecs-blue hover:bg-blue-600 px-4 py-2 rounded mb-3"
              onClick={() => setShowDemo(!showDemo)}
            >
              {showDemo ? 'Ocultar' : 'Mostrar'} Pasos Guiados
            </button>

            {showDemo && (
              <div className="bg-gray-700 p-3 rounded">
                <h4 className="font-semibold mb-2">Pasos para completar el nivel:</h4>
                <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                  {content.demoSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Progreso del nivel */}
        <div className="mt-4 pt-4 border-t border-gray-600">
          <div className="text-xs text-gray-400 mb-2">Progreso del nivel</div>
          {content.objectives && (
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-ecs-blue h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progress ? (Object.values(progress).filter(Boolean).length / content.objectives.length) * 100 : 0}%`
                }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


