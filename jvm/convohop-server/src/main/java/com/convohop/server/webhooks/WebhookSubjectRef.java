package com.convohop.server.webhooks;

/** The resource an event names. */
public final class WebhookSubjectRef {
  private final String id;
  private final String kind;

  WebhookSubjectRef(String id, String kind) {
    this.id = id;
    this.kind = kind;
  }

  /**
   * The resource's ID.
   *
   * @return the ID
   */
  public String getId() {
    return id;
  }

  /**
   * The resource's kind, such as {@code conversation}, {@code message} or {@code liveSession}.
   *
   * @return the kind
   */
  public String getKind() {
    return kind;
  }

  @Override
  public String toString() {
    return "WebhookSubjectRef{id=" + id + ", kind=" + kind + "}";
  }
}
