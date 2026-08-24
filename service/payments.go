// Package service: business logic called from the hooks.
// Package service: la lógica de negocio que llaman los hooks.
package service

import (
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

// Next payment of a monthly project: one month later.
// Próximo pago de un proyecto mensual: un mes después.
func CalculateNextPayment(paymentDate time.Time) time.Time {
	return paymentDate.AddDate(0, 1, 0)
}

// NOTE on SaveNoValidate: these functions only write a date they computed
// themselves, so re-validating the whole record is unnecessary — and harmful.
// During a cascading delete PocketBase detaches relations one by one, and a
// validated save would reject a record that still points at the row being
// deleted, aborting the whole transaction.
// NOTA sobre SaveNoValidate: estas funciones solo escriben una fecha que
// calcularon ellas mismas, así que revalidar el record entero es innecesario —
// y dañino. Durante un borrado en cascada PocketBase va desvinculando las
// relations una por una, y un guardado con validación rechazaría un record que
// todavía apunta a la fila que se está borrando, abortando la transacción.

// Refreshes the cached next_payment of a project.
// Refresca el next_payment cacheado de un proyecto.
//
// Always re-reads the latest income from the DB, so the same function works
// for create, update and delete.
// Siempre relee el último income de la base, así la misma función sirve para
// create, update y delete.
func RecalculateProjectNextPayment(app core.App, projectId string) error {
	if projectId == "" {
		return nil // empty relation / relation vacía
	}

	project, err := app.FindRecordById("projects", projectId)
	if err != nil {
		return nil // project is gone / el proyecto ya no existe
	}
	if !project.GetBool("is_monthly") {
		return nil // not monthly / no es mensual
	}

	// Latest income by date / El income más reciente por fecha.
	incomes, err := app.FindRecordsByFilter(
		"incomes", "project = {:project}", "-date", 1, 0,
		dbx.Params{"project": projectId},
	)
	if err != nil || len(incomes) == 0 {
		project.Set("next_payment", nil) // clear cache / limpiar el cache
		return app.SaveNoValidate(project)
	}

	lastDate := incomes[0].GetDateTime("date").Time()
	project.Set("next_payment", CalculateNextPayment(lastDate))

	return app.SaveNoValidate(project)
}

// Next payment for the collaborator of a project, by the mode agreed for
// that project.
// Próximo pago al colaborador de un proyecto, según la modalidad acordada
// para ese proyecto.
//
// The bool answers "is there a recurring cycle at all?": "Per project" has
// none, it is paid on delivery, not on a date.
// El bool responde "¿hay ciclo recurrente?": "Per project" no tiene, se paga
// contra entrega, no contra una fecha.
func CalculateNextCollaboratorPayment(paymentMode string, paymentDate time.Time) (time.Time, bool) {
	switch paymentMode {
	case "Hourly":
		return paymentDate.AddDate(0, 0, 15), true
	default:
		return time.Time{}, false
	}
}

// Refreshes the cached collaborator_next_payment of a project.
// Refresca el collaborator_next_payment cacheado de un proyecto.
//
// The payment agreement lives on the project, not on the person: the same
// collaborator can be hourly on one project and per-project on another.
// El acuerdo de pago vive en el proyecto, no en la persona: el mismo
// colaborador puede ser por hora en un proyecto y por proyecto en otro.
func RecalculateCollaboratorNextPayment(app core.App, projectId string) error {
	if projectId == "" {
		return nil // empty relation, nothing to do / relation vacía
	}

	project, err := app.FindRecordById("projects", projectId)
	if err != nil {
		return nil // the project is gone / el proyecto ya no existe
	}

	paymentMode := project.GetString("collaborator_payment_mode")

	payments, err := app.FindRecordsByFilter(
		"collaborator_payments", "project = {:project}", "-date", 1, 0,
		dbx.Params{"project": projectId},
	)
	if err != nil || len(payments) == 0 {
		project.Set("collaborator_next_payment", nil) // no payments left / no quedan pagos
		return app.SaveNoValidate(project)
	}

	lastDate := payments[0].GetDateTime("date").Time()

	nextPayment, applies := CalculateNextCollaboratorPayment(paymentMode, lastDate)
	if !applies {
		project.Set("collaborator_next_payment", nil)
	} else {
		project.Set("collaborator_next_payment", nextPayment)
	}

	return app.SaveNoValidate(project)
}
