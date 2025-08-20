/**
 * Sistema de Input Declarativo para ECS
 * Maneja entrada de usuario de manera declarativa con mapeo de acciones y múltiples backends
 */

export class InputSystem {
  constructor() {
    this.name = 'InputSystem';
    this.lastExecutionTime = 0;

    // Estado de entrada actual
    this.currentInputState = {
      actions: new Map(), // actionName -> { pressed, justPressed, justReleased, value }
      axes: new Map(),    // axisName -> value (-1 to 1)
      mouse: {
        position: { x: 0, y: 0 },
        delta: { x: 0, y: 0 },
        wheel: 0,
        buttons: new Map() // button -> state
      },
      touch: {
        touches: [],
        gestures: new Map()
      }
    };

    // Configuración de mapeo de acciones
    this.actionMaps = new Map();

    // Backends de entrada
    this.backends = {
      keyboard: new KeyboardBackend(),
      mouse: new MouseBackend(),
      gamepad: new GamepadBackend(),
      touch: new TouchBackend()
    };

    // Configuración
    this.config = {
      deadzone: 0.1,           // Zona muerta para joysticks
      mouseSensitivity: 0.002, // Sensibilidad del ratón
      enableKeyboard: true,
      enableMouse: true,
      enableGamepad: true,
      enableTouch: true,
      updateRate: 60          // Hz
    };

    // Estado interno
    this.previousState = {
      actions: new Map(),
      axes: new Map(),
      mouse: { buttons: new Map() }
    };

    // Edge Detection Buffers
    this.edgeBuffers = {
      actions: new Map(), // actionName -> { downBuffer, heldBuffer, upBuffer }
      buttons: new Map(), // buttonId -> { downBuffer, heldBuffer, upBuffer }
      keys: new Map()     // keyCode -> { downBuffer, heldBuffer, upBuffer }
    };

    // Configuración de buffers
    this.bufferConfig = {
      maxBufferSize: 10,        // Máximo número de frames en buffer
      clearDelay: 5,           // Frames para limpiar buffers antiguos
      enableBuffering: true    // Habilitar/deshabilitar buffering
    };

    // Estadísticas
    this.stats = {
      actionsActive: 0,
      backendsActive: 0,
      inputEvents: 0,
      bufferedEvents: 0,
      lastUpdate: 0
    };

    this.name = 'InputSystem';
    this.lastExecutionTime = 0;

    // Inicializar backends
    this.initializeBackends();
  }

  update(deltaTime, world) {
    const startTime = performance.now();

    // Actualizar backends
    this.updateBackends();

    // Procesar mapeo de acciones
    this.processActionMapping();

    // Detectar cambios (justPressed, justReleased)
    this.detectEdgeTriggers();

    // Actualizar componentes InputState en ECS
    this.updateInputComponents(world);

    // Limpiar eventos de un solo frame
    this.clearFrameEvents();

    this.stats.lastUpdate = performance.now();
    this.lastExecutionTime = performance.now() - startTime;
  }

  initializeBackends() {
    // Inicializar backends activos
    Object.entries(this.backends).forEach(([name, backend]) => {
      if (this.config[`enable${name.charAt(0).toUpperCase() + name.slice(1)}`]) {
        backend.initialize(this);
        this.stats.backendsActive++;
      }
    });

    console.log(`🎮 Sistema de Input inicializado con ${this.stats.backendsActive} backends`);
  }

  updateBackends() {
    // Actualizar cada backend activo
    Object.entries(this.backends).forEach(([name, backend]) => {
      if (this.config[`enable${name.charAt(0).toUpperCase() + name.slice(1)}`]) {
        backend.update();
      }
    });
  }

  // === MAPEO DE ACCIONES ===

  createActionMap(name, mappings) {
    this.actionMaps.set(name, {
      name,
      mappings: new Map(Object.entries(mappings)),
      active: true
    });

    console.log(`🎯 Action map "${name}" creado con ${mappings.length} acciones`);
    return this;
  }

  addActionMapping(actionMapName, actionName, bindings) {
    const actionMap = this.actionMaps.get(actionMapName);
    if (!actionMap) {
      console.warn(`Action map "${actionMapName}" no encontrado`);
      return this;
    }

    actionMap.mappings.set(actionName, bindings);
    return this;
  }

  processActionMapping() {
    // Reset actions
    this.currentInputState.actions.clear();

    // Procesar cada action map activo
    for (const [mapName, actionMap] of this.actionMaps) {
      if (!actionMap.active) continue;

      // Procesar cada acción en el mapa
      for (const [actionName, bindings] of actionMap.mappings) {
        const actionState = this.evaluateAction(bindings);
        this.currentInputState.actions.set(actionName, actionState);
      }
    }

    this.stats.actionsActive = this.currentInputState.actions.size;
  }

  evaluateAction(bindings) {
    let pressed = false;
    let value = 0;

    // Evaluar todos los bindings para esta acción
    for (const binding of bindings) {
      const bindingValue = this.evaluateBinding(binding);

      if (bindingValue.pressed) {
        pressed = true;
      }

      // Usar el valor más alto
      if (Math.abs(bindingValue.value) > Math.abs(value)) {
        value = bindingValue.value;
      }
    }

    return { pressed, value };
  }

  evaluateBinding(binding) {
    switch (binding.type) {
      case 'key':
        return this.evaluateKeyBinding(binding);

      case 'mouseButton':
        return this.evaluateMouseBinding(binding);

      case 'mouseAxis':
        return this.evaluateMouseAxisBinding(binding);

      case 'gamepadButton':
        return this.evaluateGamepadButtonBinding(binding);

      case 'gamepadAxis':
        return this.evaluateGamepadAxisBinding(binding);

      case 'touch':
        return this.evaluateTouchBinding(binding);

      default:
        return { pressed: false, value: 0 };
    }
  }

  evaluateKeyBinding(binding) {
    const keyboard = this.backends.keyboard;
    const pressed = keyboard.isKeyPressed(binding.key);
    return { pressed, value: pressed ? 1 : 0 };
  }

  evaluateMouseBinding(binding) {
    const mouse = this.backends.mouse;
    const pressed = mouse.isButtonPressed(binding.button);
    return { pressed, value: pressed ? 1 : 0 };
  }

  evaluateMouseAxisBinding(binding) {
    const mouse = this.backends.mouse;
    const axisValue = mouse.getAxisValue(binding.axis);
    const processed = Math.abs(axisValue) > this.config.deadzone ? axisValue : 0;
    return { pressed: processed !== 0, value: processed };
  }

  evaluateGamepadButtonBinding(binding) {
    const gamepad = this.backends.gamepad;
    const pressed = gamepad.isButtonPressed(binding.button, binding.gamepadIndex || 0);
    return { pressed, value: pressed ? 1 : 0 };
  }

  evaluateGamepadAxisBinding(binding) {
    const gamepad = this.backends.gamepad;
    const axisValue = gamepad.getAxisValue(binding.axis, binding.gamepadIndex || 0);
    const processed = Math.abs(axisValue) > this.config.deadzone ? axisValue : 0;
    return { pressed: processed !== 0, value: processed };
  }

  evaluateTouchBinding(binding) {
    const touch = this.backends.touch;
    const touchState = touch.getTouchState(binding.gesture || 'tap');
    return { pressed: touchState.active, value: touchState.value };
  }

  detectEdgeTriggers() {
    // Detectar justPressed y justReleased
    for (const [actionName, currentState] of this.currentInputState.actions) {
      const previousState = this.previousState.actions.get(actionName) || { pressed: false };

      currentState.justPressed = currentState.pressed && !previousState.pressed;
      currentState.justReleased = !currentState.pressed && previousState.pressed;

      // Actualizar buffers de edge detection
      if (this.bufferConfig.enableBuffering) {
        this.updateActionBuffers(actionName, currentState);
      }
    }

    // Copiar estado actual a anterior
    this.previousState.actions = new Map(this.currentInputState.actions);
    this.previousState.axes = new Map(this.currentInputState.axes);
    this.previousState.mouse.buttons = new Map(this.currentInputState.mouse.buttons);
  }

  updateActionBuffers(actionName, currentState) {
    let buffers = this.edgeBuffers.actions.get(actionName);

    if (!buffers) {
      buffers = {
        downBuffer: [],
        heldBuffer: [],
        upBuffer: [],
        lastFrame: -1
      };
      this.edgeBuffers.actions.set(actionName, buffers);
    }

    const currentFrame = performance.now();

    // Añadir a buffers según estado
    if (currentState.justPressed) {
      buffers.downBuffer.push({
        timestamp: currentFrame,
        value: currentState.value
      });
      this.trimBuffer(buffers.downBuffer);
    }

    if (currentState.pressed) {
      buffers.heldBuffer.push({
        timestamp: currentFrame,
        value: currentState.value
      });
      this.trimBuffer(buffers.heldBuffer);
    }

    if (currentState.justReleased) {
      buffers.upBuffer.push({
        timestamp: currentFrame,
        value: currentState.value
      });
      this.trimBuffer(buffers.upBuffer);
    }

    // Limpiar buffers antiguos
    this.clearOldBuffers(buffers, currentFrame);
    buffers.lastFrame = currentFrame;
  }

  updateKeyBuffers(keyCode, isPressed, timestamp) {
    if (!this.bufferConfig.enableBuffering) return;

    let buffers = this.edgeBuffers.keys.get(keyCode);

    if (!buffers) {
      buffers = {
        downBuffer: [],
        heldBuffer: [],
        upBuffer: [],
        lastFrame: -1,
        wasPressed: false
      };
      this.edgeBuffers.keys.set(keyCode, buffers);
    }

    // Detectar cambios
    const justPressed = isPressed && !buffers.wasPressed;
    const justReleased = !isPressed && buffers.wasPressed;

    if (justPressed) {
      buffers.downBuffer.push({
        timestamp: timestamp,
        value: 1
      });
      this.trimBuffer(buffers.downBuffer);
    }

    if (isPressed) {
      buffers.heldBuffer.push({
        timestamp: timestamp,
        value: 1
      });
      this.trimBuffer(buffers.heldBuffer);
    }

    if (justReleased) {
      buffers.upBuffer.push({
        timestamp: timestamp,
        value: 1
      });
      this.trimBuffer(buffers.upBuffer);
    }

    // Limpiar buffers antiguos
    this.clearOldBuffers(buffers, timestamp);
    buffers.lastFrame = timestamp;
    buffers.wasPressed = isPressed;
  }

  updateButtonBuffers(buttonId, isPressed, timestamp) {
    if (!this.bufferConfig.enableBuffering) return;

    let buffers = this.edgeBuffers.buttons.get(buttonId);

    if (!buffers) {
      buffers = {
        downBuffer: [],
        heldBuffer: [],
        upBuffer: [],
        lastFrame: -1,
        wasPressed: false
      };
      this.edgeBuffers.buttons.set(buttonId, buffers);
    }

    // Detectar cambios
    const justPressed = isPressed && !buffers.wasPressed;
    const justReleased = !isPressed && buffers.wasPressed;

    if (justPressed) {
      buffers.downBuffer.push({
        timestamp: timestamp,
        value: 1
      });
      this.trimBuffer(buffers.downBuffer);
    }

    if (isPressed) {
      buffers.heldBuffer.push({
        timestamp: timestamp,
        value: 1
      });
      this.trimBuffer(buffers.heldBuffer);
    }

    if (justReleased) {
      buffers.upBuffer.push({
        timestamp: timestamp,
        value: 1
      });
      this.trimBuffer(buffers.upBuffer);
    }

    // Limpiar buffers antiguos
    this.clearOldBuffers(buffers, timestamp);
    buffers.lastFrame = timestamp;
    buffers.wasPressed = isPressed;
  }

  trimBuffer(buffer) {
    if (buffer.length > this.bufferConfig.maxBufferSize) {
      buffer.splice(0, buffer.length - this.bufferConfig.maxBufferSize);
    }
  }

  clearOldBuffers(buffers, currentTime) {
    const maxAge = this.bufferConfig.clearDelay * (1000 / 60); // Convertir frames a ms

    buffers.downBuffer = buffers.downBuffer.filter(
      event => currentTime - event.timestamp < maxAge
    );
    buffers.heldBuffer = buffers.heldBuffer.filter(
      event => currentTime - event.timestamp < maxAge
    );
    buffers.upBuffer = buffers.upBuffer.filter(
      event => currentTime - event.timestamp < maxAge
    );
  }

  clearFrameEvents() {
    // Los eventos justPressed y justReleased se limpian automáticamente
    // en el siguiente frame por detectEdgeTriggers
  }

  updateInputComponents(world) {
    // Actualizar componentes InputState en entidades
    const inputEntities = world.queryEntities({
      components: ['InputState']
    });

    for (const entityId of inputEntities) {
      const inputState = world.getComponent(entityId, 'InputState');

      if (inputState) {
        // Actualizar estado de acciones
        this.currentInputState.actions.forEach((actionState, actionName) => {
          if (inputState.actions.hasOwnProperty(actionName)) {
            inputState.actions[actionName] = {
              pressed: actionState.pressed,
              justPressed: actionState.justPressed,
              justReleased: actionState.justReleased,
              value: actionState.value
            };
          }
        });

        // Actualizar estado de ejes
        this.currentInputState.axes.forEach((axisValue, axisName) => {
          if (inputState.axes.hasOwnProperty(axisName)) {
            inputState.axes[axisName] = axisValue;
          }
        });

        // Actualizar estado del ratón
        inputState.mouse = { ...this.currentInputState.mouse };

        // Marcar como actualizado
        inputState.lastUpdate = performance.now();
      }
    }
  }

  // === API PÚBLICA ===

  isActionPressed(actionName) {
    const action = this.currentInputState.actions.get(actionName);
    return action ? action.pressed : false;
  }

  isActionJustPressed(actionName) {
    const action = this.currentInputState.actions.get(actionName);
    return action ? action.justPressed : false;
  }

  isActionJustReleased(actionName) {
    const action = this.currentInputState.actions.get(actionName);
    return action ? action.justReleased : false;
  }

  getActionValue(actionName) {
    const action = this.currentInputState.actions.get(actionName);
    return action ? action.value : 0;
  }

  getAxisValue(axisName) {
    return this.currentInputState.axes.get(axisName) || 0;
  }

  getMousePosition() {
    return { ...this.currentInputState.mouse.position };
  }

  getMouseDelta() {
    return { ...this.currentInputState.mouse.delta };
  }

  // === EDGE DETECTION BUFFER API ===

  // Obtener buffer de eventos down (pressed) para una acción
  getActionDownBuffer(actionName, maxEvents = 5) {
    const buffers = this.edgeBuffers.actions.get(actionName);
    if (!buffers) return [];

    return buffers.downBuffer.slice(-maxEvents);
  }

  // Obtener buffer de eventos held para una acción
  getActionHeldBuffer(actionName, maxEvents = 5) {
    const buffers = this.edgeBuffers.actions.get(actionName);
    if (!buffers) return [];

    return buffers.heldBuffer.slice(-maxEvents);
  }

  // Obtener buffer de eventos up (released) para una acción
  getActionUpBuffer(actionName, maxEvents = 5) {
    const buffers = this.edgeBuffers.actions.get(actionName);
    if (!buffers) return [];

    return buffers.upBuffer.slice(-maxEvents);
  }

  // Obtener todos los buffers para una acción
  getActionBuffers(actionName) {
    const buffers = this.edgeBuffers.actions.get(actionName);
    if (!buffers) {
      return {
        downBuffer: [],
        heldBuffer: [],
        upBuffer: [],
        totalEvents: 0
      };
    }

    return {
      downBuffer: [...buffers.downBuffer],
      heldBuffer: [...buffers.heldBuffer],
      upBuffer: [...buffers.upBuffer],
      totalEvents: buffers.downBuffer.length + buffers.heldBuffer.length + buffers.upBuffer.length
    };
  }

  // Obtener buffer de teclas
  getKeyBuffer(keyCode, bufferType = 'down', maxEvents = 5) {
    const buffers = this.edgeBuffers.keys.get(keyCode);
    if (!buffers) return [];

    switch (bufferType) {
      case 'down':
        return buffers.downBuffer.slice(-maxEvents);
      case 'held':
        return buffers.heldBuffer.slice(-maxEvents);
      case 'up':
        return buffers.upBuffer.slice(-maxEvents);
      default:
        return [];
    }
  }

  // Obtener buffer de botones
  getButtonBuffer(buttonId, bufferType = 'down', maxEvents = 5) {
    const buffers = this.edgeBuffers.buttons.get(buttonId);
    if (!buffers) return [];

    switch (bufferType) {
      case 'down':
        return buffers.downBuffer.slice(-maxEvents);
      case 'held':
        return buffers.heldBuffer.slice(-maxEvents);
      case 'up':
        return buffers.upBuffer.slice(-maxEvents);
      default:
        return [];
    }
  }

  // Verificar si hay eventos en buffer para una acción
  hasBufferedAction(actionName, bufferType = 'down') {
    const buffers = this.edgeBuffers.actions.get(actionName);
    if (!buffers) return false;

    switch (bufferType) {
      case 'down':
        return buffers.downBuffer.length > 0;
      case 'held':
        return buffers.heldBuffer.length > 0;
      case 'up':
        return buffers.upBuffer.length > 0;
      default:
        return false;
    }
  }

  // Consumir eventos del buffer (útil para evitar múltiples procesamientos)
  consumeActionBuffer(actionName, bufferType = 'down') {
    const buffers = this.edgeBuffers.actions.get(actionName);
    if (!buffers) return [];

    let consumedEvents = [];

    switch (bufferType) {
      case 'down':
        consumedEvents = [...buffers.downBuffer];
        buffers.downBuffer.length = 0;
        break;
      case 'held':
        consumedEvents = [...buffers.heldBuffer];
        buffers.heldBuffer.length = 0;
        break;
      case 'up':
        consumedEvents = [...buffers.upBuffer];
        buffers.upBuffer.length = 0;
        break;
    }

    return consumedEvents;
  }

  // Limpiar todos los buffers
  clearAllBuffers() {
    this.edgeBuffers.actions.clear();
    this.edgeBuffers.buttons.clear();
    this.edgeBuffers.keys.clear();
    console.log('🧹 Buffers de edge detection limpiados');
  }

  // Configurar buffering
  setBufferingEnabled(enabled) {
    this.bufferConfig.enableBuffering = enabled;
    if (!enabled) {
      this.clearAllBuffers();
    }
    console.log(`🔄 Buffering ${enabled ? 'habilitado' : 'deshabilitado'}`);
  }

  // Obtener estadísticas de buffers
  getBufferStats() {
    let totalActionEvents = 0;
    let totalKeyEvents = 0;
    let totalButtonEvents = 0;

    // Contar eventos en buffers de acciones
    for (const buffers of this.edgeBuffers.actions.values()) {
      totalActionEvents += buffers.downBuffer.length + buffers.heldBuffer.length + buffers.upBuffer.length;
    }

    // Contar eventos en buffers de teclas
    for (const buffers of this.edgeBuffers.keys.values()) {
      totalKeyEvents += buffers.downBuffer.length + buffers.heldBuffer.length + buffers.upBuffer.length;
    }

    // Contar eventos en buffers de botones
    for (const buffers of this.edgeBuffers.buttons.values()) {
      totalButtonEvents += buffers.downBuffer.length + buffers.heldBuffer.length + buffers.upBuffer.length;
    }

    return {
      actions: {
        buffers: this.edgeBuffers.actions.size,
        events: totalActionEvents
      },
      keys: {
        buffers: this.edgeBuffers.keys.size,
        events: totalKeyEvents
      },
      buttons: {
        buffers: this.edgeBuffers.buttons.size,
        events: totalButtonEvents
      },
      totalEvents: totalActionEvents + totalKeyEvents + totalButtonEvents,
      bufferingEnabled: this.bufferConfig.enableBuffering,
      maxBufferSize: this.bufferConfig.maxBufferSize
    };
  }

  // Configuración de presets comunes
  setupDefaultMappings() {
    // Mapeo para jugador
    this.createActionMap('player', {
      moveForward: [
        { type: 'key', key: 'KeyW' },
        { type: 'gamepadButton', button: 12 } // D-Pad Up
      ],
      moveBackward: [
        { type: 'key', key: 'KeyS' },
        { type: 'gamepadButton', button: 13 } // D-Pad Down
      ],
      moveLeft: [
        { type: 'key', key: 'KeyA' },
        { type: 'gamepadButton', button: 14 } // D-Pad Left
      ],
      moveRight: [
        { type: 'key', key: 'KeyD' },
        { type: 'gamepadButton', button: 15 } // D-Pad Right
      ],
      jump: [
        { type: 'key', key: 'Space' },
        { type: 'gamepadButton', button: 0 } // A Button
      ],
      sprint: [
        { type: 'key', key: 'ShiftLeft' },
        { type: 'gamepadButton', button: 2 } // X Button
      ],
      interact: [
        { type: 'key', key: 'KeyE' },
        { type: 'gamepadButton', button: 1 } // B Button
      ],
      lookHorizontal: [
        { type: 'mouseAxis', axis: 'x' },
        { type: 'gamepadAxis', axis: 0 } // Left Stick X
      ],
      lookVertical: [
        { type: 'mouseAxis', axis: 'y' },
        { type: 'gamepadAxis', axis: 1 } // Left Stick Y
      ],
      attack: [
        { type: 'mouseButton', button: 0 }, // Left Click
        { type: 'gamepadButton', button: 7 } // Right Trigger
      ],
      aim: [
        { type: 'mouseButton', button: 2 }, // Right Click
        { type: 'gamepadButton', button: 5 } // Left Trigger
      ]
    });

    // Mapeo para UI
    this.createActionMap('ui', {
      navigateUp: [
        { type: 'key', key: 'ArrowUp' },
        { type: 'gamepadButton', button: 12 }
      ],
      navigateDown: [
        { type: 'key', key: 'ArrowDown' },
        { type: 'gamepadButton', button: 13 }
      ],
      navigateLeft: [
        { type: 'key', key: 'ArrowLeft' },
        { type: 'gamepadButton', button: 14 }
      ],
      navigateRight: [
        { type: 'key', key: 'ArrowRight' },
        { type: 'gamepadButton', button: 15 }
      ],
      select: [
        { type: 'key', key: 'Enter' },
        { type: 'gamepadButton', button: 0 }
      ],
      back: [
        { type: 'key', key: 'Escape' },
        { type: 'gamepadButton', button: 1 }
      ],
      scroll: [
        { type: 'mouseAxis', axis: 'wheel' },
        { type: 'gamepadAxis', axis: 3 } // Right Stick Y
      ]
    });

    console.log('🎮 Mapeos de input por defecto configurados');
  }

  // Estadísticas y debugging
  getStats() {
    return {
      actionsActive: this.stats.actionsActive,
      backendsActive: this.stats.backendsActive,
      inputEvents: this.stats.inputEvents,
      actionMaps: this.actionMaps.size,
      currentState: {
        actions: Object.fromEntries(this.currentInputState.actions),
        axes: Object.fromEntries(this.currentInputState.axes),
        mouse: { ...this.currentInputState.mouse }
      }
    };
  }

  createInputDebugPanel() {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 11px;
      z-index: 1000;
      border-radius: 5px;
      min-width: 200px;
    `;

    setInterval(() => {
      const stats = this.getStats();
      const activeActions = Object.entries(stats.currentState.actions)
        .filter(([_, state]) => state.pressed)
        .map(([name, _]) => name)
        .join(', ');

      panel.innerHTML = `
        <div><strong>🎮 Input Debug</strong></div>
        <div>Actions: ${stats.actionsActive}</div>
        <div>Active: ${activeActions || 'none'}</div>
        <div>Mouse: ${stats.currentState.mouse.position.x.toFixed(0)},${stats.currentState.mouse.position.y.toFixed(0)}</div>
        <div>Events: ${stats.inputEvents}</div>
      `;
    }, 100);

    document.body.appendChild(panel);
    return panel;
  }
}

// === BACKENDS DE ENTRADA ===

class KeyboardBackend {
  constructor() {
    this.pressedKeys = new Set();
    this.keyStates = new Map();
  }

  initialize(inputSystem) {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  handleKeyDown(event) {
    this.pressedKeys.add(event.code);
    this.keyStates.set(event.code, {
      pressed: true,
      timestamp: performance.now(),
      repeat: event.repeat
    });
  }

  handleKeyUp(event) {
    this.pressedKeys.delete(event.code);
    this.keyStates.set(event.code, {
      pressed: false,
      timestamp: performance.now(),
      repeat: false
    });
  }

  isKeyPressed(keyCode) {
    return this.pressedKeys.has(keyCode);
  }

  getKeyState(keyCode) {
    return this.keyStates.get(keyCode) || { pressed: false, timestamp: 0, repeat: false };
  }

  update() {
    // Limpiar estados antiguos
    const now = performance.now();
    for (const [key, state] of this.keyStates) {
      if (!state.pressed && now - state.timestamp > 1000) {
        this.keyStates.delete(key);
      }
    }
  }
}

class MouseBackend {
  constructor() {
    this.position = { x: 0, y: 0 };
    this.delta = { x: 0, y: 0 };
    this.wheel = 0;
    this.pressedButtons = new Set();
    this.buttonStates = new Map();
  }

  initialize(inputSystem) {
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    document.addEventListener('wheel', (e) => this.handleWheel(e));
  }

  handleMouseMove(event) {
    const newPosition = { x: event.clientX, y: event.clientY };
    this.delta = {
      x: newPosition.x - this.position.x,
      y: newPosition.y - this.position.y
    };
    this.position = newPosition;
  }

  handleMouseDown(event) {
    this.pressedButtons.add(event.button);
    this.buttonStates.set(event.button, {
      pressed: true,
      timestamp: performance.now()
    });
  }

  handleMouseUp(event) {
    this.pressedButtons.delete(event.button);
    this.buttonStates.set(event.button, {
      pressed: false,
      timestamp: performance.now()
    });
  }

  handleWheel(event) {
    this.wheel = event.deltaY;
  }

  isButtonPressed(button) {
    return this.pressedButtons.has(button);
  }

  getAxisValue(axis) {
    switch (axis) {
      case 'x': return this.delta.x;
      case 'y': return this.delta.y;
      case 'wheel': return this.wheel;
      default: return 0;
    }
  }

  update() {
    // Reset delta después de cada frame
    this.delta = { x: 0, y: 0 };
    this.wheel = 0;
  }
}

class GamepadBackend {
  constructor() {
    this.gamepads = new Map();
    this.deadzone = 0.1;
  }

  initialize(inputSystem) {
    window.addEventListener('gamepadconnected', (e) => this.handleGamepadConnected(e));
    window.addEventListener('gamepaddisconnected', (e) => this.handleGamepadDisconnected(e));
  }

  handleGamepadConnected(event) {
    console.log(`🎮 Gamepad conectado: ${event.gamepad.id}`);
    this.gamepads.set(event.gamepad.index, event.gamepad);
  }

  handleGamepadDisconnected(event) {
    console.log(`🎮 Gamepad desconectado: ${event.gamepad.id}`);
    this.gamepads.delete(event.gamepad.index);
  }

  isButtonPressed(buttonIndex, gamepadIndex = 0) {
    const gamepad = this.gamepads.get(gamepadIndex);
    if (!gamepad) return false;

    const button = gamepad.buttons[buttonIndex];
    return button ? button.pressed : false;
  }

  getAxisValue(axisIndex, gamepadIndex = 0) {
    const gamepad = this.gamepads.get(gamepadIndex);
    if (!gamepad) return 0;

    const axis = gamepad.axes[axisIndex];
    return Math.abs(axis) > this.deadzone ? axis : 0;
  }

  update() {
    // Actualizar estado de gamepads
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.gamepads.set(i, gamepads[i]);
      }
    }
  }
}

class TouchBackend {
  constructor() {
    this.touches = [];
    this.gestures = new Map();
  }

  initialize(inputSystem) {
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }

  handleTouchStart(event) {
    this.touches = Array.from(event.touches);
    this.detectGestures();
  }

  handleTouchMove(event) {
    this.touches = Array.from(event.touches);
    this.detectGestures();
  }

  handleTouchEnd(event) {
    this.touches = Array.from(event.touches);
    this.detectGestures();
  }

  detectGestures() {
    // Detectar gestos básicos
    if (this.touches.length === 1) {
      this.gestures.set('tap', { active: true, value: 1 });
    } else if (this.touches.length === 2) {
      const touch1 = this.touches[0];
      const touch2 = this.touches[1];

      // Calcular distancia
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      this.gestures.set('pinch', { active: true, value: distance / 100 });
    }

    // Reset otros gestos
    if (this.touches.length === 0) {
      this.gestures.clear();
    }
  }

  getTouchState(gesture) {
    return this.gestures.get(gesture) || { active: false, value: 0 };
  }

  update() {
    // Los gestos se actualizan en los event handlers
  }
}

// === COMPONENTES DE ECS ===

export const InputStateComponent = {
  actions: 'object',    // { actionName: { pressed, justPressed, justReleased, value } }
  axes: 'object',       // { axisName: value }
  mouse: 'object',      // { position, delta, wheel, buttons }
  lastUpdate: 'float32'
};

export const InputActionComponent = {
  actionName: 'string',  // Nombre de la acción
  pressed: 'boolean',    // Está presionada
  justPressed: 'boolean', // Se presionó en este frame
  justReleased: 'boolean', // Se soltó en este frame
  value: 'float32'       // Valor analógico (0-1)
};
