package com.convohop.server.push;

import com.convohop.server.internal.Json;
import com.convohop.server.internal.Wire;
import java.time.Clock;
import org.jspecify.annotations.Nullable;

/** Options for {@link PushPayloads}. Immutable; {@link #toString()} omits the visible text. */
public final class PushOptions {
  private static final PushOptions DEFAULTS = builder().build();

  private final @Nullable String title;
  private final @Nullable String body;
  private final boolean preview;
  private final Clock clock;

  private PushOptions(Builder builder) {
    this.title = builder.title;
    this.body = builder.body;
    this.preview = builder.preview;
    this.clock = builder.clock;
  }

  /**
   * Options without a title or body, with message previews enabled and the system clock.
   *
   * @return the default options
   */
  public static PushOptions defaults() {
    return DEFAULTS;
  }

  /**
   * Starts options.
   *
   * @return a builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /**
   * The visible title.
   *
   * @return the title, or null for none
   */
  public @Nullable String getTitle() {
    return title;
  }

  /**
   * The visible body, which replaces the message preview.
   *
   * @return the body, or null for none
   */
  public @Nullable String getBody() {
    return body;
  }

  /**
   * Whether a message event's preview becomes the body when there is no body.
   *
   * @return whether previews are shown
   */
  public boolean isPreview() {
    return preview;
  }

  /**
   * The clock for the TTL and expiration.
   *
   * @return the clock
   */
  public Clock getClock() {
    return clock;
  }

  @Override
  public String toString() {
    return "PushOptions{title="
        + (title == null ? "null" : "<redacted>")
        + ", body="
        + (body == null ? "null" : "<redacted>")
        + ", preview="
        + preview
        + "}";
  }

  /** Configures {@link PushOptions}. */
  public static final class Builder {
    private @Nullable String title;
    private @Nullable String body;
    private boolean preview = true;
    private Clock clock = Clock.systemUTC();

    private Builder() {}

    /**
     * Sets the visible title, such as the sender's or conversation's name.
     *
     * @param title the title; null or empty for none
     * @return this builder
     * @throws IllegalArgumentException if the title has a lone surrogate
     */
    public Builder title(@Nullable String title) {
      this.title = text(title, "title");
      return this;
    }

    /**
     * Sets the visible body, which replaces the message preview.
     *
     * @param body the body; null or empty for none
     * @return this builder
     * @throws IllegalArgumentException if the body has a lone surrogate
     */
    public Builder body(@Nullable String body) {
      this.body = text(body, "body");
      return this;
    }

    /**
     * Sets whether a message event's preview becomes the body when there is no body. Defaults to true.
     *
     * @param preview whether previews are shown
     * @return this builder
     */
    public Builder preview(boolean preview) {
      this.preview = preview;
      return this;
    }

    /**
     * Sets the clock for the TTL and expiration. Defaults to {@link Clock#systemUTC()}.
     *
     * @param clock the clock
     * @return this builder
     */
    public Builder clock(Clock clock) {
      this.clock = Wire.nonNull(clock, "clock");
      return this;
    }

    /**
     * Builds the options.
     *
     * @return the options
     */
    public PushOptions build() {
      return new PushOptions(this);
    }

    private static @Nullable String text(@Nullable String value, String field) {
      if (value == null || value.isEmpty()) {
        return null;
      }
      if (Json.hasLoneSurrogate(value)) {
        throw new IllegalArgumentException(field + " must be a string without lone surrogates");
      }
      return value;
    }
  }
}
