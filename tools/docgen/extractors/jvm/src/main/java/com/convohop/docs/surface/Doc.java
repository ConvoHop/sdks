package com.convohop.docs.surface;

/**
 * A converted documentation comment.
 *
 * @param text the docs as Markdown, possibly empty
 * @param deprecated the deprecation note as Markdown, possibly empty; null when the comment has no deprecated tag
 */
record Doc(String text, String deprecated) {
  static final Doc EMPTY = new Doc("", null);
}
