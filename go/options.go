package convohop

import (
	"errors"
	"net/http"
	"time"
)

// defaultTimeout bounds one HTTP exchange, including reading the response.
const defaultTimeout = 12 * time.Second

// Option configures a client. Pass options to [NewProjectClient] or
// [NewManagementClient].
type Option func(*settings)

type settings struct {
	client  *http.Client
	timeout time.Duration
	store   RecoveryStore
	now     func() time.Time
	err     error
}

func (s *settings) fail(message string) {
	if s.err == nil {
		s.err = errors.New("convohop: " + message)
	}
}

func newSettings(options []Option) (*settings, error) {
	s := &settings{
		client:  &http.Client{CheckRedirect: refuseRedirect},
		timeout: defaultTimeout,
		now:     time.Now,
	}
	for _, option := range options {
		if option == nil {
			s.fail("nil option")
			continue
		}
		option(s)
	}
	return s, s.err
}

func refuseRedirect(*http.Request, []*http.Request) error {
	return errors.New("convohop: the authority must not redirect")
}

// WithHTTPClient sends requests with a copy of client. The copy never follows
// redirects and never sends cookies; client's Transport and Timeout apply.
func WithHTTPClient(client *http.Client) Option {
	return func(s *settings) {
		if client == nil {
			s.fail("WithHTTPClient requires a client")
			return
		}
		copied := *client
		copied.CheckRedirect = refuseRedirect
		copied.Jar = nil
		s.client = &copied
	}
}

// WithTimeout bounds each HTTP exchange, including reading the response.
// The default is 12 seconds. A context deadline still applies.
func WithTimeout(timeout time.Duration) Option {
	return func(s *settings) {
		if timeout <= 0 {
			s.fail("WithTimeout requires a positive timeout")
			return
		}
		s.timeout = timeout
	}
}

// WithRecoveryStore persists mutation recovery records in store, so a
// restarted process can resolve or retry requests whose outcome is unknown.
// Without it, records live only in memory. Records hold request identity,
// payload and attempt counts; they never hold credentials.
func WithRecoveryStore(store RecoveryStore) Option {
	return func(s *settings) {
		if store == nil {
			s.fail("WithRecoveryStore requires a store")
			return
		}
		s.store = store
	}
}

// WithClock replaces time.Now for retry budgets. Use it in tests.
func WithClock(now func() time.Time) Option {
	return func(s *settings) {
		if now == nil {
			s.fail("WithClock requires a clock")
			return
		}
		s.now = now
	}
}

// CallOption configures one call.
type CallOption func(*callSettings)

type callSettings struct {
	requestID string
	hasID     bool
}

// WithRequestID sends the call with requestID, a canonical lowercase UUID,
// instead of a new one. To retry a mutation whose outcome is unknown, send the
// same input again with the original request ID, or use the client's Retry.
func WithRequestID(requestID string) CallOption {
	return func(s *callSettings) {
		s.requestID = requestID
		s.hasID = true
	}
}
