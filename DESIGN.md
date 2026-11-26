---
name: Door List
description: Sistema oscuro y operativo para el registro ágil de eventos.
colors:
  night: "#09090b"
  surface-text: "#fafafa"
  violet-action: "#7c3aed"
  violet-hover: "#8b5cf6"
  violet-focus: "#a78bfa"
  violet-muted: "#c4b5fd"
  zinc-strong: "#e4e4e7"
  zinc-muted: "#a1a1aa"
  success: "#6ee7b7"
typography:
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    letterSpacing: "0.18em"
rounded:
  control: "0.75rem"
  card: "1rem"
  panel: "1.5rem"
  pill: "9999px"
spacing:
  control-y: "0.7rem"
  control-x: "0.8rem"
  card: "1rem"
  panel: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.violet-action}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0.7rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.violet-hover}"
  button-secondary:
    backgroundColor: "rgb(255 255 255 / 0.1)"
    textColor: "{colors.zinc-strong}"
    rounded: "{rounded.control}"
    padding: "0.7rem 1rem"
  field-default:
    backgroundColor: "rgb(255 255 255 / 0.06)"
    textColor: "{colors.surface-text}"
    rounded: "{rounded.control}"
    padding: "0.7rem 0.8rem"
---

# Design System: Door List

## Overview

**Creative North Star: "El puesto de control nocturno"**

Door List usa un entorno oscuro, concentrado y de alta legibilidad para resolver tareas de registro y acceso sin distracciones. La interfaz se comporta como una consola de operación: superficies oscuras en capas, acciones violeta claras y señales de estado que se distinguen con rapidez.

La densidad es cómoda para formularios, paneles y tablas. El lenguaje visual evita el ornamento: cada borde, bloque de información y cambio de color debe facilitar una decisión o una acción en el contexto rápido de un evento.

**Key Characteristics:**

- Oscuridad neutra con profundidad creada por capas translúcidas, no por decoración.
- Violeta como señal de acción, selección y foco.
- Estados semánticos claros: verde para éxito y disponibilidad; cálidos para advertencias y errores.
- Controles grandes, redondeados y predecibles para una operación ágil.

## Colors

La paleta mantiene el fondo silencioso para que las acciones y los estados sean las únicas señales de alta intensidad.

### Primary

- **Violeta de acción:** se reserva para acciones principales, selección, progreso y foco de campo.
- **Violeta de foco:** refuerza el contorno de los controles activos y enlaces destacados.

### Secondary

- **Verde de confirmación:** comunica registro exitoso, disponibilidad y resultado positivo.

### Tertiary

- **Ámbar y rojo semánticos:** se usan en mensajes de advertencia, validación y acciones destructivas.

### Neutral

- **Noche neutra:** sostiene el fondo de toda la aplicación.
- **Blanco de superficie:** reserva el mayor contraste para títulos, datos y acciones críticas.
- **Zinc estructural:** organiza texto secundario, bordes y controles secundarios.

### Named Rules

**The Signal-Only Violet Rule.** El violeta marca una acción, una selección o un foco; no se usa como adorno de fondo persistente.

## Typography

**Display Font:** Arial (con Helvetica y sans-serif como respaldo)

**Body Font:** Arial (con Helvetica y sans-serif como respaldo)

**Character:** Una sans-serif de sistema sobria y familiar favorece la lectura rápida. La jerarquía nace del peso, tamaño, contraste y espaciado, no de una tipografía expresiva.

### Hierarchy

- **Display:** pesos bold y escalas grandes de utilidades para los títulos de página y llamados principales.
- **Headline:** pesos bold para títulos de secciones, eventos y estados.
- **Title:** pesos semibold o bold para tarjetas, tablas y controles agrupados.
- **Body:** texto regular para explicación, disponibilidad y datos secundarios.
- **Label:** texto pequeño y semibold; las etiquetas de navegación y estado pueden usar mayúsculas con tracking amplio.

### Named Rules

**The Read-At-The-Gate Rule.** La jerarquía debe poder distinguir acción, estado y dato importante de un vistazo; evitar textos de bajo contraste o estilos tipográficos decorativos.

## Layout

Las pantallas usan contenedores centrados con ancho máximo y respiración lateral adaptable. El espacio exterior comienza compacto en móvil y aumenta desde el breakpoint `sm`; los formularios, detalles de evento y paneles se apilan primero y pasan a grillas de dos o tres columnas cuando hay espacio. La unidad recurrente es una tarjeta o panel con padding interno constante, y las separaciones verticales agrupan cada tarea antes de presentar la siguiente.

## Elevation & Depth

La profundidad es tonal: superficies blancas de baja opacidad sobre fondo nocturno y bordes blancos sutiles separan capas sin producir ruido. Las sombras se reservan para el estado de éxito y para las tarjetas más prominentes; no son un recurso decorativo de uso general.

### Shadow Vocabulary

- **Éxito confirmado** (`0 24px 70px rgb(0 0 0 / 0.3)`): ancla visualmente la confirmación de registro.

### Named Rules

**The Tonal Layer Rule.** Las superficies se distinguen primero por opacidad y borde; añadir sombra solo cuando ayude a confirmar o aislar un estado importante.

## Shapes

Los controles comparten esquinas suavemente redondeadas; las tarjetas usan un radio algo mayor y los paneles de confirmación el mayor radio. Los indicadores compactos usan forma de píldora o círculo. Los bordes son finos y translúcidos para mantener estructura visible sin convertir la pantalla en una cuadrícula pesada.

## Components

### Buttons

- **Shape:** esquinas suavemente redondeadas (`0.75rem`).
- **Primary:** relleno violeta para confirmar, guardar, reservar o avanzar; texto blanco y peso bold.
- **Hover / Focus:** el primario aclara al pasar el cursor; la interacción activa reduce la escala levemente y los campos conservan un anillo de foco violeta visible.
- **Secondary:** fondo blanco translúcido para navegación secundaria, cancelación y acciones no críticas.

### Chips

- **Style:** píldoras translúcidas para estados como borrador o publicado, y círculos para el ícono de éxito.
- **State:** el verde identifica éxito o disponibilidad; el violeta identifica selección o información accionable.

### Cards / Containers

- **Corner Style:** tarjetas de detalle con esquinas redondeadas (`1rem`); bloques de confirmación más envolventes (`1.5rem`).
- **Background:** blanco translúcido sobre el fondo de noche.
- **Shadow Strategy:** plana por defecto; la elevación se aplica a confirmaciones destacadas.
- **Border:** línea blanca translúcida y discreta.
- **Internal Padding:** compacto para detalles y más amplio para paneles de formulario o éxito.

### Inputs / Fields

- **Style:** fondo translúcido, borde fino y texto claro; los selectores incorporan un chevrón tenue.
- **Focus:** anillo violeta de dos píxeles con separación exterior para que el control activo sea inequívoco.
- **Error / Disabled:** los mensajes se expresan con tono cálido; los controles deshabilitados reducen opacidad y muestran cursor no disponible.

### Navigation

- **Style:** encabezados simples, logo tipográfico en mayúsculas con tracking amplio y acciones agrupadas a la derecha.
- **Responsive:** la navegación y las acciones admiten wrap para conservar objetivos táctiles completos en pantallas angostas.

## Do's and Don'ts

### Do:

- **Do** usar el violeta para la siguiente acción operativa, el foco o el elemento seleccionado.
- **Do** mantener las superficies oscuras con bordes y contrastes suficientes para separar formularios, tablas y tarjetas.
- **Do** usar estados de éxito, advertencia y error con color semántico acompañado de texto claro.
- **Do** conservar acciones y controles con áreas cómodas para uso rápido.

### Don't:

- **Don't** añadir ilustraciones, texturas o efectos decorativos que compitan con la operación en puerta.
- **Don't** usar el violeta como relleno ambiental en toda una pantalla.
- **Don't** depender solo del color para comunicar un estado o un error.
- **Don't** introducir tipografías expresivas o una densidad que dificulte escanear datos y acciones.
