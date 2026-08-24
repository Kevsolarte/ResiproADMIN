package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// Adds `archived` to projects.
// Agrega `archived` a projects.
//
// Financial records are never orphaned on purpose: an income with no project
// keeps the amount but loses the attribution, which makes the history useless.
// A project that already has movements is therefore archived, not deleted —
// it disappears from the working grid but keeps naming its own history.
// Los registros de plata no se dejan huérfanos a propósito: un ingreso sin
// proyecto conserva el monto pero pierde la atribución, lo que vuelve inútil el
// historial. Por eso un proyecto que ya tiene movimientos se archiva, no se
// borra — desaparece de la grilla de trabajo pero sigue nombrando su historial.
const archivedFieldId = "bool_archived_projects"

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("projects")
		if err != nil {
			return err
		}

		collection.Fields.Add(&core.BoolField{
			Id:   archivedFieldId,
			Name: "archived",
		})

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("projects")
		if err != nil {
			return err
		}

		collection.Fields.RemoveById(archivedFieldId)

		return app.Save(collection)
	})
}
