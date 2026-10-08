package com.convohop.server;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import org.junit.jupiter.api.Test;

// Fails a CI matrix leg whose tests silently ran on the build JDK instead of the requested one.
class TestRuntimeTest {
  @Test
  void runsOnTheRequestedJavaVersion() {
    String requested = System.getProperty("convohop.testJavaVersion");
    assumeTrue(requested != null, "-PtestJavaVersion was not given");
    assertEquals(Integer.parseInt(requested), Runtime.version().feature());
  }
}
