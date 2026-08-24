package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"

	"resiproco-interno/service"

	// Blank import: only to run the init() of each migration file.
	// Blank import: solo para que corra el init() de cada migración.
	_ "resiproco-interno/migrations"
)

func main() {
	app := pocketbase.New()

	// Schema changes made in the Admin UI are written to migrations/.
	// Los cambios de schema del Admin UI se escriben en migrations/.
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: true,
	})

	bindAppHooks(app)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// Wires PocketBase events to the business logic in service/.
// Conecta los eventos de PocketBase con la lógica de service/.
func bindAppHooks(app core.App) {
	// Money IN: an income refreshes projects.next_payment.
	// Plata que ENTRA: un income refresca projects.next_payment.
	bindRecalcHooks(app, "incomes", "project", service.RecalculateProjectNextPayment)

	// Money OUT: a payment refreshes projects.collaborator_next_payment.
	// Plata que SALE: un pago refresca projects.collaborator_next_payment.
	bindRecalcHooks(
		app,
		"collaborator_payments",
		"project",
		service.RecalculateCollaboratorNextPayment,
	)

	// Relations that must be filled in when saving. Kept out of the schema on
	// purpose, so deleting a project detaches its history instead of blocking.
	// Relations que hay que completar al guardar. Fuera del schema a propósito,
	// para que borrar un proyecto desvincule su historial en vez de bloquearse.
	bindRequiredRelations(app, "incomes", []requiredRelation{
		{"project", "El proyecto es obligatorio"},
	})

	bindRequiredRelations(app, "collaborator_payments", []requiredRelation{
		{"project", "El proyecto es obligatorio: el acuerdo de pago vive en el proyecto"},
		{"collaborator", "El colaborador es obligatorio"},
	})
}

type requiredRelation struct {
	field   string
	message string
}

// Rejects a save whose relation is empty.
// Rechaza un guardado cuya relation está vacía.
//
// OnRecordValidate and not OnRecordCreate/Update: PocketBase runs this hook on
// every user-driven save, but skips it (SaveNoValidate) exactly when it clears
// the relation of a record whose parent was deleted. That is what lets the
// payment history survive a deleted project.
// OnRecordValidate y no OnRecordCreate/Update: PocketBase corre este hook en
// cada guardado hecho por el usuario, pero lo saltea (SaveNoValidate) justo
// cuando vacía la relation de un record cuyo padre fue borrado. Eso es lo que
// permite que el historial de pagos sobreviva a un proyecto eliminado.
func bindRequiredRelations(app core.App, collection string, relations []requiredRelation) {
	app.OnRecordValidate(collection).BindFunc(func(e *core.RecordEvent) error {
		for _, relation := range relations {
			if e.Record.GetString(relation.field) == "" {
				return apis.NewBadRequestError(relation.message, nil)
			}
		}

		return e.Next()
	})
}

// Wires create, update and delete of one collection to a single recalc
// function. The three events can share it because recalc always re-reads the
// latest record from the database instead of trusting the one that triggered
// the hook.
// Conecta create, update y delete de una collection a una sola función de
// recálculo. Los tres eventos pueden compartirla porque recalc siempre relee
// el record más reciente de la base en vez de confiar en el que disparó el hook.
func bindRecalcHooks(
	app core.App,
	collection string,
	relationField string,
	recalc func(core.App, string) error,
) {
	app.OnRecordCreate(collection).BindFunc(func(e *core.RecordEvent) error {
		if err := e.Next(); err != nil {
			return err
		}

		// e.App (not app): it is bound to the running transaction.
		// e.App (no app): está atado a la transacción en curso.
		return recalc(e.App, e.Record.GetString(relationField))
	})

	app.OnRecordUpdate(collection).BindFunc(func(e *core.RecordEvent) error {
		// Read the relation BEFORE the update: if the record was moved to a
		// different parent, the old one has to be recalculated too or it keeps
		// a date based on a record that no longer belongs to it.
		// Se lee la relation ANTES del update: si el record se movió a otro
		// padre, el viejo también hay que recalcularlo o queda con una fecha
		// basada en un record que ya no le pertenece.
		previous := e.Record.Original().GetString(relationField)

		if err := e.Next(); err != nil {
			return err
		}

		current := e.Record.GetString(relationField)
		if previous != "" && previous != current {
			if err := recalc(e.App, previous); err != nil {
				return err
			}
		}

		return recalc(e.App, current)
	})

	// AfterDeleteSuccess, not a "before" hook: the row must already be gone,
	// otherwise the recalc query would still count the record being deleted.
	// AfterDeleteSuccess, no un hook "antes": la fila ya tiene que estar
	// borrada, si no la query del recálculo seguiría contando ese record.
	app.OnRecordAfterDeleteSuccess(collection).BindFunc(func(e *core.RecordEvent) error {
		return recalc(e.App, e.Record.GetString(relationField))
	})
}
