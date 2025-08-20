# 🚀 ECS Playground - Juego Educativo Entity-Component-System

Un juego educativo interactivo desarrollado con **React 18**, **Three.js** y **Vite** que enseña los conceptos fundamentales del patrón arquitectónico **Entity-Component-System (ECS)** de forma práctica y visual.

![ECS Playground](https://img.shields.io/badge/ECS-Educativo-blue) ![React 18](https://img.shields.io/badge/React-18.0-blue) ![Three.js](https://img.shields.io/badge/Three.js-r150-green) ![Vite](https://img.shields.io/badge/Vite-5.0-yellow)

## 🎯 ¿Qué es ECS Playground?

**ECS Playground** es una experiencia de aprendizaje inmersiva que te enseña los principios del patrón **Entity-Component-System** a través de un videojuego educativo. En lugar de leer teoría abstracta, **juegas y experimentas** con cada concepto mientras construyes tu propio motor de juego ECS.

### 🎮 Características Principales

- **🏗️ 10 Niveles Progresivos**: Desde conceptos básicos hasta patrones avanzados
- **🎨 Visualización en Tiempo Real**: Ve cómo funcionan los sistemas ECS en 3D
- **🧪 Laboratorio Interactivo**: Experimenta con entidades, componentes y sistemas
- **📊 Herramientas de Debug**: Paneles de rendimiento y optimización
- **💾 Persistencia**: Guarda y carga estados del juego
- **🌳 Jerarquías Visuales**: Gestiona relaciones padre-hijo
- **🎛️ Recursos Globales**: Maneja configuraciones compartidas

## 📚 ¿Qué Aprenderás?

### Nivel 1: Entidades 🏗️
- Concepto de entidades como identificadores únicos
- Separación entre identidad y comportamiento
- Creación y eliminación de entidades

### Nivel 2: Componentes 📦
- Componentes como estructuras de datos puras
- Composición sobre herencia
- Tipos de componentes y sus usos

### Nivel 3: Sistemas ⚙️
- Lógica del juego en sistemas independientes
- Queries para encontrar entidades
- Bucle de juego y actualización

### Nivel 4: Queries y Arquetipos 🔍
- Optimización de acceso a datos
- Arquetipos para agrupar entidades similares
- Cache-friendly data layouts

### Nivel 5: Eventos y Mensajería 📡
- Comunicación desacoplada entre sistemas
- Colas de eventos y procesamiento
- Patrones de mensajería

### Nivel 6: Recursos y Datos Globales 🎛️
- Manejo de datos globales
- Configuraciones compartidas
- Estados del juego

### Nivel 7: Scheduling y Determinismo ⏰
- Orden de ejecución de sistemas
- Time step fijo vs variable
- Simulaciones consistentes

### Nivel 8: Jerarquías y Relaciones 🌳
- Relaciones padre-hijo
- Transformaciones locales y mundiales
- Objetos compuestos

### Nivel 9: Persistencia y Prefabs 💾
- Guardado y carga de estados
- Plantillas reutilizables (prefabs)
- Serialización de datos

### Nivel 10: Minijuego Final 🎮
- Combinar todos los conceptos
- Arquitectura de juego completa
- Extender funcionalidad sin tocar código existente

## 🚀 Instalación y Ejecución

### Prerrequisitos
- Node.js 18+
- npm o yarn

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/tuusuario/ecs-playground.git
cd ecs-playground

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
npm run preview
```

### Uso
1. Abre `http://localhost:5173` en tu navegador
2. Comienza con el **Nivel 1** y lee la teoría
3. Completa los objetivos interactivos
4. Usa el **Panel ECS** para experimentar
5. Avanza nivel por nivel aprendiendo ECS

## 🏗️ Arquitectura del Proyecto

```
src/
├── ecs/                    # Núcleo del motor ECS
│   ├── world.js           # Mundo ECS principal
│   ├── components.js      # Definiciones de componentes
│   ├── systems.js         # Implementación de sistemas
│   ├── queryOptimizer.js  # Optimización de queries
│   ├── persistence.js     # Guardado y carga
│   └── resources.js       # Recursos globales
├── components/            # Componentes React
│   ├── ui/               # Interfaz de usuario
│   │   ├── TheoryPanel.jsx    # Panel de teoría
│   │   ├── ECSPanel.jsx      # Panel ECS
│   │   ├── ConsolePanel.jsx  # Consola
│   │   ├── PerformancePanel.jsx # Rendimiento
│   │   ├── ResourcePanel.jsx   # Recursos
│   │   └── PersistencePanel.jsx # Persistencia
│   └── scene/            # Renderizado 3D
│       └── EntityRenderer.jsx
├── levels/               # Sistema de niveles
│   ├── LevelManager.jsx  # Gestión de niveles
│   └── LevelSystem.jsx   # Lógica de niveles
├── hooks/                # Hooks personalizados
│   └── useECS.js         # Hook principal del ECS
└── styles/               # Estilos CSS
    └── GameStyles.css    # Estilos del juego
```

## 🎯 Conceptos ECS Explicados

### Entidades (Entities)
```javascript
// Las entidades son solo IDs únicos
const playerId = world.createEntity('Jugador');
// playerId = 1

// Sin comportamiento, solo identidad
// ¡Las entidades NO tienen métodos!
```

### Componentes (Components)
```javascript
// Estructuras de datos puras, sin lógica
const PositionComponent = {
  x: 0, y: 0, z: 0
};

const HealthComponent = {
  current: 100,
  maximum: 100,
  regeneration: 5
};

// Añadir componentes a entidades
world.addComponent(playerId, 'Transform', { x: 10, y: 0, z: 0 });
world.addComponent(playerId, 'Health', { current: 100, maximum: 100 });
```

### Sistemas (Systems)
```javascript
// La lógica vive en sistemas separados
class MovementSystem {
  update(deltaTime, world) {
    // Encontrar entidades con Transform y Velocity
    const query = world.createQuery(['Transform', 'Velocity']);
    const entities = world.getQueryResults(query);

    // Procesar cada entidad
    for (const entityId of entities) {
      const transform = world.getComponent(entityId, 'Transform');
      const velocity = world.getComponent(entityId, 'Velocity');

      // Aplicar movimiento
      transform.x += velocity.x * deltaTime;
      transform.y += velocity.y * deltaTime;
      transform.z += velocity.z * deltaTime;
    }
  }
}
```

### Queries y Arquetipos
```javascript
// Las queries encuentran entidades por componentes
const enemies = world.createQuery(['Health', 'Damage', 'AI']);

// Los arquetipos optimizan el acceso
// Entidades con [Transform, Velocity] se agrupan automáticamente
// Entidades con [Transform, Color] se agrupan automáticamente
// Esto acelera el acceso a datos hasta 10x
```

## 🎮 Controles del Juego

- **WASD**: Movimiento del jugador
- **Espacio**: Saltar
- **Click**: Seleccionar entidades
- **Panel ECS**: Crear entidades, componentes y sistemas
- **Panel de Recursos**: Ajustar parámetros globales
- **Panel de Rendimiento**: Ver optimizaciones y estadísticas

## 🧪 Paneles Interactivos

### 🏗️ Panel ECS
- Crear entidades con geometrías 3D
- Añadir y remover componentes
- Ver estadísticas del mundo
- Gestionar sistemas activos

### 📚 Panel de Teoría
- Contenido educativo por nivel
- Explicaciones detalladas
- Consejos de mejores prácticas
- Progreso visual

### 🎛️ Panel de Recursos
- Parámetros globales (gravedad, dificultad)
- Configuraciones del juego
- Estados compartidos
- Temporizadores globales

### 💾 Panel de Persistencia
- Crear prefabs reutilizables
- Guardar/cargar mundos
- Exportar/importar entidades
- Gestión de plantillas

### 📊 Panel de Rendimiento
- Estadísticas de sistemas
- Optimización de queries
- Lupa de memoria didáctica
- Métricas de cache

## 🚀 Tecnologías Utilizadas

- **React 18**: UI moderna y componentes reutilizables
- **Three.js + React Three Fiber**: Renderizado 3D declarativo
- **React Three Drei**: Utilidades 3D adicionales
- **Tailwind CSS**: Estilos utilitarios modernos
- **Vite**: Build tool rápido y desarrollo optimizado
- **JavaScript ES6+**: Características modernas del lenguaje

## 🎯 Metas de Aprendizaje

Después de completar ECS Playground, podrás:

1. ✅ Entender los principios fundamentales de ECS
2. ✅ Diseñar sistemas modulares y reutilizables
3. ✅ Optimizar el rendimiento con queries y arquetipos
4. ✅ Gestionar estados complejos con recursos globales
5. ✅ Implementar jerarquías y relaciones
6. ✅ Crear juegos extensibles con prefabs
7. ✅ Depurar y optimizar sistemas ECS
8. ✅ Aplicar ECS en proyectos reales

## 📈 Niveles de Dificultad

- **Principiante**: Niveles 1-2 (Entidades y Componentes)
- **Intermedio**: Niveles 3-5 (Sistemas, Queries, Eventos)
- **Avanzado**: Niveles 6-8 (Recursos, Scheduling, Jerarquías)
- **Experto**: Niveles 9-10 (Persistencia, Extensibilidad)

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Si quieres mejorar ECS Playground:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Ideas para Contribuciones
- Nuevos tipos de componentes
- Sistemas más complejos
- Mejores visualizaciones
- Más niveles educativos
- Traducciones
- Tutoriales adicionales

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- **React Team** por la increíble librería
- **Three.js Team** por el motor 3D
- **Comunidad de Game Development** por los conocimientos compartidos
- **Patrón ECS** por la arquitectura elegante

## 📞 Contacto

¿Preguntas sobre ECS o el proyecto? ¡No dudes en abrir un issue!

---

**¡Feliz aprendizaje!** 🎮✨

*Construido con ❤️ para la comunidad de desarrollo de juegos*
