package migrations

import (
	"fmt"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// Relation fields go back to optional AT THE SCHEMA LEVEL.
// Los campos de relation vuelven a opcionales A NIVEL DE SCHEMA.
//
// Marking a relation required makes it an invariant, and PocketBase then
// refuses to delete the parent record: to keep the child it would have to
// empty a field that does not accept empty (see deleteRefRecords in core).
// That would mean deleting a project either destroys its payment history or
// becomes impossible.
// Marcar una relation como obligatoria la convierte en un invariante, y ahí
// PocketBase se niega a borrar el record padre: para conservar el hijo tendría
// que vaciar un campo que no admite vacío (ver deleteRefRecords en core). Eso
// dejaría que borrar un proyecto destruya su historial de pagos, o sea imposible.
//
// The rule we actually want is "you must provide one when saving", which is a
// write-time rule, not an invariant. It now lives in an OnRecordValidate hook
// (see main.go): PocketBase skips that hook precisely when it detaches the
// relation of a deleted parent, so history survives with an empty reference.
// La regla que queremos de verdad es "tenés que indicar uno al guardar", que es
// una regla de escritura, no un invariante. Ahora vive en un hook
// OnRecordValidate (ver main.go): PocketBase saltea ese hook justamente cuando
// desvincula la relation de un padre borrado, así el historial sobrevive con la
// referencia vacía.
//
// amount and date stay required in the schema: they are plain fields and do not
// affect deletes.
// amount y date siguen obligatorios en el schema: son campos comunes y no
// afectan los borrados.
var optionalRelations = map[string][]string{
	"incomes":               {"project"},
	"collaborator_payments": {"collaborator", "project"},
}

func init() {
	m.Register(func(app core.App) error {
		return applyOptionalRelations(app, false)
	}, func(app core.App) error {
		return applyOptionalRelations(app, true)
	})
}

func applyOptionalRelations(app core.App, required bool) error {
	for collectionName, fieldNames := range optionalRelations {
		collection, err := app.FindCollectionByNameOrId(collectionName)
		if err != nil {
			return err
		}

		for _, fieldName := range fieldNames {
			field, ok := collection.Fields.GetByName(fieldName).(*core.RelationField)
			if !ok {
				return fmt.Errorf("field %s.%s is not a relation", collectionName, fieldName)
			}

			field.Required = required
		}

		if err := app.Save(collection); err != nil {
			return err
		}
	}

	return nil
}
