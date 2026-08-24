package migrations

import (
	"fmt"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// Fields that must not be empty.
// Campos que no pueden quedar vacíos.
//
// The HTML `required` attribute is only a UX hint: any script hitting the API
// directly bypasses it, so the rule has to live on the server.
// El atributo `required` del HTML es solo una ayuda de UX: cualquier script que
// le pegue a la API directo se lo saltea, así que la regla vive en el servidor.
//
// For number fields PocketBase reads "required" as "non-zero", so an amount of
// 0 is rejected too — which is what we want for a payment.
// En los campos numéricos PocketBase lee "required" como "distinto de cero", así
// que un monto en 0 también se rechaza — que es justo lo que queremos para un pago.
var requiredFields = map[string][]string{
	"incomes":               {"project", "amount", "date"},
	"collaborator_payments": {"collaborator", "project", "amount", "date"},
}

func init() {
	m.Register(func(app core.App) error {
		return applyRequiredFields(app, true)
	}, func(app core.App) error {
		return applyRequiredFields(app, false)
	})
}

func applyRequiredFields(app core.App, required bool) error {
	for collectionName, fieldNames := range requiredFields {
		collection, err := app.FindCollectionByNameOrId(collectionName)
		if err != nil {
			return err
		}

		for _, fieldName := range fieldNames {
			field := collection.Fields.GetByName(fieldName)
			if field == nil {
				return fmt.Errorf("field %s.%s not found", collectionName, fieldName)
			}

			// Field is an interface: only the concrete types carry Required, so
			// a type switch is the way to reach it.
			// Field es una interface: solo los tipos concretos tienen Required,
			// así que un type switch es la forma de llegar.
			switch f := field.(type) {
			case *core.RelationField:
				f.Required = required
			case *core.NumberField:
				f.Required = required
			case *core.DateField:
				f.Required = required
			default:
				return fmt.Errorf("field %s.%s: unsupported type %T", collectionName, fieldName, field)
			}
		}

		if err := app.Save(collection); err != nil {
			return err
		}
	}

	return nil
}
