---
name: door-list-ui
description: Implementa o modifica la interfaz de Door List con su sistema visual oscuro consistente. Úsalo al crear o editar pantallas, formularios, tarjetas, listas, tablas o estados de carga, vacío, error y éxito; no lo uses para cambios exclusivamente de backend, datos o lógica sin interfaz.
---

# UI consistente de Door List

## Cuándo aplicar este skill

Aplica este skill al crear o editar una ruta visual, sección de interfaz, formulario, botón, tarjeta, lista, tabla o cualquiera de sus estados. También aplícalo al extraer componentes de UI reutilizables.

No lo apliques a migraciones, RPC, clientes de Supabase, mapeadores, lógica de dominio, correos o cambios sin interfaz visible.

## Fuente de verdad y límites

Lee [el contrato visual](references/ui-contract.md) antes de decidir estilos o estructura. Respeta los estilos existentes de `app/globals.css` y Tailwind CSS 4; no introduzcas bibliotecas de UI, fuentes, dependencias ni un modo claro salvo solicitud expresa.

- Conserva el tema oscuro y los tokens definidos en el contrato. No inventes valores visuales puntuales.
- Usa Server Components por defecto y añade `"use client"` solo cuando haya interacción o estado real en el cliente.
- Escribe código, props y nombres de componentes en inglés; los textos visibles permanecen en español.
- Coloca componentes exclusivos junto a la ruta. Usa `components/ui/` solo para componentes utilizados por dos o más rutas.
- Los componentes de UI reciben datos y callbacks por props: no consultan Supabase ni contienen reglas de negocio.

## Estados y accesibilidad

Toda lista o tabla debe manejar de forma explícita carga, error, vacío y datos, siguiendo el contrato. Los resultados asíncronos usan `aria-live="polite"` cuando el usuario deba conocer el cambio.

Mientras una acción está pendiente, deshabilita el control que la inicia y muestra una etiqueta de verbo en curso. No reemplaces contenido interactivo que el usuario esté utilizando sin preservar su contexto.

## Antes de terminar

Comprueba que la implementación:

- Solo usa la paleta, tipografía, escala de espaciado y superficies del contrato.
- Mantiene la jerarquía definida para páginas, paneles, formularios, acciones y tablas.
- Incluye los cuatro estados de una tabla o lista cuando obtiene datos asíncronos.
- Es utilizable a 320 px; las tablas de varias columnas conservan desplazamiento horizontal.
- Reutiliza un componente existente o extrae uno compartido cuando la misma estructura se usa en dos o más rutas.
