module github.com/ConvoHop/sdks/conformance/drivers/go

go 1.26.0

require github.com/ConvoHop/sdks/go v0.0.0-00010101000000-000000000000

// The driver always tests the SDK in this checkout.
replace github.com/ConvoHop/sdks/go => ../../../go
