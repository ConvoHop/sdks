package threadwave

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestManagementAndProjectCredentialSeparation(t *testing.T) {
	var adminHits, apiHits atomic.Int32
	expires := time.Now().UTC().Add(15 * time.Minute)
	managementServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		adminHits.Add(1)
		request := readGraphQLRequest(t, r, testAdminToken)
		switch {
		case strings.Contains(request.Query, "createProject("):
			assertVariables(t, request, `{"name":"Demo"}`)
			respondGraphQL(t, w, "createProject", ProvisionedProject{
				ProjectID: testProjectID, ProjectKey: testProjectKey,
			})
		case strings.Contains(request.Query, "projects(after:"):
			if _, hasAfter := request.Variables["after"]; hasAfter {
				respondGraphQL(t, w, "projects", ProjectPage{
					Items: []Project{}, NextAfter: ptr(testProjectID),
				})
			} else {
				assertVariables(t, request, `{"limit":1}`)
				respondGraphQL(t, w, "projects", ProjectPage{
					Items:     []Project{{ProjectID: testProjectID, Name: "Demo", Status: "active"}},
					NextAfter: ptr(testProjectID),
				})
			}
		case strings.Contains(request.Query, "suspendProject("):
			assertVariables(t, request, `{"id":"`+testProjectID+`"}`)
			respondGraphQL(t, w, "suspendProject", true)
		default:
			t.Errorf("unexpected Management GraphQL operation: %s", request.Query)
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer managementServer.Close()
	communicationServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiHits.Add(1)
		if r.Header.Get("Authorization") == "Bearer "+testProjectKey {
			request := readGraphQLRequest(t, r, testProjectKey)
			if strings.Contains(request.Query, "createIdentity(requestId:$requestId)") {
				assertVariables(t, request, `{"requestId":"`+testClientID+`"}`)
				respondGraphQL(t, w, "createIdentity", Identity{ID: "ci_11111111111111111111111111111111"})
				return
			}
			if !strings.Contains(request.Query, "issueIdentityToken(identityId:$identityId)") {
				t.Errorf("project key attempted an operation other than identity/token issuance: %s", request.Query)
			}
			assertVariables(t, request, `{"identityId":"ci_11111111111111111111111111111111"}`)
			respondGraphQL(t, w, "issueIdentityToken", SessionToken{
				Token: testSessionToken, ExpiresAt: expires,
			})
		} else {
			request := readGraphQLRequest(t, r, testSessionToken)
			if !strings.Contains(request.Query, "revokeSession") {
				t.Errorf("user token attempted wrong operation: %s", request.Query)
			}
			assertVariables(t, request, `{}`)
			respondGraphQL(t, w, "revokeSession", true)
		}
	}))
	defer communicationServer.Close()

	management, err := NewManagementClient(managementServer.URL, testAdminToken)
	if err != nil {
		t.Fatal(err)
	}
	project, err := management.CreateProject(context.Background(), CreateProjectRequest{Name: "Demo"})
	if err != nil || project.ProjectID != testProjectID || project.ProjectKey != testProjectKey {
		t.Fatalf("create project: %+v, %v", project, err)
	}
	page, err := management.ListProjects(context.Background(), ListProjectsOptions{Limit: 1})
	if err != nil || len(page.Items) != 1 || page.Items[0].ProjectID != testProjectID ||
		page.NextAfter == nil || *page.NextAfter != testProjectID {
		t.Fatalf("list projects: %+v, %v", page, err)
	}
	end, err := management.ListProjects(context.Background(), ListProjectsOptions{After: *page.NextAfter})
	if err != nil || len(end.Items) != 0 || end.NextAfter == nil || *end.NextAfter != testProjectID {
		t.Fatalf("empty project page: %+v, %v", end, err)
	}
	upper, err := management.ListProjects(context.Background(),
		ListProjectsOptions{After: strings.ToUpper(*page.NextAfter)})
	if err != nil || len(upper.Items) != 0 || upper.NextAfter == nil || *upper.NextAfter != testProjectID {
		t.Fatalf("uppercase UUID cursor: %+v, %v", upper, err)
	}
	if err := management.SuspendProject(context.Background(), project.ProjectID); err != nil {
		t.Fatal(err)
	}
	projectClient, err := NewProjectClient(communicationServer.URL, project.ProjectKey)
	if err != nil {
		t.Fatal(err)
	}
	identity, err := projectClient.CreateIdentity(context.Background(), testClientID)
	if err != nil || identity.ID != "ci_11111111111111111111111111111111" {
		t.Fatalf("create identity: %+v, %v", identity, err)
	}
	token, err := projectClient.MintIdentityToken(context.Background(), identity.ID)
	if err != nil || token.Token != testSessionToken || token.ExpiresAt.IsZero() {
		t.Fatalf("mint identity token: %+v, %v", token, err)
	}
	user, err := NewUserClient(communicationServer.URL, token.Token)
	if err != nil {
		t.Fatal(err)
	}
	if err := user.RevokeSession(context.Background()); err != nil {
		t.Fatal(err)
	}
	adminBefore, apiBefore := adminHits.Load(), apiHits.Load()
	if _, err := management.CreateProject(context.Background(), CreateProjectRequest{Name: "\n"}); err == nil {
		t.Error("accepted invalid project name")
	}
	if _, err := management.ListProjects(context.Background(), ListProjectsOptions{Limit: 101}); err == nil {
		t.Error("accepted invalid list limit")
	}
	if err := management.SuspendProject(context.Background(), "../bad"); err == nil {
		t.Error("accepted invalid project ID")
	}
	if _, err := projectClient.MintIdentityToken(context.Background(), "bad/user"); err == nil {
		t.Error("accepted invalid identity ID")
	}
	if _, err := projectClient.CreateIdentity(context.Background(), "not-a-uuid"); err == nil {
		t.Error("accepted invalid request ID")
	}
	if adminHits.Load() != adminBefore || apiHits.Load() != apiBefore {
		t.Error("sent a request with invalid input")
	}
}

func ptr(s string) *string { return &s }

func TestRejectsMalformedProvisioningAndTokenResponses(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := testProjectKey
		if r.Header.Get("Authorization") == "Bearer "+testAdminToken {
			token = testAdminToken
		}
		request := readGraphQLRequest(t, r, token)
		if strings.Contains(request.Query, "createProject(") {
			respondGraphQL(t, w, "createProject", ProvisionedProject{
				ProjectID: testProjectID, ProjectKey: "invalid",
			})
		} else if strings.Contains(request.Query, "createIdentity(") {
			respondGraphQL(t, w, "createIdentity", Identity{ID: "alice"})
		} else {
			respondGraphQL(t, w, "issueIdentityToken", SessionToken{
				Token: "st_wrong", ExpiresAt: time.Date(2026, 9, 25, 0, 0, 0, 0, time.UTC),
			})
		}
	}))
	defer server.Close()
	admin, err := NewManagementClient(server.URL, testAdminToken)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := admin.CreateProject(context.Background(), CreateProjectRequest{Name: "Demo"}); err == nil ||
		strings.Contains(err.Error(), testProjectKey) {
		t.Errorf("accepted malformed project key or exposed one: %v", err)
	}
	project, err := NewProjectClient(server.URL, testProjectKey)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := project.MintIdentityToken(context.Background(), "ci_11111111111111111111111111111111"); err == nil {
		t.Error("accepted malformed session token")
	}
	if _, err := project.CreateIdentity(context.Background(), testClientID); err == nil {
		t.Error("accepted malformed identity")
	}
}

func TestRejectsIncorrectProjectPageCursor(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		respondGraphQL(t, w, "projects", ProjectPage{
			Items: []Project{}, NextAfter: ptr(testProjectID),
		})
	}))
	defer server.Close()
	client, err := NewManagementClient(server.URL, testAdminToken)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := client.ListProjects(context.Background(), ListProjectsOptions{}); err == nil {
		t.Error("accepted empty project page with advancing cursor")
	}
}

func TestGraphQLBooleanFalseIsNotACompletedMutation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		respondGraphQL(t, w, "revokeSession", false)
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	var apiErr *APIError
	if err := client.RevokeSession(context.Background()); !errors.As(err, &apiErr) ||
		apiErr.StatusCode != http.StatusOK || apiErr.Code != "invalid_response" {
		t.Errorf("false mutation reported success: %v", err)
	}
}
