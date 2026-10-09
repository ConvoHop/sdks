package com.convohop.docs.surface;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/** Finds source files. */
final class Sources {
  private Sources() {}

  /** The files under {@code roots} whose names end with {@code suffix}, in path order. Missing roots are skipped. */
  static List<Path> list(List<Path> roots, String suffix) throws IOException {
    List<Path> files = new ArrayList<>();
    for (Path root : roots) {
      if (!Files.isDirectory(root)) continue;
      try (Stream<Path> walk = Files.walk(root)) {
        walk.filter(Files::isRegularFile).filter(file -> file.getFileName().toString().endsWith(suffix)).forEach(files::add);
      }
    }
    files.sort(Comparator.comparing(Sources::display));
    return files;
  }

  /** The path relative to the working directory, the repository root when the extractor runs, with / separators. */
  static String display(Path path) {
    Path absolute = path.toAbsolutePath().normalize();
    Path base = Path.of("").toAbsolutePath();
    Path shown = absolute.startsWith(base) ? base.relativize(absolute) : absolute;
    return shown.toString().replace(File.separatorChar, '/');
  }
}
