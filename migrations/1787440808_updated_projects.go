package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_484305853")
		if err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(8, []byte(`{
			"help": "",
			"hidden": false,
			"id": "select2962516296",
			"maxSelect": 0,
			"name": "collaborator_payment_mode",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "select",
			"values": [
				"Hourly",
				"Per project"
			]
		}`)); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(9, []byte(`{
			"help": "",
			"hidden": false,
			"id": "number3855999328",
			"max": null,
			"min": null,
			"name": "collaborator_amount",
			"onlyInt": false,
			"presentable": false,
			"required": false,
			"system": false,
			"type": "number"
		}`)); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(10, []byte(`{
			"help": "",
			"hidden": false,
			"id": "date2843416376",
			"max": "",
			"min": "",
			"name": "collaborator_next_payment",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "date"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_484305853")
		if err != nil {
			return err
		}

		// remove field
		collection.Fields.RemoveById("select2962516296")

		// remove field
		collection.Fields.RemoveById("number3855999328")

		// remove field
		collection.Fields.RemoveById("date2843416376")

		return app.Save(collection)
	})
}
