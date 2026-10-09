package convohop

import (
	"fmt"
	"regexp"
)

// The generated catalog_gen.go fills these tables from schema/ir.json.

type plane struct {
	name             string
	resolveOperation string
}

type operation struct {
	id            string
	plane         string
	kind          string
	field         string
	operationName string
	result        string
	input         string
	inputRequired bool
	context       map[string]string
	bearer        string
	permitField   string
	permitType    string
	retry         string
	maxAttempts   int
	windowMs      int
	resolvable    bool
	envelope      bool
	subject       []string
	echo          []string
	document      string
}

type typeField struct {
	name string
	typ  string
}

type objectType struct {
	name   string
	fields []typeField
}

type inputField struct {
	name       string
	typ        string
	hasDefault bool
}

type inputType struct {
	name   string
	fields []inputField
}

type enumType struct {
	name   string
	values []string
}

type scalarType struct {
	name           string
	representation string
	pattern        string
	disallowed     []string
	maximumDecimal string
	// minimum and maximum bound integer and number scalars. Integer bounds
	// are safe integers, which float64 represents exactly.
	minimum, maximum         *float64
	maxCanonicalJSONBytes    int
	requiredStringProperties []string
}

type compiledScalar struct {
	representation           string
	pattern                  *regexp.Regexp
	disallowed               []string
	maximumDecimal           string
	minimum, maximum         *float64
	maxCanonicalJSONBytes    int
	requiredStringProperties []string
}

type catalogIndex struct {
	operations map[string]*operation
	planes     map[string]plane
	objects    map[string][]typeField
	inputs     map[string][]inputField
	enums      map[string]map[string]bool
	scalars    map[string]compiledScalar
}

var catalog = buildCatalog()

func buildCatalog() *catalogIndex {
	index := &catalogIndex{
		operations: make(map[string]*operation, len(operations)),
		planes:     make(map[string]plane, len(planes)),
		objects:    make(map[string][]typeField, len(objectTypes)),
		inputs:     make(map[string][]inputField, len(inputTypes)),
		enums:      make(map[string]map[string]bool, len(enumTypes)),
		scalars:    make(map[string]compiledScalar, len(scalarTypes)),
	}
	for i := range operations {
		index.operations[operations[i].id] = &operations[i]
	}
	for _, p := range planes {
		index.planes[p.name] = p
	}
	for _, object := range objectTypes {
		index.objects[object.name] = object.fields
	}
	for _, input := range inputTypes {
		index.inputs[input.name] = input.fields
	}
	for _, enum := range enumTypes {
		values := make(map[string]bool, len(enum.values))
		for _, value := range enum.values {
			values[value] = true
		}
		index.enums[enum.name] = values
	}
	for _, scalar := range scalarTypes {
		compiled := compiledScalar{
			representation:           scalar.representation,
			disallowed:               scalar.disallowed,
			maximumDecimal:           scalar.maximumDecimal,
			minimum:                  scalar.minimum,
			maximum:                  scalar.maximum,
			maxCanonicalJSONBytes:    scalar.maxCanonicalJSONBytes,
			requiredStringProperties: scalar.requiredStringProperties,
		}
		if scalar.pattern != "" {
			pattern, err := regexp.Compile(scalar.pattern)
			if err != nil {
				panic(fmt.Sprintf("convohop: generated scalar %s has an unsupported pattern: %v", scalar.name, err))
			}
			compiled.pattern = pattern
		}
		index.scalars[scalar.name] = compiled
	}
	return index
}

// resolveOperation returns the request resolution query of op's plane.
func (c *catalogIndex) resolveOperation(op *operation) *operation {
	return c.operations[c.planes[op.plane].resolveOperation]
}

// isResolve reports whether op reads request resolutions for its plane.
func (c *catalogIndex) isResolve(op *operation) bool {
	return c.planes[op.plane].resolveOperation == op.id
}

// unwrapType splits a GraphQL type reference such as [UUID!]! into its
// nullability and inner reference.
func unwrapType(typ string) (inner string, required bool) {
	if n := len(typ); n > 0 && typ[n-1] == '!' {
		return typ[:n-1], true
	}
	return typ, false
}

// listItem returns the item reference of a list type such as [UUID!].
func listItem(typ string) (string, bool) {
	if n := len(typ); n >= 2 && typ[0] == '[' && typ[n-1] == ']' {
		return typ[1 : n-1], true
	}
	return "", false
}
