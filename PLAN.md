# ResiproADMIN — diseño del sistema

Documento de diseño: **qué es el sistema, cómo está modelado y por qué**.
Para el recorrido del código archivo por archivo está [GUIA.md](GUIA.md); para
arrancarlo y ver el resumen ejecutivo, el [README.md](README.md).

---

## 1. La idea

Herramienta interna de gestión para la agencia **Resiproco**: llevar los
colaboradores, los proyectos y el dinero en **las dos direcciones** — lo que
entra de los clientes y lo que sale al equipo.

No copia ningún proyecto del portafolio de Resiproco. Es la herramienta que la
agencia usaría puertas adentro, construida con su stack real: **SvelteKit +
PocketBase (Go)**.

---

## 2. El modelo de datos

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

### `collaborators` — solo identidad

| Campo | Tipo | Obligatorio |
|---|---|---|
| `name` | text | sí |
| `email` | email | no |
| `role` | select: `Employee` · `Developer` · `Freelancer` · `Design` · `Marketing` | no |
| `archived` | bool | no |

### `projects` — el centro del modelo

| Campo | Tipo | Obligatorio |
|---|---|---|
| `name` | text | sí |
| `client` | text | no |
| `type` | select: `Landing Page` · `Full Website` · `Blog Site` · `E-Commerce` · `Web App` · `Web Redesign` · `Graphic Identity` · `Digital Marketing` · `Web Audit` · `Digital Consulting` | no |
| `status` | select: `In progress` · `Paused` · `Completed` | no |
| `collaborator` | relation → `collaborators` | no |
| `is_monthly` | bool | no |
| `next_payment` | date | **calculado por un hook** |
| `collaborator_payment_mode` | select: `Hourly` · `Per project` | no |
| `collaborator_amount` | number | no |
| `collaborator_next_payment` | date | **calculado por un hook** |
| `archived` | bool | no |

### `incomes` — plata que entra (cliente → Resiproco)

| Campo | Tipo | Obligatorio |
|---|---|---|
| `project` | relation → `projects` | sí, **validado por hook** |
| `amount` | number | sí, por schema |
| `date` | date | sí, por schema |
| `note` | text | no |

### `collaborator_payments` — plata que sale (Resiproco → colaborador)

| Campo | Tipo | Obligatorio |
|---|---|---|
| `collaborator` | relation → `collaborators` | sí, **validado por hook** |
| `project` | relation → `projects` | sí, **validado por hook** |
| `amount` | number | sí, por schema |
| `date` | date | sí, por schema |
| `note` | text | no |

### Por qué el acuerdo de pago vive en el proyecto

`collaborator_payment_mode` y `collaborator_amount` están en `projects`, no en
`collaborators`, porque **el acuerdo no es una propiedad de la persona sino de
la relación entre esa persona y un trabajo concreto**: la misma diseñadora
puede cobrar por hora en un proyecto y un monto cerrado por otro.

El efecto secundario es el que más valor da: el proyecto sabe cuánto entró y
cuánto salió por él — o sea, **su margen**. Con el acuerdo del lado de la
persona ese número no se puede calcular.

### Los dos campos calculados

`next_payment` y `collaborator_next_payment` **no se cargan a mano**. Los
escribe un hook de Go y el frontend solo los lee. El tipo de TypeScript hace
cumplir la regla:

```ts
export type ProjectInput = Omit<
  Project,
  'id' | 'created' | 'updated' | 'next_payment' | 'collaborator_next_payment' | 'archived'
>;
```

Si alguien intenta mandar `next_payment` desde un formulario, no compila.

---

## 3. Las reglas de negocio

Viven en `service/`, **separadas de los hooks**. La separación no es prolijidad:
es lo que permite testear.

```
hook (main.go)      →  Recalculate…            →  Calculate…
"cuándo hacerlo"       "buscá el dato real"       "la regla"
(PocketBase)           (PocketBase + regla)       (función pura)
```

Solo la de la derecha se puede testear sin levantar nada, y es la que tiene la
regla que más importa que esté bien.

### Las dos reglas

| Regla | Entrada | Salida |
|---|---|---|
| `CalculateNextPayment` | fecha del cobro | fecha + 1 mes |
| `CalculateNextCollaboratorPayment` | modalidad + fecha del pago | `Hourly` → fecha + 15 días · `Per project` → sin ciclo |

`Per project` devuelve un segundo valor `false` que significa *"no hay ciclo
recurrente"*: se paga contra entrega, no contra una fecha.

### La decisión central: releer, no confiar

`RecalculateProjectNextPayment` **nunca usa el record que disparó el hook**.
Va a la base y pregunta *"¿cuál es el cobro más reciente de este proyecto,
ahora mismo?"*:

```go
incomes, err := app.FindRecordsByFilter(
    "incomes", "project = {:project}", "-date", 1, 0,
    dbx.Params{"project": projectId},
)
```

Por eso **la misma función sirve para create, update y delete**, en cualquier
orden. Si se corrige la fecha de un cobro viejo, o se borra el último, el
cálculo se corrige solo.

### Los hooks

Seis eventos (create · update · delete × 2 collections) cableados desde una
sola función genérica, `bindRecalcHooks`. Resuelve dos casos que no son obvios:

- **Mover un registro entre proyectos recalcula los dos**: el que pierde el
  cobro y el que lo gana. La relation vieja se lee *antes* de `e.Next()`, que
  es el punto donde el cambio se aplica.
- **El borrado usa `OnRecordAfterDeleteSuccess`**, no un hook "antes": la fila
  tiene que estar efectivamente borrada, si no la query del recálculo seguiría
  contando el record que se está eliminando.

---

## 4. La validación, en dos capas

| Qué se valida | Dónde | Por qué ahí |
|---|---|---|
| `amount`, `date`, `name` | **schema** (`required` en la collection) | son valores propios del record; PocketBase los rechaza solo |
| `project`, `collaborator` | **hook** `OnRecordValidate` | ver abajo |

Las relations **no** pueden ser `required` en el schema, y la razón es sutil.
Cuando se borra un proyecto, PocketBase recorre sus hijos y les vacía la
relation. Si esa relation fuera obligatoria, ese vaciado fallaría y **el
borrado quedaría bloqueado para siempre**.

`OnRecordValidate` resuelve las dos cosas a la vez porque PocketBase lo saltea
exactamente en ese caso (usa `SaveNoValidate` internamente):

- un usuario que guarda sin proyecto → **rechazado**, con mensaje propio
- una cascada que desvincula el historial → **permitida**

Los `Recalculate…` también usan `SaveNoValidate` por el mismo motivo: solo
escriben una fecha que calcularon ellos mismos, y revalidar el record entero
durante una cascada abortaría la transacción.

---

## 5. Archivar en vez de borrar

Borrar una entidad **no** borra su historial de dinero: PocketBase vacía la
relation. El monto sobrevive, el nombre no. Queda un cobro de $120 que nadie
puede atribuir — y, como la regla de validación exige la relation, ese registro
además queda **congelado**: solo se puede leer o borrar, nunca corregir.

Por eso `projects` y `collaborators` tienen `archived`:

| | Sin movimientos | Con movimientos |
|---|---|---|
| Proyecto | se elimina | **se archiva** |
| Colaborador | se elimina | **se archiva** |

Archivado significa: sigue existiendo, sale de la grilla de trabajo y de los
selectores, no cuenta en las métricas, y **su historial lo sigue nombrando**.
Se puede desarchivar.

El detalle que hace que funcione: **los formularios sí cargan las entidades
archivadas**, para poder resolver el nombre de una que ya está referenciada.
Solo quedan fuera del `select`:

```ts
const projectsStore = useProjects(true); // incluye archivados

const projectOptions = $derived(
  projectsStore.projects
    .filter((item) => !item.archived || item.id === project) // pero no se ofrecen
    .map((item) => [item.id, item.name] as [string, string])
);
```

Sin la segunda condición, editar un cobro de un proyecto archivado lo
**reasignaría en silencio**: el `select` no encontraría su valor actual y
caería al primero de la lista.

---

## 6. Arquitectura

### Monorepo, con el frontend anidado

Un solo repo, y SvelteKit vive **dentro** de la raíz del backend (`ui/`).
La razón es dura: `go:embed` no puede subir niveles con `../`, solo empaqueta
lo que está debajo del `.go` que lo usa. Dejar `ui/` afuera cerraría la puerta
a embeber el build en el binario.

### PocketBase como librería, no como binario

`main.go` importa el paquete y arranca la app. La API REST, el Admin UI y la
base salen de ahí. Eso es lo que permite enganchar código Go propio en el ciclo
de vida de cada record — con el binario suelto, los hooks no existirían.

### SPA pura, sin SSR

`ssr = false` + `adapter-static` con `fallback: 'index.html'`. Todo el panel
está detrás de auth: no hay página pública que valga la pena prerenderizar, así
que los costos del modo SPA (SEO, no funciona sin JS) no aplican.

El fallback se llama `index.html` a propósito y no `200.html`: es el archivo
que el handler estático estándar de PocketBase ya busca, lo que permitiría
embeber el build sin escribir código propio.

---

## 7. El frontend

Arquitectura por features. Las rutas son cáscaras de tres líneas; toda la
lógica vive en `lib/features/<dominio>/`.

```
src/
├── routes/                    rutas = solo composición
│   ├── login/
│   └── panel/
│       ├── +layout.svelte     auth guard + shell
│       ├── collaborators/
│       └── projects/[id]/     ruta dinámica
└── lib/
    ├── api/pocketbase.ts      el único archivo que conoce el SDK
    ├── features/<dominio>/    types.ts · api.ts · hooks/ · components/
    ├── components/ui/         9 componentes propios
    ├── components/layout/     Sidebar
    └── utils/                 date · money · payment
```

Cada feature tiene siempre la misma forma:

| Archivo | Responsabilidad |
|---|---|
| `types.ts` | el dato: la interfaz que espeja la collection |
| `api.ts` | el transporte: el único que habla con el SDK |
| `hooks/*.svelte.ts` | el estado: runes + refetch después de cada mutación |
| `components/` | la UI |

### El dinero se registra dentro del proyecto

No hay pantalla global de movimientos. El dinero siempre entra o sale **por un
proyecto**, así que registrarlo desde el detalle del proyecto — donde ya están
a la vista el acuerdo con el colaborador y el margen — es el único flujo con
contexto. Una pantalla aparte obligaría a elegir el proyecto de nuevo en un
`select`, sin ver nada de eso.

Los totales agregados están donde sirven para decidir: el dashboard.

---

## 8. Testing

```
go test ./...
```

| Función | Cobertura |
|---|---|
| `CalculateNextPayment` | **100%** |
| `CalculateNextCollaboratorPayment` | **100%** |
| `RecalculateProjectNextPayment` | 0% |
| `RecalculateCollaboratorNextPayment` | 0% |

**Las dos funciones puras están al 100%; las dos que tocan la base, en 0.**
Testear las segundas requiere levantar una app de test (`tests.ApiScenario`,
el patrón oficial de PocketBase), que quedó fuera de alcance por tiempo.

Mientras tanto se verificaron **por API contra la app real**: create, update,
delete, mover un cobro entre proyectos, los dos ciclos de pago, el rechazo del
pago sin proyecto, y el flujo de archivado completo.

El test de `CalculateNextCollaboratorPayment` es *table-driven* e incluye un
caso de regresión (`"Fixed salary"`), una modalidad que no existe en el modelo:
si alguien la reintroduce por accidente, el test falla.

---

## 9. Fuera de alcance, y por qué

**Por tiempo, no por desconocimiento.** Todo esto está identificado y acotado:

| | Qué falta |
|---|---|
| Tests de integración | `tests.ApiScenario` para las dos funciones que tocan la base |
| `clients` como collection | hoy `projects.client` es texto libre; debería ser una relation |
| Modalidad "Per project" completa | falta el hook que marca un pago pendiente cuando un proyecto pasa a `Completed` |
| `go:embed` | el build del frontend todavía no se embebe en el binario |
| Responsive | el sidebar tiene ancho fijo, no hay versión mobile |
| Paginación | `getFullList` trae todo: sirve con decenas de registros, no con miles |
| Moneda | `formatMoney` usa `$` sin código ISO, porque la moneda no está definida |
| Toasts | guardar cierra el drawer sin confirmación visual |

### Un edge case conocido

`AddDate(0, 1, 0)` de Go **normaliza en vez de recortar**: un cobro el 31 de
enero da *3 de marzo*, no *28 de febrero*. Para un cliente que paga los 31, la
fecha deriva hacia adelante mes a mes. Está detectado y acotado; la corrección
son unas diez líneas en `CalculateNextPayment` más un test con año bisiesto.
