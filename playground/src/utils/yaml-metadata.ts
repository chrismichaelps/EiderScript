/** Detects YAML metadata (version and encoding) */
export interface YamlMetadata {
  version: string;
  encoding: string;
}

/** 
 * Scans for directives and encoding comments.
 */
export function detectYamlMetadata(content: string): YamlMetadata {
  const metadata: YamlMetadata = {
    version: '1.2',
    encoding: 'UTF-8'
  };

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // Version directive: %YAML 1.2
    if (trimmed.startsWith('%YAML')) {
      const match = trimmed.match(/%YAML\s+(\d+\.\d+)/);
      if (match?.[1]) {
        metadata.version = match[1];
      }
    }

    // Encoding comment: # encoding: utf-8
    if (trimmed.startsWith('#') && trimmed.toLowerCase().includes('encoding:')) {
      const match = trimmed.match(/encoding:\s*([\w-]+)/i);
      if (match?.[1]) {
        metadata.encoding = match[1].toUpperCase();
      }
    }

    // Stop if content starts
    if (trimmed.startsWith('kind:') || trimmed.startsWith('name:')) {
      break;
    }
  }

  return metadata;
}
