package convohop

import (
	"context"
	"errors"
)

// ManagementConfig configures a [ManagementClient].
type ManagementConfig struct {
	// BaseURL is the authority origin, such as https://api.example.com. HTTP
	// is accepted only for localhost, 127.0.0.1 and [::1].
	BaseURL string
	// AccessToken is an operator access token. Keep it in trusted server
	// runtimes; never ship it to a browser or a mobile app.
	AccessToken string
	// ActorID identifies the operator, a canonical lowercase UUID. It names
	// the client's recovery records in a [RecoveryStore].
	ActorID string
}

// NewManagementClient returns a client for the management plane. It sends
// nothing until a method is called.
func NewManagementClient(config ManagementConfig, options ...Option) (*ManagementClient, error) {
	if !isUUID(config.ActorID) {
		return nil, errors.New("convohop: the actor ID must be a canonical lowercase UUID")
	}
	s, err := newSettings(options)
	if err != nil {
		return nil, err
	}
	t, err := newTransport(transportConfig{
		baseURL:     config.BaseURL,
		credential:  config.AccessToken,
		incarnation: managementIncarnation,
		management:  true,
		storeKey:    "management:" + config.ActorID,
	}, s)
	if err != nil {
		return nil, err
	}
	return &ManagementClient{t: t}, nil
}

// Retry settles a mutation this client recorded with an unknown outcome. It
// reads the request's resolution and returns it once the authority has
// observed the request. Otherwise it sends the request again with its original
// request ID and payload, within the operation's retry budget, and returns the
// resolution read afterwards. It never sends a request under a new identity.
// It fails with a plain error, not a [*Problem], when the client has no
// record of requestID.
func (c *ManagementClient) Retry(ctx context.Context, requestID string) (*RequestResolution, error) {
	return retryResolution(ctx, c.t, requestID)
}

// RecoveryRecords returns copies of the client's recovery records, oldest
// first.
func (c *ManagementClient) RecoveryRecords(ctx context.Context) ([]RecoveryRecord, error) {
	return c.t.records(ctx)
}
