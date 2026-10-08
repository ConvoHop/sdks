package com.convohop.server.internal;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/** Every generated operation, by ID, with each plane's resolve operation. Not API. */
public final class OperationCatalog {
  private final Map<String, OperationDescriptor<?>> operations;
  private final Map<String, String> resolveOperations;

  /**
   * Creates the catalog.
   *
   * @param operations the descriptors
   * @param resolveOperations the resolve operation ID for each plane that has one
   * @throws IllegalArgumentException if an ID repeats or a resolve operation is missing
   */
  public OperationCatalog(List<? extends OperationDescriptor<?>> operations, Map<String, String> resolveOperations) {
    Map<String, OperationDescriptor<?>> byId = new LinkedHashMap<>();
    for (OperationDescriptor<?> operation : operations) {
      if (byId.put(operation.id(), operation) != null) {
        throw new IllegalArgumentException("Duplicate operation " + operation.id());
      }
    }
    for (String resolve : resolveOperations.values()) {
      if (!byId.containsKey(resolve)) {
        throw new IllegalArgumentException("Unknown resolve operation " + resolve);
      }
    }
    this.operations = Collections.unmodifiableMap(byId);
    this.resolveOperations = Map.copyOf(resolveOperations);
  }

  /**
   * Finds an operation.
   *
   * @param id the operation ID
   * @return the descriptor, or null when unknown
   */
  public @Nullable OperationDescriptor<?> find(String id) {
    return operations.get(id);
  }

  /**
   * The resolve operation of a plane.
   *
   * @param plane the plane name
   * @return the descriptor, or null when the plane has none
   */
  public @Nullable OperationDescriptor<?> resolveOperation(String plane) {
    String id = resolveOperations.get(plane);
    return id == null ? null : operations.get(id);
  }

  /**
   * Every operation, in catalog order.
   *
   * @return an unmodifiable collection
   */
  public Collection<OperationDescriptor<?>> operations() {
    return operations.values();
  }
}
