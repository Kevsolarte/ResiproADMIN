package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// Adds `archived` to collaborators, for the same reason projects have it.
// Agrega `archived` a collaborators, por la misma razón que lo tienen projects.
//
// Deleting a collaborator does not delete the payments made to them: it blanks
// the relation. The amount survives but the name does not, so nobody can tell
// who was paid. Worse, the OnRecordValidate rule then rejects every edit of
// that payment, freezing it as read-only forever.
// Borrar un colaborador no borra los pagos que se le hicieron: vacía la
// relation. El monto sobrevive pero el nombre no, así que nadie sabe a quién se
// le pagó. Peor: la regla de OnRecordValidate después rechaza toda edición de
// ese pago, dejándolo congelado como solo-lectura para siempre.
const archivedFieldIdCollaborators = "bool_archived_collaborators"

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("collaborators")
		if err != nil {
			return err
		}

		collection.Fields.Add(&core.BoolField{
			Id:   archivedFieldIdCollaborators,
			Name: "archived",
		})

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("collaborators")
		if err != nil {
			return err
		}

		collection.Fields.RemoveById(archivedFieldIdCollaborators)

		return app.Save(collection)
	})
}
