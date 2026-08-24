package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_2884215333")
		if err != nil {
			return err
		}

		// remove field
		collection.Fields.RemoveById("select3058290911")

		// remove field
		collection.Fields.RemoveById("number3119564493")

		// remove field
		collection.Fields.RemoveById("date2946936495")

		// remove field
		collection.Fields.RemoveById("date195344453")

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_2884215333")
		if err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(4, []byte(`{
			"help": "",
			"hidden": false,
			"id": "select3058290911",
			"maxSelect": 0,
			"name": "payment_mode",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "select",
			"values": [
				"Hourly",
				"Per project",
				"Fixed salary"
			]
		}`)); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(5, []byte(`{
			"help": "",
			"hidden": false,
			"id": "number3119564493",
			"max": null,
			"min": null,
			"name": "agreed_amount",
			"onlyInt": false,
			"presentable": false,
			"required": false,
			"system": false,
			"type": "number"
		}`)); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(6, []byte(`{
			"help": "",
			"hidden": false,
			"id": "date2946936495",
			"max": "",
			"min": "",
			"name": "next_payment",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "date"
		}`)); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(7, []byte(`{
			"help": "",
			"hidden": false,
			"id": "date195344453",
			"max": "",
			"min": "",
			"name": "last_payment",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "date"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	})
}
