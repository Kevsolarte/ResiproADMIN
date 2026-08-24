# GUIA — cómo funciona ResiproADMIN, archivo por archivo

Guía de estudio. Recorre el proyecto de arriba a abajo: cómo arrancarlo, qué
hace cada archivo, cómo se conectan entre sí, y cómo probar que funciona.

Para el resumen ejecutivo está el [README](README.md); para las decisiones de
diseño y el modelo de datos, [PLAN.md](PLAN.md).

**Índice**

1. [Cómo arrancarlo](#1-cómo-arrancarlo)
2. [Mapa del proyecto](#2-mapa-del-proyecto)
3. [El backend, archivo por archivo](#3-el-backend-archivo-por-archivo)
4. [El frontend, archivo por archivo](#4-el-frontend-archivo-por-archivo)
5. [El recorrido completo de un cobro](#5-el-recorrido-completo-de-un-cobro)
6. [Los conceptos que hay que entender](#6-los-conceptos-que-hay-que-entender)
7. [Cómo probarlo](#7-cómo-probarlo)

---

## 1. Cómo arrancarlo

### Requisitos

| | Versión | Verificar con |
|---|---|---|
| Go | 1.26+ | `go version` |
| Node | 20+ | `node -v` |

En Windows, si `go` no se encuentra desde Git Bash:

```bash
export PATH="/c/Program Files/Go/bin:$PATH"
```

### Arranque

Hacen falta **dos terminales**, y el orden importa: el frontend no muestra nada
sin el backend arriba.

**Terminal 1 — backend:**

```bash
cd resiproco-interno
go run . serve
```

Levanta en `http://127.0.0.1:8090`. Al arrancar hace tres cosas:

1. abre (o crea) la base SQLite en `pb_data/`
2. **aplica las migraciones pendientes** de `migrations/`
3. registra los hooks de `main.go` y sirve la API REST + el Admin UI

**Terminal 2 — frontend:**

```bash
cd ui
npm install     # solo la primera vez
npm run dev
```

Levanta en `http://localhost:5173`.

### La primera vez

1. PocketBase imprime en consola un link para **crear el superusuario**. Ese es
   el dueño del Admin UI (`http://127.0.0.1:8090/_/`), no el login del panel.
2. En el Admin UI, entrar a la collection `users` y **crear un registro**. Ese
   sí es el que usa el login del panel en `localhost:5173`.

La distinción confunde y vale entenderla: **superuser** administra PocketBase;
**users** es una collection de auth común, la que el panel consume.

### Datos de demo

`scripts/seed.py` carga un set coherente: 4 colaboradores, 6 proyectos (uno
archivado) y sus cobros y pagos, con fechas elegidas para que se vean los tres
estados — *Atrasado*, *Esta semana* y *Próximo*.

```bash
python scripts/seed.py --email TU_SUPERUSUARIO --password TU_PASSWORD --reset
```

`--reset` borra las cuatro collections antes de cargar. Sin ese flag, suma
encima de lo que ya haya.

Lo importante: el script **no escribe ninguna fecha calculada**. Carga cobros y
pagos por la API, y `next_payment` / `collaborator_next_payment` los escriben
los hooks de Go. Si el script imprime las fechas correctas, los hooks funcionan.

### Si algo falla

| Síntoma | Causa y solución |
|---|---|
| El panel queda en blanco | El backend no está arriba. `curl http://127.0.0.1:8090/api/health` debería dar `200`. |
| `does not provide an export named 'X'` apuntando a una línea que ya no dice eso | Cache de Vite. `rm -rf node_modules/.vite && npm run dev -- --force` |
| Una migración nueva no se aplicó | Solo corren al arrancar. Reiniciar el backend. |
| El puerto 8090 está ocupado | Quedó un proceso viejo. En Windows: `Get-NetTCPConnection -LocalPort 8090 -State Listen` y `Stop-Process`. |

---

## 2. Mapa del proyecto

```
resiproco-interno/
├── main.go                  arranque + hooks
├── go.mod / go.sum          dependencias de Go
├── service/
│   ├── payments.go          LA LÓGICA DE NEGOCIO
│   └── payments_test.go     sus tests
├── migrations/              16 archivos: el schema versionado
├── pb_data/                 la base SQLite (gitignored)
└── ui/                      el frontend SvelteKit
    ├── vite.config.ts       Vite + SvelteKit + Tailwind + adapter
    └── src/
        ├── app.html         el cascarón HTML
        ├── routes/          las URLs
        └── lib/             todo lo demás
```

La regla mental para ubicarse: **`routes/` son URLs, `lib/` es código.**
Una ruta nunca tiene lógica; importa un componente de `lib/features/` y lo
renderiza.

---

## 3. El backend, archivo por archivo

### `main.go` — el arranque y los hooks

Tres bloques.

**a) `main()` — arranca la app**

```go
app := pocketbase.New()

migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
    Automigrate: true,
})

bindAppHooks(app)

if err := app.Start(); err != nil {
    log.Fatal(err)
}
```

`Automigrate: true` significa que **los cambios de schema hechos en el Admin UI
se escriben como archivos Go** en `migrations/`. Por eso el schema queda
versionado y no vive solo dentro del `.db`.

Arriba del archivo hay un import raro:

```go
_ "resiproco-interno/migrations"
```

El `_` es un **blank import**: no se usa nada del paquete, se importa solo para
que corran los `init()` de cada archivo de migración, que es donde se registran.

**b) `bindAppHooks` — el cableado**

Es la tabla de contenidos del backend. Dice qué se conecta con qué, sin lógica:

```go
bindRecalcHooks(app, "incomes", "project", service.RecalculateProjectNextPayment)
bindRecalcHooks(app, "collaborator_payments", "project", service.RecalculateCollaboratorNextPayment)

bindRequiredRelations(app, "incomes", []requiredRelation{
    {"project", "El proyecto es obligatorio"},
})
bindRequiredRelations(app, "collaborator_payments", []requiredRelation{
    {"project", "El proyecto es obligatorio: el acuerdo de pago vive en el proyecto"},
    {"collaborator", "El colaborador es obligatorio"},
})
```

**c) `bindRecalcHooks` — la función genérica**

Recibe una collection, el nombre del campo relation, y **la función a llamar**.
Con eso cablea los tres eventos. Es la parte más densa del backend:

```go
app.OnRecordCreate(collection).BindFunc(func(e *core.RecordEvent) error {
    if err := e.Next(); err != nil {
        return err
    }
    return recalc(e.App, e.Record.GetString(relationField))
})
```

`e.Next()` es la frontera: **antes** es "todavía no se guardó", **después** es
"ya está en la base". El recálculo va después, porque necesita leer el record
que se acaba de escribir.

El update tiene un detalle que no es obvio:

```go
previous := e.Record.Original().GetString(relationField)  // ANTES de e.Next()

if err := e.Next(); err != nil {
    return err
}

current := e.Record.GetString(relationField)
if previous != "" && previous != current {
    if err := recalc(e.App, previous); err != nil {  // el que perdió el cobro
        return err
    }
}
return recalc(e.App, current)                          // el que lo ganó
```

Si un cobro se **mueve** de un proyecto a otro, hay que recalcular **los dos**.
Sin esto, el proyecto original queda con una fecha basada en un cobro que ya no
le pertenece.

El delete usa `OnRecordAfterDeleteSuccess`, no un hook "antes": la fila tiene
que estar efectivamente borrada, si no la query del recálculo seguiría contando
el record que se está eliminando.

**d) `bindRequiredRelations` — la validación**

```go
app.OnRecordValidate(collection).BindFunc(func(e *core.RecordEvent) error {
    for _, relation := range relations {
        if e.Record.GetString(relation.field) == "" {
            return apis.NewBadRequestError(relation.message, nil)
        }
    }
    return e.Next()
})
```

Por qué `OnRecordValidate` y no `OnRecordCreate`: es el único hook que
PocketBase **saltea** cuando desvincula relations durante un borrado en
cascada. Eso permite las dos cosas a la vez — rechazar el guardado de un
usuario, y dejar que el historial sobreviva a un proyecto borrado.

### `service/payments.go` — la lógica de negocio

Cuatro funciones, en dos pares.

**Las puras** — no conocen PocketBase, solo reciben datos y devuelven datos:

```go
func CalculateNextPayment(paymentDate time.Time) time.Time {
    return paymentDate.AddDate(0, 1, 0)
}

func CalculateNextCollaboratorPayment(paymentMode string, paymentDate time.Time) (time.Time, bool) {
    switch paymentMode {
    case "Hourly":
        return paymentDate.AddDate(0, 0, 15), true
    default:
        return time.Time{}, false
    }
}
```

El `bool` de la segunda responde *"¿hay ciclo recurrente?"*. `Per project` no
tiene: se paga contra entrega, no contra una fecha.

**Estas dos son las únicas testeables sin levantar nada**, y son las que tienen
la regla que más importa que esté bien.

**Las que tocan la base** — buscan el dato real y guardan el resultado:

```go
func RecalculateProjectNextPayment(app core.App, projectId string) error {
    if projectId == "" {
        return nil                       // relation vacía
    }

    project, err := app.FindRecordById("projects", projectId)
    if err != nil {
        return nil                       // el proyecto ya no existe
    }
    if !project.GetBool("is_monthly") {
        return nil                       // no es mensual
    }

    incomes, err := app.FindRecordsByFilter(
        "incomes", "project = {:project}", "-date", 1, 0,
        dbx.Params{"project": projectId},
    )
    if err != nil || len(incomes) == 0 {
        project.Set("next_payment", nil) // no quedan cobros
        return app.SaveNoValidate(project)
    }

    lastDate := incomes[0].GetDateTime("date").Time()
    project.Set("next_payment", CalculateNextPayment(lastDate))

    return app.SaveNoValidate(project)
}
```

Tres cosas para explicar de acá:

1. **Los tres `return nil` del principio.** En Go el error es un valor de
   retorno, no una excepción. Devolver `nil` es una decisión: *"no hay nada que
   hacer"* no es lo mismo que *"algo salió mal"*. Un proyecto borrado no es un
   error del sistema.
2. **`{:project}` con `dbx.Params`.** Es una query parametrizada: el valor se
   escapa, no se concatena. Es la defensa contra inyección SQL, y el frontend
   usa la misma sintaxis con `pb.filter()`.
3. **`SaveNoValidate` y no `Save`.** Estas funciones solo escriben una fecha que
   calcularon ellas mismas. Durante un borrado en cascada, un guardado
   *validado* rechazaría un record que todavía apunta a la fila que se está
   borrando, y abortaría la transacción entera.

### `service/payments_test.go` — los tests

Dos tests. El segundo es *table-driven*: un slice de structs describe todos los
casos y un solo loop los corre.

```go
tests := []struct {
    paymentMode string
    wantApplies bool
    want        time.Time
}{
    {"Hourly", true, date.AddDate(0, 0, 15)},
    {"Per project", false, time.Time{}},
    {"", false, time.Time{}},
    {"Fixed salary", false, time.Time{}}, // modalidad eliminada, no debe volver
}
```

La última línea es un **test de regresión**: `Fixed salary` es una modalidad que
no existe en el modelo. Si alguien la reintroduce por accidente, el test falla.

Agregar una modalidad es agregar una línea, no escribir otra función.

### `migrations/` — el schema versionado

16 archivos. Los generados por el Admin UI tienen nombres como
`1787429008_created_projects.go`; los escritos a mano tienen nombres que
describen la intención:

| Archivo | Qué hace |
|---|---|
| `1787524559_required_fields.go` | pone `required` en los campos planos (`amount`, `date`) |
| `1787525231_relations_not_required.go` | **revierte** `required` en las relations |
| `1787525992_projects_archived.go` | agrega `archived` a `projects` |
| `1787528076_collaborators_archived.go` | agrega `archived` a `collaborators` |

Los dos primeros juntos cuentan una historia: poner `required` en las relations
**bloqueó el borrado de proyectos**, porque PocketBase no puede vaciar una
relation obligatoria. La segunda migración lo revierte, y la regla se mudó al
hook `OnRecordValidate`.

Forma de una migración:

```go
func init() {
    m.Register(func(app core.App) error {
        // up: aplicar
    }, func(app core.App) error {
        // down: revertir
    })
}
```

**Las migraciones son inmutables.** Una vez aplicada, no se edita: se escribe
otra. PocketBase lleva la cuenta en la tabla `_migrations`, por nombre de
archivo.

---

## 4. El frontend, archivo por archivo

### La forma de una feature

Cuatro de las cinco features (`projects`, `collaborators`, `incomes`,
`collaborator-payments`) tienen **siempre la misma estructura**. Entender una es
entender las cuatro. La quinta, `dashboard`, es la excepción: solo tiene un
componente, porque no es un dominio propio — compone los otros cuatro.

```
features/projects/
├── types.ts                    el DATO
├── api.ts                      el TRANSPORTE
├── hooks/projects.svelte.ts    el ESTADO
└── components/                 la UI
    ├── ProjectsDashboard.svelte
    ├── ProjectCard.svelte
    ├── ProjectDetail.svelte
    └── ProjectForm.svelte
```

**`types.ts` — el dato**

Espeja la collection de PocketBase. Sin `[key: string]: any`, a propósito: ese
index signature se tragaría cualquier typo.

**`api.ts` — el transporte**

El único lugar que conoce el nombre de la collection y el SDK. Todo lo de
arriba trabaja con objetos y promesas comunes:

```ts
const COLLECTION = 'projects';

export function listProjects(includeArchived = false): Promise<Project[]> {
	return pb.collection(COLLECTION).getFullList<Project>({
		sort: '-created',
		filter: includeArchived ? '' : 'archived = false'
	});
}
```

Acá vive también el tipo que protege los campos calculados:

```ts
export type ProjectInput = Omit<
	Project,
	'id' | 'created' | 'updated' | 'next_payment' | 'collaborator_next_payment' | 'archived'
>;
```

Si un formulario intentara mandar `next_payment`, **no compila**.

**`hooks/*.svelte.ts` — el estado**

La extensión `.svelte.ts` es obligatoria: en un `.ts` común los runes (`$state`)
quedan sin compilar.

```ts
export function useProjects(includeArchived = false) {
	let projects = $state<Project[]>([]);
	let loading = $state(true);

	async function load() {
		projects = await listProjects(showArchived);
	}

	async function create(input: ProjectInput) {
		await createProject(input);
		await load();          // refetch, no parcheo local
	}

	load();

	return {
		get projects() { return projects; },   // GETTERS, no valores
		get loading() { return loading; },
		create
	};
}
```

Dos cosas críticas:

1. **Devuelve getters, no valores.** Los runes trackean la *lectura de una
   propiedad*. Devolver `projects` a secas copiaría el valor de ese instante y
   la pantalla no se enteraría nunca más de un cambio.
2. **Refetch después de cada mutación.** El hook de Go reescribe `next_payment`
   del lado del servidor, así que la copia local queda vieja apenas se guarda.
   Volver a pedir es la única lectura correcta.

**`components/` — la UI**

| Componente | Rol |
|---|---|
| `ProjectsDashboard` | la grilla: stats, búsqueda, toggle de archivados |
| `ProjectCard` | una card; es un `<a>`, no un `<div onclick>`, para que el foco por teclado y "abrir en pestaña nueva" funcionen gratis |
| `ProjectDetail` | la pantalla más compleja: dos tablas de dinero, alta/edición/baja, archivar |
| `ProjectForm` | el Drawer de alta y edición |

### `lib/api/pocketbase.ts` — el cliente

Quince líneas, y es el único archivo de toda la app que importa el SDK:

```ts
const PB_URL = import.meta.env.VITE_PB_URL ?? 'http://127.0.0.1:8090';
export const pb = new PocketBase(PB_URL);
```

Ese cliente es dueño del token de auth y lo persiste solo en `localStorage`,
sincronizando entre pestañas. Por eso no hay ningún `token-storage.ts` escrito
a mano.

### `lib/utils/` — tres archivos chicos

| Archivo | Qué resuelve |
|---|---|
| `date.ts` | PocketBase manda `"2026-09-20 00:00:00.000Z"`, con un espacio donde ISO pone la `T`. `toDate()` lo normaliza para que cualquier navegador lo lea. |
| `money.ts` | `formatMoney()` con separadores de miles y un `$` neutro |
| `payment.ts` | **la regla visual del vencimiento**, definida una sola vez |

`payment.ts` es el que más se usa:

```ts
export const DUE_WINDOW_DAYS = 7;

export function paymentState(nextPayment: string): PaymentState {
	const date = toDate(nextPayment);
	if (!date) return 'none';

	const diff = date.getTime() - Date.now();
	if (diff < 0) return 'overdue';
	if (diff <= DUE_WINDOW_DAYS * DAY_MS) return 'due';
	return 'upcoming';
}
```

Y exporta los labels y las clases de color en objetos indexados por ese estado,
así ninguna pantalla decide por su cuenta qué es "atrasado".

### `lib/components/ui/` — nueve componentes propios

`PageHeader` · `StatCard` · `TableCard` · `SearchInput` · `TextField` ·
`SelectField` · `CheckboxField` · `Drawer` · `ConfirmDialog`

`Drawer` y `ConfirmDialog` son los dos únicos que usan `bits-ui`: los dos
envuelven la misma primitiva `Dialog`, con distinta animación y distinto rol.

**La convención de la app:** formulario → Drawer lateral. Confirmación → modal
centrado.

### `routes/` — las URLs

| Ruta | Archivo | Qué hace |
|---|---|---|
| `/` | `+page.ts` | `redirect(307, '/panel')` |
| `/login` | `login/+page.svelte` | el formulario de login |
| `/panel` | `panel/+page.svelte` | el dashboard |
| `/panel/projects` | `projects/+page.svelte` | la grilla |
| `/panel/projects/[id]` | `[id]/+page.svelte` | el detalle |
| `/panel/collaborators` | `collaborators/+page.svelte` | el equipo |

Una ruta típica tiene tres líneas:

```svelte
<script lang="ts">
	import ProjectsDashboard from '$lib/features/projects/components/ProjectsDashboard.svelte';
</script>

<ProjectsDashboard />
```

**El `+` en los nombres** es convención de SvelteKit: marca los archivos que el
framework interpreta como parte del enrutado (`+page`, `+layout`, `+error`).
Un archivo sin `+` en `routes/` es un archivo común.

**`routes/+layout.ts`** define el modo de renderizado de toda la app:

```ts
export const ssr = false;
export const prerender = false;
```

**`routes/panel/+layout.svelte`** es el auth guard y el shell:

```svelte
let ready = $state(false);

onMount(() => {
	if (!pb.authStore.isValid) {
		goto('/login');
		return;
	}
	ready = true;
});
```

El flag `ready` no es decorativo: sin él, el panel aparece un instante antes de
que la redirección ocurra.

**`routes/panel/projects/[id]/+page.svelte`** tiene el otro detalle fino:

```svelte
{#key params.id}
	<ProjectDetail id={params.id} />
{/key}
```

En una SPA, navegar de un detalle a otro **reutiliza el componente**: `onMount`
no vuelve a correr y la pantalla se queda con los datos del proyecto anterior.
`{#key}` fuerza el remonte.

### `routes/layout.css` — el design system

Tokens en dos niveles:

```css
:root {
	--primary: #6d28d9;
	--panel: #f5f3f8;
}

@theme inline {
	--color-primary: var(--primary);
}
```

`:root` define los valores, `@theme inline` se los expone a Tailwind. Cambiar
`--primary` repinta la app entera.

Las clases spec (`.page-title`, `.table-cell-custom`…) van **sin capa y sin
`!important`**: en Tailwind v4 las utilidades viven en `@layer utilities`, y el
CSS sin capa les gana por cascada.

---

## 5. El recorrido completo de un cobro

Este es el flujo que conviene tener memorizado para explicar el proyecto. Son
diez pasos, del click al pixel.

**El usuario está en `/panel/projects/abc123` y registra un cobro de $500.**

```
 1. ProjectDetail.svelte          click en "+ Cobro" → openIncome(null)
        │                          editingIncome = null → es un alta
        ▼
 2. IncomeForm.svelte             Drawer con el proyecto ya fijado
        │                          (lockedProjectId, no hay select que elegir)
        ▼
 3. saveIncome(input)             ProjectDetail decide: ¿hay editingIncome?
        │                          no → create
        ▼
 4. useProjectIncomes.create()    el hook llama al api
        │
        ▼
 5. createIncome(data)            api.ts: pb.collection('incomes').create(...)
        │
        ▼  ── HTTP POST /api/collections/incomes/records ──▶
 6. OnRecordValidate              ¿project vacío? → 400 y termina acá
        │                          no → sigue
        ▼
 7. OnRecordCreate                e.Next() → la fila se escribe
        │
        ▼
 8. RecalculateProjectNextPayment relee el cobro MÁS RECIENTE de la base
        │                          CalculateNextPayment(fecha) = fecha + 1 mes
        │                          project.SaveNoValidate()
        ▼  ◀── 200 OK ──
 9. await load() + loadProject()  refetch de los cobros Y del proyecto,
        │                          porque el hook acaba de reescribirle la fecha
        ▼
10. la pantalla se repinta        el rune vio que projects cambió
```

**El punto que hay que subrayar al explicarlo:** el paso 8 no usa el cobro que
acaba de llegar. Va a la base y pregunta cuál es el más reciente. Por eso el
mismo código funciona si el cobro se crea, se edita o se borra — y por eso el
paso 9 tiene que refetchear en vez de parchear el estado local.

---

## 6. Los conceptos que hay que entender

### Go / PocketBase

| Concepto | Qué es |
|---|---|
| **PocketBase como librería** | `main.go` importa el paquete y arranca la app; no se usa el binario suelto. Es lo que permite tener hooks propios. |
| **Hook** | Una función que corre en un evento del CRUD (`OnRecordCreate`, `OnRecordUpdate`…). No reemplaza el CRUD, le agrega comportamiento. |
| **`e.Next()`** | La frontera del middleware: antes es "todavía no se guardó", después es "ya está en la base". |
| **`e.App` vs `app`** | `e.App` está atado a la transacción en curso. Usar el `app` de afuera puede no ver el record recién insertado. |
| **`Save` vs `SaveNoValidate`** | `SaveNoValidate` escribe sin correr validaciones. Necesario cuando el que escribe es el sistema, no el usuario. |
| **`expand`** | El "populate" de PocketBase: pide que la respuesta traiga anidado el record relacionado en vez del id. |
| **Migración** | Un delta inmutable del schema, con `up` y `down`. PocketBase lleva la cuenta en `_migrations`. |
| **`dbx.Params`** | Query parametrizada: escapa el valor en vez de concatenarlo. |

### Svelte 5 / SvelteKit

| Concepto | Qué es |
|---|---|
| **Rune** | El sistema de reactividad de Svelte 5: `$state`, `$derived`, `$effect`, `$props`. |
| **`.svelte.ts`** | La extensión que hace que los runes funcionen fuera de un componente. |
| **Getters en un hook** | Los runes trackean la *lectura de una propiedad*. Devolver el valor suelto copia ese instante y rompe la reactividad. |
| **`$derived` vs `$effect`** | `$derived` calcula un valor a partir de otros; `$effect` corre un efecto secundario. Si estás calculando, va `$derived`. |
| **`{#key}`** | Fuerza el remonte de un bloque cuando cambia su clave. Necesario al navegar entre dos rutas dinámicas. |
| **`$bindable()`** | Marca una prop como bidireccional, para que `bind:open` funcione desde el padre. |
| **El `+` en `routes/`** | Marca los archivos que SvelteKit interpreta como enrutado. |
| **`ssr = false`** | Modo SPA: todo se renderiza en el navegador. |

### Gotchas reales que costaron tiempo

- **Una variable llamada `state` rompe el rune `$state`**, porque `$nombre` es
  la sintaxis de suscripción a stores de Svelte 4.
- **`required` en una relation bloquea el borrado del padre**: PocketBase no
  puede vaciar una relation obligatoria.
- **Un `select` que no encuentra su valor actual cae al primero de la lista** —
  por eso los formularios cargan las entidades archivadas aunque no las
  ofrezcan.
- **El mensaje de error de PocketBase al borrar es un catch-all.** "Make sure
  that the record is not part of a required relation reference" puede tapar
  causas completamente distintas; hay que mirar el `data` de la respuesta.

---

## 7. Cómo probarlo

### Tests automáticos

```bash
go test ./...                                   # los tests
go test ./... -cover                            # con cobertura
go test ./... -coverprofile=cov.out && go tool cover -func=cov.out
go vet ./...                                    # análisis estático
gofmt -l .                                      # formato (sin salida = ok)

cd ui && npm run check                          # typecheck del frontend
cd ui && npm run build                          # build de producción
```

Todo verde debería verse así:

```
ok      resiproco-interno/service    coverage: 11.8% of statements
COMPLETED 4492 FILES 0 ERRORS 0 WARNINGS
```

### Prueba manual, de punta a punta

El guión mínimo para una demo:

1. Crear un **colaborador**.
2. Crear un **proyecto**, asignarle ese colaborador, marcarlo **mensual** y
   elegir modalidad **Hourly** con un monto.
3. Entrar al detalle del proyecto y **registrar un cobro**.
   → *Próximo cobro* aparece solo, un mes después.
4. **Registrar un pago** al colaborador.
   → *Próximo pago* aparece solo, 15 días después.
5. **Editar el cobro** y cambiarle la fecha.
   → la fecha calculada se corrige sola.
6. Intentar **borrar el proyecto**.
   → dice **Archivar**, porque tiene movimientos.
7. Archivarlo y activar **"Ver archivados"**.
   → reaparece, en gris, con su badge.

### Verificar contra la API directamente

Para probar el backend sin pasar por la UI hace falta un token. Se crea un
superusuario temporal, se usa, y se borra:

```bash
# 1. crear
go run . superuser upsert temp@local.test temp-1234

# 2. autenticar
TOKEN=$(curl -s -X POST http://127.0.0.1:8090/api/collections/_superusers/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"temp@local.test","password":"temp-1234"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['token'])")

# 3. usar
curl -s "http://127.0.0.1:8090/api/collections/projects/records" \
  -H "Authorization: $TOKEN" | python -m json.tool

# 4. BORRARLO SIEMPRE al terminar
go run . superuser delete temp@local.test
```

Casos que vale la pena verificar así:

| Qué se prueba | Cómo | Esperado |
|---|---|---|
| Validación de relation | `POST /incomes` sin `project` | `400` con el mensaje del hook |
| Recálculo en update | `PATCH` la fecha del último cobro | `next_payment` se mueve |
| Mover entre proyectos | `PATCH` el `project` de un cobro | los **dos** proyectos se recalculan |
| El historial sobrevive | borrar un proyecto sin archivar | los cobros siguen existiendo |
| Filtro de archivados | `GET /projects?filter=archived%3Dfalse` | no aparece el archivado |

### Mirar la base directamente

Sin cliente de SQLite instalado, con Python alcanza:

```bash
python -c "
import sqlite3
c = sqlite3.connect('file:pb_data/data.db?mode=ro', uri=True)
for r in c.execute('SELECT id, name, archived, next_payment FROM projects'):
    print(r)
"
```

Útil para confirmar que un hook escribió lo que se esperaba, sin pasar por la
API ni por la UI.
