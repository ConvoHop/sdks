package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	threadwave "github.com/ConvoHop/sdks/packages/go-sdk"
)

func main() {
	if err := run(context.Background()); err != nil {
		log.Fatal(err)
	}
}

func run(ctx context.Context) (runErr error) {
	adminToken := os.Getenv("COMMS_ADMIN_TOKEN")
	if adminToken == "" {
		return fmt.Errorf("set COMMS_ADMIN_TOKEN from your service operator's secret store")
	}
	managementURL := os.Getenv("COMMS_MANAGEMENT_URL")
	apiURL := os.Getenv("COMMS_API_URL")
	if managementURL == "" || apiURL == "" {
		return fmt.Errorf("set COMMS_API_URL and COMMS_MANAGEMENT_URL to your service origins")
	}

	management, err := threadwave.NewManagementClient(managementURL, adminToken)
	if err != nil {
		return err
	}
	project, err := management.CreateProject(ctx, threadwave.CreateProjectRequest{Name: "Go SDK demo"})
	if err != nil {
		return err
	}
	defer func() {
		cleanupCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := management.SuspendProject(cleanupCtx, project.ProjectID); err != nil {
			runErr = errors.Join(runErr, fmt.Errorf("suspend demo project: %w", err))
		}
	}()
	projectClient, err := threadwave.NewProjectClient(apiURL, project.ProjectKey)
	if err != nil {
		return err
	}
	requestID, err := threadwave.NewMessageID()
	if err != nil {
		return err
	}
	identity, err := projectClient.CreateIdentity(ctx, requestID)
	if err != nil {
		return err
	}
	session, err := projectClient.MintIdentityToken(ctx, identity.ID)
	if err != nil {
		return err
	}
	user, err := threadwave.NewUserClient(apiURL, session.Token)
	if err != nil {
		return err
	}
	thread, err := user.CreateThread(ctx, threadwave.CreateThreadRequest{Title: "Go demo"})
	if err != nil {
		return err
	}
	messageID, err := threadwave.NewMessageID()
	if err != nil {
		return err
	}
	message, err := user.SendMessage(ctx, thread.ID,
		threadwave.SendMessageRequest{
			ClientMessageID: messageID, Body: "Hello from Go",
			Props: map[string]any{"source": "go-sdk"},
		})
	if err != nil {
		return err
	}
	page, err := user.ListThreadEvents(ctx, thread.ID, threadwave.PageOptions{})
	if err != nil {
		return err
	}
	fmt.Printf("project=%s thread=%s message-sequence=%d events=%d next-after=%d\n",
		project.ProjectID, thread.ID, message.Sequence, len(page.Items), page.NextAfter)

	if os.Getenv("COMMS_DEMO_MEDIA") == "1" {
		call, err := user.CreateCall(ctx, threadwave.CreateCallRequest{
			ThreadID: thread.ID, Title: "Go audio demo", Mode: threadwave.CallAudio,
		})
		if err != nil {
			return err
		}
		started, err := user.StartMedia(ctx, call.ID)
		if err != nil {
			return err
		}
		grant, err := user.JoinMedia(ctx, call.ID, threadwave.JoinMediaRequest{})
		if err != nil {
			return err
		}
		fmt.Printf("call=%s state=%s participant=%s\n", call.ID, started.State, grant.ParticipantID)
		if _, err := user.StopMedia(ctx, call.ID); err != nil {
			return err
		}
	}
	return nil
}
