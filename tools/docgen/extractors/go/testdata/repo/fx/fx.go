// Package fx is the extractor tests' fixture.
package fx

import (
	"context"
	"errors"
	"io"
)

// DefaultTimeout is how long a call waits, in seconds.
const DefaultTimeout = 30

// Limits on a request.
const (
	// MaxSize is the largest body, in bytes.
	MaxSize             = 1 << 20
	MinSize, maxRetries = 1, 3 // The smallest body.
)

// ErrClosed reports a call on a closed [Client].
var ErrClosed = errors.New("fx: closed")

// Color is a color.
type Color string

// The colors.
const (
	// Red is warm.
	Red  Color = "red"
	Blue Color = "blue"
)

// Properties are free-form attributes.
type Properties = map[string]any

// Base holds what every client shares.
type Base struct {
	// Name names the client.
	Name string `json:"name"`
	id   string
}

// Ping checks the connection.
func (b *Base) Ping(ctx context.Context) error { return nil }

// Close closes the connection.
func (b *Base) Close() error { return nil }

// Client calls the API. See [Client.Send], [Store] and https://example.com/docs.
//
// # Retries
//
// A failed call is retried:
//
//   - up to [MaxSize] bytes at a time
//   - with *backoff* & jitter
type Client struct {
	Base
	// Timeout overrides [DefaultTimeout]; 0 keeps it.
	Timeout int
	key     string
}

// NewClient returns a client for key.
func NewClient(key string, opts ...Option) *Client { return &Client{key: key} }

// Send sends text.
//
// Deprecated: Use [Client.SendAll].
func (c *Client) Send(ctx context.Context, text string) error { return nil }

// SendAll sends each text in turn.
func (c *Client) SendAll(ctx context.Context, texts ...string) error { return nil }

// Close closes the client, unlike [Base.Close].
func (c *Client) Close() error { return nil }

// Option configures a [Client].
type Option func(*Client)

// WithTimeout sets [Client.Timeout].
func WithTimeout(seconds int) Option { return func(c *Client) { c.Timeout = seconds } }

// Store keeps state between calls.
type Store interface {
	io.Closer
	// Load reads the state of key.
	Load(ctx context.Context, key string) ([]byte, error)
	save(key string)
}

// Copy copies src to dst.
//
// Deprecated:
func Copy(dst io.Writer, src io.Reader) (int64, error) { return 0, nil }
