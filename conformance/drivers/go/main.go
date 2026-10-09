// Command conformance-driver adapts the ConvoHop Go server SDK to the
// conformance runner. It speaks the driver protocol in
// spec/conformance/driver-protocol.md: one JSON request per line on stdin and
// one JSON response per line on stdout, which carries nothing else.
//
// main.go runs the protocol, params.go decodes parameters strictly and sdk.go
// is the only file that uses the SDK.
package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strconv"
)

const (
	driverName    = "convohop-go"
	driverVersion = "0.1.0"
)

// protocolError is a request the driver could not carry out.
type protocolError struct {
	code    string
	message string
}

func (e *protocolError) Error() string { return e.message }

func failure(code, format string, args ...any) error {
	return &protocolError{code: code, message: fmt.Sprintf(format, args...)}
}

// errorBody is the error of a response.
type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type successResponse struct {
	ID     int64 `json:"id"`
	Result any   `json:"result"`
}

type errorResponse struct {
	// ID is nil when the request has no valid id.
	ID    *int64    `json:"id"`
	Error errorBody `json:"error"`
}

// driver holds the state between requests: the negotiation, the open clients
// and the named recovery stores, which outlive the clients until reset.
type driver struct {
	negotiated bool
	clients    map[string]*client
	stores     map[string]*recoveryStore
}

func newDriver() *driver {
	return &driver{clients: map[string]*client{}, stores: map[string]*recoveryStore{}}
}

func main() {
	os.Exit(run(os.Stdin, os.Stdout))
}

// run serves requests until shutdown or the end of input and returns the exit
// status. Like the reference driver, it exits 0 when stdout fails, as the
// runner has gone.
func run(stdin io.Reader, stdout io.Writer) int {
	in := bufio.NewReader(stdin)
	out := bufio.NewWriter(stdout)
	d := newDriver()
	for {
		line, readErr := in.ReadBytes('\n')
		if len(line) > 0 {
			response, stop := d.handle(line)
			if response != nil {
				if _, err := out.Write(response); err != nil {
					return 0
				}
				if err := out.Flush(); err != nil {
					return 0
				}
			}
			if stop {
				return 0
			}
		}
		if readErr != nil {
			// The runner closed stdin.
			d.reset()
			return 0
		}
	}
}

// handle answers one line. It returns no response for a blank line, and stop
// after answering shutdown.
func (d *driver) handle(line []byte) (response []byte, stop bool) {
	line = bytes.TrimSuffix(line, []byte("\n"))
	line = bytes.TrimSuffix(line, []byte("\r"))
	if len(bytes.TrimSpace(line)) == 0 {
		return nil, false
	}
	request, ok := parse(line)
	if !ok {
		return encodeError(nil, failure("INVALID_REQUEST", "Request is not valid JSON")), false
	}
	fields, isObject := request.(map[string]any)
	id, validID := safeInteger(fields["id"])
	if !isObject || !validID || id < 1 {
		return encodeError(nil, failure("INVALID_REQUEST", "id must be a positive integer")), false
	}
	method, isText := fields["method"].(string)
	if !isText {
		return encodeError(&id, failure("INVALID_REQUEST", "method must be a string")), false
	}
	args := object{}
	if value := fields["params"]; value != nil {
		if args, isObject = value.(map[string]any); !isObject {
			return encodeError(&id, failure("INVALID_REQUEST", "params must be an object")), false
		}
	}
	result, err := d.dispatch(method, args)
	if err != nil {
		return encodeError(&id, err), false
	}
	if method == "shutdown" {
		d.reset()
		stop = true
	}
	encoded, err := encode(successResponse{ID: id, Result: result})
	if err != nil {
		return encodeError(&id, fmt.Errorf("encoding the result: %w", err)), stop
	}
	return encoded, stop
}

// parse decodes a line that holds exactly one JSON value, keeping numbers
// exact.
func parse(line []byte) (any, bool) {
	var value any
	decoder := json.NewDecoder(bytes.NewReader(line))
	decoder.UseNumber()
	if decoder.Decode(&value) != nil {
		return nil, false
	}
	var extra any
	if !errors.Is(decoder.Decode(&extra), io.EOF) {
		return nil, false
	}
	return value, true
}

func (d *driver) dispatch(method string, args object) (any, error) {
	if !d.negotiated && method != "hello" {
		return nil, failure("INVALID_REQUEST", "hello must be the first request")
	}
	switch method {
	case "hello":
		return d.hello()
	case "client.create":
		return d.createClient(args)
	case "client.close":
		return d.closeClient(args)
	case "invoke":
		return d.invoke(args)
	case "realtime.subscribe", "realtime.collect", "realtime.close":
		return nil, failure("UNSUPPORTED", "This driver does not declare the realtime feature")
	case "webhooks.verify":
		return verifyWebhook(newParams(args))
	case "reset":
		d.reset()
		return struct{}{}, nil
	case "shutdown":
		return struct{}{}, nil
	default:
		return nil, failure("UNKNOWN_METHOD", "Unknown method %s", method)
	}
}

func (d *driver) hello() (any, error) {
	if d.negotiated {
		return nil, failure("INVALID_REQUEST", "hello was already negotiated")
	}
	d.negotiated = true
	roles := map[string]any{}
	for _, role := range declaredRoles {
		roles[role] = map[string]any{"operations": operationNames(role)}
	}
	return map[string]any{
		"driver": map[string]any{
			"name": driverName, "version": driverVersion, "language": "go", "packages": packages(),
		},
		"roles":    roles,
		"features": features,
	}, nil
}

// lookup finds the client a request names.
func (d *driver) lookup(args object) (string, *client, error) {
	p := newParams(args)
	name := p.text("client")
	if err := p.Err(); err != nil {
		return "", nil, err
	}
	found := d.clients[name]
	if found == nil {
		return "", nil, failure("UNKNOWN_HANDLE", "Unknown client handle %s", name)
	}
	return name, found, nil
}

func (d *driver) createClient(args object) (any, error) {
	p := newParams(args)
	name := p.handle("client")
	if err := p.Err(); err != nil {
		return nil, err
	}
	if d.clients[name] != nil {
		return nil, invalid("Client handle %s already exists", name)
	}
	role := p.text("role")
	if err := p.Err(); err != nil {
		return nil, err
	}
	if !isRole(role) {
		return nil, invalid("role must be one of %s", roleList)
	}
	if !declares(role) {
		return nil, failure("UNSUPPORTED", "This driver does not declare the %s role", role)
	}
	var storage *string
	if p.has("storage") {
		value := p.handle("storage")
		storage = &value
	}
	spec := clientSpec{
		role:        role,
		baseURL:     p.text("baseUrl"),
		credential:  p.text("credential"),
		projectID:   p.optionalText("projectId"),
		incarnation: p.optionalText("incarnation"),
		principalID: p.optionalText("principalId"),
		actorID:     p.optionalText("actorId"),
	}
	if err := p.Err(); err != nil {
		return nil, err
	}
	// A named store outlives its clients, so a later client recovers what an
	// earlier one recorded.
	if storage != nil {
		spec.store = d.stores[*storage]
		if spec.store == nil {
			spec.store = newRecoveryStore()
		}
	}
	created, err := newClient(spec)
	if err != nil {
		return nil, err
	}
	d.clients[name] = created
	if storage != nil {
		d.stores[*storage] = spec.store
	}
	return struct{}{}, nil
}

func (d *driver) closeClient(args object) (any, error) {
	name, _, err := d.lookup(args)
	if err != nil {
		return nil, err
	}
	delete(d.clients, name)
	return struct{}{}, nil
}

// invoke runs one catalog operation. SDK failures are results; the request
// fails only when the driver cannot carry it out.
func (d *driver) invoke(args object) (any, error) {
	_, target, err := d.lookup(args)
	if err != nil {
		return nil, err
	}
	p := newParams(args)
	name := p.text("operation")
	input := object{}
	if p.has("args") {
		input = p.record("args", "args")
	}
	if err := p.Err(); err != nil {
		return nil, err
	}
	execute, err := prepare(target, name, newParams(input))
	if err != nil {
		return nil, err
	}
	value, err := execute(context.Background())
	if err != nil {
		return map[string]any{"ok": false, "error": sdkError(err)}, nil
	}
	return map[string]any{"ok": true, "value": value}, nil
}

// reset forgets every client and recovery store, as right after hello.
func (d *driver) reset() {
	clear(d.clients)
	clear(d.stores)
}

func encode(value any) ([]byte, error) {
	var buffer bytes.Buffer
	encoder := json.NewEncoder(&buffer)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

// encodeError answers a request that failed. Errors that are neither protocol
// nor parameter errors are driver failures.
func encodeError(id *int64, err error) []byte {
	body := errorBody{Code: "DRIVER_FAILURE", Message: err.Error()}
	var protocol *protocolError
	var param *paramsError
	switch {
	case errors.As(err, &protocol):
		body.Code = protocol.code
	case errors.As(err, &param):
		body.Code = "INVALID_PARAMS"
	}
	if body.Message == "" {
		body.Message = "Driver failure"
	}
	encoded, encodeErr := encode(errorResponse{ID: id, Error: body})
	if encodeErr != nil {
		// Only the id and two strings remain, which always encode.
		encoded = []byte(`{"id":` + idText(id) + `,"error":{"code":"DRIVER_FAILURE","message":"Driver failure"}}` + "\n")
	}
	return encoded
}

func idText(id *int64) string {
	if id == nil {
		return "null"
	}
	return strconv.FormatInt(*id, 10)
}
