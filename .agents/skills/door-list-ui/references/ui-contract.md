# Contrato visual de Door List

## Paleta

| Rol | Valor o clase aprobada |
| --- | --- |
| Fondo de aplicación | `#09090b`; usar `registration-page` en páginas públicas con gradiente |
| Texto principal | `text-white` o `text-zinc-100` |
| Texto secundario | `text-zinc-300` |
| Texto auxiliar | `text-zinc-400` o `text-zinc-500` |
| Superficie principal | `bg-white/[0.055]` |
| Superficie secundaria | `bg-white/[0.03]` |
| Borde estándar | `border-white/10` |
| Marca y acción primaria | `#7c3aed`, `text-violet-300`, `bg-violet-500/10` |
| Éxito | `text-emerald-300`, `border-emerald-300/20`, `bg-emerald-300/[0.07]` |
| Advertencia | `text-amber-300`, `border-amber-300/25`, `bg-amber-300/10` |
| Error | `text-rose-300` para campo; `text-red-200` para mensaje general |

No agregues otro color para comunicar estos mismos roles.

## Tipografía

- Fuente global: `Arial, Helvetica, sans-serif`.
- Marca o etiqueta de sección: `text-sm font-semibold uppercase tracking-[0.18em] text-violet-300`.
- Título de página de panel: `text-3xl font-bold tracking-tight sm:text-4xl`.
- Título editorial público: `text-4xl font-bold leading-tight tracking-[-0.035em] sm:text-5xl`.
- Título de panel: `text-xl font-bold` o `text-2xl font-bold`.
- Cuerpo: `leading-6 text-zinc-300` o `leading-7 text-zinc-400`.
- Metadatos y tabla: `text-sm`; encabezados `text-xs uppercase tracking-wide text-zinc-500`.

## Espaciado y superficies

- Página: `px-5 py-8 sm:px-8 sm:py-12`.
- Contenedor: `max-w-5xl`, `max-w-6xl` o `max-w-7xl` según densidad del contenido.
- Separación entre secciones: `mt-8` o `mt-10`.
- Panel o formulario destacado: `rounded-3xl border border-white/10 bg-white/[0.055] p-6 sm:p-8`.
- Panel informativo compacto: clase global `event-detail-card`.
- Grupo de campos: `space-y-5`.
- Grupo de acciones: `flex flex-wrap gap-3`.

Usa la escala de Tailwind `1, 2, 3, 4, 5, 6, 7, 8, 10, 12`; no introduzcas márgenes o paddings arbitrarios fuera de estos casos ya definidos.

## Componentes y variantes existentes

Reutiliza estas variantes de `app/globals.css`:

- Acción primaria: `primary-button`.
- Acción secundaria: `secondary-button`.
- Campo: `field`; selector: `field select-field`.
- Panel de detalle: `event-detail-card`.

Cuando la misma estructura se use en dos o más rutas, extráela a `components/ui/` con uno de estos límites:

- `PageHeader`: etiqueta de marca, título, descripción y acciones.
- `EmptyState`: `title`, `description`, `action?` y `variant?`.
- `LoadingState`: `label` y `scope?`.
- `StatusMessage`: `variant` y contenido.
- `DataTable`: solo estructura visual y composición; las columnas y datos llegan por props.

No extraigas componentes por una única ocurrencia ni combines en ellos acceso a datos o reglas del negocio.

## Tablas y listas que cargan datos

Toda tabla o lista asíncrona tiene exactamente estos estados:

1. **Carga:** mantener el título y contexto de la sección; usar un bloque dentro de `event-detail-card` con un texto específico como `Cargando asistentes…`.
2. **Error:** mostrar mensaje seguro, con `text-red-200`; ofrecer reintento solamente si ya existe una acción de recarga en ese flujo.
3. **Vacío:** usar `event-detail-card` con un título que describa la ausencia y una explicación breve; incluir una acción solo si el usuario puede resolverla desde esa pantalla.
4. **Datos:** envolver la tabla en `event-detail-card overflow-x-auto p-0`; usar `min-w-*` cuando haya más de tres columnas.

El encabezado de tabla usa `border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500`. Las filas usan `border-b border-white/10 last:border-0`, con celdas `px-5 py-4`.

Ejemplos de copy reproducible:

```tsx
<section className="event-detail-card mt-4" aria-live="polite">
  <p className="text-zinc-400">Cargando asistentes…</p>
</section>

<section className="event-detail-card mt-4 text-center">
  <h3 className="text-xl font-bold text-white">Aún no hay asistentes registrados</h3>
  <p className="mt-2 text-zinc-400">Los registros confirmados aparecerán aquí.</p>
</section>
```

## Formularios, mensajes y acciones

- Etiqueta de campo: `block text-sm font-medium text-zinc-200`.
- Error de campo: debajo del control, `mt-2 block text-sm text-rose-300`.
- Estado exitoso: panel esmeralda con texto y contexto, nunca solo un cambio de color.
- Estado de advertencia: panel ámbar con texto y contexto.
- En una acción pendiente, el botón queda deshabilitado y su texto cambia a `Guardando…`, `Confirmando…` o `Eliminando…`, según corresponda.
- Acciones destructivas usan texto rojo y solicitan confirmación cuando el impacto sea material.

## Casos que deben activar este contrato

- “Agregá una tabla de asistentes al dashboard.”
- “Rediseñá el formulario de registro.”
- “Mostrá estados de carga mientras carga la lista de eventos.”
- “Creá el estado vacío de tipos de entrada.”
- “Extraé los paneles repetidos del organizador y del dashboard.”

## Casos que no deben activarlo

- “Añadí una constraint de capacidad.”
- “Corregí la RPC de registro.”
- “Renombrá una columna en una migración.”
- “Validá el formato de email en la API.”
