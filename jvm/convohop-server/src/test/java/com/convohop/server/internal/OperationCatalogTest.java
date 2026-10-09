package com.convohop.server.internal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.convohop.server.api.Operations;
import com.convohop.server.testing.Repo;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class OperationCatalogTest {
  @Test
  void retryableSaysWhetherTheSchemaMarksEachErrorCodeRetryable() {
    OperationCatalog catalog = Operations.catalog();
    List<Object> codes = Repo.list(Repo.object(Repo.object(Repo.json("schema/ir.json")).get("errors")).get("codes"));
    assertFalse(codes.isEmpty());
    for (Object item : codes) {
      Map<String, Object> code = Repo.object(item);
      String name = (String) code.get("name");
      assertEquals(code.get("retryable"), catalog.retryable(name), name);
    }
    assertNull(catalog.retryable("NEWER_CODE"));
  }
}
