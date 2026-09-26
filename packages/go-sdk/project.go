package threadwave

import (
	"context"
	"errors"
	"time"
)

// ProjectClient holds a pk_ secret. Keep it on a trusted server; never expose
// this client or its key to a browser or an untrusted device.
type ProjectClient struct{ api apiClient }

func NewProjectClient(baseURL, projectKey string, options ...ClientOption) (*ProjectClient, error) {
	api, err := newClient(baseURL, projectKey, "pk_", options)
	if err != nil {
		return nil, err
	}
	return &ProjectClient{api: api}, nil
}

type SessionToken struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type Identity struct {
	ID string `json:"id"`
}

// CreateIdentity registers an opaque, project-scoped identity. Persist its ID
// against your own user record, and reuse requestID when retrying creation.
func (c *ProjectClient) CreateIdentity(ctx context.Context, requestID string) (*Identity, error) {
	if err := validateNonNilUUID("request ID", requestID); err != nil {
		return nil, err
	}
	const query = `mutation CreateIdentity($requestId:ID!){createIdentity(requestId:$requestId){id}}`
	var result Identity
	if err := c.api.graphql(ctx, query, map[string]any{"requestId": requestID}, "createIdentity", &result); err != nil {
		return nil, err
	}
	if err := validateIdentityID(result.ID); err != nil {
		return nil, errors.New("invalid identity in response")
	}
	return &result, nil
}

// MintIdentityToken exchanges a registered identity for a 15-minute session.
// Authenticate and authorize your own user before calling this server-only API.
func (c *ProjectClient) MintIdentityToken(ctx context.Context, identityID string) (*SessionToken, error) {
	if err := validateIdentityID(identityID); err != nil {
		return nil, err
	}
	const query = `mutation IssueIdentityToken($identityId:ID!){
		issueIdentityToken(identityId:$identityId){token expiresAt}}`
	var result SessionToken
	if err := c.api.graphql(ctx, query, map[string]any{"identityId": identityID}, "issueIdentityToken", &result); err != nil {
		return nil, err
	}
	if !validCredential(result.Token, "st_") || result.ExpiresAt.IsZero() {
		return nil, errors.New("invalid session token in response")
	}
	return &result, nil
}
