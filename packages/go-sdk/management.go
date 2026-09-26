package threadwave

import (
	"context"
	"errors"
	"strings"
)

// ManagementClient is for trusted processes only. Its adm_ token can
// provision and suspend projects on the separate Management service.
type ManagementClient struct{ api apiClient }

func NewManagementClient(baseURL, adminToken string, options ...ClientOption) (*ManagementClient, error) {
	api, err := newClient(baseURL, adminToken, "adm_", options)
	if err != nil {
		return nil, err
	}
	return &ManagementClient{api: api}, nil
}

type CreateProjectRequest struct {
	Name string
}

// ProvisionedProject contains the one-time project key. Store it securely;
// ListProjects never returns it.
type ProvisionedProject struct {
	ProjectID  string `json:"id"`
	ProjectKey string `json:"projectKey"`
}

func (c *ManagementClient) CreateProject(ctx context.Context, input CreateProjectRequest) (*ProvisionedProject, error) {
	if err := validateTitle(input.Name); err != nil {
		return nil, err
	}
	const query = `mutation CreateProject($name:String!){createProject(name:$name){id projectKey}}`
	var result ProvisionedProject
	if err := c.api.graphql(ctx, query, map[string]any{"name": input.Name}, "createProject", &result); err != nil {
		return nil, err
	}
	if err := validateUUID("project ID in response", result.ProjectID); err != nil {
		return nil, err
	}
	if !validCredential(result.ProjectKey, "pk_") {
		return nil, errors.New("invalid project key in response")
	}
	return &result, nil
}

type ListProjectsOptions struct {
	After string // Optional UUID from ProjectPage.NextAfter.
	Limit int    // 0 uses 50; otherwise 1-100.
}

type Project struct {
	ProjectID string `json:"id"`
	Name      string `json:"name"`
	Status    string `json:"status"`
}

type ProjectPage struct {
	Items     []Project `json:"items"`
	NextAfter *string   `json:"nextAfter"` // Nil when the first page is empty.
}

func (c *ManagementClient) ListProjects(ctx context.Context, options ListProjectsOptions) (*ProjectPage, error) {
	if options.After != "" {
		if err := validateUUID("after", options.After); err != nil {
			return nil, err
		}
	}
	limit, err := boundedLimit(options.Limit)
	if err != nil {
		return nil, err
	}
	variables := map[string]any{"limit": limit}
	if options.After != "" {
		variables["after"] = options.After
	}
	const query = `query Projects($after:ID,$limit:Int){
		projects(after:$after,limit:$limit){items{id name status}nextAfter}}`
	var page ProjectPage
	if err := c.api.graphql(ctx, query, variables, "projects", &page); err != nil {
		return nil, err
	}
	if page.Items == nil {
		return nil, errors.New("invalid project listing in response")
	}
	last := strings.ToLower(options.After)
	for _, project := range page.Items {
		if validateUUID("project ID in response", project.ProjectID) != nil ||
			project.Name == "" || project.Status == "" {
			return nil, errors.New("invalid project in response")
		}
		current := strings.ToLower(project.ProjectID)
		if current <= last {
			return nil, errors.New("project page is not ordered after the cursor")
		}
		last = current
	}
	if len(page.Items) == 0 && options.After == "" {
		if page.NextAfter != nil {
			return nil, errors.New("invalid empty project page cursor")
		}
	} else if page.NextAfter == nil || !strings.EqualFold(*page.NextAfter, last) {
		return nil, errors.New("project page cursor does not match last project")
	}
	return &page, nil
}

func (c *ManagementClient) SuspendProject(ctx context.Context, projectID string) error {
	if err := validateUUID("project ID", projectID); err != nil {
		return err
	}
	const query = `mutation SuspendProject($id:ID!){suspendProject(id:$id)}`
	return c.api.graphqlBool(ctx, query, map[string]any{"id": projectID}, "suspendProject")
}
