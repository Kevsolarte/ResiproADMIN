# ResiproADMIN — panel interno de gestión

Herramienta interna para llevar colaboradores, proyectos y el dinero en las dos
direcciones: lo que entra de los clientes y lo que sale al equipo.

Proyecto de práctica construido con el stack real que usa Resiproco:
**SvelteKit + PocketBase (Go)**.

| Documento | Para qué |
|---|---|
| **README.md** (este) | qué es, cómo correrlo, las decisiones que lo definen |
| [PLAN.md](PLAN.md) | el diseño completo: modelo de datos, reglas de negocio, arquitectura |
| [GUIA.md](GUIA.md) | recorrido del código archivo por archivo, y cómo probarlo |

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Go 1.26 + PocketBase v0.39.11 (como **librería**, no como binario) |
| Base de datos | SQLite (la trae PocketBase) |
| Frontend | SvelteKit 2.63 + Svelte 5.56 (runes) + TypeScript |
| Estilos | Tailwind v4 (config en CSS, sin `tailwind.config.js`) |
| Componentes | `bits-ui` 2.19 (primitivas headless) — solo Dialog |
| Íconos | `@lucide/svelte` |

**PocketBase se usa como librería.** `main.go` importa el paquete y arranca la
app: la API REST, el Admin UI y la base salen de ahí. Eso es lo que permite
enganchar código Go propio en el ciclo de vida de cada record.

---

## Cómo correrlo

Se necesitan **dos terminales**.

```bash
# 1. Backend  →  http://127.0.0.1:8090
go run . serve

# 2. Frontend →  http://localhost:5173
cd ui
npm install
npm run dev
```

La primera vez, PocketBase pide crear un superusuario (imprime un link en la
consola). Después hay que crear un registro en la collection `users`: ese es el
que usa el login del panel.

```bash
go test ./...           # tests del backend
cd ui && npm run check  # typecheck del frontend
```

El paso a paso detallado, con qué hacer si algo falla, está en
[GUIA.md](GUIA.md).

---

## El modelo, en una imagen

Cuatro collections. La pieza que ordena todo: **`projects` es donde se cruzan
las dos direcciones del dinero.**

```
collaborators              projects                            incomes
  name                       name, client, type, status          project ──┐
  email                      collaborator ─────────┐             amount    │
  role                                             │             date      │
  archived                   is_monthly            │             note      │
                             next_payment ◄────────┼───────────────────────┘
  (identidad, nada más)         (cliente → Resiproco)
                             ───────────────────────
                             collaborator_payment_mode  ← el acuerdo
                             collaborator_amount
                             collaborator_next_payment ◄─┐ collaborator_payments
                                (Resiproco → colaborador) │   collaborator
                             archived                     └── project
                                                              amount, date, note
```

---

## Las tres decisiones que definen el proyecto

### 1. El acuerdo de pago vive en el proyecto, no en la persona

`collaborator_payment_mode` y `collaborator_amount` están en `projects` porque
**el acuerdo no es una propiedad del colaborador sino de la relación entre esa
persona y un trabajo concreto**: la misma diseñadora puede cobrar por hora en
un proyecto y un monto cerrado en otro.

El efecto secundario es el que más valor da: el proyecto sabe cuánto entró y
cuánto salió por él — o sea, **su margen**. Con el acuerdo del lado de la
persona, ese número no se puede calcular.

### 2. Releer, no confiar

Los hooks nunca usan el record que los disparó. Van a la base y preguntan
*"¿cuál es el cobro más reciente de este proyecto, ahora mismo?"*:

```go
incomes, err := app.FindRecordsByFilter(
    "incomes", "project = {:project}", "-date", 1, 0,
    dbx.Params{"project": projectId},
)
```

Por eso **la misma función sirve para create, update y delete**, en cualquier
orden. Si se corrige la fecha de un cobro viejo, o se borra el último, el
cálculo se corrige solo. Seis eventos salen de una sola función genérica.

### 3. Una entidad con historial no se borra, se archiva

Borrar un proyecto **no** borra sus cobros: PocketBase vacía la relation. El
monto sobrevive, el nombre no, y queda plata que nadie puede atribuir.

Por eso `projects` y `collaborators` tienen `archived`. Con movimientos se
archiva; sin movimientos se elimina de verdad. Archivado = sigue existiendo,
sale de la grilla y de los selectores, y su historial lo sigue nombrando.

---

## Estructura

```
resiproco-interno/
├── main.go              hooks: conecta eventos de PocketBase con service/
├── service/
│   ├── payments.go      la lógica de negocio, sin PocketBase adentro
│   └── payments_test.go
├── migrations/          schema versionado, se aplica solo al arrancar
├── pb_data/             la base (gitignored)
└── ui/                  SvelteKit
    └── src/
        ├── routes/      solo composición
        └── lib/
            ├── api/pocketbase.ts     el único archivo que conoce el SDK
            ├── features/<dominio>/   types · api · hooks · components
            ├── components/ui/        9 componentes propios
            └── utils/                date · money · payment
```

### El dinero se registra dentro del proyecto

No hay pantalla global de movimientos. El dinero siempre entra o sale **por un
proyecto**, así que registrarlo desde el detalle del proyecto — donde ya están
a la vista el acuerdo con el colaborador y el margen — es el único flujo con
contexto. Una pantalla aparte obligaría a elegir el proyecto de nuevo en un
`select`, sin ver nada de eso.

Los totales agregados están donde sirven para decidir: el dashboard.

### Modo SPA

`ssr = false` + `adapter-static` con `fallback: 'index.html'`. Todo el panel
está detrás de auth: no hay página pública que valga la pena prerenderizar.

El fallback se llama `index.html` a propósito y no `200.html`: es el archivo
que el handler estático estándar de PocketBase ya busca, lo que permitiría
embeber el build en el binario sin escribir código propio.

### Design system

Portado de un panel propio anterior (Linkso) y re-teñido con el violeta de
Resiproco. Vive entero en `ui/src/routes/layout.css`:

- Tokens en dos niveles: `:root` define los valores, `@theme inline` se los
  expone a Tailwind. Cambiar `--primary` repinta la app entera.
- Escala tipográfica deliberadamente chica (9–17px), pensada para tablas densas.
- Sin sombras y sin bordes: la profundidad sale del contraste entre `--panel`
  (el fondo) y `--card` (blanco encima).
- Las clases spec van **sin capa y sin `!important`**: en Tailwind v4 las
  utilidades viven en `@layer utilities`, y el CSS sin capa les gana por
  cascada.

### Auth

El SDK de PocketBase ya trae `pb.authStore` con persistencia en `localStorage`
y sincronización entre pestañas, así que no hizo falta escribir manejo de
tokens. El guard es un componente en `panel/+layout.svelte` que no renderiza
nada hasta validar la sesión — sin eso el panel parpadea antes de redirigir.

Las API rules de las cuatro collections están en `@request.auth.id != ""`.

---

## Testing

```
go test ./...
```

| Función | Cobertura |
|---|---|
| `CalculateNextPayment` | **100%** |
| `CalculateNextCollaboratorPayment` | **100%** |
| `RecalculateProjectNextPayment` | 0% |
| `RecalculateCollaboratorNextPayment` | 0% |

Ese número pide contexto: **las dos funciones puras están al 100%; las dos que
tocan la base, en 0.** Testear las segundas requiere levantar una app de test
(`tests.ApiScenario`, el patrón oficial de PocketBase), que quedó fuera de
alcance por tiempo.

Mientras tanto se verificaron **por API contra la app real**: create, update,
delete, mover un cobro entre proyectos, los dos ciclos de pago, el rechazo del
pago sin proyecto y el flujo de archivado completo. Cómo reproducir esas
pruebas está en [GUIA.md](GUIA.md).

---

## Qué quedó afuera, y por qué

**Por tiempo, no por desconocimiento.** Todo esto está identificado y acotado:

| | Qué falta |
|---|---|
| Tests de integración | `tests.ApiScenario` para las dos funciones que tocan la base |
| `clients` como collection | hoy `projects.client` es texto libre; debería ser una relation |
| Modalidad "Per project" completa | falta el hook que marca un pago pendiente cuando un proyecto pasa a `Completed` |
| `go:embed` | el build del frontend todavía no se embebe en el binario |
| Responsive | el sidebar tiene ancho fijo, no hay versión mobile |
| Paginación | `getFullList` trae todo: sirve con decenas de registros, no con miles |
| Moneda | `formatMoney` usa `$` sin código ISO |
| Toasts | guardar cierra el drawer sin confirmación visual |

### Un edge case conocido

`AddDate(0, 1, 0)` de Go **normaliza en vez de recortar**: un cobro el 31 de
enero da *3 de marzo*, no *28 de febrero*. Para un cliente que paga los 31, la
fecha deriva hacia adelante mes a mes. Está detectado y acotado; la corrección
son unas diez líneas más un test con año bisiesto.

---

## Lo que más costó aprender

- **Svelte 5 vs React.** Los runes trackean por *lectura de propiedad*, no por
  valor: un hook que devuelve estado tiene que devolver **getters**, porque
  devolver la variable suelta copia el valor de ese instante y la pantalla no
  se entera nunca más. Y una variable llamada `state` rompe el rune `$state`,
  porque `$nombre` es la sintaxis de suscripción a stores.
- **Las SPA reutilizan componentes entre rutas.** Al navegar entre dos
  detalles, `onMount` no vuelve a correr; hace falta `{#key}` para forzar el
  remonte.
- **Los hooks de PocketBase corren dentro de una transacción.** Hay que usar
  `e.App` y no la app de afuera, o la consulta puede no ver el record recién
  insertado.
- **`required` en una relation bloquea el borrado del padre.** PocketBase
  desvincula los hijos uno por uno al borrar; si la relation es obligatoria,
  ese vaciado falla y el borrado queda bloqueado para siempre. Por eso la regla
  vive en un hook `OnRecordValidate` y no en el schema.
- **Go no tiene excepciones.** El error es un valor de retorno más, y decidir
  entre `return err` y `return nil` es una decisión de diseño: acá, una
  relation vacía o un proyecto borrado devuelven `nil` porque *no hay nada que
  hacer* no es lo mismo que *algo salió mal*.
