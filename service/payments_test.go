package service

import (
	"testing"
	"time"
)

func TestCalculateNextPayment(t *testing.T) {
	date := time.Date(2026, 8, 20, 0, 0, 0, 0, time.UTC)

	got := CalculateNextPayment(date)
	want := time.Date(2026, 9, 20, 0, 0, 0, 0, time.UTC)

	if !got.Equal(want) {
		t.Errorf("got %v, want %v", got, want)
	}
}

func TestCalculateNextCollaboratorPayment(t *testing.T) {
	date := time.Date(2026, 8, 20, 0, 0, 0, 0, time.UTC)

	// Table-driven test: one struct slice describes every case, one loop runs
	// them all. Adding a payment mode means adding a line, not a function.
	// Table-driven test: un slice de structs describe todos los casos y un solo
	// loop los corre. Agregar una modalidad es agregar una línea, no una función.
	tests := []struct {
		paymentMode string
		wantApplies bool
		want        time.Time
	}{
		{"Hourly", true, date.AddDate(0, 0, 15)},
		{"Per project", false, time.Time{}},
		{"", false, time.Time{}},
		{"Fixed salary", false, time.Time{}}, // dropped mode, must not resurface
	}

	for _, tt := range tests {
		got, applies := CalculateNextCollaboratorPayment(tt.paymentMode, date)

		if applies != tt.wantApplies {
			t.Errorf("%q: applies = %v, want %v", tt.paymentMode, applies, tt.wantApplies)
		}
		if applies && !got.Equal(tt.want) {
			t.Errorf("%q: got %v, want %v", tt.paymentMode, got, tt.want)
		}
	}
}
