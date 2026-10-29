// ===== 1. REFERENCIAS A ELEMENTOS DEL HTML =====

// Busca en el HTML el elemento con id="pantalla" y lo guarda en una constante (donde se ven los números)
const pantalla = document.getElementById("pantalla");
// Busca el elemento con id="operacion": la línea pequeña sobre la pantalla
const lineaOperacion = document.getElementById("operacion");
// Busca la lista <ul> donde se muestran las operaciones del historial
const listaHistorial = document.getElementById("listaHistorial");
// Busca el botón "Borrar" del historial
const btnBorrarHistorial = document.getElementById("borrarHistorial");

// ===== 2. VARIABLES DE ESTADO (la "memoria" de la calculadora) =====

// Lista con lo que el usuario va escribiendo. Ej: ["2", "*", "4"] (números y operadores como texto)
let tokens = [];
// true justo después de pulsar "=", para saber que el próximo número debe empezar de cero
let resultadoMostrado = false;
// true cuando hubo un error (dividir entre 0). ¡Esta es la que te faltaba declarar!
let hayError = false;
// Texto de la línea pequeña (la última operación realizada)
let textoOperacion = "";

// Los 4 operadores internos. ¡Esta también te faltaba declararla!
const operadores = ["+", "-", "*", "/"];
// Traduce cada operador interno al símbolo bonito que se ve en pantalla
const simbolos = { "+": "+", "-": "−", "*": "×", "/": "÷" };

// ===== SONIDO =====

// El "contexto de audio" es el motor de sonido del navegador. Empieza en null y se crea al primer clic
let audioCtx = null;

// Genera un "bip" corto. frecuencia = qué tan agudo es; duracion = cuánto dura (en segundos)
function reproducirSonido(frecuencia = 800, duracion = 0.05) {
    // try/catch: si el navegador no soporta audio, la calculadora sigue funcionando sin sonido
    try {
        // Crea el motor de audio solo la primera vez (webkitAudioContext es para Safari antiguo)
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        // Los navegadores pausan el audio hasta que el usuario interactúa; esto lo reactiva
        if (audioCtx.state === "suspended") audioCtx.resume();

        const oscilador = audioCtx.createOscillator(); // genera la onda de sonido
        const volumen = audioCtx.createGain();         // controla qué tan fuerte suena

        oscilador.type = "square";                     // onda cuadrada: el sonido "electrónico" de calculadora
        oscilador.frequency.value = frecuencia;        // tono del bip (en Hz)

        const ahora = audioCtx.currentTime;            // momento actual del motor de audio
        volumen.gain.setValueAtTime(0.08, ahora);      // volumen inicial bajito (0.08 de 1)
        // Baja el volumen rápidamente a casi cero: así suena como un "tic" y no como un pitido largo
        volumen.gain.exponentialRampToValueAtTime(0.001, ahora + duracion);

        oscilador.connect(volumen);                    // oscilador → control de volumen
        volumen.connect(audioCtx.destination);         // control de volumen → parlantes

        oscilador.start(ahora);                        // empieza a sonar ya
        oscilador.stop(ahora + duracion);              // se detiene cuando termina la duración
    } catch {}
}

// ===== 3. FUNCIONES AUXILIARES =====

// Recibe un texto "t" y responde true si es un operador (+, -, *, /)
function esOperador(t) {
    // includes() revisa si el texto está dentro de la lista "operadores"
    return operadores.includes(t);
}

// Devuelve el último elemento de la lista tokens
function ultimo() {
    // La última posición es la longitud menos 1 (las listas empiezan en 0)
    return tokens[tokens.length - 1];
}

// Convierte ["2","*","4"] en el texto "2 × 4" para mostrarlo
function formatear(lista) {
    return lista
        // map() recorre cada elemento "t" y lo transforma
        .map((t) => {
            // Si es operador, lo cambia por su símbolo bonito (* pasa a ×)
            if (esOperador(t)) return simbolos[t];
            // Si es un número negativo y hay más elementos, lo envuelve en paréntesis: (-3)
            if (t.startsWith("-") && lista.length > 1) return `(${t})`;
            // Si no es ninguno de los casos anteriores, lo deja igual
            return t;
        })
        // join(" ") une todos los elementos en un solo texto separados por un espacio
        .join(" ");
}

// ===== 4. MOSTRAR EN PANTALLA =====

function actualizarPantalla() {
    // Si hubo error, la pantalla muestra la palabra "Error"
    if (hayError) {
        pantalla.textContent = "Error";
    } else {
        // Si hay elementos en tokens, muestra la expresión armada; si está vacío, muestra "0"
        pantalla.textContent = tokens.length ? formatear(tokens) : "0";
    }
    // Escribe en la línea pequeña la última operación
    lineaOperacion.textContent = textoOperacion;
    // Mueve el scroll al final para ver siempre lo último que escribiste si la expresión es larga
    pantalla.scrollLeft = pantalla.scrollWidth;
}

// ===== 5. HISTORIAL =====

// Lista donde se guardan las operaciones pasadas
let historial = [];
try {
    // Lee del navegador el historial guardado (viene como texto) y lo convierte en lista.
    // Si no hay nada guardado, devuelve null y el "|| []" usa una lista vacía
    historial = JSON.parse(localStorage.getItem("historial")) || [];
} catch {
    // Si algo falla (datos dañados, o el navegador bloquea localStorage), empieza vacío
    historial = [];
}

// Dibuja el historial en pantalla
function mostrarHistorial() {
    // Vacía la lista HTML para volver a dibujarla desde cero
    listaHistorial.innerHTML = "";

    // Si no hay operaciones guardadas...
    if (historial.length === 0) {
        // Crea un elemento <li> nuevo
        const vacio = document.createElement("li");
        // Le pone el mensaje
        vacio.textContent = "Aún no hay operaciones";
        // Lo agrega a la lista del HTML
        listaHistorial.appendChild(vacio);
        // return termina la función aquí
        return;
    }

    // Para cada operación guardada...
    historial.forEach((texto) => {
        // Crea un <li>
        const li = document.createElement("li");
        // Le escribe la operación
        li.textContent = texto;
        // Lo agrega a la lista
        listaHistorial.appendChild(li);
    });
}

// Agrega una operación nueva al historial
function agregarHistorial(texto) {
    // unshift() la pone al inicio de la lista (la más reciente queda arriba)
    historial.unshift(texto);
    // Si ya hay más de 20, pop() elimina la última (la más antigua)
    if (historial.length > 20) historial.pop();
    // Guarda la lista en el navegador (convertida a texto con JSON.stringify).
    // El try/catch evita que se rompa todo si el navegador no permite guardar
    try { localStorage.setItem("historial", JSON.stringify(historial)); } catch {}
    // Vuelve a dibujar el historial para ver la operación nueva
    mostrarHistorial();
}

// Cuando se hace clic en el botón "Borrar" del historial...
btnBorrarHistorial.addEventListener("click", () => {
    // Vacía la lista
    historial = [];
    // Elimina lo guardado en el navegador
    try { localStorage.removeItem("historial"); } catch {}
    // Redibuja (mostrará "Aún no hay operaciones")
    mostrarHistorial();
});

// ===== 6. AGREGAR NÚMEROS Y PUNTO =====

// Se ejecuta al pulsar un número. "n" es el dígito como texto
function agregarNumero(n) {
    // Si estaba en error, primero limpia todo
    if (hayError) limpiar();

    // Si acabas de pulsar "=", un número nuevo empieza una cuenta nueva
    if (resultadoMostrado) {
        tokens = [];                  // borra la expresión anterior
        resultadoMostrado = false;    // ya no estamos mostrando un resultado
        textoOperacion = "";          // limpia la línea pequeña
    }

    // Si la lista está vacía o el último elemento es un operador...
    if (tokens.length === 0 || esOperador(ultimo())) {
        tokens.push(n);                       // ...empieza un número nuevo (push agrega al final)
    } else if (ultimo() === "0") {
        tokens[tokens.length - 1] = n;        // si el número actual es "0", lo reemplaza (evita 07, 0089)
    } else {
        tokens[tokens.length - 1] += n;       // si no, pega el dígito al número actual: "1" + "2" = "12"
    }
}

// Se ejecuta al pulsar "."
function agregarPunto() {
    if (hayError) limpiar();

    // Si venía de un resultado, empieza un número nuevo "0."
    if (resultadoMostrado) {
        tokens = ["0."];
        resultadoMostrado = false;
        textoOperacion = "";
        return;
    }

    // Si no hay número en curso (lista vacía o último es operador), empieza con "0."
    if (tokens.length === 0 || esOperador(ultimo())) {
        tokens.push("0.");
    // Si el número actual aún no tiene punto, se lo agrega (evita 3.4.5)
    } else if (!ultimo().includes(".")) {
        tokens[tokens.length - 1] += ".";
    }
}

// ===== 7. ELEGIR OPERADOR =====

// Se ejecuta al pulsar + − × ÷. "op" es el operador interno
function elegirOperador(op) {
    if (hayError) limpiar();
    // No se puede empezar con un operador
    if (tokens.length === 0) return;

    resultadoMostrado = false;   // permite seguir operando con el resultado anterior
    textoOperacion = "";         // limpia la línea pequeña

    // Si el último ya es un operador, lo reemplaza (2 + pasa a 2 ×)
    if (esOperador(ultimo())) {
        tokens[tokens.length - 1] = op;
    } else {
        // Si el último es un número, agrega el operador
        tokens.push(op);
    }
}

// ===== 8. CÁLCULO =====

// Recibe la lista ["2","+","3","*","4"] y devuelve el resultado numérico
function evaluar(lista) {
    // Pasada 1: resolver × y ÷ primero (jerarquía de operaciones).
    // La pila empieza con el primer número convertido a decimal (parseFloat)
    const pila = [parseFloat(lista[0])];

    // Recorre de 2 en 2: en las posiciones impares están los operadores
    for (let i = 1; i < lista.length; i += 2) {
        const op = lista[i];                    // el operador
        const num = parseFloat(lista[i + 1]);   // el número que viene después

        if (op === "*") {
            // Multiplica el último número de la pila por num
            pila[pila.length - 1] *= num;
        } else if (op === "/") {
            // Si se divide entre 0, devuelve null para avisar del error
            if (num === 0) return null;
            pila[pila.length - 1] /= num;
        } else {
            // Si es + o −, no lo resuelve todavía: lo guarda para la pasada 2
            pila.push(op, num);
        }
    }

    // Pasada 2: resolver + y − de izquierda a derecha.
    // Aquí estaba tu error: es pila[0], con el número cero
    let resultado = pila[0];
    for (let i = 1; i < pila.length; i += 2) {
        // Si el operador es "+", suma; si no, resta
        resultado = pila[i] === "+" ? resultado + pila[i + 1] : resultado - pila[i + 1];
    }
    return resultado;
}

// Se ejecuta al pulsar "="
function calcular() {
    // Si no hay nada escrito, o ya se mostró un resultado, no hace nada
    if (tokens.length === 0 || resultadoMostrado) return;

    // Copia la lista con [...tokens] para no dañar la original
    const lista = [...tokens];
    // Si termina en operador ("2 +"), lo quita y calcula solo "2"
    if (esOperador(lista[lista.length - 1])) lista.pop();
    // Si solo queda un número, no hay nada que calcular
    if (lista.length === 1) return;

    // Texto para la línea pequeña e historial: "2 × 4 ="
    const textoCompleto = formatear(lista) + " =";
    // Calcula el resultado
    const resultado = evaluar(lista);

    // Si evaluar devolvió null, fue una división entre 0
    if (resultado === null) {
        hayError = true;
        tokens = [];
        textoOperacion = textoCompleto;
        return;
    }

    // toFixed(10) evita errores como 0.1+0.2 = 0.30000000000000004;
    // parseFloat quita los ceros sobrantes; String lo vuelve texto
    const resultadoTexto = String(parseFloat(resultado.toFixed(10)));
    textoOperacion = textoCompleto;
    // Guarda en el historial (aquí tenías agregarOperacion, que no existe)
    agregarHistorial(`${textoCompleto} ${resultadoTexto}`);

    // El resultado queda como único elemento, listo para seguir operando
    tokens = [resultadoTexto];
    resultadoMostrado = true;
}

// ===== 9. PORCENTAJE Y CAMBIO DE SIGNO =====

function porcentaje() {
    if (hayError) limpiar();
    // Si no hay nada, o el último es un operador, no hay número al cual sacar porcentaje
    if (tokens.length === 0 || esOperador(ultimo())) return;

    const i = tokens.length - 1;               // posición del último número
    const valor = parseFloat(tokens[i]);       // el número como decimal
    let resultado;

    // Si es "200 + 10 %": el 10% se calcula sobre 200 (da 20)
    if (i >= 2 && (tokens[i - 1] === "+" || tokens[i - 1] === "-")) {
        resultado = (parseFloat(tokens[i - 2]) * valor) / 100;
    } else {
        // En los demás casos, simplemente divide entre 100
        resultado = valor / 100;
    }

    // Guarda el resultado como texto en lugar del número original
    tokens[i] = String(parseFloat(resultado.toFixed(10)));
}

function cambiarSigno() {
    if (hayError) limpiar();
    // Estas dos líneas te faltaban: sin ellas "i" no existía y daba error
    if (tokens.length === 0 || esOperador(ultimo())) return;

    const i = tokens.length - 1;
    // Al 0 no se le cambia el signo
    if (tokens[i] === "0") return;

    // Si ya empieza con "-", se lo quita; si no, se lo pone
    tokens[i] = tokens[i].startsWith("-") ? tokens[i].slice(1) : "-" + tokens[i];
}

// ===== 10. LIMPIAR Y BORRAR =====

// Botón C: deja todo como al inicio
function limpiar() {
    tokens = [];
    resultadoMostrado = false;
    hayError = false;
    textoOperacion = "";
}

// Botón ⌫: borra lo último que escribiste (tu versión se llamaba "borra")
function borrar() {
    // Si hay error, borrar equivale a limpiar todo
    if (hayError) { limpiar(); return; }
    // Si no hay nada o hay un resultado mostrado, no hace nada
    if (tokens.length === 0 || resultadoMostrado) return;

    const i = tokens.length - 1;

    if (esOperador(tokens[i])) {
        // Si lo último es un operador, lo elimina de la lista
        tokens.pop();
    } else {
        // Si es un número, le quita el último carácter (slice(0, -1))
        const resto = tokens[i].slice(0, -1);
        if (resto === "" || resto === "-") {
            tokens.pop();        // si no queda nada (o solo un "-"), elimina el número completo
        } else {
            tokens[i] = resto;   // si no, deja el número recortado
        }
    }
}

// ===== 11. EVENTO DE LOS BOTONES (un solo evento para todos) =====

// Escucha los clics dentro del contenedor de botones
document.getElementById("botones").addEventListener("click", (e) => {
    // closest("button") encuentra el botón pulsado aunque hagas clic en su interior
    const boton = e.target.closest("button");
    // Si el clic no fue en un botón (por ejemplo, un espacio vacío), se sale
    if (!boton) return;

    // Lee los atributos data-numero, data-operador y data-accion del botón.
    // "operador: op" lo renombra a "op" para no chocar con otros nombres
    const { numero, operador: op, accion } = boton.dataset;

    // --- NUEVO: elige un tono según el tipo de botón ---
    let tono = 800;                          // números: tono medio
    if (op !== undefined) tono = 600;        // operadores: tono más grave
    else if (accion === "igual") tono = 1000; // igual: tono más agudo
    else if (accion !== undefined) tono = 500; // C, ⌫, %, ± y punto: el más grave
    reproducirSonido(tono);                  // reproduce el bip

    // Según qué atributo tenga el botón, llama a la función correspondiente
    if (numero !== undefined) agregarNumero(numero);
    else if (op !== undefined) elegirOperador(op);
    else if (accion === "punto") agregarPunto();
    else if (accion === "igual") calcular();
    else if (accion === "limpiar") limpiar();
    else if (accion === "borrar") borrar();          // antes: "borror" y borra()
    else if (accion === "porcentaje") porcentaje();
    else if (accion === "signo") cambiarSigno();     // antes: sin paréntesis

    // Después de cualquier acción, refresca la pantalla
    actualizarPantalla();
});

// ===== 12. SOPORTE DE TECLADO =====

// Escucha cualquier tecla presionada en toda la página
document.addEventListener("keydown", (e) => {
    // Si se usa Ctrl, Cmd o Alt, no hace nada (no romper Ctrl+C, Ctrl+R, etc.)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // e.key es el nombre de la tecla: "5", "+", "Enter", "Backspace"...
    const tecla = e.key;   // antes: "tacla"

    // Si la tecla es un dígito del 0 al 9 (expresión regular)
    if (/^[0-9]$/.test(tecla)) agregarNumero(tecla);   // antes: agregarNumero() sin la tecla
    // Si es punto o coma, agrega el punto decimal
    else if (tecla === "." || tecla === ",") agregarPunto();
    // Si es un operador
    else if (operadores.includes(tecla)) {
        e.preventDefault();      // evita que "/" abra la búsqueda rápida en Firefox
        elegirOperador(tecla);
    }
    // Enter o "=" calculan
    else if (tecla === "Enter" || tecla === "=") {
        e.preventDefault();      // evita que Enter vuelva a "pulsar" el último botón clicado
        calcular();
    }
    // Retroceso borra lo último
    else if (tecla === "Backspace") borrar();
    // Escape o la letra c limpian todo
    else if (tecla === "Escape" || tecla.toLowerCase() === "c") limpiar();
    // % calcula porcentaje
    else if (tecla === "%") porcentaje();
    // Cualquier otra tecla se ignora y no actualiza la pantalla
    else return;

    // --- NUEVO: sonido al usar el teclado ---
    let tono = 600;                                   // operadores y demás: tono grave
    if (/^[0-9]$/.test(tecla)) tono = 800;            // dígitos: tono medio
    else if (tecla === "Enter" || tecla === "=") tono = 1000; // calcular: tono agudo
    reproducirSonido(tono);

    // Refresca la pantalla tras la acción del teclado
    actualizarPantalla();
});

// ===== 13. ARRANQUE =====

// Dibuja el historial guardado al abrir la página
mostrarHistorial();
// Dibuja la pantalla inicial (muestra "0")
actualizarPantalla();